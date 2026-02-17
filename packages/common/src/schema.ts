import { Schema } from "effect";

export const IncludeEnumSchema = Schema.Literal(
  "reasoning.encrypted_content",
  "message.output_text.logprobs",
);

export const ImageDetailSchema = Schema.Literal("low", "high", "auto");

export const FunctionCallStatusSchema = Schema.Literal("in_progress", "completed", "incomplete");

export const ToolChoiceValueEnumSchema = Schema.Literal("none", "auto", "required");

export const VerbosityEnumSchema = Schema.Literal("low", "medium", "high");

export const ReasoningEffortEnumSchema = Schema.Literal("none", "low", "medium", "high", "xhigh");

export const ReasoningSummaryEnumSchema = Schema.Literal("concise", "detailed", "auto");

export const TruncationEnumSchema = Schema.Literal("auto", "disabled");

export const ServiceTierEnumSchema = Schema.Literal("auto", "default", "flex", "priority");

export const ReasoningSummaryContentParamSchema = Schema.Struct({
  type: Schema.Literal("summary_text"),
  text: Schema.String,
});

export const InputTextContentParamSchema = Schema.Struct({
  type: Schema.Literal("input_text"),
  text: Schema.String,
});

export const InputImageContentParamAutoParamSchema = Schema.Struct({
  type: Schema.Literal("input_image"),
  image_url: Schema.optionalWith(Schema.NullOr(Schema.String), { exact: true }),
  detail: Schema.optionalWith(Schema.NullOr(ImageDetailSchema), { exact: true }),
});

export const InputFileContentParamSchema = Schema.Struct({
  type: Schema.Literal("input_file"),
  filename: Schema.optionalWith(Schema.NullOr(Schema.String), { exact: true }),
  file_data: Schema.optionalWith(Schema.NullOr(Schema.String), { exact: true }),
  file_url: Schema.optionalWith(Schema.NullOr(Schema.String), { exact: true }),
});

export const InputVideoContentSchema = Schema.Struct({
  type: Schema.Literal("input_video"),
  video_url: Schema.String,
});

export const UrlCitationParamSchema = Schema.Struct({
  type: Schema.Literal("url_citation"),
  start_index: Schema.Number,
  end_index: Schema.Number,
  url: Schema.String,
  title: Schema.String,
});

export const OutputTextContentParamSchema = Schema.Struct({
  type: Schema.Literal("output_text"),
  text: Schema.String,
  annotations: Schema.optionalWith(Schema.Array(UrlCitationParamSchema), { exact: true }),
});

export const RefusalContentParamSchema = Schema.Struct({
  type: Schema.Literal("refusal"),
  refusal: Schema.String,
});

export const ItemReferenceParamSchema = Schema.Struct({
  type: Schema.Literal("item_reference"),
  id: Schema.String,
});

export const ReasoningItemParamSchema = Schema.Struct({
  id: Schema.optionalWith(Schema.NullOr(Schema.String), { exact: true }),
  type: Schema.Literal("reasoning"),
  summary: Schema.Array(ReasoningSummaryContentParamSchema),
  content: Schema.optionalWith(Schema.Null, { exact: true }),
  encrypted_content: Schema.optionalWith(Schema.NullOr(Schema.String), { exact: true }),
});

export const UserMessageItemParamSchema = Schema.Struct({
  id: Schema.optionalWith(Schema.NullOr(Schema.String), { exact: true }),
  type: Schema.Literal("message"),
  role: Schema.Literal("user"),
  content: Schema.Union(
    Schema.Array(
      Schema.Union(
        InputTextContentParamSchema,
        InputImageContentParamAutoParamSchema,
        InputFileContentParamSchema,
      ),
    ),
    Schema.String,
  ),
  status: Schema.optionalWith(Schema.NullOr(Schema.String), { exact: true }),
});

export const SystemMessageItemParamSchema = Schema.Struct({
  id: Schema.optionalWith(Schema.NullOr(Schema.String), { exact: true }),
  type: Schema.Literal("message"),
  role: Schema.Literal("system"),
  content: Schema.Union(Schema.Array(InputTextContentParamSchema), Schema.String),
  status: Schema.optionalWith(Schema.NullOr(Schema.String), { exact: true }),
});

