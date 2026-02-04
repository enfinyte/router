import { Effect, Schema } from "effect";
import type { ResponsesTable } from "./table";
import { ResponseResourceSchema, type ResponseResource } from "@/src/services/responses/schema";

const fields = ResponseResourceSchema.fields;

export const adaptResponsesResourcefromResponsesTable = (table: ResponsesTable) =>
  Effect.gen(function* () {
    return {
      id: table.id,
      object: yield* Schema.decodeUnknown(fields.object)(table.object),
      created_at: table.created_at,
      completed_at: table.completed_at,
      status: table.status,
      incomplete_details:
        table.incomplete_details !== null
          ? yield* Schema.decodeUnknown(fields.incomplete_details)(
              JSON.parse(table.incomplete_details),
            )
          : null,
      model: table.model,
      previous_response_id: table.previous_response_id,
      instructions: table.instructions,
      output: yield* Schema.decodeUnknown(fields.output)(JSON.parse(table.output)),
      error:
        table.error !== null
          ? yield* Schema.decodeUnknown(fields.error)(JSON.parse(table.error))
          : null,
      tools: yield* Schema.decodeUnknown(fields.tools)(JSON.parse(table.tools)),
      tool_choice: yield* Schema.decodeUnknown(fields.tool_choice)(JSON.parse(table.tool_choice)),
      truncation: yield* Schema.decodeUnknown(fields.truncation)(table.truncation),
      parallel_tool_calls: table.parallel_tool_calls,
      text: yield* Schema.decodeUnknown(fields.text)(JSON.parse(table.text)),
      top_p: table.top_p,
      presence_penalty: table.presence_penalty,
      frequency_penalty: table.frequency_penalty,
      top_logprobs: table.top_logprobs,
      temperature: table.temperature,
      reasoning:
        table.reasoning !== null
          ? yield* Schema.decodeUnknown(fields.reasoning)(JSON.parse(table.reasoning))
          : null,
      usage:
        table.usage !== null
          ? yield* Schema.decodeUnknown(fields.usage)(JSON.parse(table.usage))
          : null,
      max_output_tokens: table.max_output_tokens,
      max_tool_calls: table.max_tool_calls,
      store: table.store,
      background: table.background,
      service_tier: table.service_tier,
      metadata:
        table.metadata !== null
          ? yield* Schema.decodeUnknown(fields.metadata)(JSON.parse(table.metadata))
          : null,
      safety_identifier: table.safety_identifier,
      prompt_cache_key: table.prompt_cache_key,
    };
  });

export const convertResponsesResourcetoResponsesTable = (resource: ResponseResource) =>
  Effect.gen(function* () {
    const encodedIncompleteDetails = yield* Schema.encode(fields.incomplete_details)(
      resource.incomplete_details,
    );
    const encodedOutput = yield* Schema.encode(fields.output)(resource.output);
    const encodedError = yield* Schema.encode(fields.error)(resource.error);
    const encodedTools = yield* Schema.encode(fields.tools)(resource.tools);
    const encodedToolChoice = yield* Schema.encode(fields.tool_choice)(resource.tool_choice);
    const encodedText = yield* Schema.encode(fields.text)(resource.text);
    const encodedReasoning = yield* Schema.encode(fields.reasoning)(resource.reasoning);
    const encodedUsage = yield* Schema.encode(fields.usage)(resource.usage);
    const encodedMetadata = yield* Schema.encode(fields.metadata)(resource.metadata);

    return {
      id: resource.id,
      object: resource.object,
      created_at: resource.created_at,
      completed_at: resource.completed_at,
      status: resource.status,
      incomplete_details:
        encodedIncompleteDetails !== null ? JSON.stringify(encodedIncompleteDetails) : null,
      model: resource.model,
      previous_response_id: resource.previous_response_id,
      instructions: resource.instructions,
      output: JSON.stringify(encodedOutput),
      error: encodedError !== null ? JSON.stringify(encodedError) : null,
      tools: JSON.stringify(encodedTools),
      tool_choice: JSON.stringify(encodedToolChoice),
      truncation: resource.truncation,
      parallel_tool_calls: resource.parallel_tool_calls,
      text: JSON.stringify(encodedText),
      top_p: resource.top_p,
      presence_penalty: resource.presence_penalty,
      frequency_penalty: resource.frequency_penalty,
      top_logprobs: resource.top_logprobs,
      temperature: resource.temperature,
      reasoning: encodedReasoning !== null ? JSON.stringify(encodedReasoning) : null,
      usage: encodedUsage !== null ? JSON.stringify(encodedUsage) : null,
      max_output_tokens: resource.max_output_tokens,
      max_tool_calls: resource.max_tool_calls,
      store: resource.store,
      background: resource.background,
      service_tier: resource.service_tier,
      metadata: encodedMetadata !== null ? JSON.stringify(encodedMetadata) : null,
      safety_identifier: resource.safety_identifier,
      prompt_cache_key: resource.prompt_cache_key,
    };
  });
