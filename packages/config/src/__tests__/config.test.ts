import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { Effect } from "effect";
import {
  ApiPlatformConfig,
  ApiPlatformConfigLive,
  BackendConfig,
  BackendConfigLive,
  VaultConfig,
  VaultConfigLive,
  ResolverConfig,
  ResolverConfigLive,
  LedgerConfig,
  LedgerConfigLive,
  RedisConfig,
  RedisConfigLive,
  makeLoggerConfig,
  validateStartup,
  validateAllConfig,
} from "../index.js";

const runConfig = <A>(effect: Effect.Effect<A, unknown, never>) =>
  Effect.runPromise(effect);

const expectConfigError = async (effect: Effect.Effect<unknown, unknown, never>) => {
  try {
    await runConfig(effect);
    throw new Error("Expected config to fail but it succeeded");
  } catch (e) {
    return String(e);
  }
};

let originalEnv: Record<string, string | undefined>;
beforeEach(() => {
  originalEnv = { ...process.env };
});
afterEach(() => {
  for (const key of Object.keys(process.env)) {
    if (!(key in originalEnv)) {
      Reflect.deleteProperty(process.env, key);
    }
  }
  Object.assign(process.env, originalEnv);
});

describe("ApiPlatformConfig", () => {
  it("loads with defaults when only required var set", async () => {
    process.env.API_PLATFORM_PG_URL = "postgres://test:test@localhost:5432/test";
    const config = await runConfig(
      Effect.provide(ApiPlatformConfig, ApiPlatformConfigLive)
    );
    expect(config.pgConnection).toBe("postgres://test:test@localhost:5432/test");
    expect(config.port).toBe(8080);
    expect(config.logLevel).toBe("INFO");
    expect(config.backendUrl).toBe("http://localhost:8000");
  });

  it("loads custom port when API_PLATFORM_PORT is set", async () => {
    process.env.API_PLATFORM_PG_URL = "postgres://test";
    process.env.API_PLATFORM_PORT = "9000";
    const config = await runConfig(
      Effect.provide(ApiPlatformConfig, ApiPlatformConfigLive)
    );
    expect(config.port).toBe(9000);
  });

  it("loads custom log level when API_PLATFORM_LOG_LEVEL is set", async () => {
    process.env.API_PLATFORM_PG_URL = "postgres://test";
    process.env.API_PLATFORM_LOG_LEVEL = "DEBUG";
    const config = await runConfig(
      Effect.provide(ApiPlatformConfig, ApiPlatformConfigLive)
    );
    expect(config.logLevel).toBe("DEBUG");
  });

  it("loads custom backend URL when API_PLATFORM_BACKEND_URL is set", async () => {
    process.env.API_PLATFORM_PG_URL = "postgres://test";
    process.env.API_PLATFORM_BACKEND_URL = "https://api.example.com";
    const config = await runConfig(
      Effect.provide(ApiPlatformConfig, ApiPlatformConfigLive)
    );
    expect(config.backendUrl).toBe("https://api.example.com");
  });

  it("fails when API_PLATFORM_PG_URL is missing", async () => {
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
    Reflect.deleteProperty(process.env, "API_PLATFORM_PG_URL");
    const err = await expectConfigError(
      Effect.provide(ApiPlatformConfig, ApiPlatformConfigLive)
    );
    expect(err).toContain("API_PLATFORM_PG_URL");
  });
});