export const DeveloperMessageItemParamSchema = Schema.Struct({
  id: Schema.optionalWith(Schema.NullOr(Schema.String), { exact: true }),
  type: Schema.Literal("message"),
  role: Schema.Literal("developer"),
  content: Schema.Union(Schema.Array(InputTextContentParamSchema), Schema.String),
  status: Schema.optionalWith(Schema.NullOr(Schema.String), { exact: true }),
});

export const AssistantMessageItemParamSchema = Schema.Struct({
  id: Schema.optionalWith(Schema.NullOr(Schema.String), { exact: true }),
  type: Schema.Literal("message"),
  role: Schema.Literal("assistant"),
  content: Schema.Union(
    Schema.Array(Schema.Union(OutputTextContentParamSchema, RefusalContentParamSchema)),
    Schema.String,
  ),
  status: Schema.optionalWith(Schema.NullOr(Schema.String), { exact: true }),
});

export const FunctionCallItemParamSchema = Schema.Struct({
  id: Schema.optionalWith(Schema.NullOr(Schema.String), { exact: true }),
  call_id: Schema.String,
  type: Schema.Literal("function_call"),
  name: Schema.String,
  arguments: Schema.String,
  status: Schema.optionalWith(Schema.NullOr(FunctionCallStatusSchema), { exact: true }),
});

export const FunctionCallOutputItemParamSchema = Schema.Struct({
  id: Schema.optionalWith(Schema.NullOr(Schema.String), { exact: true }),
  call_id: Schema.String,
  type: Schema.Literal("function_call_output"),
  output: Schema.Union(
    Schema.String,
    Schema.Array(
      Schema.Union(
        InputTextContentParamSchema,
        InputImageContentParamAutoParamSchema,
        InputFileContentParamSchema,
        InputVideoContentSchema,
      ),
    ),
  ),
  status: Schema.optionalWith(Schema.NullOr(FunctionCallStatusSchema), { exact: true }),
});

export const ItemParamSchema = Schema.Union(
  ItemReferenceParamSchema,
  ReasoningItemParamSchema,
  UserMessageItemParamSchema,
  SystemMessageItemParamSchema,
  DeveloperMessageItemParamSchema,
  AssistantMessageItemParamSchema,
  FunctionCallItemParamSchema,
  FunctionCallOutputItemParamSchema,
);
export type CreateResponseBodyInputItem = Schema.Schema.Type<typeof ItemParamSchema>;

export const EmptyModelParamSchema = Schema.Record({ key: Schema.String, value: Schema.Unknown });

export const FunctionToolParamSchema = Schema.Struct({
  name: Schema.String,
  description: Schema.optionalWith(Schema.NullOr(Schema.String), { exact: true }),
  parameters: Schema.optionalWith(Schema.NullOr(EmptyModelParamSchema), { exact: true }),
  strict: Schema.optionalWith(Schema.Boolean, { exact: true }),
  type: Schema.Literal("function"),
});

export const SpecificFunctionParamSchema = Schema.Struct({
  type: Schema.Literal("function"),
  name: Schema.String,
});

export const AllowedToolsParamSchema = Schema.Struct({
  type: Schema.Literal("allowed_tools"),
  tools: Schema.Array(SpecificFunctionParamSchema),
  mode: Schema.optionalWith(ToolChoiceValueEnumSchema, { exact: true }),
});

export const ToolChoiceParamSchema = Schema.Union(
  SpecificFunctionParamSchema,
  ToolChoiceValueEnumSchema,
  AllowedToolsParamSchema,
);

export const MetadataParamSchema = Schema.Record({ key: Schema.String, value: Schema.String });

export const TextResponseFormatSchema = Schema.Struct({
  type: Schema.Literal("text"),
});

export const JsonSchemaResponseFormatParamSchema = Schema.Struct({
  type: Schema.optionalWith(Schema.Literal("json_schema"), { exact: true }),
  description: Schema.optionalWith(Schema.String, { exact: true }),
  name: Schema.optionalWith(Schema.String, { exact: true }),
  schema: Schema.optionalWith(Schema.Record({ key: Schema.String, value: Schema.Unknown }), {
    exact: true,
  }),
  strict: Schema.optionalWith(Schema.NullOr(Schema.Boolean), { exact: true }),
});

export const TextFormatParamSchema = Schema.Union(
  TextResponseFormatSchema,
  JsonSchemaResponseFormatParamSchema,
);

