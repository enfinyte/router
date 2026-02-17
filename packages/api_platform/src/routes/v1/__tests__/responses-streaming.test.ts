import { describe, it, expect, beforeAll, afterAll, mock } from "bun:test";
import { HttpMiddleware, HttpServer } from "@effect/platform";
import { BunContext, BunHttpServer } from "@effect/platform-bun";
import { Effect, Fiber, Layer, flow } from "effect";
import type { CreateResponseBody, ResponseResource } from "common";
import type { TextStreamPart, ToolSet, streamText } from "ai";
import type { ApiPlatformDatabase } from "../../../services/database/tables";
import type { Kysely } from "kysely";
import { router } from "../..";
import { AppConfig } from "../../../services/config";
import { DatabaseService, DatabaseServiceError } from "../../../services/database";
import { VaultService } from "vault";

type StreamResult = ReturnType<typeof streamText>;

const aiModulePath = new URL("../../../services/ai/index.ts", import.meta.url).pathname;

const buildResponseResource = (overrides: Partial<ResponseResource> = {}): ResponseResource => ({
  id: overrides.id ?? "resp-test",
  object: "response",
  created_at: overrides.created_at ?? Date.now(),
  completed_at: overrides.completed_at ?? Date.now(),
  status: overrides.status ?? "completed",
  incomplete_details: null,
  model: overrides.model ?? "openai/gpt-4o-mini",
  previous_response_id: null,
  instructions: null,
  output: [],
  error: null,
  tools: [],
  tool_choice: "none",
  truncation: "auto",
  parallel_tool_calls: true,
  text: { format: { type: "text" } },
  top_p: 1,
  presence_penalty: 0,
  frequency_penalty: 0,
  top_logprobs: 0,
  temperature: 1,
  reasoning: null,
  usage: null,
  max_output_tokens: null,
  max_tool_calls: null,
  store: false,
  background: false,
  service_tier: "default",
  metadata: null,
  safety_identifier: null,
  prompt_cache_key: null,
  ...overrides,
});

const mockStream = async function* (): AsyncIterable<TextStreamPart<ToolSet>> {
  yield { type: "text-start" } as TextStreamPart<ToolSet>;
  yield { type: "text-delta", text: "Hello" } as TextStreamPart<ToolSet>;
  yield { type: "text-delta", text: " world" } as TextStreamPart<ToolSet>;
  yield { type: "text-end" } as TextStreamPart<ToolSet>;
  yield { type: "finish", finishReason: "stop" } as TextStreamPart<ToolSet>;
};

const mockStreamResult = (): StreamResult =>
  ({
    totalUsage: Promise.resolve({
      inputTokens: 4,
      outputTokens: 6,
      totalTokens: 10,
      inputTokenDetails: { cacheWriteTokens: 0 },
      outputTokenDetails: { reasoningTokens: 0 },
    }),
  }) as unknown as StreamResult;

mock.module(aiModulePath, () => ({
  execute: (body: CreateResponseBody) =>
    Effect.succeed(
      buildResponseResource({
        status: "completed",
        model: typeof body.model === "string" ? body.model : "openai/gpt-4o-mini",
      }),
    ),
  executeStream: (_body: CreateResponseBody) =>
    Effect.succeed({
      stream: mockStream(),
      result: mockStreamResult(),
      resolvedModelAndProvider: { provider: "openai", model: "gpt-4o-mini" },
    }),
}));

const app = router.pipe(
  HttpServer.serve(
    flow(HttpMiddleware.logger, HttpMiddleware.cors(), HttpMiddleware.xForwardedHeaders),
  ),
  HttpServer.withLogAddress,
);

type ParsedSseEvent =
  | { done: true; raw: string }
  | {
      done: false;
      raw: string;
      event: string;
      data: { type: string; sequence_number: number } & Record<string, unknown>;
    };

const parseSseChunk = (chunk: string): ParsedSseEvent => {
  if (chunk.trim() === "data: [DONE]") {
    return { done: true, raw: chunk };
  }

  const lines = chunk.split("\n");
  const eventLine = lines.find((line) => line.startsWith("event: "));
  const dataLine = lines.find((line) => line.startsWith("data: "));

  if (!eventLine || !dataLine) {
    throw new Error(`Invalid SSE chunk: ${chunk}`);
  }

  const event = eventLine.slice("event: ".length).trim();
  const dataText = dataLine.slice("data: ".length).trim();
  const data = JSON.parse(dataText) as { type: string; sequence_number: number } & Record<
    string,
    unknown
  >;

  return { done: false, raw: chunk, event, data };
};

const readSseEvents = async (response: Response): Promise<ParsedSseEvent[]> => {
  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("Response body is not readable");
  }

  const decoder = new TextDecoder();
  let buffer = "";
  const chunks: string[] = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let index = buffer.indexOf("\n\n");
    while (index !== -1) {
      chunks.push(buffer.slice(0, index));
      buffer = buffer.slice(index + 2);
      index = buffer.indexOf("\n\n");
    }
  }

  buffer += decoder.decode();
  if (buffer.trim().length > 0) {
    chunks.push(buffer.trim());
  }

  return chunks.map(parseSseChunk);
};

const makeFakeDatabase = (): Kysely<ApiPlatformDatabase> =>
  ({
    insertInto: () => ({
      values: () => ({
        returningAll: () => ({
          executeTakeFirst: async () => ({ id: "fake" }),
        }),
      }),
    }),
    updateTable: () => ({
      set: () => ({
        where: () => ({
          returningAll: () => ({
            executeTakeFirst: async () => null,
          }),
        }),
      }),
    }),
    selectFrom: () => ({
      where: () => ({
        selectAll: () => ({
          executeTakeFirst: async () => null,
        }),
      }),
    }),
  }) as unknown as Kysely<ApiPlatformDatabase>;

