import type { Component } from 'solid-js';
import { createSignal, For, Show, onMount, onCleanup } from 'solid-js';
import {
  SUPPORTED_PROVIDERS,
  PROVIDER_METADATA,
  type SupportedProvider,
  type ProviderKeys,
} from './providers';
import {
  fetchAllSecrets,
  saveSecret,
  deleteSecret,
  updateProviderEnabled,
  getApiKey,
  createApiKey,
  regenerateApiKey,
  updateApiKey,
  type ApiKeyInfo,
  type ProviderInfo,
} from './api';

// ── Types ─────────────────────────────────────────────────────────────

type TabType = 'providers' | 'apikeys';

// ── Icons ────────────────────────────────────────────────────────────

const ChevronDownIcon = () => (
  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
    <path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
  </svg>
);

const LogOutIcon = () => (
  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
    <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
  </svg>
);

const EyeIcon = () => (
  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
    <path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
    <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
  </svg>
);

const EyeSlashIcon = () => (
  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
    <path stroke-linecap="round" stroke-linejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
  </svg>
);

const XMarkIcon = () => (
  <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
    <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
  </svg>
);

const CheckIcon = () => (
  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
    <path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" />
  </svg>
);

const TrashIcon = () => (
  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
    <path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
  </svg>
);

const CopyIcon = () => (
  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
    <path stroke-linecap="round" stroke-linejoin="round" d="M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 0 1-.75.75H9a.75.75 0 0 1-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 0 1 1.927-.184" />
  </svg>
);

const KeyIcon = () => (
  <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
    <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 5.25a3 3 0 0 1 3 3m3 0a6 6 0 0 1-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1 1 21.75 8.25Z" />
  </svg>
);

const RefreshIcon = () => (
  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
    <path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
  </svg>
);

// ── Dashboard Props ──────────────────────────────────────────────────

interface DashboardProps {
  user: { name?: string; email?: string };
  onSignOut: () => void;
}

// ── Dashboard Component ──────────────────────────────────────────────