export const TextParamSchema = Schema.Struct({
  format: Schema.optionalWith(Schema.NullOr(TextFormatParamSchema), { exact: true }),
  verbosity: Schema.optionalWith(VerbosityEnumSchema, { exact: true }),
});

export const StreamOptionsParamSchema = Schema.Struct({
  include_obfuscation: Schema.optionalWith(Schema.Boolean, { exact: true }),
});

export const ReasoningParamSchema = Schema.Struct({
  effort: Schema.optionalWith(Schema.NullOr(ReasoningEffortEnumSchema), { exact: true }),
  summary: Schema.optionalWith(Schema.NullOr(ReasoningSummaryEnumSchema), { exact: true }),
});

export const CreateResponseBodySchema = Schema.Struct({
  model: Schema.optionalWith(Schema.NullOr(Schema.String), { exact: true }),
  input: Schema.optionalWith(
    Schema.NullOr(Schema.Union(Schema.String, Schema.Array(ItemParamSchema))),
    { exact: true },
  ),
  previous_response_id: Schema.optionalWith(Schema.NullOr(Schema.String), { exact: true }),
  include: Schema.optionalWith(Schema.Array(IncludeEnumSchema), { exact: true }),
  tools: Schema.optionalWith(Schema.NullOr(Schema.Array(FunctionToolParamSchema)), {
    exact: true,
  }),
  tool_choice: Schema.optionalWith(Schema.NullOr(ToolChoiceParamSchema), { exact: true }),
  metadata: Schema.optionalWith(Schema.NullOr(MetadataParamSchema), { exact: true }),
  text: Schema.optionalWith(Schema.NullOr(TextParamSchema), { exact: true }),
  temperature: Schema.optionalWith(Schema.NullOr(Schema.Number), { exact: true }),
  top_p: Schema.optionalWith(Schema.NullOr(Schema.Number), { exact: true }),
  presence_penalty: Schema.optionalWith(Schema.NullOr(Schema.Number), { exact: true }),
  frequency_penalty: Schema.optionalWith(Schema.NullOr(Schema.Number), { exact: true }),
  parallel_tool_calls: Schema.optionalWith(Schema.NullOr(Schema.Boolean), { exact: true }),
  stream: Schema.optionalWith(Schema.Boolean, { exact: true }),
  stream_options: Schema.optionalWith(Schema.NullOr(StreamOptionsParamSchema), { exact: true }),
  background: Schema.optionalWith(Schema.Boolean, { exact: true }),
  max_output_tokens: Schema.optionalWith(Schema.NullOr(Schema.Number), { exact: true }),
  max_tool_calls: Schema.optionalWith(Schema.NullOr(Schema.Number), { exact: true }),
  reasoning: Schema.optionalWith(Schema.NullOr(ReasoningParamSchema), { exact: true }),
  safety_identifier: Schema.optionalWith(Schema.NullOr(Schema.String), { exact: true }),
  prompt_cache_key: Schema.optionalWith(Schema.NullOr(Schema.String), { exact: true }),
  truncation: Schema.optionalWith(TruncationEnumSchema, { exact: true }),
  instructions: Schema.optionalWith(Schema.NullOr(Schema.String), { exact: true }),
  store: Schema.optionalWith(Schema.Boolean, { exact: true }),
  service_tier: Schema.optionalWith(ServiceTierEnumSchema, { exact: true }),
  top_logprobs: Schema.optionalWith(Schema.NullOr(Schema.Number), { exact: true }),
});

export const MessageStatusSchema = Schema.Literal("in_progress", "completed", "incomplete");
export const MessageRoleSchema = Schema.Literal("user", "assistant", "system", "developer");

export const InputTextContentSchema = Schema.Struct({
  type: Schema.Literal("input_text"),
  text: Schema.String,
});

export const UrlCitationBodySchema = Schema.Struct({
  type: Schema.Literal("url_citation"),
  url: Schema.String,
  start_index: Schema.Number,
  end_index: Schema.Number,
  title: Schema.String,
});

export const TopLogProbSchema = Schema.Struct({
  token: Schema.String,
  logprob: Schema.Number,
  bytes: Schema.Array(Schema.Number),
});

export const LogProbSchema = Schema.Struct({
  token: Schema.String,
  logprob: Schema.Number,
  bytes: Schema.Array(Schema.Number),
  top_logprobs: Schema.Array(TopLogProbSchema),
});

