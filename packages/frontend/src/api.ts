// ── API Service ──────────────────────────────────────────────────────
// Centralized API calls to the backend with auth-aware fetch (cookies).
// SECURITY: The backend never returns actual secret values. The GET
// endpoint returns only the field *names* that have been configured
// for each provider (e.g. ["apiKey", "endpoint"]).

const API_BASE = "http://localhost:8000";

export type ProviderKeys = Record<string, string>;

export interface ProviderInfo {
  fields: string[];
  enabled: boolean;
}

export interface SecretsResponse {
  /** Map of provider name → provider info with fields and enabled state. */
  providers: Record<string, ProviderInfo>;
}

/** Fetch wrapper that sends session cookies and handles errors. */
async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? `Request failed: ${res.status}`);
  }

  return res.json() as Promise<T>;
}

/**
 * Fetch all configured providers for the current user.
 * Returns a map of provider name → provider info (fields and enabled state).
 * Actual secret values are NEVER returned by the backend.
 */
export async function fetchAllSecrets(): Promise<Record<string, ProviderInfo>> {
  const data = await apiFetch<SecretsResponse>("/v1/secret");
  return data.providers;
}

/**
 * Save keys for a specific provider.
 * Only non-empty fields are sent. The backend merges them with existing
 * Vault data, so fields the user didn't touch are preserved.
 */
export async function saveSecret(provider: string, keys: ProviderKeys): Promise<void> {
  await apiFetch<{ success: boolean }>("/v1/secret", {
    method: "POST",
    body: JSON.stringify({ provider, keys }),
  });
}

/**
 * Toggle provider enabled state.
 */
export async function updateProviderEnabled(provider: string, enabled: boolean): Promise<void> {
  await apiFetch<{ success: boolean; enabled: boolean }>(`/v1/secret/${provider}`, {
    method: "PATCH",
    body: JSON.stringify({ enabled }),
  });
}

/**
 * Delete all keys for a specific provider.
 */
export async function deleteSecret(provider: string): Promise<void> {
  await apiFetch<{ success: boolean }>(`/v1/secret/${provider}`, {
    method: "DELETE",
  });
}

// ── API Key Management ────────────────────────────────────────────────

export interface ApiKeyInfo {
  id: string;
  name: string | null;
  start: string | null;
  prefix: string | null;
  enabled: boolean;
  createdAt: string;
}

export interface ApiKeyWithValue extends ApiKeyInfo {
  value: string;
}

interface GetApiKeyResponse {
  key: ApiKeyInfo | null;
}

interface CreateApiKeyResponse {
  key: ApiKeyWithValue;
}

/**
 * Get the current user's API key metadata (if any).
 * Does NOT return the actual key value.
 */
export async function getApiKey(): Promise<ApiKeyInfo | null> {
  const data = await apiFetch<GetApiKeyResponse>("/v1/apikey");
  return data.key;
}

/**
 * Create a new API key for the current user.
 * Returns the full key value (only shown once).
 */
export async function createApiKey(): Promise<ApiKeyWithValue> {
  const data = await apiFetch<CreateApiKeyResponse>("/v1/apikey", {
    method: "POST",
  });
  return data.key;
}

/**
 * Regenerate the user's API key (deletes existing, creates new).
 * Returns the new key value (only shown once).
 */
export async function regenerateApiKey(): Promise<ApiKeyWithValue> {
  const data = await apiFetch<CreateApiKeyResponse>("/v1/apikey", {
    method: "PUT",
  });
  return data.key;
}

/**
 * Update the user's API key (enable/disable).
 */
export async function updateApiKey(enabled: boolean): Promise<ApiKeyInfo> {
  const data = await apiFetch<GetApiKeyResponse>("/v1/apikey", {
    method: "PATCH",
    body: JSON.stringify({ enabled }),
  });
  return data.key!;
}

/**
 * Delete the user's API key.
 */
export async function deleteApiKey(): Promise<void> {
  await apiFetch<{ success: boolean }>("/v1/apikey", {
    method: "DELETE",
  });
}
