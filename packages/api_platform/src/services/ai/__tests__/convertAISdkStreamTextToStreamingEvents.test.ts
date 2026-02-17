import { describe, it, expect } from "bun:test";
import { convertAISdkStreamTextToStreamingEvents } from "../convertAISdkStreamTextToStreamingEvents";
import type { StreamingEvent } from "common";

type MockPart = { type: string; [key: string]: unknown };

async function* mockTextStreamParts(parts: MockPart[]): AsyncIterable<MockPart> {
  for (const part of parts) {
    yield part;
  }
}

async function collectEvents(
  stream: AsyncIterable<StreamingEvent[]>,
): Promise<StreamingEvent[]> {
  const collected: StreamingEvent[] = [];
  for await (const batch of stream) {
    collected.push(...batch);
  }
  return collected;
}

describe("convertAISdkStreamTextToStreamingEvents", () => {
  describe("text message lifecycle", () => {
    it("produces correct events for text-start → text-delta → text-end", async () => {
      const stream = mockTextStreamParts([
        { type: "text-start" },
        { type: "text-delta", text: "Hello" },
        { type: "text-delta", text: " world" },
        { type: "text-end" },
        { type: "finish", finishReason: "stop" },
      ]);

      const { events } = convertAISdkStreamTextToStreamingEvents(
        stream as never,
        "resp-test-1",
      );
      const collected = await collectEvents(events);

      expect(collected).toHaveLength(7);
      expect(collected[0]?.type).toBe("response.output_item.added");
      expect(collected[1]?.type).toBe("response.content_part.added");
      expect(collected[2]?.type).toBe("response.output_text.delta");
      expect(collected[3]?.type).toBe("response.output_text.delta");
      expect(collected[4]?.type).toBe("response.output_text.done");
      expect(collected[5]?.type).toBe("response.content_part.done");
      expect(collected[6]?.type).toBe("response.output_item.done");
    });

    it("accumulates text deltas and includes full text in done events", async () => {
      const stream = mockTextStreamParts([
        { type: "text-start" },
        { type: "text-delta", text: "foo" },
        { type: "text-delta", text: "bar" },
        { type: "text-end" },
      ]);

      const { events } = convertAISdkStreamTextToStreamingEvents(
        stream as never,
        "resp-test-2",
      );
      const collected = await collectEvents(events);

      const textDone = collected.find((e) => e.type === "response.output_text.done");
      expect(textDone).toBeDefined();
      expect((textDone as { text: string }).text).toBe("foobar");

      const contentDone = collected.find((e) => e.type === "response.content_part.done");
      expect(contentDone).toBeDefined();
      expect((contentDone as { part: { text: string } }).part.text).toBe("foobar");
    });

    it("sets output_index = 0 and content_index = 0 for first text item", async () => {
      const stream = mockTextStreamParts([
        { type: "text-start" },
        { type: "text-delta", text: "x" },
        { type: "text-end" },
      ]);

      const { events } = convertAISdkStreamTextToStreamingEvents(
        stream as never,
        "resp-idx",
      );
      const collected = await collectEvents(events);

      const added = collected[0] as StreamingEvent & { output_index: number };
      expect(added.output_index).toBe(0);

      const delta = collected[2] as StreamingEvent & {
        output_index: number;
        content_index: number;
      };
      expect(delta.output_index).toBe(0);
      expect(delta.content_index).toBe(0);
    });

    it("assigns consistent item_id to all events within an item", async () => {
      const stream = mockTextStreamParts([
        { type: "text-start" },
        { type: "text-delta", text: "hi" },
        { type: "text-end" },
      ]);

      const { events } = convertAISdkStreamTextToStreamingEvents(
        stream as never,
        "resp-id",
      );
      const collected = await collectEvents(events);

      const addedEvent = collected[0] as StreamingEvent & { item: { id: string } };
      const itemId = addedEvent.item.id;
      expect(itemId).toBeTruthy();

      for (const event of collected) {
        if ("item_id" in event) {
          expect((event as { item_id: string }).item_id).toBe(itemId);
        }
        if ("item" in event) {
          expect((event as { item: { id: string } }).item.id).toBe(itemId);
        }
      }
    });
  });

  describe("function call lifecycle", () => {
    it("produces correct events for tool-input-start → tool-input-delta → tool-input-end", async () => {
      const stream = mockTextStreamParts([
        { type: "tool-input-start", toolCallId: "call_abc", toolName: "get_weather" },
        { type: "tool-input-delta", argsTextDelta: '{"loc' },
        { type: "tool-input-delta", argsTextDelta: 'ation":"NYC"}' },
        { type: "tool-input-end" },
      ]);

      const { events } = convertAISdkStreamTextToStreamingEvents(
        stream as never,
        "resp-tool-1",
      );
      const collected = await collectEvents(events);

      expect(collected).toHaveLength(7);
      expect(collected[0]?.type).toBe("response.output_item.added");
      expect(collected[1]?.type).toBe("response.content_part.added");
      expect(collected[2]?.type).toBe("response.function_call_arguments.delta");
      expect(collected[3]?.type).toBe("response.function_call_arguments.delta");
      expect(collected[4]?.type).toBe("response.function_call_arguments.done");
      expect(collected[5]?.type).toBe("response.content_part.done");
      expect(collected[6]?.type).toBe("response.output_item.done");
    });

    it("accumulates arguments and includes full args in done event", async () => {
      const stream = mockTextStreamParts([
        { type: "tool-input-start", toolCallId: "call_1", toolName: "fn" },
        { type: "tool-input-delta", argsTextDelta: '{"a":' },
        { type: "tool-input-delta", argsTextDelta: "1}" },
        { type: "tool-input-end" },
      ]);

      const { events } = convertAISdkStreamTextToStreamingEvents(
        stream as never,
        "resp-tool-acc",
      );
      const collected = await collectEvents(events);

      const argsDone = collected.find(
        (e) => e.type === "response.function_call_arguments.done",
      );
      expect(argsDone).toBeDefined();
      expect((argsDone as { arguments: string }).arguments).toBe('{"a":1}');
    });

    it("stores function call in accumulated output items", async () => {
      const stream = mockTextStreamParts([
        { type: "tool-input-start", toolCallId: "call_xyz", toolName: "search" },
        { type: "tool-input-delta", argsTextDelta: "{}" },
        { type: "tool-input-end" },
      ]);

      const { events, getAccumulatedState } = convertAISdkStreamTextToStreamingEvents(
        stream as never,
        "resp-tool-state",
      );
      await collectEvents(events);

      const state = getAccumulatedState();
      expect(state.outputItems).toHaveLength(1);
      expect(state.outputItems[0]?.type).toBe("function_call");

      const fc = state.outputItems[0] as {
        type: string;
        call_id: string;
        name: string;
        arguments: string;
      };
      expect(fc.call_id).toBe("call_xyz");
      expect(fc.name).toBe("search");
      expect(fc.arguments).toBe("{}");
    });
  });

  describe("reasoning lifecycle", () => {
    it("produces correct events for reasoning-start → reasoning-delta → reasoning-end", async () => {
      const stream = mockTextStreamParts([
        { type: "reasoning-start" },
        { type: "reasoning-delta", text: "Let me " },
        { type: "reasoning-delta", text: "think..." },
        { type: "reasoning-end" },
      ]);

      const { events } = convertAISdkStreamTextToStreamingEvents(
        stream as never,
        "resp-reason-1",
      );
      const collected = await collectEvents(events);

      expect(collected).toHaveLength(7);
      expect(collected[0]?.type).toBe("response.output_item.added");
      expect(collected[1]?.type).toBe("response.content_part.added");
      expect(collected[2]?.type).toBe("response.reasoning.delta");
      expect(collected[3]?.type).toBe("response.reasoning.delta");
      expect(collected[4]?.type).toBe("response.reasoning.done");
      expect(collected[5]?.type).toBe("response.content_part.done");
      expect(collected[6]?.type).toBe("response.output_item.done");
    });

    it("accumulates reasoning text in done event", async () => {
      const stream = mockTextStreamParts([
        { type: "reasoning-start" },
        { type: "reasoning-delta", text: "Step 1. " },
        { type: "reasoning-delta", text: "Step 2." },
        { type: "reasoning-end" },
      ]);

      const { events } = convertAISdkStreamTextToStreamingEvents(
        stream as never,
        "resp-reason-acc",
      );
      const collected = await collectEvents(events);

      const reasoningDone = collected.find((e) => e.type === "response.reasoning.done");
      expect(reasoningDone).toBeDefined();
      expect((reasoningDone as { text: string }).text).toBe("Step 1. Step 2.");
    });

    it("stores reasoning in accumulated output items", async () => {
      const stream = mockTextStreamParts([
        { type: "reasoning-start" },
        { type: "reasoning-delta", text: "hmm" },
        { type: "reasoning-end" },
      ]);

      const { events, getAccumulatedState } = convertAISdkStreamTextToStreamingEvents(
        stream as never,
        "resp-reason-state",
      );
      await collectEvents(events);

      const state = getAccumulatedState();
      expect(state.outputItems).toHaveLength(1);
      expect(state.outputItems[0]?.type).toBe("reasoning");
    });
  });

  describe("multiple output items", () => {
    it("increments output_index for each new item", async () => {
      const stream = mockTextStreamParts([
        { type: "reasoning-start" },
        { type: "reasoning-delta", text: "think" },
        { type: "reasoning-end" },
        { type: "text-start" },
        { type: "text-delta", text: "Answer" },
        { type: "text-end" },
        { type: "tool-input-start", toolCallId: "call_1", toolName: "fn" },
        { type: "tool-input-delta", argsTextDelta: "{}" },
        { type: "tool-input-end" },
      ]);

      const { events } = convertAISdkStreamTextToStreamingEvents(
        stream as never,
        "resp-multi",
      );
      const collected = await collectEvents(events);

      const addedEvents = collected.filter(
        (e) => e.type === "response.output_item.added",
      ) as Array<StreamingEvent & { output_index: number }>;

      expect(addedEvents).toHaveLength(3);
      expect(addedEvents[0]?.output_index).toBe(0);
      expect(addedEvents[1]?.output_index).toBe(1);
      expect(addedEvents[2]?.output_index).toBe(2);
    });

    it("accumulates all output items in state", async () => {
      const stream = mockTextStreamParts([
        { type: "text-start" },
        { type: "text-delta", text: "Hello" },
        { type: "text-end" },
        { type: "tool-input-start", toolCallId: "call_2", toolName: "lookup" },
        { type: "tool-input-delta", argsTextDelta: '{"q":"x"}' },
        { type: "tool-input-end" },
      ]);

      const { events, getAccumulatedState } = convertAISdkStreamTextToStreamingEvents(
        stream as never,
        "resp-multi-state",
      );
      await collectEvents(events);

      const state = getAccumulatedState();
      expect(state.outputItems).toHaveLength(2);
      expect(state.outputItems[0]?.type).toBe("message");
      expect(state.outputItems[1]?.type).toBe("function_call");
    });
  });

  describe("sequence numbers", () => {
    it("assigns monotonically increasing sequence numbers starting at 0", async () => {
      const stream = mockTextStreamParts([
        { type: "text-start" },
        { type: "text-delta", text: "A" },
        { type: "text-delta", text: "B" },
        { type: "text-end" },
      ]);

      const { events } = convertAISdkStreamTextToStreamingEvents(
        stream as never,
        "resp-seq",
      );
      const collected = await collectEvents(events);

      const seqNumbers = collected.map((e) => e.sequence_number);
      expect(seqNumbers[0]).toBe(0);

      for (let i = 1; i < seqNumbers.length; i++) {
        const prev = seqNumbers[i - 1];
        const curr = seqNumbers[i];
        expect(curr).toBe((prev ?? 0) + 1);
      }
    });

    it("continues sequence numbers across multiple items", async () => {
      const stream = mockTextStreamParts([
        { type: "text-start" },
        { type: "text-delta", text: "hi" },
        { type: "text-end" },
        { type: "reasoning-start" },
        { type: "reasoning-delta", text: "hmm" },
        { type: "reasoning-end" },
      ]);

      const { events } = convertAISdkStreamTextToStreamingEvents(
        stream as never,
        "resp-seq-multi",
      );
      const collected = await collectEvents(events);

      const seqNumbers = collected.map((e) => e.sequence_number);
      for (let i = 1; i < seqNumbers.length; i++) {
        const prev = seqNumbers[i - 1];
        const curr = seqNumbers[i];
        expect(curr).toBe((prev ?? 0) + 1);
      }
    });
  });

  describe("error handling", () => {
    it("produces error event from error part with object error", async () => {
      const stream = mockTextStreamParts([
        {
          type: "error",
          error: {
            type: "api_error",
            code: "rate_limit_exceeded",
            message: "Too many requests",
            param: null,
          },
        },
      ]);

      const { events } = convertAISdkStreamTextToStreamingEvents(
        stream as never,
        "resp-err",
      );
      const collected = await collectEvents(events);

      expect(collected).toHaveLength(1);
      const errorEvent = collected[0] as StreamingEvent & {
        error: { type: string; code: string | null; message: string; param: string | null };
      };
      expect(errorEvent.type).toBe("error");
      expect(errorEvent.error.type).toBe("api_error");
      expect(errorEvent.error.code).toBe("rate_limit_exceeded");
      expect(errorEvent.error.message).toBe("Too many requests");
      expect(errorEvent.error.param).toBeNull();
    });

    it("handles string error value", async () => {
      const stream = mockTextStreamParts([
        { type: "error", error: "Something went wrong" },
      ]);

      const { events } = convertAISdkStreamTextToStreamingEvents(
        stream as never,
        "resp-err-str",
      );
      const collected = await collectEvents(events);

      expect(collected).toHaveLength(1);
      const errorEvent = collected[0] as StreamingEvent & {
        error: { type: string; message: string };
      };
      expect(errorEvent.type).toBe("error");
      expect(errorEvent.error.type).toBe("error");
      expect(errorEvent.error.message).toBe("Something went wrong");
    });

    it("handles error with name field as type fallback", async () => {
      const stream = mockTextStreamParts([
        {
          type: "error",
          error: { name: "TimeoutError", message: "Request timed out" },
        },
      ]);

      const { events } = convertAISdkStreamTextToStreamingEvents(
        stream as never,
        "resp-err-name",
      );
      const collected = await collectEvents(events);

      const errorEvent = collected[0] as StreamingEvent & {
        error: { type: string; message: string };
      };
      expect(errorEvent.error.type).toBe("TimeoutError");
      expect(errorEvent.error.message).toBe("Request timed out");
    });

    it("handles null error value with defaults", async () => {
      const stream = mockTextStreamParts([
        { type: "error", error: null },
      ]);

      const { events } = convertAISdkStreamTextToStreamingEvents(
        stream as never,
        "resp-err-null",
      );
      const collected = await collectEvents(events);

      expect(collected).toHaveLength(1);
      const errorEvent = collected[0] as StreamingEvent & {
        error: { type: string; message: string };
      };
      expect(errorEvent.error.type).toBe("error");
      expect(errorEvent.error.message).toBe("Unknown error");
    });
  });

  describe("getAccumulatedState", () => {
    it("returns correct state after full text lifecycle", async () => {
      const stream = mockTextStreamParts([
        { type: "text-start" },
        { type: "text-delta", text: "hello" },
        { type: "text-end" },
      ]);

      const { events, getAccumulatedState } = convertAISdkStreamTextToStreamingEvents(
        stream as never,
        "resp-state",
      );
      await collectEvents(events);

      const state = getAccumulatedState();
      expect(state.outputItems).toHaveLength(1);
      expect(state.currentItemId).toBeNull();
      expect(state.currentItemType).toBeNull();
      expect(state.outputIndex).toBe(0);
      expect(state.sequenceNumber).toBe(6);
    });

    it("returns empty state for empty stream", async () => {
      const stream = mockTextStreamParts([]);

      const { events, getAccumulatedState } = convertAISdkStreamTextToStreamingEvents(
        stream as never,
        "resp-empty",
      );
      await collectEvents(events);

      const state = getAccumulatedState();
      expect(state.outputItems).toHaveLength(0);
      expect(state.sequenceNumber).toBe(0);
      expect(state.outputIndex).toBe(-1);
      expect(state.currentItemId).toBeNull();
    });
  });

  describe("edge cases", () => {
    it("ignores finish part (no events emitted)", async () => {
      const stream = mockTextStreamParts([
        { type: "finish", finishReason: "stop" },
      ]);

      const { events } = convertAISdkStreamTextToStreamingEvents(
        stream as never,
        "resp-finish",
      );
      const collected = await collectEvents(events);

      expect(collected).toHaveLength(0);
    });

    it("ignores unknown part types", async () => {
      const stream = mockTextStreamParts([
        { type: "some-unknown-type" },
      ]);

      const { events } = convertAISdkStreamTextToStreamingEvents(
        stream as never,
        "resp-unknown",
      );
      const collected = await collectEvents(events);

      expect(collected).toHaveLength(0);
    });
  });
});
