import { Effect } from "effect";
import type { CreateResponseBody, CreateResponseBodyInputItem } from "../responses/schema";
import type {
  FilePart,
  ImagePart,
  ModelMessage,
  SystemModelMessage,
  TextPart,
  ToolResultPart,
} from "ai";
import { AIServiceError } from ".";
import { isNotNullable } from "effect/Predicate";
import { detectMimeTypeFromBase64EncodedString, detectMimeTypeFromURL } from "@/src/utils";

export const convertCreateResponseBodyInputFieldToCallSettingsMessages = (
  createResponseBody: CreateResponseBody,
) =>
  Effect.gen(function* () {
    const { input, instructions } = createResponseBody;

    if (!input) {
      return yield* Effect.fail(
        new AIServiceError({ message: "Input field is required for message-based models." }),
      );
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

    return yield* Effect.succeed([
      ...instructionsAsSystemMessage,
      ...inputItemsAsModelMessage.flat(),
    ]);
  });

const convertInputItemToModelMessage = (createResponseBodyInputItem: CreateResponseBodyInputItem) =>
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
        return [
          {
            role: "assistant",
            content: [
              {
                type: "tool-call",
                toolCallId: createResponseBodyInputItem.call_id,
                toolName: createResponseBodyInputItem.name,
                input: JSON.parse(createResponseBodyInputItem.arguments),
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
                toolName: "<<<NO_TOOL_NAME>>>",
                output: (() => {
                  const output = createResponseBodyInputItem.output;
                  if (typeof output === "string") {
                    return {
                      type: "text",
                      value: createResponseBodyInputItem.output,
                    };
                  }
                  return output.map((outputItem) => {
                    switch (outputItem.type) {
                      case "input_text":
                        return {
                          type: "text",
                          value: outputItem.text,
                        };
                      case "input_image": {
                        if (!outputItem.image_url) return;
                        return {
                          type: "file-url",
                          url: outputItem.image_url,
                        };
                      }
                      case "input_file": {
                        if (outputItem.file_data) {
                          return {
                            type: "file-data",
                            file,
                          };
                        }
                      }
                    }
                  });
                })() satisfies ToolResultPart["output"],
              },
            ],
          },
        ] satisfies ModelMessage[];
      }
    }
  });
