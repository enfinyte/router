import { Effect } from "effect";
import type { CreateResponseBody, CreateResponseBodyInputItem } from "common";
import type {
  FilePart,
  ImagePart,
  ModelMessage,
  SystemModelMessage,
  TextPart,
  ToolResultPart,
} from "ai";
import { jsonSchema, Output } from "ai";
import type { ToolSet } from "ai";
import { AIServiceError } from ".";
import { isNotNullable } from "effect/Predicate";
import { detectMimeTypeFromBase64EncodedString, detectMimeTypeFromURL } from "../../utils";

export const convertCreateResponseBodyInputFieldToCallSettingsMessages = (
  createResponseBody: CreateResponseBody,
) =>
  Effect.gen(function* () {
    const { input, instructions } = createResponseBody;

    if (!input) {
      return yield* new AIServiceError({
        message: "Input field is required for message-based models.",
      });
    }

    const instructionsAsSystemMessage: SystemModelMessage[] = instructions
      ? [
          {
            role: "system",
            content: instructions,
          },
        ]
      : [];

    if (typeof input === "string") {
      return yield* Effect.succeed([
        ...instructionsAsSystemMessage,
        {
          role: "user",
          content: input,
        },
      ] satisfies ModelMessage[] as ModelMessage[]);
    }

    const inputItemsAsModelMessage = yield* Effect.all(input.map(convertInputItemToModelMessage));

    return yield* Effect.succeed(
      [...instructionsAsSystemMessage, ...inputItemsAsModelMessage.flat()].filter(
        isNotNullable,
      ) satisfies ModelMessage[] as ModelMessage[],
    );
  });