export const Dashboard: Component<DashboardProps> = (props) => {
  // ── Tab State ───────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = createSignal<TabType>('providers');

  // ── Profile State ───────────────────────────────────────────────────
  const [profileOpen, setProfileOpen] = createSignal(false);

  // ── Provider Keys State ─────────────────────────────────────────────
  const [selectedProvider, setSelectedProvider] = createSignal<SupportedProvider | null>(null);
  const [formData, setFormData] = createSignal<ProviderKeys>({});
  const [showPasswords, setShowPasswords] = createSignal<Record<string, boolean>>({});
  const [providerStates, setProviderStates] = createSignal<Record<string, boolean>>({});
  // Stores provider info (fields and enabled state) for each provider
  const [providerInfo, setProviderInfo] = createSignal<Record<string, ProviderInfo>>({});
  const [loading, setLoading] = createSignal(false);
  const [loadingProviders, setLoadingProviders] = createSignal(true);
  const [error, setError] = createSignal<string | null>(null);
  const [togglingProvider, setTogglingProvider] = createSignal<string | null>(null);

  // ── API Key State ───────────────────────────────────────────────────
  const [userApiKey, setUserApiKey] = createSignal<ApiKeyInfo | null>(null);
  const [newlyCreatedKey, setNewlyCreatedKey] = createSignal<string | null>(null);
  const [apiKeyLoading, setApiKeyLoading] = createSignal(false);
  const [apiKeyError, setApiKeyError] = createSignal<string | null>(null);
  const [apiKeyCopied, setApiKeyCopied] = createSignal(false);

  let profileButtonRef: HTMLButtonElement | undefined;
  let profileMenuRef: HTMLDivElement | undefined;

  // Fetch configured providers from the backend on mount
  onMount(async () => {
    try {
      setLoadingProviders(true);
      const providers = await fetchAllSecrets();
      setProviderInfo(providers);

      const states: Record<string, boolean> = {};
      SUPPORTED_PROVIDERS.forEach((p) => {
        const info = providers[p];
        const metadata = PROVIDER_METADATA[p];
        // Provider is configured if all its required fields are present
        states[p] = info ? metadata.fields.every((f) => info.fields.includes(f.key)) : false;
      });
      setProviderStates(states);
    } catch (err) {
      console.error("Failed to load provider secrets:", err);
      setError("Failed to load provider configuration.");
    } finally {
      setLoadingProviders(false);
    }
  });

  // Close profile dropdown when clicking outside
  const handleClickOutside = (e: MouseEvent) => {
    if (
      profileMenuRef &&
      profileButtonRef &&
      !profileMenuRef.contains(e.target as Node) &&
      !profileButtonRef.contains(e.target as Node)
    ) {
      setProfileOpen(false);
    }
  };

  onMount(() => {
    document.addEventListener('click', handleClickOutside);
  });

  onCleanup(() => {
    document.removeEventListener('click', handleClickOutside);
  });

  const userInitials = () => {
    if (props.user.name) {
      return props.user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    if (props.user.email) {
      return props.user.email[0].toUpperCase();
    }
    return '?';
  };

  const openProviderModal = (provider: SupportedProvider) => {
    // Form always starts empty — we never have actual key values on the frontend.
    // For existing providers, fields will show "Key is set" placeholder.
    setFormData({});
    setShowPasswords({});
    setError(null);
    setSelectedProvider(provider);
  };

  /** Check if a specific field already has a value stored in Vault. */
  const isFieldConfigured = (fieldKey: string): boolean => {
    const provider = selectedProvider();
    if (!provider) return false;
    const info = providerInfo()[provider];
    return info ? info.fields.includes(fieldKey) : false;
  };

  const closeModal = () => {
    setSelectedProvider(null);
    setFormData({});
    setShowPasswords({});
  };

  const handleSave = async () => {
    const provider = selectedProvider();
    if (!provider) return;

    const data = formData();
    const metadata = PROVIDER_METADATA[provider];
    const existingInfo = providerInfo()[provider];
    const existingFields = existingInfo?.fields ?? [];
    const isNew = existingFields.length === 0;

    // For a new provider, all required fields must be filled.
    // For an existing provider, at least one field must be filled (partial update).
    const filledKeys = Object.entries(data).filter(
      ([, v]) => typeof v === "string" && v.trim().length > 0,
    );

    if (isNew) {
      const missing = metadata.fields.filter(
        (f) => !filledKeys.some(([k]) => k === f.key),
      );
      if (missing.length > 0) {
        setError(`Please fill in: ${missing.map((f) => f.label).join(", ")}`);
        return;
      }
    } else if (filledKeys.length === 0) {
      setError("Enter at least one field to update.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      // Only send non-empty fields — backend merges with existing Vault data
      const keysToSend: ProviderKeys = {};
      for (const [k, v] of filledKeys) {
        keysToSend[k] = v;
      }
      await saveSecret(provider, keysToSend);

      // Update local field tracking: merge newly set field names with existing ones
      const updatedFieldNames = [
        ...new Set([...existingFields, ...filledKeys.map(([k]) => k)]),
      ];
      setProviderInfo({
        ...providerInfo(),
        [provider]: {
          fields: updatedFieldNames,
          enabled: existingInfo?.enabled ?? true,
        },
      });
      setProviderStates({ ...providerStates(), [provider]: true });
      closeModal();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save keys.");
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async () => {
    const provider = selectedProvider();
    if (!provider) return;

    if (!confirm(`Remove all API keys for ${PROVIDER_METADATA[provider].name}?`)) return;

    setLoading(true);
    setError(null);
    try {
      await deleteSecret(provider);
      const updated = { ...providerInfo() };
      delete updated[provider];
      setProviderInfo(updated);
      setProviderStates({ ...providerStates(), [provider]: false });
      closeModal();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove keys.");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleProvider = async (provider: SupportedProvider) => {
    const info = providerInfo()[provider];
    if (!info) return;

    const newEnabled = !info.enabled;
    const action = newEnabled ? 'enable' : 'disable';

    if (!newEnabled && !confirm(`Are you sure you want to ${action} ${PROVIDER_METADATA[provider].name}? API requests using this provider will be rejected.`)) {
      return;
    }

    setTogglingProvider(provider);
    setError(null);
    try {
      await updateProviderEnabled(provider, newEnabled);
      setProviderInfo({
        ...providerInfo(),
        [provider]: { ...info, enabled: newEnabled },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${action} provider`);
    } finally {
      setTogglingProvider(null);
    }
  };

  const updateField = (key: string, value: string) => {
    setFormData({ ...formData(), [key]: value });
  };

  const togglePasswordVisibility = (key: string) => {
    setShowPasswords({ ...showPasswords(), [key]: !showPasswords()[key] });
  };

  const currentMetadata = () => {
    const provider = selectedProvider();
    return provider ? PROVIDER_METADATA[provider] : null;
  };

  // ── API Key Functions ───────────────────────────────────────────────

  const fetchUserApiKey = async () => {
    setApiKeyLoading(true);
    setApiKeyError(null);
    try {
      const key = await getApiKey();
      setUserApiKey(key);
    } catch (err) {
      setApiKeyError(err instanceof Error ? err.message : 'Failed to load API key');
    } finally {
      setApiKeyLoading(false);
    }
  };

  const handleCreateApiKey = async () => {
    setApiKeyLoading(true);
    setApiKeyError(null);
    setNewlyCreatedKey(null);
    try {
      const key = await createApiKey();
      setNewlyCreatedKey(key.value);
      setUserApiKey(key);
    } catch (err) {
      setApiKeyError(err instanceof Error ? err.message : 'Failed to create API key');
    } finally {
      setApiKeyLoading(false);
    }
  };

  const handleRegenerateApiKey = async () => {
    if (!confirm('This will invalidate your current API key. Any applications using it will stop working. Continue?')) {
      return;
    }

    setApiKeyLoading(true);
    setApiKeyError(null);
    setNewlyCreatedKey(null);
    try {
      const key = await regenerateApiKey();
      setNewlyCreatedKey(key.value);
      setUserApiKey(key);
    } catch (err) {
      setApiKeyError(err instanceof Error ? err.message : 'Failed to regenerate API key');
    } finally {
      setApiKeyLoading(false);
    }
  };

  const copyApiKey = async () => {
    const key = newlyCreatedKey();
    if (!key) return;
    try {
      await navigator.clipboard.writeText(key);
      setApiKeyCopied(true);
      setTimeout(() => setApiKeyCopied(false), 2000);
    } catch {
      setApiKeyError('Failed to copy to clipboard');
    }
  };

  const handleToggleApiKey = async () => {
    const currentKey = userApiKey();
    if (!currentKey) return;

    const newEnabled = !currentKey.enabled;
    const action = newEnabled ? 'enable' : 'disable';

    if (!newEnabled && !confirm(`Are you sure you want to ${action} your API key? API requests using this key will be rejected.`)) {
      return;
    }

    setApiKeyLoading(true);
    setApiKeyError(null);
    try {
      const updatedKey = await updateApiKey(newEnabled);
      setUserApiKey(updatedKey);
    } catch (err) {
      setApiKeyError(err instanceof Error ? err.message : `Failed to ${action} API key`);
    } finally {
      setApiKeyLoading(false);
    }
  };

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    if (tab === 'apikeys' && !userApiKey() && !apiKeyLoading()) {
      fetchUserApiKey();
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div class="min-h-screen flex flex-col">
      {/* ── Navbar ─────────────────────────────────────────────────── */}
      <nav class="sticky top-0 z-40 bg-[#161b22] border-b border-[#30363d]">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex items-center justify-between h-16">
            {/* Brand */}
            <div class="flex items-center gap-3">
              <div class="flex items-center justify-center w-8 h-8 rounded-md bg-[#58a6ff]">
                <svg class="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                </svg>
              </div>
              <span class="text-lg font-semibold text-[#c9d1d9]">Enfinyte</span>
            </div>

            {/* Profile */}
            <div class="relative">
              <button
                ref={profileButtonRef}
                onClick={() => setProfileOpen(!profileOpen())}
                class="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-[#30363d] transition-colors duration-150"
              >
                <div class="w-7 h-7 rounded-full bg-[#58a6ff] flex items-center justify-center text-white text-xs font-semibold">
                  {userInitials()}
                </div>
                <ChevronDownIcon />
              </button>

              {/* Profile Dropdown */}
              <Show when={profileOpen()}>
                <div
                  ref={profileMenuRef}
                  class="absolute right-0 mt-2 w-64 bg-[#161b22] border border-[#30363d] rounded-md shadow-lg overflow-hidden animate-fade-in"
                >
                  <div class="p-4 border-b border-[#21262d]">
                    <p class="text-sm font-medium text-[#c9d1d9] truncate">{props.user.name || 'User'}</p>
                    <p class="text-xs text-[#8b949e] truncate mt-0.5">{props.user.email}</p>
                  </div>
                  <button
                    onClick={() => {
                      setProfileOpen(false);
                      props.onSignOut();
                    }}
                    class="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[#c9d1d9] hover:bg-[#21262d] transition-colors duration-150"
                  >
                    <LogOutIcon />
                    <span>Sign Out</span>
                  </button>
                </div>
              </Show>
            </div>
          </div>
        </div>
      </nav>

      {/* ── Main Content ───────────────────────────────────────────── */}
      <main class="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div class="mb-6">
          <h1 class="text-2xl font-bold text-[#c9d1d9] mb-1">API Keys</h1>
          <p class="text-[#8b949e] text-sm">Manage your provider credentials and platform access</p>
        </div>

        {/* ── Tabs ─────────────────────────────────────────────────────── */}
        <div class="border-b border-[#30363d] mb-6">
          <nav class="flex gap-6" aria-label="Tabs">
            <button
              onClick={() => handleTabChange('providers')}
              class={`py-3 px-1 text-sm font-medium border-b-2 transition-colors duration-150 ${
                activeTab() === 'providers'
                  ? 'border-[#58a6ff] text-[#c9d1d9]'
                  : 'border-transparent text-[#8b949e] hover:text-[#c9d1d9] hover:border-[#30363d]'
              }`}
            >
              Provider Keys
            </button>
            <button
              onClick={() => handleTabChange('apikeys')}
              class={`py-3 px-1 text-sm font-medium border-b-2 transition-colors duration-150 ${
                activeTab() === 'apikeys'
                  ? 'border-[#58a6ff] text-[#c9d1d9]'
                  : 'border-transparent text-[#8b949e] hover:text-[#c9d1d9] hover:border-[#30363d]'
              }`}
            >
              API Keys
            </button>
          </nav>
        </div>

        {/* ── Provider Keys Tab Content ─────────────────────────────── */}
        <Show when={activeTab() === 'providers'}>
          {/* Loading / Error states for initial fetch */}
          <Show when={loadingProviders()}>
            <div class="flex items-center justify-center py-12">
              <div class="animate-spin w-6 h-6 border-2 border-[#30363d] border-t-[#58a6ff] rounded-full" />
              <span class="ml-3 text-sm text-[#8b949e]">Loading providers...</span>
            </div>
          </Show>

          <Show when={!loadingProviders() && error() && !selectedProvider()}>
            <div class="mb-4 px-4 py-3 rounded-md bg-[#da3633]/10 border border-[#da3633]/30 text-sm text-[#f85149]">
              {error()}
            </div>
          </Show>

          {/* Provider Table */}
          <Show when={!loadingProviders()}>
          <div class="overflow-x-auto -mx-4 sm:mx-0">
            <div class="inline-block min-w-full align-middle">
              <div class="bg-[#161b22] border border-[#30363d] rounded-md overflow-hidden">
                <table class="min-w-full md:min-w-0 table-auto border-collapse">
                  <thead class="border-b border-[#21262d]">
                    <tr>
                      <th class="py-2 px-4 text-left text-xs font-semibold text-[#8b949e]">
                        Provider
                      </th>
                      <th class="hidden md:table-cell py-2 px-4 text-left text-xs font-semibold text-[#8b949e]">
                        Description
                      </th>
                      <th class="py-2 px-4 text-left text-xs font-semibold text-[#8b949e]">
                        Status
                      </th>
                      <th class="py-2 px-4 text-center text-xs font-semibold text-[#8b949e]">
                        Enabled
                      </th>
                      <th class="py-2 px-4 text-right text-xs font-semibold text-[#8b949e]">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-[#21262d]">
                    <For each={SUPPORTED_PROVIDERS}>
                      {(provider) => {
                        const metadata = PROVIDER_METADATA[provider];
                        const configured = () => providerStates()[provider];
                        const info = () => providerInfo()[provider];
                        const isEnabled = () => info()?.enabled ?? true;
                        const isToggling = () => togglingProvider() === provider;

                        return (
                          <tr class="hover:bg-[#161b22] transition-colors duration-150">
                            {/* Provider cell */}
                            <td class="py-3 px-4 whitespace-nowrap">
                              <div class="flex items-center gap-3">
                                <div class="w-7 h-7 rounded-md bg-[#21262d] border border-[#30363d] flex items-center justify-center flex-shrink-0">
                                  <svg class="w-4 h-4 text-[#c9d1d9]" fill="currentColor" viewBox="0 0 24 24">
                                    <path d={metadata.iconPath} />
                                  </svg>
                                </div>
                                <span class="text-sm font-medium text-[#c9d1d9]">{metadata.name}</span>
                              </div>
                            </td>

                            {/* Description cell */}
                            <td class="hidden md:table-cell py-3 px-4">
                              <p class="text-sm text-[#8b949e] line-clamp-2">{metadata.description}</p>
                            </td>

                            {/* Status cell */}
                            <td class="py-3 px-4 whitespace-nowrap">
                              <Show
                                when={configured()}
                                fallback={
                                  <span class="inline-flex items-center gap-2 text-xs">
                                    <div class="w-2 h-2 rounded-full bg-[#6e7681]" />
                                    <span class="text-[#6e7681]">Not configured</span>
                                  </span>
                                }
                              >
                                <Show
                                  when={isEnabled()}
                                  fallback={
                                    <span class="inline-flex items-center gap-2 text-xs">
                                      <div class="w-2 h-2 rounded-full bg-[#f85149]" />
                                      <span class="text-[#f85149]">Disabled</span>
                                    </span>
                                  }
                                >
                                  <span class="inline-flex items-center gap-2 text-xs">
                                    <CheckIcon />
                                    <span class="text-[#3fb950]">Configured</span>
                                  </span>
                                </Show>
                              </Show>
                            </td>

                            {/* Enabled toggle cell */}
                            <td class="py-3 px-4 text-center whitespace-nowrap">
                              <Show
                                when={configured()}
                                fallback={
                                  <span class="text-xs text-[#6e7681]">-</span>
                                }
                              >
                                <button
                                  onClick={() => handleToggleProvider(provider)}
                                  disabled={isToggling()}
                                  class="inline-flex items-center justify-center"
                                  title={isEnabled() ? 'Click to disable' : 'Click to enable'}
                                >
                                  <div
                                    class={`relative w-9 h-5 rounded-full transition-colors duration-200 ${
                                      isEnabled()
                                        ? 'bg-[#238636]'
                                        : 'bg-[#30363d]'
                                    } ${isToggling() ? 'opacity-50' : 'cursor-pointer'}`}
                                  >
                                    <div
                                      class={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${
                                        isEnabled() ? 'translate-x-4' : 'translate-x-0.5'
                                      }`}
                                    />
                                  </div>
                                </button>
                              </Show>
                            </td>

                            {/* Actions cell */}
                            <td class="py-3 px-4 text-right whitespace-nowrap">
                              <button
                                onClick={() => openProviderModal(provider)}
                                class={`
                                  px-3 py-1.5 rounded-md text-xs font-medium
                                  transition-colors duration-150
                                  ${configured()
                                    ? 'bg-[#21262d] border border-[#30363d] text-[#c9d1d9] hover:bg-[#30363d]'
                                    : 'bg-[#238636] text-white hover:bg-[#2ea043]'
                                  }
                                `}
                              >
                                {configured() ? 'Edit' : 'Configure'}
                              </button>
                            </td>
                          </tr>
                        );
                      }}
                    </For>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          </Show>
        </Show>

        {/* ── API Keys Tab Content ─────────────────────────────────────── */}
        <Show when={activeTab() === 'apikeys'}>
          {/* Loading State */}
          <Show when={apiKeyLoading() && !userApiKey()}>
            <div class="flex items-center justify-center py-12">
              <div class="animate-spin w-6 h-6 border-2 border-[#30363d] border-t-[#58a6ff] rounded-full" />
              <span class="ml-3 text-sm text-[#8b949e]">Loading API key...</span>
            </div>
          </Show>

          {/* Error State */}
          <Show when={apiKeyError()}>
            <div class="mb-4 px-4 py-3 rounded-md bg-[#da3633]/10 border border-[#da3633]/30 text-sm text-[#f85149]">
              {apiKeyError()}
            </div>
          </Show>

          {/* No API Key - Show Generate Button */}
          <Show when={!apiKeyLoading() && !userApiKey()}>
            <div class="bg-[#161b22] border border-[#30363d] rounded-md p-6">
              <div class="flex flex-col items-center text-center py-8">
                <div class="w-12 h-12 rounded-full bg-[#21262d] border border-[#30363d] flex items-center justify-center mb-4">
                  <KeyIcon />
                </div>
                <h3 class="text-lg font-medium text-[#c9d1d9] mb-2">No API Key</h3>
                <p class="text-sm text-[#8b949e] mb-6 max-w-md">
                  Generate an API key to authenticate requests to the Enfinyte API. 
                  This key will be used to access your configured LLM providers.
                </p>
                <button
                  onClick={handleCreateApiKey}
                  disabled={apiKeyLoading()}
                  class="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium text-white bg-[#238636] hover:bg-[#2ea043] transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Show when={apiKeyLoading()} fallback={<KeyIcon />}>
                    <div class="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
                  </Show>
                  <span>Generate API Key</span>
                </button>
              </div>
            </div>
          </Show>

          {/* Has API Key - Show Key Info */}
          <Show when={userApiKey()}>
            <div class="bg-[#161b22] border border-[#30363d] rounded-md overflow-hidden">
              {/* Header */}
              <div class="px-6 py-4 border-b border-[#21262d]">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-3">
                    <div class="w-9 h-9 rounded-md bg-[#21262d] border border-[#30363d] flex items-center justify-center">
                      <KeyIcon />
                    </div>
                    <div>
                      <h3 class="text-sm font-medium text-[#c9d1d9]">Platform API Key</h3>
                      <p class="text-xs text-[#8b949e]">Use this key to authenticate API requests</p>
                    </div>
                  </div>
                  <Show
                    when={userApiKey()?.enabled}
                    fallback={
                      <span class="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium bg-[#da3633]/20 text-[#f85149]">
                        <div class="w-1.5 h-1.5 rounded-full bg-[#f85149]" />
                        Disabled
                      </span>
                    }
                  >
                    <span class="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium bg-[#238636]/20 text-[#3fb950]">
                      <div class="w-1.5 h-1.5 rounded-full bg-[#3fb950]" />
                      Active
                    </span>
                  </Show>
                </div>
              </div>

              {/* Newly Created Key Display */}
              <Show when={newlyCreatedKey()}>
                <div class="px-6 py-4 bg-[#0d1117] border-b border-[#21262d]">
                  <div class="flex items-center justify-between gap-4">
                    <div class="flex-1 min-w-0">
                      <label class="block text-xs font-medium text-[#8b949e] mb-2">
                        Your API Key
                        <span class="ml-2 text-[#f0883e]">(copy now - won't be shown again)</span>
                      </label>
                      <div class="flex items-center gap-2">
                        <code class="flex-1 px-3 py-2 rounded-md bg-[#161b22] border border-[#30363d] text-sm text-[#c9d1d9] font-mono overflow-x-auto">
                          {newlyCreatedKey()}
                        </code>
                        <button
                          onClick={copyApiKey}
                          class={`flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-150 ${
                            apiKeyCopied()
                              ? 'bg-[#238636] text-white'
                              : 'bg-[#21262d] border border-[#30363d] text-[#c9d1d9] hover:bg-[#30363d]'
                          }`}
                        >
                          <Show when={apiKeyCopied()} fallback={<CopyIcon />}>
                            <CheckIcon />
                          </Show>
                          <span>{apiKeyCopied() ? 'Copied!' : 'Copy'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </Show>

              {/* Key Details */}
              <div class="px-6 py-4">
                <div class="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div>
                    <p class="text-xs font-medium text-[#8b949e] mb-1">Key Preview</p>
                    <p class="text-sm text-[#c9d1d9] font-mono">
                      {userApiKey()?.prefix}{userApiKey()?.start?.replace(userApiKey()?.prefix || '', '')}...
                    </p>
                  </div>
                  <div>
                    <p class="text-xs font-medium text-[#8b949e] mb-1">Created</p>
                    <p class="text-sm text-[#c9d1d9]">
                      {userApiKey() ? formatDate(userApiKey()!.createdAt) : '-'}
                    </p>
                  </div>
                  <div>
                    <p class="text-xs font-medium text-[#8b949e] mb-1">Expiration</p>
                    <p class="text-sm text-[#c9d1d9]">Never</p>
                  </div>
                  <div>
                    <p class="text-xs font-medium text-[#8b949e] mb-1">Status</p>
                    <button
                      onClick={handleToggleApiKey}
                      disabled={apiKeyLoading()}
                      class="flex items-center gap-2 group"
                      title={userApiKey()?.enabled ? 'Click to disable' : 'Click to enable'}
                    >
                      {/* Toggle Switch */}
                      <div
                        class={`relative w-9 h-5 rounded-full transition-colors duration-200 ${
                          userApiKey()?.enabled
                            ? 'bg-[#238636]'
                            : 'bg-[#30363d]'
                        } ${apiKeyLoading() ? 'opacity-50' : 'cursor-pointer'}`}
                      >
                        <div
                          class={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${
                            userApiKey()?.enabled ? 'translate-x-4' : 'translate-x-0.5'
                          }`}
                        />
                      </div>
                      <span class={`text-sm ${userApiKey()?.enabled ? 'text-[#3fb950]' : 'text-[#8b949e]'}`}>
                        {userApiKey()?.enabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div class="px-6 py-4 bg-[#0d1117] border-t border-[#21262d]">
                <div class="flex items-center justify-between">
                  <p class="text-xs text-[#8b949e]">
                    Lost your key? Regenerate to get a new one. This will invalidate the current key.
                  </p>
                  <button
                    onClick={handleRegenerateApiKey}
                    disabled={apiKeyLoading()}
                    class="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium text-[#c9d1d9] bg-[#21262d] border border-[#30363d] hover:bg-[#30363d] transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Show when={apiKeyLoading()} fallback={<RefreshIcon />}>
                      <div class="animate-spin w-4 h-4 border-2 border-[#30363d] border-t-[#c9d1d9] rounded-full" />
                    </Show>
                    <span>Regenerate Key</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Usage Instructions */}
            <div class="mt-6 bg-[#161b22] border border-[#30363d] rounded-md p-6">
              <h4 class="text-sm font-medium text-[#c9d1d9] mb-3">Usage</h4>
              
              <p class="text-sm text-[#8b949e] mb-2">
                <strong class="text-[#c9d1d9]">Verify your API key:</strong>
              </p>
              <pre class="px-4 py-3 mb-4 rounded-md bg-[#0d1117] border border-[#30363d] text-sm text-[#c9d1d9] font-mono overflow-x-auto">
{`curl -X POST http://localhost:8000/v1/apikey/verify \\
  -H "Content-Type: application/json" \\
  -d '{"key": "YOUR_API_KEY"}'`}
              </pre>

              <p class="text-sm text-[#8b949e] mb-2">
                <strong class="text-[#c9d1d9]">Make API requests:</strong> Include your API key in the <code class="px-1.5 py-0.5 rounded bg-[#21262d] text-[#c9d1d9] text-xs">Authorization</code> header:
              </p>
              <pre class="px-4 py-3 rounded-md bg-[#0d1117] border border-[#30363d] text-sm text-[#c9d1d9] font-mono overflow-x-auto">
{`curl -X POST http://localhost:8080/v1/responses \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"model": "auto/most-popular", "input": "Hello!"}'`}
              </pre>
            </div>
          </Show>
        </Show>
      </main>

      {/* ── Provider Config Modal ──────────────────────────────────── */}
      <Show when={selectedProvider()}>
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4 animate-modal-fade-in">
          {/* Backdrop */}
          <div
            class="absolute inset-0 bg-black/70"
            onClick={closeModal}
          />

          {/* Modal */}
          <div class="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-[#161b22] border border-[#30363d] rounded-md shadow-2xl animate-modal-scale-in">
            {/* Header */}
            <div class="sticky top-0 bg-[#161b22] border-b border-[#21262d] px-6 py-4 flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div class="w-9 h-9 rounded-md bg-[#21262d] border border-[#30363d] flex items-center justify-center">
                  <svg class="w-5 h-5 text-[#c9d1d9]" fill="currentColor" viewBox="0 0 24 24">
                    <path d={currentMetadata()?.iconPath} />
                  </svg>
                </div>
                <div>
                  <h2 class="text-lg font-semibold text-[#c9d1d9]">{currentMetadata()?.name}</h2>
                  <p class="text-xs text-[#8b949e]">{currentMetadata()?.description}</p>
                </div>
              </div>
              <button
                onClick={closeModal}
                class="w-8 h-8 rounded-md hover:bg-[#21262d] transition-colors duration-150 flex items-center justify-center text-[#8b949e] hover:text-[#c9d1d9]"
              >
                <XMarkIcon />
              </button>
            </div>

            {/* Error banner */}
            <Show when={error()}>
              <div class="mx-6 mt-4 px-4 py-3 rounded-md bg-[#da3633]/10 border border-[#da3633]/30 text-sm text-[#f85149]">
                {error()}
              </div>
            </Show>

            {/* Form */}
            <div class="p-6 space-y-5">
              <For each={currentMetadata()?.fields}>
                {(field) => {
                  const isPassword = field.type === 'password';
                  const isTextarea = field.type === 'textarea';
                  const showPassword = () => showPasswords()[field.key];
                  const hasExistingValue = () => isFieldConfigured(field.key);

                  // For existing fields: show a "set" placeholder instead of the original.
                  // The user must enter a new value to replace it.
                  const placeholder = () =>
                    hasExistingValue()
                      ? `\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022 (enter new value to replace)`
                      : field.placeholder;

                  return (
                    <div>
                      <label class="block text-xs font-medium text-[#8b949e] mb-2">
                        {field.label}
                        <Show when={hasExistingValue()}>
                          <span class="ml-2 text-[#3fb950] font-normal">(currently set)</span>
                        </Show>
                      </label>
                      <Show when={field.description}>
                        <p class="text-xs text-[#6e7681] mb-2">{field.description}</p>
                      </Show>
                      <div class="relative">
                        <Show
                          when={isTextarea}
                          fallback={
                            <>
                              <input
                                type={isPassword && !showPassword() ? 'password' : 'text'}
                                value={formData()[field.key] || ''}
                                onInput={(e) => updateField(field.key, e.currentTarget.value)}
                                placeholder={placeholder()}
                                class="w-full px-3 py-2 pr-10 rounded-md bg-[#0d1117] border border-[#30363d] text-[#c9d1d9] text-sm placeholder-[#6e7681] transition-colors duration-150 focus:outline-none focus:border-[#58a6ff] focus:ring-1 focus:ring-[#58a6ff]"
                              />
                              {/* Only show eye toggle when the user has typed something */}
                              <Show when={isPassword && formData()[field.key]}>
                                <button
                                  type="button"
                                  onClick={() => togglePasswordVisibility(field.key)}
                                  class="absolute right-3 top-1/2 -translate-y-1/2 text-[#8b949e] hover:text-[#c9d1d9] transition-colors duration-150"
                                >
                                  <Show when={showPassword()} fallback={<EyeIcon />}>
                                    <EyeSlashIcon />
                                  </Show>
                                </button>
                              </Show>
                            </>
                          }
                        >
                          <textarea
                            value={formData()[field.key] || ''}
                            onInput={(e) => updateField(field.key, e.currentTarget.value)}
                            placeholder={placeholder()}
                            rows={6}
                            class="w-full px-3 py-2 rounded-md bg-[#0d1117] border border-[#30363d] text-[#c9d1d9] text-sm placeholder-[#6e7681] transition-colors duration-150 focus:outline-none focus:border-[#58a6ff] focus:ring-1 focus:ring-[#58a6ff] font-mono resize-none"
                          />
                        </Show>
                      </div>
                    </div>
                  );
                }}
              </For>

              {/* Hint for existing providers */}
              <Show when={providerStates()[selectedProvider()!]}>
                <p class="text-xs text-[#8b949e] border-t border-[#21262d] pt-4">
                  Leave fields empty to keep their current values. Only fields you fill in will be updated.
                </p>
              </Show>
            </div>

            {/* Footer */}
            <div class="sticky bottom-0 bg-[#161b22] border-t border-[#21262d] px-6 py-4 flex items-center justify-between gap-3">
              <Show when={providerStates()[selectedProvider()!]}>
                <button
                  onClick={handleRemove}
                  disabled={loading()}
                  class="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium text-[#f85149] border border-[#da3633]/30 hover:bg-[#da3633]/10 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Show when={loading()} fallback={<TrashIcon />}>
                    <div class="animate-spin w-4 h-4 border-2 border-[#da3633]/30 border-t-[#f85149] rounded-full" />
                  </Show>
                  <span>Remove</span>
                </button>
              </Show>
              <div class="flex items-center gap-3 ml-auto">
                <button
                  onClick={closeModal}
                  disabled={loading()}
                  class="px-4 py-1.5 rounded-md text-sm font-medium text-[#c9d1d9] border border-[#30363d] hover:bg-[#21262d] transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={loading()}
                  class="flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium text-white bg-[#238636] hover:bg-[#2ea043] transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Show when={loading()} fallback={<CheckIcon />}>
                    <div class="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
                  </Show>
                  <span>{loading() ? 'Saving...' : 'Save'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </Show>
    </div>
  );
};
