import type { Component } from 'solid-js';
import { createSignal, For, Show, onMount, onCleanup } from 'solid-js';
import {
  SUPPORTED_PROVIDERS,
  PROVIDER_METADATA,
  isProviderConfigured,
  getProviderKeys,
  saveProviderKeys,
  removeProviderKeys,
  type SupportedProvider,
  type ProviderKeys,
} from './providers';

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

// ── Dashboard Props ──────────────────────────────────────────────────

interface DashboardProps {
  user: { name?: string; email?: string };
  onSignOut: () => void;
}

// ── Dashboard Component ──────────────────────────────────────────────

export const Dashboard: Component<DashboardProps> = (props) => {
  const [profileOpen, setProfileOpen] = createSignal(false);
  const [selectedProvider, setSelectedProvider] = createSignal<SupportedProvider | null>(null);
  const [formData, setFormData] = createSignal<ProviderKeys>({});
  const [showPasswords, setShowPasswords] = createSignal<Record<string, boolean>>({});
  const [providerStates, setProviderStates] = createSignal<Record<string, boolean>>({});

  let profileButtonRef: HTMLButtonElement | undefined;
  let profileMenuRef: HTMLDivElement | undefined;

  // Initialize provider states
  onMount(() => {
    const states: Record<string, boolean> = {};
    SUPPORTED_PROVIDERS.forEach((p) => {
      states[p] = isProviderConfigured(p);
    });
    setProviderStates(states);
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
    const existingKeys = getProviderKeys(provider);
    setFormData(existingKeys || {});
    setShowPasswords({});
    setSelectedProvider(provider);
  };

  const closeModal = () => {
    setSelectedProvider(null);
    setFormData({});
    setShowPasswords({});
  };

  const handleSave = () => {
    const provider = selectedProvider();
    if (!provider) return;

    saveProviderKeys(provider, formData());
    setProviderStates({ ...providerStates(), [provider]: true });
    closeModal();
  };

  const handleRemove = () => {
    const provider = selectedProvider();
    if (!provider) return;

    if (confirm(`Remove all API keys for ${PROVIDER_METADATA[provider].name}?`)) {
      removeProviderKeys(provider);
      setProviderStates({ ...providerStates(), [provider]: false });
      closeModal();
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
          <h1 class="text-2xl font-bold text-[#c9d1d9] mb-1">Providers</h1>
          <p class="text-[#8b949e] text-sm">Configure your LLM provider API keys</p>
        </div>

        {/* Provider Table */}
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
                              <span class="inline-flex items-center gap-2 text-xs">
                                <CheckIcon />
                                <span class="text-[#3fb950]">Configured</span>
                              </span>
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

            {/* Form */}
            <div class="p-6 space-y-5">
              <For each={currentMetadata()?.fields}>
                {(field) => {
                  const isPassword = field.type === 'password';
                  const isTextarea = field.type === 'textarea';
                  const showPassword = () => showPasswords()[field.key];

                  return (
                    <div>
                      <label class="block text-xs font-medium text-[#8b949e] mb-2">
                        {field.label}
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
                                placeholder={field.placeholder}
                                class="w-full px-3 py-2 pr-10 rounded-md bg-[#0d1117] border border-[#30363d] text-[#c9d1d9] text-sm placeholder-[#6e7681] transition-colors duration-150 focus:outline-none focus:border-[#58a6ff] focus:ring-1 focus:ring-[#58a6ff]"
                              />
                              <Show when={isPassword}>
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
                            placeholder={field.placeholder}
                            rows={6}
                            class="w-full px-3 py-2 rounded-md bg-[#0d1117] border border-[#30363d] text-[#c9d1d9] text-sm placeholder-[#6e7681] transition-colors duration-150 focus:outline-none focus:border-[#58a6ff] focus:ring-1 focus:ring-[#58a6ff] font-mono resize-none"
                          />
                        </Show>
                      </div>
                    </div>
                  );
                }}
              </For>
            </div>

            {/* Footer */}
            <div class="sticky bottom-0 bg-[#161b22] border-t border-[#21262d] px-6 py-4 flex items-center justify-between gap-3">
              <Show when={providerStates()[selectedProvider()!]}>
                <button
                  onClick={handleRemove}
                  class="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium text-[#f85149] border border-[#da3633]/30 hover:bg-[#da3633]/10 transition-colors duration-150"
                >
                  <TrashIcon />
                  <span>Remove</span>
                </button>
              </Show>
              <div class="flex items-center gap-3 ml-auto">
                <button
                  onClick={closeModal}
                  class="px-4 py-1.5 rounded-md text-sm font-medium text-[#c9d1d9] border border-[#30363d] hover:bg-[#21262d] transition-colors duration-150"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  class="flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium text-white bg-[#238636] hover:bg-[#2ea043] transition-colors duration-150"
                >
                  <CheckIcon />
                  <span>Save</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </Show>
    </div>
  );
};