const startApiServer = async (port: number, backendUrl: string) => {
  const AppConfigTest = Layer.succeed(
    AppConfig,
    AppConfig.of({
      logLevel: "INFO",
      port,
      pgConnection: "postgres://test:test@localhost:5432/test",
      backendUrl,
    }),
  );

  const fakeDb = makeFakeDatabase();

  const DatabaseServiceTest = Layer.succeed(
    DatabaseService,
    DatabaseService.of({
      use: (fn) =>
        Effect.tryPromise({
          try: () => Promise.resolve(fn(fakeDb)),
          catch: (error) =>
            new DatabaseServiceError({
              cause: error,
              message: "Test database error",
            }),
        }),
    }),
  );

  const VaultServiceTest = Layer.succeed(
    VaultService,
    VaultService.of({
      addSecret: () => Effect.void,
      getSecret: () => Effect.succeed({}),
      deleteSecret: () => Effect.void,
    }),
  );

  const HttpServerLayer = BunHttpServer.layer({ port });
  const AllServices = Layer.mergeAll(
    AppConfigTest,
    DatabaseServiceTest,
    VaultServiceTest,
    BunContext.layer,
  );
  const AllServicesAndHttpServer = Layer.mergeAll(AllServices, HttpServerLayer);

  const serverEffect = Layer.launch(Layer.provide(app, AllServicesAndHttpServer));
  const fiber = Effect.runFork(serverEffect);

  await new Promise((resolve) => setTimeout(resolve, 50));

  return async () => {
    await Effect.runPromise(Fiber.interrupt(fiber));
  };
};

describe("responses streaming integration", () => {
  let backendServer: ReturnType<typeof Bun.serve> | null = null;
  let stopApiServer: (() => Promise<void>) | null = null;
  let baseUrl = "";

  beforeAll(async () => {
    backendServer = Bun.serve({
      port: 0,
      fetch: async (request) => {
        const url = new URL(request.url);
        if (url.pathname === "/v1/apikey/verify" && request.method === "POST") {
          return Response.json({ valid: true, userId: "user-test", providers: ["openai"] });
        }
        return new Response("Not found", { status: 404 });
      },
    });

    const backendPort = backendServer.port;
    if (backendPort === undefined) {
      throw new Error("Backend server did not expose a port");
    }
    const backendUrl = `http://localhost:${backendPort}`;
    const apiPort = 14000 + Math.floor(Math.random() * 1000);
    baseUrl = `http://localhost:${apiPort}`;
    stopApiServer = await startApiServer(apiPort, backendUrl);
  });

  afterAll(async () => {
    if (stopApiServer) {
      await stopApiServer();
    }
    if (backendServer) {
      backendServer.stop();
    }
  });

  it("streams SSE lifecycle with correct headers and sequence", async () => {
    const response = await fetch(`${baseUrl}/v1/responses`, {
      method: "POST",
      headers: {
        Authorization: "Bearer test-key",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-4o-mini",
        input: "Hello",
        stream: true,
        store: false,
      }),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/event-stream");
    expect(response.headers.get("cache-control")).toBe("no-cache");

    const events = await readSseEvents(response);
    const eventPayloads = events.filter((evt) => !evt.done) as Extract<
      ParsedSseEvent,
      { done: false }
    >[];

    expect(eventPayloads.length).toBeGreaterThan(0);
    expect(eventPayloads[0]?.data.type).toBe("response.created");
    expect(eventPayloads[1]?.data.type).toBe("response.in_progress");
    expect(eventPayloads.some((evt) => evt.data.type.includes("delta"))).toBe(true);

    const completedIndex = eventPayloads.findIndex(
      (evt) => evt.data.type === "response.completed",
    );
    expect(completedIndex).toBeGreaterThan(-1);
    expect(events[events.length - 1]).toEqual({ done: true, raw: "data: [DONE]" });

    for (const evt of eventPayloads) {
      expect(evt.raw).toContain(`event: ${evt.data.type}`);
      expect(evt.raw).toContain("data: ");
      expect(evt.data.type).toContain(".");
      expect(evt.data.type).toBe(evt.data.type.toLowerCase());
    }

    const sequenceNumbers = eventPayloads.map((evt) => evt.data.sequence_number);
    expect(sequenceNumbers[0]).toBe(0);
    for (let i = 1; i < sequenceNumbers.length; i++) {
      const previous = sequenceNumbers[i - 1];
      const current = sequenceNumbers[i];
      if (previous === undefined || current === undefined) {
        throw new Error("Missing sequence number in streamed events");
      }
      expect(current).toBeGreaterThan(previous);
    }
  });

  it("rejects json_schema when streaming", async () => {
    const response = await fetch(`${baseUrl}/v1/responses`, {
      method: "POST",
      headers: {
        Authorization: "Bearer test-key",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-4o-mini",
        input: "Hello",
        stream: true,
        text: {
          format: {
            type: "json_schema",
            name: "test_schema",
            description: "test",
            schema: { type: "object", properties: { foo: { type: "string" } } },
            strict: true,
          },
        },
      }),
    });

    expect(response.status).toBe(400);
  });

  it("returns JSON when stream is false", async () => {
    const response = await fetch(`${baseUrl}/v1/responses`, {
      method: "POST",
      headers: {
        Authorization: "Bearer test-key",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-4o-mini",
        input: "Hello",
        stream: false,
      }),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/json");

    const body = (await response.json()) as ResponseResource;
    expect(body.object).toBe("response");
  });
});