export const OutputTextContentSchema = Schema.Struct({
  type: Schema.Literal("output_text"),
  text: Schema.String,
  annotations: Schema.Array(UrlCitationBodySchema),
  logprobs: Schema.Array(LogProbSchema),
});

export const TextContentSchema = Schema.Struct({
  type: Schema.Literal("text_content"),
  text: Schema.String,
});

export const SummaryTextContentSchema = Schema.Struct({
  type: Schema.Literal("summary_text"),
  text: Schema.String,
});

export const ReasoningTextContentSchema = Schema.Struct({
  type: Schema.Literal("reasoning"),
  text: Schema.String,
});

export const RefusalContentSchema = Schema.Struct({
  type: Schema.Literal("refusal"),
  refusal: Schema.String,
});

export const InputImageContentSchema = Schema.Struct({
  type: Schema.Literal("input_image"),
  image_url: Schema.NullOr(Schema.String),
  detail: ImageDetailSchema,
});

export const InputFileContentSchema = Schema.Struct({
  type: Schema.Literal("input_file"),
  filename: Schema.optionalWith(Schema.String, { exact: true }),
  file_url: Schema.optionalWith(Schema.String, { exact: true }),
});

export const ResponseContentPartSchema = Schema.Union(
  InputTextContentSchema,
  OutputTextContentSchema,
  TextContentSchema,
  SummaryTextContentSchema,
  ReasoningTextContentSchema,
  RefusalContentSchema,
  InputImageContentSchema,
  InputFileContentSchema,
);

export const MessageContentPartSchema = Schema.Union(
  InputTextContentSchema,
  OutputTextContentSchema,
  TextContentSchema,
  SummaryTextContentSchema,
  ReasoningTextContentSchema,
  RefusalContentSchema,
  InputImageContentSchema,
  InputFileContentSchema,
  InputVideoContentSchema,
);

export const MessageSchema = Schema.Struct({
  type: Schema.Literal("message"),
  id: Schema.String,
  status: MessageStatusSchema,
  role: MessageRoleSchema,
  content: Schema.Array(MessageContentPartSchema),
});

export type Message = Schema.Schema.Type<typeof MessageSchema>;

export const FunctionCallSchema = Schema.Struct({
  type: Schema.Literal("function_call"),
  id: Schema.String,
  call_id: Schema.String,
  name: Schema.String,
  arguments: Schema.String,
  status: FunctionCallStatusSchema,
});

export type FunctionCall = Schema.Schema.Type<typeof FunctionCallSchema>;

export const FunctionCallOutputSchema = Schema.Struct({
  type: Schema.Literal("function_call_output"),
  id: Schema.String,
  call_id: Schema.String,
  output: Schema.Union(
    Schema.String,
    Schema.Array(
      Schema.Union(InputTextContentSchema, InputImageContentSchema, InputFileContentSchema),
    ),
  ),
  status: FunctionCallStatusSchema,
});

export type FunctionCallOutput = Schema.Schema.Type<typeof FunctionCallOutputSchema>;

export const ReasoningBodySchema = Schema.Struct({
  type: Schema.Literal("reasoning"),
  id: Schema.String,
  content: Schema.optionalWith(Schema.Array(ResponseContentPartSchema), { exact: true }),
  summary: Schema.Array(ResponseContentPartSchema),
  encrypted_content: Schema.optionalWith(Schema.String, { exact: true }),
});

export const ItemFieldSchema = Schema.Union(
  MessageSchema,
  FunctionCallSchema,
  FunctionCallOutputSchema,
  ReasoningBodySchema,
);

export type ItemField = Schema.Schema.Type<typeof ItemFieldSchema>;
export type ReasoningBody = Schema.Schema.Type<typeof ReasoningBodySchema>;

export const ItemFieldWithoutTypeSchema = Schema.Struct({ id: Schema.String });

export const AnnotationWithoutTypeSchema = Schema.Struct({
  url: Schema.String,
  start_index: Schema.Number,
  end_index: Schema.Number,
  title: Schema.String,
});

export const IncompleteDetailsSchema = Schema.Struct({ reason: Schema.String });

export const ResponseErrorSchema = Schema.Struct({
  code: Schema.String,
  message: Schema.String,
});

export const FunctionToolSchema = Schema.Struct({
  type: Schema.Literal("function"),
  name: Schema.String,
  description: Schema.NullOr(Schema.String),
  parameters: Schema.NullOr(Schema.Record({ key: Schema.String, value: Schema.Unknown })),
  strict: Schema.NullOr(Schema.Boolean),
});

