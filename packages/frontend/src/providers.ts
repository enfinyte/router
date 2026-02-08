// ── Provider Configuration ──────────────────────────────────────────

export const SUPPORTED_PROVIDERS = [
  "google-vertex-anthropic",
  "azure",
  "google-vertex",
  "openai",
  "anthropic",
  "azure-cognitive-services",
  "amazon-bedrock",
] as const;

export type SupportedProvider = typeof SUPPORTED_PROVIDERS[number];

export interface ProviderField {
  key: string;
  label: string;
  placeholder: string;
  type?: "text" | "password" | "textarea";
  description?: string;
}

export interface ProviderMetadata {
  name: string;
  description: string;
  iconPath: string;
  fields: ProviderField[];
}

// ── Provider Metadata ────────────────────────────────────────────────

export const PROVIDER_METADATA: Record<SupportedProvider, ProviderMetadata> = {
  "openai": {
    name: "OpenAI",
    description: "GPT-4, GPT-3.5, and other OpenAI models",
    iconPath: "M22.282 9.821a5.985 5.985 0 00-.516-4.91 6.046 6.046 0 00-6.51-2.9A6.065 6.065 0 004.981 4.18a5.985 5.985 0 00-3.998 2.9 6.046 6.046 0 00.743 7.097 5.98 5.98 0 00.51 4.911 6.051 6.051 0 006.515 2.9A5.985 5.985 0 0013.26 24a6.056 6.056 0 005.772-4.206 5.99 5.99 0 003.997-2.9 6.056 6.056 0 00-.747-7.073zM13.26 22.43a4.476 4.476 0 01-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 00.392-.681v-6.737l2.02 1.168a.071.071 0 01.038.052v5.583a4.504 4.504 0 01-4.494 4.494zM3.6 18.304a4.47 4.47 0 01-.535-3.014l.142.085 4.783 2.759a.771.771 0 00.78 0l5.843-3.369v2.332a.08.08 0 01-.033.062L9.74 19.95a4.5 4.5 0 01-6.14-1.646zM2.34 7.896a4.485 4.485 0 012.366-1.973V11.6a.766.766 0 00.388.676l5.815 3.355-2.02 1.168a.076.076 0 01-.071 0l-4.83-2.786A4.504 4.504 0 012.34 7.872zm16.597 3.855l-5.833-3.387L15.119 7.2a.076.076 0 01.071 0l4.83 2.791a4.494 4.494 0 01-.676 8.105v-5.678a.79.79 0 00-.407-.667zm2.01-3.023l-.141-.085-4.774-2.782a.776.776 0 00-.785 0L9.409 9.23V6.897a.066.066 0 01.028-.061l4.83-2.787a4.5 4.5 0 016.68 4.66zm-12.64 4.135l-2.02-1.164a.08.08 0 01-.038-.057V6.075a4.5 4.5 0 017.375-3.453l-.142.08L8.704 5.46a.795.795 0 00-.393.681zm1.097-2.365l2.602-1.5 2.607 1.5v2.999l-2.597 1.5-2.607-1.5z",
    fields: [
      { key: "apiKey", label: "API Key", placeholder: "sk-...", type: "password" }
    ]
  },
  "anthropic": {
    name: "Anthropic",
    description: "Claude 3.5 Sonnet, Claude 3 Opus, and other Claude models",
    iconPath: "M12 0L3 7.2v9.6L12 24l9-7.2V7.2L12 0zm6.5 14.9L12 19.7l-6.5-4.8V8.3L12 3.5l6.5 4.8v6.6z M8.5 9.8l3.5 2.6 3.5-2.6v4.4l-3.5 2.6-3.5-2.6V9.8z",
    fields: [
      { key: "apiKey", label: "API Key", placeholder: "sk-ant-...", type: "password" }
    ]
  },
  "azure": {
    name: "Azure OpenAI",
    description: "OpenAI models hosted on Microsoft Azure",
    iconPath: "M22.379 23.343a1.62 1.62 0 01-1.158.657H2.78a1.621 1.621 0 01-1.155-2.765l5.34-5.34a1.62 1.62 0 011.155-.656H16.5l5.879 6.946a1.62 1.62 0 010 2.158zM.75 11.446L8.27 3.924a1.621 1.621 0 012.77 1.158l-.003 11.876-10.289.003a1.622 1.622 0 01-1.156-2.764l.657-.656.501-.095zm23.174 1.856l-5.949-7.03a1.621 1.621 0 00-2.458-.203l-4.345 4.345h8.637a1.621 1.621 0 011.621 1.621l.025.03h1.287a1.619 1.619 0 011.182 2.767l-.768.768h-5.349l-.103-.309 4.665-4.664 1.555 1.875z",
    fields: [
      { key: "apiKey", label: "API Key", placeholder: "Your Azure OpenAI API key", type: "password" },
      { key: "endpoint", label: "Endpoint URL", placeholder: "https://your-resource.openai.azure.com", type: "text" },
      { key: "deploymentName", label: "Deployment Name", placeholder: "gpt-4", type: "text" }
    ]
  },
  "google-vertex": {
    name: "Google Vertex AI",
    description: "Gemini and other Google AI models via Vertex AI",
    iconPath: "M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z",
    fields: [
      { key: "projectId", label: "Project ID", placeholder: "my-gcp-project", type: "text" },
      { key: "region", label: "Region", placeholder: "us-central1", type: "text" },
      { key: "serviceAccount", label: "Service Account JSON", placeholder: "Paste your service account JSON here", type: "textarea", description: "The JSON key file for your GCP service account" }
    ]
  },
  "google-vertex-anthropic": {
    name: "Vertex AI (Anthropic)",
    description: "Claude models via Google Vertex AI",
    iconPath: "M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z",
    fields: [
      { key: "projectId", label: "Project ID", placeholder: "my-gcp-project", type: "text" },
      { key: "region", label: "Region", placeholder: "us-central1", type: "text" },
      { key: "serviceAccount", label: "Service Account JSON", placeholder: "Paste your service account JSON here", type: "textarea", description: "The JSON key file for your GCP service account" }
    ]
  },
  "amazon-bedrock": {
    name: "Amazon Bedrock",
    description: "Claude, Llama, and other models on AWS Bedrock",
    iconPath: "M.75 10.812l10.5-6.636L1.59 1.897C1.148 1.656.75 1.835.75 2.353v8.46zm11.25-6.636l10.5 6.636V2.353c0-.518-.398-.697-.84-.456L12 4.176zM12 12.174l-9.75 6.15v3.822c0 .518.398.697.84.456l8.91-5.619v-4.81zm.75 4.81l8.91 5.618c.442.28.84.062.84-.456v-3.821l-9.75-6.15v4.81z",
    fields: [
      { key: "accessKeyId", label: "Access Key ID", placeholder: "AKIA...", type: "password" },
      { key: "secretAccessKey", label: "Secret Access Key", placeholder: "Your AWS secret key", type: "password" },
      { key: "region", label: "Region", placeholder: "us-east-1", type: "text" }
    ]
  },
  "azure-cognitive-services": {
    name: "Azure Cognitive Services",
    description: "Azure AI services and cognitive APIs",
    iconPath: "M22.379 23.343a1.62 1.62 0 01-1.158.657H2.78a1.621 1.621 0 01-1.155-2.765l5.34-5.34a1.62 1.62 0 011.155-.656H16.5l5.879 6.946a1.62 1.62 0 010 2.158zM.75 11.446L8.27 3.924a1.621 1.621 0 012.77 1.158l-.003 11.876-10.289.003a1.622 1.622 0 01-1.156-2.764l.657-.656.501-.095zm23.174 1.856l-5.949-7.03a1.621 1.621 0 00-2.458-.203l-4.345 4.345h8.637a1.621 1.621 0 011.621 1.621l.025.03h1.287a1.619 1.619 0 011.182 2.767l-.768.768h-5.349l-.103-.309 4.665-4.664 1.555 1.875z",
    fields: [
      { key: "apiKey", label: "API Key", placeholder: "Your Azure Cognitive Services key", type: "password" },
      { key: "endpoint", label: "Endpoint URL", placeholder: "https://your-resource.cognitiveservices.azure.com", type: "text" }
    ]
  }
};

