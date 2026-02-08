import { Hono } from "hono";
import { auth } from "./auth";
import { pool } from "./pool";

const apikeyRoute = new Hono<{
  Variables: {
    user: typeof auth.$Infer.Session.user | null;
    session: typeof auth.$Infer.Session.session | null;
  };
}>().basePath("/apikey");

/**
 * GET /v1/apikey
 * Get the current user's API key (if any).
 * Returns key metadata but NOT the actual key value.
 */
apikeyRoute.get("/", async (c) => {
  const user = c.get("user");
  if (!user) return c.json({ error: "Unauthorized" }, 401);

  try {
    const result = await auth.api.listApiKeys({
      headers: c.req.raw.headers,
    });

    if (!result || result.length === 0) {
      return c.json({ key: null });
    }

    // Return the first (and should be only) key
    const key = result[0]!;
    return c.json({
      key: {
        id: key.id,
        name: key.name,
        start: key.start,
        prefix: key.prefix,
        enabled: key.enabled,
        createdAt: key.createdAt,
      },
    });
  } catch (err) {
    console.error("GET /v1/apikey error:", err);
    return c.json({ error: "Failed to fetch API key" }, 500);
  }
});

/**
 * POST /v1/apikey
 * Create a new API key for the current user.
 * If the user already has a key, returns an error (use PUT to regenerate).
 */
apikeyRoute.post("/", async (c) => {
  const user = c.get("user");
  if (!user) return c.json({ error: "Unauthorized" }, 401);

  try {
    // Check if user already has a key
    const existing = await auth.api.listApiKeys({
      headers: c.req.raw.headers,
    });

    if (existing && existing.length > 0) {
      return c.json({ error: "API key already exists. Use regenerate to replace it." }, 400);
    }

    // Create new key on the server
    const result = await auth.api.createApiKey({
      body: {
        name: "default",
        userId: user.id,
      },
    });

    return c.json({
      key: {
        id: result.id,
        name: result.name,
        start: result.start,
        prefix: result.prefix,
        enabled: result.enabled,
        createdAt: result.createdAt,
        // Include the full key value only on creation
        value: result.key,
      },
    });
  } catch (err) {
    console.error("POST /v1/apikey error:", err);
    return c.json({ error: "Failed to create API key" }, 500);
  }
});

/**
 * PUT /v1/apikey
 * Regenerate the user's API key (delete existing and create new).
 * Returns the new key value.
 */
apikeyRoute.put("/", async (c) => {
  const user = c.get("user");
  if (!user) return c.json({ error: "Unauthorized" }, 401);

  try {
    // Get existing keys
    const existing = await auth.api.listApiKeys({
      headers: c.req.raw.headers,
    });

    // Delete any existing keys
    if (existing && existing.length > 0) {
      for (const key of existing) {
        await auth.api.deleteApiKey({
          body: { keyId: key.id },
          headers: c.req.raw.headers,
        });
      }
    }

    // Create new key on the server
    const result = await auth.api.createApiKey({
      body: {
        name: "default",
        userId: user.id,
      },
    });

    return c.json({
      key: {
        id: result.id,
        name: result.name,
        start: result.start,
        prefix: result.prefix,
        enabled: result.enabled,
        createdAt: result.createdAt,
        // Include the full key value only on creation/regeneration
        value: result.key,
      },
    });
  } catch (err) {
    console.error("PUT /v1/apikey error:", err);
    return c.json({ error: "Failed to regenerate API key" }, 500);
  }
});

/**
 * PATCH /v1/apikey
 * Update the user's API key (enable/disable).
 */
apikeyRoute.patch("/", async (c) => {
  const user = c.get("user");
  if (!user) return c.json({ error: "Unauthorized" }, 401);

  try {
    const body = await c.req.json<{ enabled?: boolean }>();

    if (typeof body.enabled !== "boolean") {
      return c.json({ error: "Invalid body: requires { enabled: boolean }" }, 400);
    }

    const existing = await auth.api.listApiKeys({
      headers: c.req.raw.headers,
    });

    if (!existing || existing.length === 0) {
      return c.json({ error: "No API key to update" }, 404);
    }

    const key = existing[0]!;

    // Update the key's enabled status
    const result = await auth.api.updateApiKey({
      body: {
        keyId: key.id,
        enabled: body.enabled,
      },
      headers: c.req.raw.headers,
    });

    return c.json({
      key: {
        id: result.id,
        name: result.name,
        start: result.start,
        prefix: result.prefix,
        enabled: result.enabled,
        createdAt: result.createdAt,
      },
    });
  } catch (err) {
    console.error("PATCH /v1/apikey error:", err);
    return c.json({ error: "Failed to update API key" }, 500);
  }
});

/**
 * DELETE /v1/apikey
 * Delete the user's API key.
 */
apikeyRoute.delete("/", async (c) => {
  const user = c.get("user");
  if (!user) return c.json({ error: "Unauthorized" }, 401);

  try {
    const existing = await auth.api.listApiKeys({
      headers: c.req.raw.headers,
    });

    if (!existing || existing.length === 0) {
      return c.json({ error: "No API key to delete" }, 404);
    }

    for (const key of existing) {
      await auth.api.deleteApiKey({
        body: { keyId: key.id },
        headers: c.req.raw.headers,
      });
    }

    return c.json({ success: true });
  } catch (err) {
    console.error("DELETE /v1/apikey error:", err);
    return c.json({ error: "Failed to delete API key" }, 500);
  }
});

/**
 * POST /v1/apikey/verify
 * Verify an API key. This endpoint does NOT require session auth.
 * Pass the API key in the request body.
 */
apikeyRoute.post("/verify", async (c) => {
  try {
    const body = await c.req.json<{ key?: string }>();

    if (!body.key || typeof body.key !== "string") {
      return c.json({ valid: false, error: "Missing or invalid key" }, 400);
    }

    const result = await auth.api.verifyApiKey({
      body: { key: body.key },
    });

    if (result.valid) {
      // Fetch the user's configured providers from the secrets table
      let providers: string[] = [];
      if (result.key?.userId) {
        try {
          const secretsResult = await pool.query<{
            providers: string[] | null;
            disabledProviders: string[] | null;
          }>(`SELECT "providers", "disabledProviders" FROM "secrets" WHERE "userId" = $1`, [
            result.key.userId,
          ]);

          const allProviders = secretsResult.rows[0]?.providers ?? [];
          const disabledProviders = secretsResult.rows[0]?.disabledProviders ?? [];
          providers = allProviders.filter((p) => !disabledProviders.includes(p));
        } catch (err) {
          console.error("Failed to fetch user providers during verify:", err);
        }
      }

      return c.json({
        valid: true,
        key: result.key
          ? {
              id: result.key.id,
              name: result.key.name,
              enabled: result.key.enabled,
              userId: result.key.userId,
            }
          : null,
        providers,
      });
    } else {
      return c.json({
        valid: false,
        error: result.error?.message ?? "Invalid API key",
      });
    }
  } catch (err) {
    console.error("POST /v1/apikey/verify error:", err);
    return c.json({ valid: false, error: "Verification failed" }, 500);
  }
});

export { apikeyRoute };