const convertInputItemToModelMessage = (
  createResponseBodyInputItem: CreateResponseBodyInputItem,
): Effect.Effect<ModelMessage[], AIServiceError, never> =>
  Effect.gen(function* () {
    switch (createResponseBodyInputItem.type) {
      case "message": {
        const role = createResponseBodyInputItem.role;
        const content = createResponseBodyInputItem.content;

        switch (role) {
          case "system":
          case "developer": {
            const providerOptions =
              role === "developer"
                ? {
                    providerOptions: {
                      openai: { systemMessageMode: "developer" },
                    },
                  }
                : {};

            if (typeof content === "string")
              return [
                {
                  role: "system",
                  content,
                  ...providerOptions,
                },
              ] satisfies ModelMessage[];
            else
              return content
                .filter((contentItem) => contentItem.type === "input_text")
                .map((contentItem) => ({
                  role: "system",
                  content: contentItem.text,
                  ...providerOptions,
                })) satisfies ModelMessage[];
          }
          case "user": {
            if (typeof content === "string") {
              return [
                {
                  role: "user",
                  content,
                },
              ] satisfies ModelMessage[];
            } else {
              const parts = yield* Effect.all(
                content.map((contentItem) =>
                  Effect.gen(function* () {
                    switch (contentItem.type) {
                      case "input_text":
                        return {
                          type: "text",
                          text: contentItem.text,
                        } satisfies TextPart;
                      case "input_image":
                        if (!contentItem.image_url) return;
                        return {
                          type: "image",
                          image: new URL(contentItem.image_url),
                          providerOptions: {
                            openai: {
                              imageDetail: contentItem.detail,
                            },
                          },
                        } satisfies ImagePart;
                      case "input_file": {
                        if (!contentItem.file_data && !contentItem.file_url) return;

                        const mediaType = contentItem.file_url
                          ? yield* detectMimeTypeFromURL(contentItem.file_url)
                          : contentItem.file_data
                            ? yield* detectMimeTypeFromBase64EncodedString(contentItem.file_data)
                            : "application/octet-stream";

                        return {
                          type: "file",
                          ...(contentItem.filename ? { filename: contentItem.filename } : {}),
                          data: contentItem.file_url
                            ? new URL(contentItem.file_url)
                            : contentItem.file_data
                              ? contentItem.file_data
                              : "<<<<<<unreachable>>>>>>",
                          mediaType,
                        } satisfies FilePart;
                      }
                    }
                  }),
                ),
              );
              return [
                {
                  role: "user",
                  content: parts.filter(isNotNullable),
                },
              ] satisfies ModelMessage[];
            }
          }
          case "assistant": {
            if (typeof content === "string") {
              return [
                {
                  role: "assistant",
                  content,
                },
              ] satisfies ModelMessage[];
            } else {
              const parts = yield* Effect.all(
                content.map((contentItem) =>
                  Effect.gen(function* () {
                    switch (contentItem.type) {
                      case "input_text":
                      case "output_text":
                        return {
                          type: "text",
                          text: contentItem.text,
                        } satisfies TextPart;
                      case "input_image":
                        if (!contentItem.image_url) return;
                        return {
                          type: "file",
                          data: new URL(contentItem.image_url),
                          mediaType: "image/png",
                          providerOptions: {
                            openai: {
                              imageDetail: contentItem.detail,
                            },
                          },
                        } satisfies FilePart;
                      case "input_file": {
                        if (!contentItem.file_data && !contentItem.file_url) return;

                        const mediaType = contentItem.file_url
                          ? yield* detectMimeTypeFromURL(contentItem.file_url)
                          : contentItem.file_data
                            ? yield* detectMimeTypeFromBase64EncodedString(contentItem.file_data)
                            : "application/octet-stream";

                        return {
                          type: "file",
                          ...(contentItem.filename ? { filename: contentItem.filename } : {}),
                          data: contentItem.file_url
                            ? new URL(contentItem.file_url)
                            : contentItem.file_data
                              ? contentItem.file_data
                              : "<<<<<<unreachable>>>>>>",
                          mediaType,
                        } satisfies FilePart;
                      }
                    }
                  }),
                ),
              );

              return [
                {
                  role: "assistant",
                  content: parts.filter(isNotNullable),
                },
              ] satisfies ModelMessage[];
            }
          }
        }
      }
      case "reasoning": {
        return [
          {
            role: "assistant",
            content: createResponseBodyInputItem.summary.map((summaryItem) => ({
              type: "reasoning",
              text: summaryItem.text,
            })),
            providerOptions: {
              openai: {
                itemId: createResponseBodyInputItem.id,
                reasoningEncryptedContent: createResponseBodyInputItem.encrypted_content,
              },
            },
          },
        ] satisfies ModelMessage[];
      }

      case "function_call": {
        const parsedArguments = yield* Effect.try({
          try: () => JSON.parse(createResponseBodyInputItem.arguments),
          catch: (error) =>
            new AIServiceError({
              message: `Failed to parse function_call arguments: ${error}`,
              cause: error,
            }),
        });

        return [
          {
            role: "assistant",
            content: [
              {
                type: "tool-call",
                toolCallId: createResponseBodyInputItem.call_id,
                toolName: createResponseBodyInputItem.name,
                input: parsedArguments,
                providerExecuted: createResponseBodyInputItem.status === "completed",
              },
            ],
            providerOptions: {
              openai: {
                itemId: createResponseBodyInputItem.id,
              },
            },
          },
        ] satisfies ModelMessage[];
      }

      case "function_call_output": {
        return [
          {
            role: "tool",
            content: [
              {
                type: "tool-result",
                toolCallId: createResponseBodyInputItem.call_id,
                toolName: crypto.randomUUID(),
                output: yield* (() =>
                  Effect.gen(function* () {
                    const output = createResponseBodyInputItem.output;

                    if (typeof output === "string") {
                      return {
                        type: "text",
                        value: output,
                      } satisfies ToolResultPart["output"];
                    }

                    return {
                      type: "content",
                      value: (yield* Effect.all(
                        output.map((outputItem) =>
                          Effect.gen(function* () {
                            switch (outputItem.type) {
                              case "input_text":
                                return {
                                  type: "text" as const,
                                  text: outputItem.text,
                                };
                              case "input_image": {
                                if (!outputItem.image_url) return;
                                return {
                                  type: "image-url" as const,
                                  url: outputItem.image_url,
                                };
                              }
                              case "input_file": {
                                if (outputItem.file_data)
                                  return {
                                    type: "file-data" as const,
                                    data: outputItem.file_data,
                                    mediaType: yield* detectMimeTypeFromBase64EncodedString(
                                      outputItem.file_data,
                                    ),
                                    filename: outputItem.filename ?? crypto.randomUUID(),
                                  };
                                else if (outputItem.file_url)
                                  return {
                                    type: "file-url" as const,
                                    url: outputItem.file_url,
                                  };
                                else {
                                  return;
                                }
                              }
                              case "input_video": {
                                return {
                                  type: "file-url" as const,
                                  url: outputItem.video_url,
                                };
                              }
                            }
                          }),
                        ),
                      )).filter(isNotNullable),
                    } satisfies ToolResultPart["output"];
                  }))(),
              },
            ],
          },
        ] satisfies ModelMessage[];
      }
      default: {
        return yield* Effect.fail(
          new AIServiceError({
            message: `Unsupported input item type: ${(createResponseBodyInputItem as { type: string }).type}`,
          }),
        );
      }
    }
  });

