export interface ApiPlatformDatabase {
  [RESPONSES_TABLE]: ResponsesTable;
}

const RESPONSES_TABLE = "responses_table";
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
