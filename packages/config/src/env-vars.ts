// Centralized env var name constants — single source of truth for all config schemas

// --- api_platform ---
export const API_PLATFORM_LOG_LEVEL = "API_PLATFORM_LOG_LEVEL";
export const API_PLATFORM_PORT = "API_PLATFORM_PORT";
export const API_PLATFORM_PG_URL = "API_PLATFORM_PG_URL";
export const API_PLATFORM_BACKEND_URL = "API_PLATFORM_BACKEND_URL";

// --- backend ---
export const BACKEND_PORT = "BACKEND_PORT";
export const BACKEND_CORS_ORIGIN = "BACKEND_CORS_ORIGIN";
export const BACKEND_AUTH_BASE_URL = "BACKEND_AUTH_BASE_URL";
export const BACKEND_PG_URL = "BACKEND_PG_URL";
export const BACKEND_GITHUB_CLIENT_ID = "BACKEND_GITHUB_CLIENT_ID";
export const BACKEND_GITHUB_CLIENT_SECRET = "BACKEND_GITHUB_CLIENT_SECRET";

// --- vault ---
export const VAULT_ADDR = "VAULT_ADDR";
export const VAULT_TOKEN = "VAULT_TOKEN";
export const VAULT_TOKEN_KEY = "VAULT_TOKEN_KEY";
export const VAULT_LOG_LEVEL = "VAULT_LOG_LEVEL";
export const VAULT_LOG_FILE = "VAULT_LOG_FILE";

// --- resolver ---
export const RESOLVER_LOG_LEVEL = "RESOLVER_LOG_LEVEL";
export const RESOLVER_LOG_FILE = "RESOLVER_LOG_FILE";

// --- shared ---
export const REDIS_URL = "REDIS_URL";

// --- ledger ---
export const LEDGER_PG_URL = "LEDGER_PG_URL";

// --- library-mandated (cannot be renamed) ---
export const BETTER_AUTH_SECRET = "BETTER_AUTH_SECRET";
export const DATABASE_URL = "DATABASE_URL";
export const AWS_ACCESS_KEY_ID = "AWS_ACCESS_KEY_ID";
export const AWS_SECRET_ACCESS_KEY = "AWS_SECRET_ACCESS_KEY";
export const AWS_REGION = "AWS_REGION";