describe("BackendConfig", () => {
  it("loads with defaults when required vars set", async () => {
    process.env.BACKEND_PG_URL = "postgres://test@localhost/test";
    process.env.BACKEND_GITHUB_CLIENT_ID = "test-id";
    process.env.BACKEND_GITHUB_CLIENT_SECRET = "test-secret";
    const config = await runConfig(
      Effect.provide(BackendConfig, BackendConfigLive)
    );
    expect(config.postgresConnectionString).toBe("postgres://test@localhost/test");
    expect(config.githubClientId).toBe("test-id");
    expect(config.githubClientSecret).toBe("test-secret");
    expect(config.port).toBe(8000);
    expect(config.corsOrigin).toBe("http://localhost:3000");
    expect(config.baseUrl).toBe("http://localhost:8000");
  });

  it("loads custom port when BACKEND_PORT is set", async () => {
    process.env.BACKEND_PG_URL = "postgres://test";
    process.env.BACKEND_GITHUB_CLIENT_ID = "test-id";
    process.env.BACKEND_GITHUB_CLIENT_SECRET = "test-secret";
    process.env.BACKEND_PORT = "3001";
    const config = await runConfig(
      Effect.provide(BackendConfig, BackendConfigLive)
    );
    expect(config.port).toBe(3001);
  });

  it("loads custom CORS origin when BACKEND_CORS_ORIGIN is set", async () => {
    process.env.BACKEND_PG_URL = "postgres://test";
    process.env.BACKEND_GITHUB_CLIENT_ID = "test-id";
    process.env.BACKEND_GITHUB_CLIENT_SECRET = "test-secret";
    process.env.BACKEND_CORS_ORIGIN = "https://app.example.com";
    const config = await runConfig(
      Effect.provide(BackendConfig, BackendConfigLive)
    );
    expect(config.corsOrigin).toBe("https://app.example.com");
  });

  it("fails when BACKEND_PG_URL is missing", async () => {
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
    Reflect.deleteProperty(process.env, "BACKEND_PG_URL");
    process.env.BACKEND_GITHUB_CLIENT_ID = "test-id";
    process.env.BACKEND_GITHUB_CLIENT_SECRET = "test-secret";
    const err = await expectConfigError(
      Effect.provide(BackendConfig, BackendConfigLive)
    );
    expect(err).toContain("BACKEND_PG_URL");
  });

  it("fails when BACKEND_GITHUB_CLIENT_ID is missing", async () => {
    process.env.BACKEND_PG_URL = "postgres://test";
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
    Reflect.deleteProperty(process.env, "BACKEND_GITHUB_CLIENT_ID");
    process.env.BACKEND_GITHUB_CLIENT_SECRET = "test-secret";
    const err = await expectConfigError(
      Effect.provide(BackendConfig, BackendConfigLive)
    );
    expect(err).toContain("BACKEND_GITHUB_CLIENT_ID");
  });

  it("fails when BACKEND_GITHUB_CLIENT_SECRET is missing", async () => {
    process.env.BACKEND_PG_URL = "postgres://test";
    process.env.BACKEND_GITHUB_CLIENT_ID = "test-id";
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
    Reflect.deleteProperty(process.env, "BACKEND_GITHUB_CLIENT_SECRET");
    const err = await expectConfigError(
      Effect.provide(BackendConfig, BackendConfigLive)
    );
    expect(err).toContain("BACKEND_GITHUB_CLIENT_SECRET");
  });
});

describe("VaultConfig", () => {
  it("loads with defaults when only VAULT_TOKEN set", async () => {
    process.env.VAULT_TOKEN = "test-token";
    const config = await runConfig(
      Effect.provide(VaultConfig, VaultConfigLive)
    );
    expect(config.token).toBe("test-token");
    expect(config.endpoint).toBe("http://127.0.0.1:8200");
    expect(config.logLevel).toMatch(/^(Info|INFO)$/);
    expect(config.logFile).toBe("vault.log");
  });

  it("loads custom endpoint when VAULT_ADDR is set", async () => {
    process.env.VAULT_TOKEN = "test-token";
    process.env.VAULT_ADDR = "https://vault.example.com";
    const config = await runConfig(
      Effect.provide(VaultConfig, VaultConfigLive)
    );
    expect(config.endpoint).toBe("https://vault.example.com");
  });

  it("loads custom log level when VAULT_LOG_LEVEL is set", async () => {
    process.env.VAULT_TOKEN = "test-token";
    process.env.VAULT_LOG_LEVEL = "Debug";
    const config = await runConfig(
      Effect.provide(VaultConfig, VaultConfigLive)
    );
    expect(config.logLevel).toBe("Debug");
  });

  it("loads custom log file when VAULT_LOG_FILE is set", async () => {
    process.env.VAULT_TOKEN = "test-token";
    process.env.VAULT_LOG_FILE = "custom-vault.log";
    const config = await runConfig(
      Effect.provide(VaultConfig, VaultConfigLive)
    );
    expect(config.logFile).toBe("custom-vault.log");
  });

  it("loads optional VAULT_TOKEN_KEY when set", async () => {
    process.env.VAULT_TOKEN = "test-token";
    process.env.VAULT_TOKEN_KEY = "my-key";
    const config = await runConfig(
      Effect.provide(VaultConfig, VaultConfigLive)
    );
    expect(config.tokenKey).toBeDefined();
  });

  it("fails when VAULT_TOKEN is missing", async () => {
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
    Reflect.deleteProperty(process.env, "VAULT_TOKEN");
    const err = await expectConfigError(
      Effect.provide(VaultConfig, VaultConfigLive)
    );
    expect(err).toContain("VAULT_TOKEN");
  });
});

