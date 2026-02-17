import { describe, it, expect } from "bun:test";
import { encodeSSEEvent, encodeSSEDone, encodeSSEToUint8Array } from "../sse";

describe("encodeSSEEvent", () => {
  it("formats event type and JSON data with correct SSE delimiters", () => {
    const result = encodeSSEEvent("response.output_text.delta", {
      type: "response.output_text.delta",
      delta: "hello",
    });

    expect(result).toBe(
      'event: response.output_text.delta\ndata: {"type":"response.output_text.delta","delta":"hello"}\n\n',
    );
  });

  it("serializes nested objects in data payload", () => {
    const result = encodeSSEEvent("error", {
      type: "error",
      error: { code: "rate_limit", message: "slow down" },
    });

    expect(result).toContain("event: error\n");
    expect(result).toContain('"error":{"code":"rate_limit","message":"slow down"}');
    expect(result).toEndWith("\n\n");
  });

  it("handles empty object data", () => {
    const result = encodeSSEEvent("ping", {});
    expect(result).toBe("event: ping\ndata: {}\n\n");
  });
});

describe("encodeSSEDone", () => {
  it("produces the standard SSE done sentinel", () => {
    const result = encodeSSEDone();
    expect(result).toBe("data: [DONE]\n\n");
  });

  it("has no event: prefix line", () => {
    const result = encodeSSEDone();
    expect(result).not.toContain("event:");
  });
});

describe("encodeSSEToUint8Array", () => {
  it("returns a Uint8Array", () => {
    const result = encodeSSEToUint8Array("data: test\n\n");
    expect(result).toBeInstanceOf(Uint8Array);
  });

  it("encodes the string as UTF-8 bytes", () => {
    const input = "event: test\ndata: {}\n\n";
    const result = encodeSSEToUint8Array(input);
    const decoded = new TextDecoder().decode(result);
    expect(decoded).toBe(input);
  });

  it("correctly encodes the done sentinel", () => {
    const done = encodeSSEDone();
    const bytes = encodeSSEToUint8Array(done);
    const decoded = new TextDecoder().decode(bytes);
    expect(decoded).toBe("data: [DONE]\n\n");
  });

  it("handles unicode characters", () => {
    const input = encodeSSEEvent("msg", { text: "héllo wörld 🌍" });
    const bytes = encodeSSEToUint8Array(input);
    const decoded = new TextDecoder().decode(bytes);
    expect(decoded).toContain("héllo wörld 🌍");
  });
});
