import { ProviderConfig } from "@/components/ProviderCard";
import { OpenAI, Aws } from "@lobehub/icons";

export const PROVIDERS: ProviderConfig[] = [
  {
    id: "openai",
    name: "OpenAI",
    description: "GPT-family, Sora, and more",
    icon: <OpenAI className="h-5 w-5" />,
    models: ["gpt-5.x", "gpt-5.x-mini", "gpt-image-1", "sora"],
    fields: [
      {
        key: "apiKey",
        label: "API Key",
        placeholder: "sk-...",
        type: "password",
      },
      {
        key: "orgId",
        label: "Organization ID (optional)",
        placeholder: "org-...",
        type: "text",
      },
      {
        key: "baseUrl",
        label: "Base URL (optional)",
        placeholder: "https://api.openai.com/v1",
        defaultValue: "https://api.openai.com/v1",
        type: "text",
      },
    ],
    docsUrl: "https://platform.openai.com/api-keys",
  },
  {
    id: "amazon-bedrock",
    name: "AWS Bedrock",
    description: "Access foundation models through AWS infrastructure",
    icon: <Aws className="h-5 w-5" />,
    models: ["claude", "titan", "llama", "mistral"],
    fields: [
      {
        key: "accessKeyId",
        label: "Access Key ID",
        placeholder: "AKIA...",
        type: "password",
      },
      {
        key: "secretAccessKey",
        label: "Secret Access Key",
        placeholder: "...",
        type: "password",
      },
      {
        key: "region",
        label: "Region",
        placeholder: "us-east-1",
        type: "text",
      },
    ],
    docsUrl: "https://docs.aws.amazon.com/bedrock/",
  },
];
