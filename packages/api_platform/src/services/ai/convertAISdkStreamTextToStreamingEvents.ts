import type { TextStreamPart } from "ai";
import type { FunctionCall, ItemField, Message, ReasoningBody, StreamingEvent } from "common";

export type AccumulatedState = {
  sequenceNumber: number;
  currentItemId: string | null;
  outputIndex: number;
  contentIndex: number;
  accumulatedText: string;
  outputItems: ItemField[];
  currentItemType: "text" | "reasoning" | "tool-input" | null;
  currentToolCallId: string | null;
  currentToolName: string | null;
};

type ToolInputPart = {
  toolCallId?: string;
  toolName?: string;
  delta?: string;
  text?: string;
  argsTextDelta?: string;
};

const getTextDelta = (part: ToolInputPart): string =>
  part.delta ?? part.text ?? part.argsTextDelta ?? "";

export const convertAISdkStreamTextToStreamingEvents = (
  fullStream: AsyncIterable<TextStreamPart<Record<string, never>>>,
  responseId: string,
  startingSequenceNumber = 0,
) => {
  void responseId;

  let sequenceNumber = startingSequenceNumber;
  let currentItemId: string | null = null;
  let outputIndex = -1;
  let contentIndex = 0;
  let accumulatedText = "";
  let currentItemType: AccumulatedState["currentItemType"] = null;
  let currentToolCallId: string | null = null;
  let currentToolName: string | null = null;
  const outputItems: ItemField[] = [];

  const nextSequenceNumber = () => {
    const current = sequenceNumber;
    sequenceNumber += 1;
    return current;
  };

  const startNewItem = (type: AccumulatedState["currentItemType"]) => {
    currentItemId = crypto.randomUUID();
    outputIndex += 1;
    contentIndex = 0;
    accumulatedText = "";
    currentItemType = type;
  };

  const finishItem = () => {
    currentItemId = null;
    currentItemType = null;
    currentToolCallId = null;
    currentToolName = null;
  };

  const getAccumulatedState = (): AccumulatedState => ({
    sequenceNumber,
    currentItemId,
    outputIndex,
    contentIndex,
    accumulatedText,
    outputItems,
    currentItemType,
    currentToolCallId,
    currentToolName,
  });

  const events = (async function* () {
    for await (const part of fullStream) {
      switch (part.type) {
        case "text-start": {
          startNewItem("text");

          if (!currentItemId) break;

          const addedEvent: StreamingEvent = {
            type: "response.output_item.added",
            sequence_number: nextSequenceNumber(),
            output_index: outputIndex,
            item: {
              id: currentItemId,
              status: "in_progress",
              role: "assistant",
              content: [],
            },
          };

          const contentAddedEvent: StreamingEvent = {
            type: "response.content_part.added",
            sequence_number: nextSequenceNumber(),
            item_id: currentItemId,
            output_index: outputIndex,
            content_index: contentIndex,
            part: {
              type: "output_text",
              text: "",
              annotations: [],
              logprobs: [],
            },
          };

          contentIndex += 1;
          yield [addedEvent, contentAddedEvent];
          break;
        }
        case "text-delta": {
          if (!currentItemId || currentItemType !== "text") break;
          const delta = (part as ToolInputPart).text ?? "";
          accumulatedText += delta;
          const deltaEvent: StreamingEvent = {
            type: "response.output_text.delta",
            sequence_number: nextSequenceNumber(),
            item_id: currentItemId,
            output_index: outputIndex,
            content_index: Math.max(contentIndex - 1, 0),
            delta,
            logprobs: [],
          };
          yield [deltaEvent];
          break;
        }
        case "text-end": {
          if (!currentItemId || currentItemType !== "text") break;

          const textDoneEvent: StreamingEvent = {
            type: "response.output_text.done",
            sequence_number: nextSequenceNumber(),
            item_id: currentItemId,
            output_index: outputIndex,
            content_index: Math.max(contentIndex - 1, 0),
            text: accumulatedText,
            logprobs: [],
          };

          const contentDoneEvent: StreamingEvent = {
            type: "response.content_part.done",
            sequence_number: nextSequenceNumber(),
            item_id: currentItemId,
            output_index: outputIndex,
            content_index: Math.max(contentIndex - 1, 0),
            part: {
              type: "output_text",
              text: accumulatedText,
              annotations: [],
              logprobs: [],
            },
          };

          const completedMessageItem = {
            id: currentItemId,
            status: "completed" as const,
            role: "assistant" as const,
            content: [
              {
                type: "output_text" as const,
                text: accumulatedText,
                annotations: [] as never[],
                logprobs: [] as never[],
              },
            ],
          };

          const outputDoneEvent: StreamingEvent = {
            type: "response.output_item.done",
            sequence_number: nextSequenceNumber(),
            output_index: outputIndex,
            item: completedMessageItem,
          };

          outputItems.push({
            type: "message",
            ...completedMessageItem,
          } satisfies Message);

          yield [textDoneEvent, contentDoneEvent, outputDoneEvent];
          finishItem();
          break;
        }
        case "reasoning-start": {
          startNewItem("reasoning");

          if (!currentItemId) break;

          const addedEvent: StreamingEvent = {
            type: "response.output_item.added",
            sequence_number: nextSequenceNumber(),
            output_index: outputIndex,
            item: {
              id: currentItemId,
              summary: [],
            },
          };

          const contentAddedEvent: StreamingEvent = {
            type: "response.content_part.added",
            sequence_number: nextSequenceNumber(),
            item_id: currentItemId,
            output_index: outputIndex,
            content_index: contentIndex,
            part: {
              type: "reasoning",
              text: "",
            },
          };

          contentIndex += 1;
          yield [addedEvent, contentAddedEvent];
          break;
        }
        case "reasoning-delta": {
          if (!currentItemId || currentItemType !== "reasoning") break;
          const delta = (part as ToolInputPart).text ?? "";
          accumulatedText += delta;
          const deltaEvent: StreamingEvent = {
            type: "response.reasoning.delta",
            sequence_number: nextSequenceNumber(),
            item_id: currentItemId,
            output_index: outputIndex,
            content_index: Math.max(contentIndex - 1, 0),
            delta,
          };
          yield [deltaEvent];
          break;
        }
        case "reasoning-end": {
          if (!currentItemId || currentItemType !== "reasoning") break;

          const reasoningDoneEvent: StreamingEvent = {
            type: "response.reasoning.done",
            sequence_number: nextSequenceNumber(),
            item_id: currentItemId,
            output_index: outputIndex,
            content_index: Math.max(contentIndex - 1, 0),
            text: accumulatedText,
          };

          const contentDoneEvent: StreamingEvent = {
            type: "response.content_part.done",
            sequence_number: nextSequenceNumber(),
            item_id: currentItemId,
            output_index: outputIndex,
            content_index: Math.max(contentIndex - 1, 0),
            part: {
              type: "reasoning",
              text: accumulatedText,
            },
          };

          const completedReasoningItem = {
            id: currentItemId,
            summary: [] as never[],
            content: [{ type: "reasoning" as const, text: accumulatedText }],
          };

          const outputDoneEvent: StreamingEvent = {
            type: "response.output_item.done",
            sequence_number: nextSequenceNumber(),
            output_index: outputIndex,
            item: completedReasoningItem,
          };

          outputItems.push({
            type: "reasoning",
            ...completedReasoningItem,
          } satisfies ReasoningBody);

          yield [reasoningDoneEvent, contentDoneEvent, outputDoneEvent];
          finishItem();
          break;
        }
        case "tool-input-start": {
          startNewItem("tool-input");
          const { toolCallId, toolName } = part as ToolInputPart;
          currentToolCallId = toolCallId ?? null;
          currentToolName = toolName ?? null;

          if (!currentItemId) break;

          const addedEvent: StreamingEvent = {
            type: "response.output_item.added",
            sequence_number: nextSequenceNumber(),
            output_index: outputIndex,
            item: {
              id: currentItemId,
              call_id: currentToolCallId ?? "",
              name: currentToolName ?? "",
              arguments: "",
              status: "in_progress" as const,
            },
          };

          const contentAddedEvent: StreamingEvent = {
            type: "response.content_part.added",
            sequence_number: nextSequenceNumber(),
            item_id: currentItemId,
            output_index: outputIndex,
            content_index: contentIndex,
            part: {
              type: "input_text",
              text: "",
            },
          };

          contentIndex += 1;
          yield [addedEvent, contentAddedEvent];
          break;
        }
        case "tool-input-delta": {
          if (!currentItemId || currentItemType !== "tool-input") break;
          const delta = getTextDelta(part as ToolInputPart);
          accumulatedText += delta;
          const deltaEvent: StreamingEvent = {
            type: "response.function_call_arguments.delta",
            sequence_number: nextSequenceNumber(),
            item_id: currentItemId,
            output_index: outputIndex,
            delta,
          };
          yield [deltaEvent];
          break;
        }
        case "tool-input-end": {
          if (!currentItemId || currentItemType !== "tool-input") break;

          const argumentsDoneEvent: StreamingEvent = {
            type: "response.function_call_arguments.done",
            sequence_number: nextSequenceNumber(),
            item_id: currentItemId,
            output_index: outputIndex,
            arguments: accumulatedText,
          };

          const contentDoneEvent: StreamingEvent = {
            type: "response.content_part.done",
            sequence_number: nextSequenceNumber(),
            item_id: currentItemId,
            output_index: outputIndex,
            content_index: Math.max(contentIndex - 1, 0),
            part: {
              type: "input_text",
              text: accumulatedText,
            },
          };

          const completedFunctionCallItem = {
            id: currentItemId,
            status: "completed" as const,
            call_id: currentToolCallId ?? "",
            name: currentToolName ?? "",
            arguments: accumulatedText,
          };

          const outputDoneEvent: StreamingEvent = {
            type: "response.output_item.done",
            sequence_number: nextSequenceNumber(),
            output_index: outputIndex,
            item: completedFunctionCallItem,
          };

          outputItems.push({
            type: "function_call",
            ...completedFunctionCallItem,
          } satisfies FunctionCall);

          yield [argumentsDoneEvent, contentDoneEvent, outputDoneEvent];
          finishItem();
          break;
        }
        case "error": {
          const errorValue = (part as { error?: unknown }).error;
          const errorObject =
            typeof errorValue === "object" && errorValue !== null
              ? (errorValue as Record<string, unknown>)
              : undefined;
          const errorEvent: StreamingEvent = {
            type: "error",
            sequence_number: nextSequenceNumber(),
            error: {
              type: (typeof errorObject?.type === "string"
                ? errorObject?.type
                : typeof errorObject?.name === "string"
                  ? errorObject?.name
                  : "error") as string,
              code: typeof errorObject?.code === "string" ? errorObject?.code : null,
              message:
                typeof errorObject?.message === "string"
                  ? errorObject?.message
                  : typeof errorValue === "string"
                    ? errorValue
                    : "Unknown error",
              param: typeof errorObject?.param === "string" ? errorObject?.param : null,
              ...(typeof errorObject?.headers === "object" && errorObject?.headers !== null
                ? { headers: errorObject?.headers as Record<string, string> }
                : {}),
            },
          };
          yield [errorEvent];
          break;
        }
        case "finish": {
          break;
        }
        default: {
          break;
        }
      }
    }
  })();

  return { events, getAccumulatedState };
};
