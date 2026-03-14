import type { TableDefinition } from "../tables";

export const RESPONSES_TABLE = "responses_table";

export type ResponsesTable = {
  id: string;
  object: string;
  created_at: number;
  completed_at: number | null;
  status: string;
  incomplete_details: string | null;
  model: string;
  previous_response_id: string | null;
  instructions: string | null;
  output: string;
  error: string | null;
  tools: string;
  tool_choice: string;
  truncation: string;
  parallel_tool_calls: boolean;
  text: string;
  top_p: number;
  presence_penalty: number;
  frequency_penalty: number;
  top_logprobs: number;
  temperature: number;
  reasoning: string | null;
  usage: string | null;
  max_output_tokens: number | null;
  max_tool_calls: number | null;
  store: boolean;
  background: boolean;
  service_tier: string;
  metadata: string | null;
  safety_identifier: string | null;
  prompt_cache_key: string | null;
};

export const ResponsesTableDefinition: TableDefinition = {
  create: (db) =>
    db.schema
      .createTable(RESPONSES_TABLE)
      .ifNotExists()
      .addColumn("id", "text", (col) => col.primaryKey())
      .addColumn("object", "text", (col) => col.notNull())
      .addColumn("created_at", "bigint", (col) => col.notNull())
      .addColumn("completed_at", "bigint")
      .addColumn("status", "text", (col) => col.notNull())
      .addColumn("incomplete_details", "text")
      .addColumn("model", "text", (col) => col.notNull())
      .addColumn("previous_response_id", "text")
      .addColumn("instructions", "text")
      .addColumn("output", "text", (col) => col.notNull())
      .addColumn("error", "text")
      .addColumn("tools", "text", (col) => col.notNull())
      .addColumn("tool_choice", "text", (col) => col.notNull())
      .addColumn("truncation", "text", (col) => col.notNull())
      .addColumn("parallel_tool_calls", "boolean", (col) => col.notNull())
      .addColumn("text", "text", (col) => col.notNull())
      .addColumn("top_p", "double precision", (col) => col.notNull())
      .addColumn("presence_penalty", "double precision", (col) => col.notNull())
      .addColumn("frequency_penalty", "double precision", (col) => col.notNull())
      .addColumn("top_logprobs", "integer", (col) => col.notNull())
      .addColumn("temperature", "double precision", (col) => col.notNull())
      .addColumn("reasoning", "text")
      .addColumn("usage", "text")
      .addColumn("max_output_tokens", "integer")
      .addColumn("max_tool_calls", "integer")
      .addColumn("store", "boolean", (col) => col.notNull())
      .addColumn("background", "boolean", (col) => col.notNull())
      .addColumn("service_tier", "text", (col) => col.notNull())
      .addColumn("metadata", "text")
      .addColumn("safety_identifier", "text")
      .addColumn("prompt_cache_key", "text")
      .execute(),
};
