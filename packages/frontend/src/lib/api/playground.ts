"use client";

const API_PLATFORM_URL =
  process.env.NEXT_PUBLIC_API_PLATFORM_URL ??
  process.env.NEXT_PUBLIC_BACKEND_URL;

if (!API_PLATFORM_URL) {
  throw new Error(
    "NEXT_PUBLIC_API_PLATFORM_URL or NEXT_PUBLIC_BACKEND_URL environment variable is not set.",
  );
}

export interface PlaygroundMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  model?: string;
  responseId?: string;
  isStreaming?: boolean;
  usage?: {
    input_tokens: number;
    output_tokens: number;
    total_tokens: number;
  };
}

export interface PlaygroundSettings {
  instructions?: string;
  temperature?: number | null;
  top_p?: number | null;
  max_output_tokens?: number | null;
  reasoning_effort?: "none" | "low" | "medium" | "high" | null;
  presence_penalty?: number | null;
  frequency_penalty?: number | null;
}

export interface SendMessageParams {
  apiKey: string;
  model: string;
  input: string;
  previousResponseId?: string;
  settings?: PlaygroundSettings;
}

export interface StreamCallbacks {
  onTextDelta: (delta: string) => void;
  onComplete: (response: {
    id: string;
    model: string;
    outputText: string;
    usage?: {
      input_tokens: number;
      output_tokens: number;
      total_tokens: number;
    };
  }) => void;
  onError: (error: string) => void;
}

export async function sendStreamingMessage(
  params: SendMessageParams,
  callbacks: StreamCallbacks,
): Promise<AbortController> {
  const controller = new AbortController();

  const body: Record<string, unknown> = {
    model: params.model,
    input: params.input,
    stream: true,
  };

  if (params.previousResponseId) {
    body.previous_response_id = params.previousResponseId;
  }

  if (params.settings) {
    const s = params.settings;
    if (s.instructions) body.instructions = s.instructions;
    if (s.temperature != null) body.temperature = s.temperature;
    if (s.top_p != null) body.top_p = s.top_p;
    if (s.max_output_tokens != null) body.max_output_tokens = s.max_output_tokens;
    if (s.presence_penalty != null) body.presence_penalty = s.presence_penalty;
    if (s.frequency_penalty != null) body.frequency_penalty = s.frequency_penalty;
    if (s.reasoning_effort != null && s.reasoning_effort !== "none") {
      body.reasoning = { effort: s.reasoning_effort };
    }
  }

  try {
    const response = await fetch(`${API_PLATFORM_URL}/v1/responses`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${params.apiKey.replace(/[^\x20-\x7E]/g, "")}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}`;
      try {
        const contentType = response.headers.get("content-type") ?? "";
        if (contentType.includes("application/json")) {
          const errorBody = (await response.json()) as Record<string, unknown>;
          const errorObj = errorBody?.error as Record<string, unknown> | undefined;
          errorMessage =
            (errorObj?.message as string) ??
            (errorBody?.message as string) ??
            errorMessage;
        } else {
          const text = await response.text();
          if (text) errorMessage = text;
        }
      } catch {
        // ignore parse error
      }
      callbacks.onError(errorMessage);
      return controller;
    }

    const reader = response.body?.getReader();
    if (!reader) {
      callbacks.onError("No response body");
      return controller;
    }

    const decoder = new TextDecoder();
    let buffer = "";
    let receivedCompletion = false;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const data = line.slice(6).trim();
          if (data === "[DONE]") {
            receivedCompletion = true;
            return controller;
          }

          try {
            const event = JSON.parse(data);
            const type = event.type as string | undefined;
            if (
              type === "response.completed" ||
              type === "response.failed" ||
              type === "error"
            ) {
              receivedCompletion = true;
            }
            handleSSEEvent(event, callbacks);
          } catch {
            // ignore parse errors for malformed events
          }
        }
      }
    }

    if (!receivedCompletion) {
      callbacks.onError(
        "Stream ended unexpectedly. The server may have encountered an error processing this request.",
      );
    }
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      // User cancelled - not an error
    } else {
      callbacks.onError(
        err instanceof Error ? err.message : "An unknown error occurred",
      );
    }
  }

  return controller;
}

function handleSSEEvent(
  event: Record<string, unknown>,
  callbacks: StreamCallbacks,
) {
  const type = event.type as string | undefined;

  switch (type) {
    case "response.output_text.delta": {
      const delta = event.delta as string | undefined;
      if (delta) {
        callbacks.onTextDelta(delta);
      }
      break;
    }
    case "response.completed": {
      const response = event.response as Record<string, unknown> | undefined;
      if (response) {
        const usage = response.usage as Record<string, number> | undefined;
        // Extract full output text from the completed response
        const output = response.output as Array<Record<string, unknown>> | undefined;
        let outputText = "";
        if (output) {
          for (const item of output) {
            if (item.type === "message" && item.role === "assistant") {
              const content = item.content as Array<Record<string, unknown>> | undefined;
              if (content) {
                for (const part of content) {
                  if (part.type === "output_text" && typeof part.text === "string") {
                    outputText += part.text;
                  }
                }
              }
            }
          }
        }
        callbacks.onComplete({
          id: response.id as string,
          model: response.model as string,
          outputText,
          usage: usage
            ? {
                input_tokens: usage.input_tokens ?? 0,
                output_tokens: usage.output_tokens ?? 0,
                total_tokens: usage.total_tokens ?? 0,
              }
            : undefined,
        });
      }
      break;
    }
    case "response.failed": {
      const response = event.response as Record<string, unknown> | undefined;
      const error = response?.error as Record<string, unknown> | undefined;
      callbacks.onError(
        (error?.message as string) ?? "Response generation failed",
      );
      break;
    }
    case "error": {
      const error = event.error as Record<string, unknown> | undefined;
      callbacks.onError(
        (error?.message as string) ?? "Stream error occurred",
      );
      break;
    }
  }
}