export const FunctionToolChoiceSchema = Schema.Struct({
  type: Schema.Literal("function"),
  name: Schema.optionalWith(Schema.String, { exact: true }),
});

export const AllowedToolChoiceSchema = Schema.Struct({
  type: Schema.Literal("allowed_tools"),
  tools: Schema.Array(FunctionToolChoiceSchema),
  mode: ToolChoiceValueEnumSchema,
});

export const ResponseToolChoiceSchema = Schema.Union(
  FunctionToolChoiceSchema,
  ToolChoiceValueEnumSchema,
  AllowedToolChoiceSchema,
);

export const JsonObjectResponseFormatSchema = Schema.Struct({
  type: Schema.Literal("json_object"),
});

export const JsonSchemaResponseFormatSchema = Schema.Struct({
  type: Schema.Literal("json_schema"),
  name: Schema.String,
  description: Schema.NullOr(Schema.String),
  schema: Schema.NullOr(Schema.Record({ key: Schema.String, value: Schema.Unknown })),
  strict: Schema.Boolean,
});

export const TextFieldFormatSchema = Schema.Union(
  TextResponseFormatSchema,
  JsonObjectResponseFormatSchema,
  JsonSchemaResponseFormatSchema,
);

export const TextFieldSchema = Schema.Struct({
  format: TextFieldFormatSchema,
  verbosity: Schema.optionalWith(VerbosityEnumSchema, { exact: true }),
});

export const ReasoningSchema = Schema.Struct({
  effort: Schema.NullOr(ReasoningEffortEnumSchema),
  summary: Schema.NullOr(ReasoningSummaryEnumSchema),
});

export const InputTokensDetailsSchema = Schema.Struct({ cached_tokens: Schema.Number });
export const OutputTokensDetailsSchema = Schema.Struct({ reasoning_tokens: Schema.Number });

export const UsageSchema = Schema.Struct({
  input_tokens: Schema.Number,
  output_tokens: Schema.Number,
  total_tokens: Schema.Number,
  input_tokens_details: InputTokensDetailsSchema,
  output_tokens_details: OutputTokensDetailsSchema,
});

export const ResponseResourceSchema = Schema.Struct({
  id: Schema.String,
  object: Schema.Literal("response"),
  created_at: Schema.Number,
  completed_at: Schema.NullOr(Schema.Number),
  status: Schema.String,
  incomplete_details: Schema.NullOr(IncompleteDetailsSchema),
  model: Schema.String,
  previous_response_id: Schema.NullOr(Schema.String),
  instructions: Schema.NullOr(Schema.String),
  output: Schema.Array(ItemFieldSchema),
  error: Schema.NullOr(ResponseErrorSchema),
  tools: Schema.Array(FunctionToolSchema),
  tool_choice: ResponseToolChoiceSchema,
  truncation: TruncationEnumSchema,
  parallel_tool_calls: Schema.Boolean,
  text: TextFieldSchema,
  top_p: Schema.Number,
  presence_penalty: Schema.Number,
  frequency_penalty: Schema.Number,
  top_logprobs: Schema.Number,
  temperature: Schema.Number,
  reasoning: Schema.NullOr(ReasoningSchema),
  usage: Schema.NullOr(UsageSchema),
  max_output_tokens: Schema.NullOr(Schema.Number),
  max_tool_calls: Schema.NullOr(Schema.Number),
  store: Schema.Boolean,
  background: Schema.Boolean,
  service_tier: Schema.String,
  metadata: Schema.NullOr(Schema.Record({ key: Schema.String, value: Schema.String })),
  safety_identifier: Schema.NullOr(Schema.String),
  prompt_cache_key: Schema.NullOr(Schema.String),
});

export const ResponseCreatedStreamingEventSchema = Schema.Struct({
  type: Schema.Literal("response.created"),
  sequence_number: Schema.Number,
  response: ResponseResourceSchema,
});

export const ResponseQueuedStreamingEventSchema = Schema.Struct({
  type: Schema.Literal("response.queued"),
  sequence_number: Schema.Number,
  response: ResponseResourceSchema,
});

export const ResponseInProgressStreamingEventSchema = Schema.Struct({
  type: Schema.Literal("response.in_progress"),
  sequence_number: Schema.Number,
  response: ResponseResourceSchema,
});