// ── LocalStorage Helpers ─────────────────────────────────────────────

const STORAGE_PREFIX = "enfinyte_keys_";

export type ProviderKeys = Record<string, string>;

export function getProviderKeys(provider: SupportedProvider): ProviderKeys | null {
  try {
    const stored = localStorage.getItem(`${STORAGE_PREFIX}${provider}`);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

export function saveProviderKeys(provider: SupportedProvider, keys: ProviderKeys): void {
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${provider}`, JSON.stringify(keys));
  } catch (err) {
    console.error(`Failed to save keys for ${provider}:`, err);
  }
}

export function removeProviderKeys(provider: SupportedProvider): void {
  try {
    localStorage.removeItem(`${STORAGE_PREFIX}${provider}`);
  } catch (err) {
    console.error(`Failed to remove keys for ${provider}:`, err);
  }
}

export function isProviderConfigured(provider: SupportedProvider): boolean {
  const keys = getProviderKeys(provider);
  if (!keys) return false;
  
  const metadata = PROVIDER_METADATA[provider];
  // Check if all required fields have non-empty values
  return metadata.fields.every(field => {
    const value = keys[field.key];
    return typeof value === 'string' && value.trim().length > 0;
  });
}

export function getAllConfiguredProviders(): SupportedProvider[] {
  return SUPPORTED_PROVIDERS.filter(isProviderConfigured);
}