describe("ResolverConfig", () => {
  it("loads with all defaults (no required vars)", async () => {
    const config = await runConfig(
      Effect.provide(ResolverConfig, ResolverConfigLive)
    );
    expect(config.logLevel).toBe("Info");
    expect(config.logFile).toBe("resolver.log");
  });

  it("loads custom log level when RESOLVER_LOG_LEVEL is set", async () => {
    process.env.RESOLVER_LOG_LEVEL = "Debug";
    const config = await runConfig(
      Effect.provide(ResolverConfig, ResolverConfigLive)
    );
    expect(config.logLevel).toBe("Debug");
  });

  it("loads custom log file when RESOLVER_LOG_FILE is set", async () => {
    process.env.RESOLVER_LOG_FILE = "custom-resolver.log";
    const config = await runConfig(
      Effect.provide(ResolverConfig, ResolverConfigLive)
    );
    expect(config.logFile).toBe("custom-resolver.log");
  });
});

describe("LedgerConfig", () => {
  it("loads pgUrl when LEDGER_PG_URL is set", async () => {
    process.env.LEDGER_PG_URL = "postgres://ledger@localhost/ledger";
    const config = await runConfig(
      Effect.provide(LedgerConfig, LedgerConfigLive)
    );
    expect(config.pgUrl).toBe("postgres://ledger@localhost/ledger");
  });

  it("fails when LEDGER_PG_URL is missing", async () => {
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
    Reflect.deleteProperty(process.env, "LEDGER_PG_URL");
    const err = await expectConfigError(
      Effect.provide(LedgerConfig, LedgerConfigLive)
    );
    expect(err).toContain("LEDGER_PG_URL");
  });
});

describe("RedisConfig", () => {
  it("loads REDIS_URL correctly", async () => {
    process.env.REDIS_URL = "redis://localhost:6379";
    const config = await runConfig(
      Effect.provide(RedisConfig, RedisConfigLive)
    );
    expect(config.url).toBe("redis://localhost:6379");
  });

  it("loads custom REDIS_URL with password", async () => {
    process.env.REDIS_URL = "redis://:password@redis.example.com:6380";
    const config = await runConfig(
      Effect.provide(RedisConfig, RedisConfigLive)
    );
    expect(config.url).toBe("redis://:password@redis.example.com:6380");
  });

  it("fails when REDIS_URL is missing", async () => {
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
    Reflect.deleteProperty(process.env, "REDIS_URL");
    const err = await expectConfigError(
      Effect.provide(RedisConfig, RedisConfigLive)
    );
    expect(err).toContain("REDIS_URL");
  });
});

describe("makeLoggerConfig", () => {
  it("reads from correct prefixed vars with lowercase file default", async () => {
    process.env.VAULT_LOG_LEVEL = "Debug";
    const config = await runConfig(makeLoggerConfig("VAULT", "vault"));
    expect(config.logLevel).toBe("Debug");
    expect(config.logFile).toBe("vault.log");
  });

  it("uses defaults when no vars set", async () => {
    const config = await runConfig(makeLoggerConfig("RESOLVER", "resolver"));
    expect(config.logLevel).toBe("Info");
    expect(config.logFile).toBe("resolver.log");
  });

  it("reads custom log file from prefixed var", async () => {
    process.env.CUSTOM_LOG_FILE = "my-custom.log";
    const config = await runConfig(makeLoggerConfig("CUSTOM", "custom"));
    expect(config.logFile).toBe("my-custom.log");
  });

  it("reads both log level and log file from prefixed vars", async () => {
    process.env.SERVICE_LOG_LEVEL = "Trace";
    process.env.SERVICE_LOG_FILE = "service-trace.log";
    const config = await runConfig(makeLoggerConfig("SERVICE", "service"));
    expect(config.logLevel).toBe("Trace");
    expect(config.logFile).toBe("service-trace.log");
  });
});