export const ResponseCompletedStreamingEventSchema = Schema.Struct({
  type: Schema.Literal("response.completed"),
  sequence_number: Schema.Number,
  response: ResponseResourceSchema,
});

export const ResponseFailedStreamingEventSchema = Schema.Struct({
  type: Schema.Literal("response.failed"),
  sequence_number: Schema.Number,
  response: ResponseResourceSchema,
});

export const ResponseIncompleteStreamingEventSchema = Schema.Struct({
  type: Schema.Literal("response.incomplete"),
  sequence_number: Schema.Number,
  response: ResponseResourceSchema,
});

export const ResponseOutputItemAddedStreamingEventSchema = Schema.Struct({
  type: Schema.Literal("response.output_item.added"),
  sequence_number: Schema.Number,
  output_index: Schema.Number,
  item: Schema.NullOr(ItemFieldWithoutTypeSchema),
});

export const ResponseOutputItemDoneStreamingEventSchema = Schema.Struct({
  type: Schema.Literal("response.output_item.done"),
  sequence_number: Schema.Number,
  output_index: Schema.Number,
  item: Schema.NullOr(ItemFieldWithoutTypeSchema),
});

export const ResponseReasoningSummaryPartAddedStreamingEventSchema = Schema.Struct({
  type: Schema.Literal("response.reasoning_summary_part.added"),
  sequence_number: Schema.Number,
  item_id: Schema.String,
  output_index: Schema.Number,
  summary_index: Schema.Number,
  part: ResponseContentPartSchema,
});

export const ResponseReasoningSummaryPartDoneStreamingEventSchema = Schema.Struct({
  type: Schema.Literal("response.reasoning_summary_part.done"),
  sequence_number: Schema.Number,
  item_id: Schema.String,
  output_index: Schema.Number,
  summary_index: Schema.Number,
  part: ResponseContentPartSchema,
});

export const ResponseContentPartAddedStreamingEventSchema = Schema.Struct({
  type: Schema.Literal("response.content_part.added"),
  sequence_number: Schema.Number,
  item_id: Schema.String,
  output_index: Schema.Number,
  content_index: Schema.Number,
  part: ResponseContentPartSchema,
});

export const ResponseContentPartDoneStreamingEventSchema = Schema.Struct({
  type: Schema.Literal("response.content_part.done"),
  sequence_number: Schema.Number,
  item_id: Schema.String,
  output_index: Schema.Number,
  content_index: Schema.Number,
  part: ResponseContentPartSchema,
});

export const ResponseOutputTextDeltaStreamingEventSchema = Schema.Struct({
  type: Schema.Literal("response.output_text.delta"),
  sequence_number: Schema.Number,
  item_id: Schema.String,
  output_index: Schema.Number,
  content_index: Schema.Number,
  delta: Schema.String,
  logprobs: Schema.Array(LogProbSchema),
  obfuscation: Schema.optionalWith(Schema.String, { exact: true }),
});

export const ResponseOutputTextDoneStreamingEventSchema = Schema.Struct({
  type: Schema.Literal("response.output_text.done"),
  sequence_number: Schema.Number,
  item_id: Schema.String,
  output_index: Schema.Number,
  content_index: Schema.Number,
  text: Schema.String,
  logprobs: Schema.Array(LogProbSchema),
});

export const ResponseRefusalDeltaStreamingEventSchema = Schema.Struct({
  type: Schema.Literal("response.refusal.delta"),
  sequence_number: Schema.Number,
  item_id: Schema.String,
  output_index: Schema.Number,
  content_index: Schema.Number,
  delta: Schema.String,
});

export const ResponseRefusalDoneStreamingEventSchema = Schema.Struct({
  type: Schema.Literal("response.refusal.done"),
  sequence_number: Schema.Number,
  item_id: Schema.String,
  output_index: Schema.Number,
  content_index: Schema.Number,
  refusal: Schema.String,
});

export const ResponseReasoningDeltaStreamingEventSchema = Schema.Struct({
  type: Schema.Literal("response.reasoning.delta"),
  sequence_number: Schema.Number,
  item_id: Schema.String,
  output_index: Schema.Number,
  content_index: Schema.Number,
  delta: Schema.String,
  obfuscation: Schema.optionalWith(Schema.String, { exact: true }),
});

