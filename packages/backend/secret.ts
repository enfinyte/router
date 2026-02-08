import { addSecret, getSecret, deleteSecret, VaultService, VaultServiceLive } from "vault";
import { Effect } from "effect";
import { Hono } from "hono";
import { auth } from "./auth";
import { pool } from "./pool";

const secretRoute = new Hono<{
  Variables: {
    user: typeof auth.$Infer.Session.user | null;
    session: typeof auth.$Infer.Session.session | null;
  };
}>().basePath("/secret");

function runVault<A, E>(effect: Effect.Effect<A, E, VaultService>): Promise<A> {
  return Effect.runPromise(Effect.provide(effect, VaultServiceLive));
}

secretRoute.get("/", async (c) => {
  const user = c.get("user");
  if (!user) return c.json({ error: "Unauthorized" }, 401);

  try {
    const result = await pool.query<{
      providers: string[] | null;
      disabledProviders: string[] | null;
    }>(
      `SELECT "providers", "disabledProviders" FROM "secrets" WHERE "userId" = $1`,
      [user.id],
    );

    const providers = result.rows[0]?.providers ?? [];
    const disabledProviders = result.rows[0]?.disabledProviders ?? [];

    const providerFields: Record<string, { fields: string[]; enabled: boolean }> = {};

    await Promise.all(
      providers.map(async (provider) => {
        try {
          const keys = await runVault(getSecret(user.id, provider));
          providerFields[provider] = {
            fields: Object.keys(keys).filter(
              (k) => typeof keys[k] === "string" && keys[k].length > 0,
            ),
            enabled: !disabledProviders.includes(provider),
          };
        } catch {
          providerFields[provider] = {
            fields: [],
            enabled: !disabledProviders.includes(provider),
          };
        }
      }),
    );

    return c.json({ providers: providerFields });
  } catch (err) {
    console.error("GET /v1/secret/ error:", err);
    return c.json({ error: "Failed to fetch secrets" }, 500);
  }
});

secretRoute.post("/", async (c) => {
  const user = c.get("user");
  if (!user) return c.json({ error: "Unauthorized" }, 401);

  const body = await c.req.json<{
    provider: string;
    keys: Record<string, string>;
  }>();

  if (!body.provider || !body.keys || typeof body.keys !== "object") {
    return c.json({ error: "Invalid body: requires { provider, keys }" }, 400);
  }

  const incomingKeys: Record<string, string> = {};
  for (const [k, v] of Object.entries(body.keys)) {
    if (typeof v === "string" && v.trim().length > 0) {
      incomingKeys[k] = v;
    }
  }

  if (Object.keys(incomingKeys).length === 0) {
    return c.json({ error: "No non-empty keys provided" }, 400);
  }

  try {
    let existing: Record<string, string> = {};
    try {
      existing = await runVault(getSecret(user.id, body.provider));
    } catch {}

    const merged = { ...existing, ...incomingKeys };

    await runVault(addSecret(body.provider, user.id, merged));

    await pool.query(
      `INSERT INTO "secrets" ("userId", "providers", "updatedAt")
       VALUES ($1, ARRAY[$2]::text[], CURRENT_TIMESTAMP)
       ON CONFLICT ("userId")
       DO UPDATE SET
         "providers" = CASE
           WHEN $2 = ANY("secrets"."providers") THEN "secrets"."providers"
           ELSE array_append("secrets"."providers", $2)
         END,
         "updatedAt" = CURRENT_TIMESTAMP`,
      [user.id, body.provider],
    );

    return c.json({ success: true });
  } catch (err) {
    console.error("POST /v1/secret/ error:", err);
    return c.json({ error: "Failed to save secret" }, 500);
  }
});

secretRoute.patch("/:provider", async (c) => {
  const user = c.get("user");
  if (!user) return c.json({ error: "Unauthorized" }, 401);

  const provider = c.req.param("provider");
  if (!provider) {
    return c.json({ error: "Missing provider parameter" }, 400);
  }

  try {
    const body = await c.req.json<{ enabled?: boolean }>();

    if (typeof body.enabled !== "boolean") {
      return c.json({ error: "Invalid body: requires { enabled: boolean }" }, 400);
    }

    // Check if provider exists for this user
    const result = await pool.query<{ providers: string[] | null }>(
      `SELECT "providers" FROM "secrets" WHERE "userId" = $1`,
      [user.id],
    );

    const providers = result.rows[0]?.providers ?? [];
    if (!providers.includes(provider)) {
      return c.json({ error: "Provider not configured" }, 404);
    }

    if (body.enabled) {
      // Remove from disabled list
      await pool.query(
        `UPDATE "secrets"
         SET "disabledProviders" = array_remove("disabledProviders", $2),
             "updatedAt" = CURRENT_TIMESTAMP
         WHERE "userId" = $1`,
        [user.id, provider],
      );
    } else {
      // Add to disabled list
      await pool.query(
        `UPDATE "secrets"
         SET "disabledProviders" = CASE
           WHEN $2 = ANY("disabledProviders") THEN "disabledProviders"
           ELSE array_append(COALESCE("disabledProviders", '{}'), $2)
         END,
         "updatedAt" = CURRENT_TIMESTAMP
         WHERE "userId" = $1`,
        [user.id, provider],
      );
    }

    return c.json({ success: true, enabled: body.enabled });
  } catch (err) {
    console.error("PATCH /v1/secret/:provider error:", err);
    return c.json({ error: "Failed to update provider" }, 500);
  }
});

secretRoute.delete("/:provider", async (c) => {
  const user = c.get("user");
  if (!user) return c.json({ error: "Unauthorized" }, 401);

  const provider = c.req.param("provider");
  if (!provider) {
    return c.json({ error: "Missing provider parameter" }, 400);
  }

  try {
    await runVault(deleteSecret(user.id, provider));

    await pool.query(
      `UPDATE "secrets"
       SET "providers" = array_remove("providers", $2),
           "updatedAt" = CURRENT_TIMESTAMP
       WHERE "userId" = $1`,
      [user.id, provider],
    );

    return c.json({ success: true });
  } catch (err) {
    console.error("DELETE /v1/secret/:provider error:", err);
    return c.json({ error: "Failed to delete secret" }, 500);
  }
});

export { secretRoute };