describe("validateStartup", () => {
  it("passes when all required api_platform vars are set", async () => {
    process.env.API_PLATFORM_PG_URL = "postgres://test";
    process.env.REDIS_URL = "redis://test";
    await runConfig(validateStartup("api_platform"));
  });

  it("fails for api_platform when API_PLATFORM_PG_URL is missing", async () => {
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
    Reflect.deleteProperty(process.env, "API_PLATFORM_PG_URL");
    process.env.REDIS_URL = "redis://test";
    const err = await expectConfigError(validateStartup("api_platform"));
    expect(err).toContain("API_PLATFORM_PG_URL");
  });

  it("fails for api_platform when REDIS_URL is missing", async () => {
    process.env.API_PLATFORM_PG_URL = "postgres://test";
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
    Reflect.deleteProperty(process.env, "REDIS_URL");
    const err = await expectConfigError(validateStartup("api_platform"));
    expect(err).toContain("REDIS_URL");
  });

  it("passes when all required backend vars are set", async () => {
    process.env.BACKEND_PG_URL = "postgres://test";
    process.env.BACKEND_GITHUB_CLIENT_ID = "test";
    process.env.BACKEND_GITHUB_CLIENT_SECRET = "test";
    process.env.BETTER_AUTH_SECRET = "test";
    process.env.REDIS_URL = "redis://test";
    await runConfig(validateStartup("backend"));
  });

  it("fails for backend when BETTER_AUTH_SECRET is missing", async () => {
    process.env.BACKEND_PG_URL = "postgres://test";
    process.env.BACKEND_GITHUB_CLIENT_ID = "test";
    process.env.BACKEND_GITHUB_CLIENT_SECRET = "test";
    process.env.REDIS_URL = "redis://test";
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
    Reflect.deleteProperty(process.env, "BETTER_AUTH_SECRET");
    const err = await expectConfigError(validateStartup("backend"));
    expect(err).toContain("BETTER_AUTH_SECRET");
  });

  it("passes when all required vault vars are set", async () => {
    process.env.VAULT_TOKEN = "test-token";
    await runConfig(validateStartup("vault"));
  });

  it("passes when all required resolver vars are set", async () => {
    process.env.REDIS_URL = "redis://test";
    await runConfig(validateStartup("resolver"));
  });

  it("passes when all required ledger vars are set", async () => {
    process.env.LEDGER_PG_URL = "postgres://test";
    await runConfig(validateStartup("ledger"));
  });
});

describe("validateAllConfig", () => {
  it("collects multiple missing vars in one error", async () => {
    const vars = [
      "API_PLATFORM_PG_URL",
      "BACKEND_PG_URL",
      "VAULT_TOKEN",
      "REDIS_URL",
      "LEDGER_PG_URL",
      "DATABASE_URL",
      "BACKEND_GITHUB_CLIENT_ID",
      "BACKEND_GITHUB_CLIENT_SECRET",
      "BETTER_AUTH_SECRET",
    ];
    for (const v of vars) {
      delete process.env[v];
    }
    const err = await expectConfigError(validateAllConfig);
    const missingCount = (err.match(/Missing:/g) || []).length;
    expect(missingCount).toBeGreaterThanOrEqual(3);
  });

  it("passes when all required vars are set", async () => {
    process.env.API_PLATFORM_PG_URL = "postgres://test";
    process.env.BACKEND_PG_URL = "postgres://test";
    process.env.BACKEND_GITHUB_CLIENT_ID = "test";
    process.env.BACKEND_GITHUB_CLIENT_SECRET = "test";
    process.env.BETTER_AUTH_SECRET = "test";
    process.env.VAULT_TOKEN = "test";
    process.env.REDIS_URL = "redis://test";
    process.env.LEDGER_PG_URL = "postgres://test";
    process.env.DATABASE_URL = "postgres://test";
    await runConfig(validateAllConfig);
  });

  it("fails when API_PLATFORM_PG_URL is missing", async () => {
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
    Reflect.deleteProperty(process.env, "API_PLATFORM_PG_URL");
    process.env.BACKEND_PG_URL = "postgres://test";
    process.env.BACKEND_GITHUB_CLIENT_ID = "test";
    process.env.BACKEND_GITHUB_CLIENT_SECRET = "test";
    process.env.BETTER_AUTH_SECRET = "test";
    process.env.VAULT_TOKEN = "test";
    process.env.REDIS_URL = "redis://test";
    process.env.LEDGER_PG_URL = "postgres://test";
    process.env.DATABASE_URL = "postgres://test";
    const err = await expectConfigError(validateAllConfig);
    expect(err).toContain("API_PLATFORM_PG_URL");
  });
});