export const ResponseReasoningDoneStreamingEventSchema = Schema.Struct({
  type: Schema.Literal("response.reasoning.done"),
  sequence_number: Schema.Number,
  item_id: Schema.String,
  output_index: Schema.Number,
  content_index: Schema.Number,
  text: Schema.String,
});

export const ResponseReasoningSummaryDeltaStreamingEventSchema = Schema.Struct({
  type: Schema.Literal("response.reasoning_summary.delta"),
  sequence_number: Schema.Number,
  item_id: Schema.String,
  output_index: Schema.Number,
  summary_index: Schema.Number,
  delta: Schema.String,
  obfuscation: Schema.optionalWith(Schema.String, { exact: true }),
});

export const ResponseReasoningSummaryDoneStreamingEventSchema = Schema.Struct({
  type: Schema.Literal("response.reasoning_summary.done"),
  sequence_number: Schema.Number,
  item_id: Schema.String,
  output_index: Schema.Number,
  summary_index: Schema.Number,
  text: Schema.String,
});

export const ResponseOutputTextAnnotationAddedStreamingEventSchema = Schema.Struct({
  type: Schema.Literal("response.output_text.annotation.added"),
  sequence_number: Schema.Number,
  item_id: Schema.String,
  output_index: Schema.Number,
  content_index: Schema.Number,
  annotation_index: Schema.Number,
  annotation: Schema.NullOr(AnnotationWithoutTypeSchema),
});

export const ResponseFunctionCallArgumentsDeltaStreamingEventSchema = Schema.Struct({
  type: Schema.Literal("response.function_call_arguments.delta"),
  sequence_number: Schema.Number,
  item_id: Schema.String,
  output_index: Schema.Number,
  delta: Schema.String,
  obfuscation: Schema.optionalWith(Schema.String, { exact: true }),
});

export const ResponseFunctionCallArgumentsDoneStreamingEventSchema = Schema.Struct({
  type: Schema.Literal("response.function_call_arguments.done"),
  sequence_number: Schema.Number,
  item_id: Schema.String,
  output_index: Schema.Number,
  arguments: Schema.String,
});

export const ErrorPayloadSchema = Schema.Struct({
  type: Schema.String,
  code: Schema.NullOr(Schema.String),
  message: Schema.String,
  param: Schema.NullOr(Schema.String),
  headers: Schema.optionalWith(Schema.Record({ key: Schema.String, value: Schema.String }), {
    exact: true,
  }),
});

export const ErrorStreamingEventSchema = Schema.Struct({
  type: Schema.Literal("error"),
  sequence_number: Schema.Number,
  error: ErrorPayloadSchema,
});

export const StreamingEventSchema = Schema.Union(
  ResponseCreatedStreamingEventSchema,
  ResponseQueuedStreamingEventSchema,
  ResponseInProgressStreamingEventSchema,
  ResponseCompletedStreamingEventSchema,
  ResponseFailedStreamingEventSchema,
  ResponseIncompleteStreamingEventSchema,
  ResponseOutputItemAddedStreamingEventSchema,
  ResponseOutputItemDoneStreamingEventSchema,
  ResponseReasoningSummaryPartAddedStreamingEventSchema,
  ResponseReasoningSummaryPartDoneStreamingEventSchema,
  ResponseContentPartAddedStreamingEventSchema,
  ResponseContentPartDoneStreamingEventSchema,
  ResponseOutputTextDeltaStreamingEventSchema,
  ResponseOutputTextDoneStreamingEventSchema,
  ResponseRefusalDeltaStreamingEventSchema,
  ResponseRefusalDoneStreamingEventSchema,
  ResponseReasoningDeltaStreamingEventSchema,
  ResponseReasoningDoneStreamingEventSchema,
  ResponseReasoningSummaryDeltaStreamingEventSchema,
  ResponseReasoningSummaryDoneStreamingEventSchema,
  ResponseOutputTextAnnotationAddedStreamingEventSchema,
  ResponseFunctionCallArgumentsDeltaStreamingEventSchema,
  ResponseFunctionCallArgumentsDoneStreamingEventSchema,
  ErrorStreamingEventSchema,
);

export type CreateResponseBody = Schema.Schema.Type<typeof CreateResponseBodySchema>;
export type ResponseResource = Schema.Schema.Type<typeof ResponseResourceSchema>;
export type StreamingEvent = Schema.Schema.Type<typeof StreamingEventSchema>;