const EFFORT_TO_BUDGET_TOKENS: Record<string, number> = {
  low: 1024,
  medium: 4096,
  high: 10000,
  xhigh: 32000,
};

const EFFORT_TO_NOVA_REASONING_EFFORT: Record<string, string> = {
  low: "low",
  medium: "medium",
  high: "high",
  xhigh: "max",
};

export const convertCreateResponseBodyReasoningToProviderOptions = (
  reasoning: CreateResponseBody["reasoning"],
  bedrockModelId?: string,
  hasStructuredOutput?: boolean,
) => {
  if (!reasoning) return undefined;

  const effort = reasoning.effort;
  const summary = reasoning.summary;

  if (!effort && !summary) return undefined;

  const openaiOptions = {
    ...(effort && effort !== "none"
      ? { reasoningEffort: effort === "xhigh" ? "high" : effort }
      : {}),
    ...(summary ? { reasoningSummary: summary } : {}),
  };

  const anthropicThinkingConfig =
    !effort || effort === "none"
      ? ({ type: "disabled" } as const)
      : ({ type: "enabled", budgetTokens: EFFORT_TO_BUDGET_TOKENS[effort] ?? 4096 } as const);

  const bedrockReasoningConfig = (() => {
    if (!effort || effort === "none") return undefined;
    if (hasStructuredOutput) return undefined;

    const isAnthropicModel = bedrockModelId?.includes("anthropic") ?? false;
    const isAmazonModel =
      bedrockModelId?.includes("amazon") ?? false;

    if (isAnthropicModel) {
      return {
        type: "enabled" as const,
        budgetTokens: EFFORT_TO_BUDGET_TOKENS[effort] ?? 4096,
      };
    }
    if (isAmazonModel) {
      return {
        type: "enabled" as const,
        maxReasoningEffort: EFFORT_TO_NOVA_REASONING_EFFORT[effort] ?? "medium",
      };
    }
    return undefined;
  })();

  return {
    openai: openaiOptions,
    anthropic: { thinking: anthropicThinkingConfig },
    ...(bedrockReasoningConfig
      ? { bedrock: { reasoningConfig: bedrockReasoningConfig } }
      : {}),
  };
};

export const convertCreateResponseBodyToolsToCallSettingsTools = (
  tools: CreateResponseBody["tools"],
  toolChoice: CreateResponseBody["tool_choice"],
): ToolSet | undefined => {
  if (!tools?.length) return undefined;

  const filteredTools =
    toolChoice &&
    typeof toolChoice !== "string" &&
    toolChoice.type === "allowed_tools"
      ? tools.filter((t) =>
          toolChoice.tools.some((allowed) => allowed.name === t.name),
        )
      : tools;

  if (!filteredTools.length) return undefined;

  return Object.fromEntries(
    filteredTools.map((t) => [
      t.name,
      {
        ...(t.description != null ? { description: t.description } : {}),
        inputSchema: jsonSchema(
          (t.parameters as Parameters<typeof jsonSchema>[0]) ?? {
            type: "object" as const,
          },
        ),
        ...(t.strict != null ? { strict: t.strict } : {}),
      },
    ]),
  ) as ToolSet;
};

export const convertCreateResponseBodyToolChoiceToCallSettingsToolChoice = (
  toolChoice: CreateResponseBody["tool_choice"],
) => {
  if (!toolChoice) return undefined;
  if (typeof toolChoice === "string") return toolChoice;
  if (toolChoice.type === "function")
    return { type: "tool" as const, toolName: toolChoice.name };
  return toolChoice.mode ?? ("auto" as const);
};

export const convertCreateResponseBodyTextFormatToCallSettingsOutput = (
  text: CreateResponseBody["text"],
) => {
  const format = text?.format;
  if (!format || format.type === "text") return undefined;
  return Output.object({
    schema: jsonSchema(
      (format.schema as Parameters<typeof jsonSchema>[0]) ?? {
        type: "object" as const,
      },
    ),
    ...(format.name != null ? { name: format.name } : {}),
    ...(format.description != null ? { description: format.description } : {}),
  });
};
