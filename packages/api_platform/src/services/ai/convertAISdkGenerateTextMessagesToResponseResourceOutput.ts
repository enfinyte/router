import type { generateText } from "ai";
import { Effect } from "effect";
import type { FunctionCall, FunctionCallOutput, ItemField, Message } from "common";
import { isValidUrl } from "../../utils";

export const convertAISdkGenerateTextMessagesToResponseResourceOutput = (
  result: Awaited<ReturnType<typeof generateText>>,
) => {
  type FunctionCallOutputContentPart = Exclude<FunctionCallOutput["output"], string>[number];
  type ToolResultContentPart =
    | { type: "text"; text: string }
    | { type: "media"; mediaType: string; data: string }
    | { type: "file-url"; url: string }
    | { type: "file-data"; mediaType: string; data: string }
    | { type: "image-data"; data: string }
    | { type: "image-url"; url: string }
    | { type: "file-id"; fileId: string }
    | { type: "image-file-id"; fileId: string }
    | { type: "custom"; providerOptions: unknown };

  type ToolResultOutput =
    | { type: "text"; value: string }
    | { type: "execution-denied"; reason?: string }
    | { type: "error-json"; value: unknown }
    | { type: "json"; value: unknown }
    | { type: "error-text"; value: string }
    | { type: "content"; value: ToolResultContentPart[] };

  const convertToolResultContentPart = (
    outputValue: ToolResultContentPart,
    index: number,
  ): FunctionCallOutputContentPart => {
    switch (outputValue.type) {
      case "text":
        return {
          type: "input_text",
          text: outputValue.text,
        } satisfies FunctionCallOutputContentPart;
      case "media": {
        if (outputValue.mediaType.startsWith("image/")) {
          return {
            type: "input_image",
            image_url: isValidUrl(outputValue.data)
              ? outputValue.data
              : `data:image/png;base64,${outputValue.data}`,
            detail: "auto",
          } satisfies FunctionCallOutputContentPart;
        }
        return {
          type: "input_file",
          filename: `file-${index}`,
          file_url: isValidUrl(outputValue.data)
            ? outputValue.data
            : `data:${outputValue.mediaType};base64,${outputValue.data}`,
        } satisfies FunctionCallOutputContentPart;
      }
      case "file-url":
        return {
          type: "input_file",
          filename: `file-${index}`,
          file_url: outputValue.url,
        } satisfies FunctionCallOutputContentPart;
      case "file-data":
        return {
          type: "input_file",
          filename: `file-${index}`,
          file_url: `data:${outputValue.mediaType};base64,${outputValue.data}`,
        } satisfies FunctionCallOutputContentPart;
      case "image-data":
        return {
          type: "input_image",
          image_url: `data:image/png;base64,${outputValue.data}`,
          detail: "auto",
        } satisfies FunctionCallOutputContentPart;
      case "image-url":
        return {
          type: "input_image",
          image_url: outputValue.url,
          detail: "auto",
        } satisfies FunctionCallOutputContentPart;
      case "file-id":
      case "image-file-id":
        return {
          type: "input_text",
          text: JSON.stringify(outputValue.fileId),
        } satisfies FunctionCallOutputContentPart;
      case "custom":
        return {
          type: "input_text",
          text: JSON.stringify(outputValue.providerOptions),
        } satisfies FunctionCallOutputContentPart;
    }
  };

  const convertToolResultOutput = (output: ToolResultOutput): FunctionCallOutput["output"] => {
    switch (output.type) {
      case "text":
        return output.value;
      case "execution-denied":
        return `Tool execution denied "${output.reason || "NO REASON PROVIDED"}"`;
      case "error-json":
      case "json":
        return JSON.stringify(output.value);
      case "error-text":
        return `Tool execution resulted in error: "${output.value}"`;
      case "content": {
        return output.value.map((outputValue, index) =>
          convertToolResultContentPart(outputValue, index),
        ) satisfies FunctionCallOutput["output"];
      }
    }
  };

  const getItemIdFromProviderOptions = (providerOptions: unknown, fallbackId: string) => {
    if (!providerOptions || typeof providerOptions !== "object") {
      return fallbackId;
    }

    const itemEntry = Object.entries(providerOptions).find(
      ([_, metadata]) => typeof metadata === "object" && metadata !== null && "itemId" in metadata,
    )?.[1] as { itemId?: string } | undefined;

    return itemEntry?.itemId ?? fallbackId;
  };

  const toolAsOutput: FunctionCall[] = result.toolCalls.map((toolCall) => ({
    type: "function_call",
    id: getItemIdFromProviderOptions(toolCall.providerMetadata, toolCall.toolCallId),
    status: toolCall.providerExecuted ? "completed" : "incomplete",
    arguments: toolCall.input as string,
    call_id: toolCall.toolCallId,
    name: toolCall.toolName,
  }));

  const messagesAsOutput: ItemField[] = result.response.messages.flatMap((message, indx) => {
    const messageRole = message.role as Message["role"] | "tool";

    switch (messageRole) {
      case "tool": {
        type ToolMessageContentItem =
          | {
              type: "tool-result";
              toolCallId: string;
              output: ToolResultOutput;
              providerOptions?: unknown;
            }
          | { type: "tool-approval-response"; approvalId: string };

        const content = Array.isArray(message.content)
          ? (message.content as ToolMessageContentItem[])
          : [];

        return content.flatMap((c) => {
          switch (c.type) {
            case "tool-result": {
              return [
                {
                  type: "function_call_output",
                  id: getItemIdFromProviderOptions(c.providerOptions, c.toolCallId),
                  status: "completed",
                  output: convertToolResultOutput(c.output as ToolResultOutput),
                  call_id: c.toolCallId,
                } satisfies FunctionCallOutput,
              ];
            }
            case "tool-approval-response": {
              return [{ type: "function_call", call_id: c.approvalId } as ItemField];
            }
            default:
              return [];
          }
        });
      }
      case "user":
      case "system":
      case "developer":
        return [];
      case "assistant": {
        const content = message.content;
        if (typeof content === "string") {
          return {
            type: "message",
            id: `message-${indx}`,
            status: "completed",
            role: "assistant",
            content: [
              {
                type: "output_text",
                text: content,
                annotations: [],
                logprobs: [],
              },
            ],
          } satisfies Message;
        }
        return content.flatMap((contentItem): ItemField[] => {
          switch (contentItem.type) {
            case "text": {
              return [
                {
                  type: "message",
                  id: getItemIdFromProviderOptions(contentItem.providerOptions, `message-${indx}`),
                  status: "completed",
                  role: "assistant",
                  content: [
                    {
                      type: "output_text",
                      text: contentItem.text,
                      annotations: [],
                      logprobs: [],
                    },
                  ],
                } satisfies Message,
              ];
            }
            case "reasoning": {
              return [
                {
                  type: "message",
                  id: getItemIdFromProviderOptions(contentItem.providerOptions, `message-${indx}`),
                  status: "completed",
                  role: "assistant",
                  content: [
                    {
                      type: "reasoning",
                      text: contentItem.text,
                    },
                  ],
                } satisfies Message,
              ];
            }
            case "file": {
              if (contentItem.mediaType.startsWith("image/")) {
                return [
                  {
                    type: "message",
                    id: getItemIdFromProviderOptions(
                      contentItem.providerOptions,
                      `message-${indx}`,
                    ),
                    status: "completed",
                    role: "assistant",
                    content: [
                      {
                        type: "input_image",
                        image_url:
                          contentItem.data instanceof URL
                            ? String(contentItem.data)
                            : `data:${contentItem.mediaType};base64,${contentItem.data}`,
                        detail: "auto",
                      },
                    ],
                  } satisfies Message,
                ];
              }

              if (contentItem.mediaType.startsWith("video/")) {
                return [
                  {
                    type: "message",
                    id: getItemIdFromProviderOptions(
                      contentItem.providerOptions,
                      `message-${indx}`,
                    ),
                    status: "completed",
                    role: "assistant",
                    content: [
                      {
                        type: "input_video",
                        video_url:
                          contentItem.data instanceof URL
                            ? String(contentItem.data)
                            : `data:${contentItem.mediaType};base64,${contentItem.data}`,
                      },
                    ],
                  } satisfies Message,
                ];
              }

              return [
                {
                  type: "message",
                  id: `message-${indx}`,
                  status: "completed",
                  role: "assistant",
                  content: [
                    {
                      type: "input_file",
                      file_url:
                        contentItem.data instanceof URL
                          ? String(contentItem.data)
                          : `data:${contentItem.mediaType};base64,${contentItem.data}`,
                    },
                  ],
                } satisfies Message,
              ];
            }
            case "tool-call": {
              return [
                {
                  type: "function_call",
                  id: getItemIdFromProviderOptions(
                    contentItem.providerOptions,
                    contentItem.toolCallId,
                  ),
                  status: "completed",
                  call_id: contentItem.toolCallId,
                  name: contentItem.toolName,
                  arguments: contentItem.input as string,
                } satisfies FunctionCall,
              ];
            }
            case "tool-approval-request": {
              return [
                {
                  type: "function_call",
                  id: contentItem.approvalId,
                  status: "in_progress",
                  call_id: contentItem.toolCallId,
                  name: `tool-approval-${contentItem.toolCallId}`,
                  arguments: "",
                } satisfies FunctionCall,
              ];
            }
            case "tool-result": {
              return [
                {
                  type: "function_call_output",
                  id: contentItem.toolCallId,
                  status: "completed",
                  output: convertToolResultOutput(contentItem.output as ToolResultOutput),
                  call_id: "",
                } satisfies FunctionCallOutput,
              ];
            }
            default:
              return [];
          }
        });
      }
    }
  });

  return Effect.succeed([...toolAsOutput, ...messagesAsOutput]);
};
