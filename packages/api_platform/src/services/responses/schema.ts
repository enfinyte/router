import { Schema } from "effect";

const IncludeEnumSchema = Schema.Literal(
  "reasoning.encrypted_content",
  "message.output_text.logprobs",
);

const ImageDetailSchema = Schema.Literal("low", "high", "auto");

const FunctionCallStatusSchema = Schema.Literal("in_progress", "completed", "incomplete");

const ToolChoiceValueEnumSchema = Schema.Literal("none", "auto", "required");

const VerbosityEnumSchema = Schema.Literal("low", "medium", "high");

const ReasoningEffortEnumSchema = Schema.Literal("none", "low", "medium", "high", "xhigh");

const ReasoningSummaryEnumSchema = Schema.Literal("concise", "detailed", "auto");

const TruncationEnumSchema = Schema.Literal("auto", "disabled");

const ServiceTierEnumSchema = Schema.Literal("auto", "default", "flex", "priority");

const ReasoningSummaryContentParamSchema = Schema.Struct({
  type: Schema.Literal("summary_text"),
  text: Schema.String,
});

const InputTextContentParamSchema = Schema.Struct({
  type: Schema.Literal("input_text"),
  text: Schema.String,
});

const InputImageContentParamAutoParamSchema = Schema.Struct({
  type: Schema.Literal("input_image"),
  image_url: Schema.optionalWith(Schema.NullOr(Schema.String), { exact: true }),
  detail: Schema.optionalWith(Schema.NullOr(ImageDetailSchema), { exact: true }),
});

const InputFileContentParamSchema = Schema.Struct({
  type: Schema.Literal("input_file"),
  filename: Schema.optionalWith(Schema.NullOr(Schema.String), { exact: true }),
  file_data: Schema.optionalWith(Schema.NullOr(Schema.String), { exact: true }),
  file_url: Schema.optionalWith(Schema.NullOr(Schema.String), { exact: true }),
});

const InputVideoContentSchema = Schema.Struct({
  type: Schema.Literal("input_video"),
  video_url: Schema.String,
});

const UrlCitationParamSchema = Schema.Struct({
  type: Schema.Literal("url_citation"),
  start_index: Schema.Number,
  end_index: Schema.Number,
  url: Schema.String,
  title: Schema.String,
});

const OutputTextContentParamSchema = Schema.Struct({
  type: Schema.Literal("output_text"),
  text: Schema.String,
  annotations: Schema.optionalWith(Schema.Array(UrlCitationParamSchema), { exact: true }),
});

const RefusalContentParamSchema = Schema.Struct({
  type: Schema.Literal("refusal"),
  refusal: Schema.String,
});

const ItemReferenceParamSchema = Schema.Struct({
  type: Schema.Literal("item_reference"),
  id: Schema.String,
});

const ReasoningItemParamSchema = Schema.Struct({
  id: Schema.optionalWith(Schema.NullOr(Schema.String), { exact: true }),
  type: Schema.Literal("reasoning"),
  summary: Schema.Array(ReasoningSummaryContentParamSchema),
  content: Schema.optionalWith(Schema.Null, { exact: true }),
  encrypted_content: Schema.optionalWith(Schema.NullOr(Schema.String), { exact: true }),
});

const UserMessageItemParamSchema = Schema.Struct({
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

const SystemMessageItemParamSchema = Schema.Struct({
  id: Schema.optionalWith(Schema.NullOr(Schema.String), { exact: true }),
  type: Schema.Literal("message"),
  role: Schema.Literal("system"),
  content: Schema.Union(Schema.Array(InputTextContentParamSchema), Schema.String),
  status: Schema.optionalWith(Schema.NullOr(Schema.String), { exact: true }),
});

const DeveloperMessageItemParamSchema = Schema.Struct({
  id: Schema.optionalWith(Schema.NullOr(Schema.String), { exact: true }),
  type: Schema.Literal("message"),
  role: Schema.Literal("developer"),
  content: Schema.Union(Schema.Array(InputTextContentParamSchema), Schema.String),
  status: Schema.optionalWith(Schema.NullOr(Schema.String), { exact: true }),
});

const AssistantMessageItemParamSchema = Schema.Struct({
  id: Schema.optionalWith(Schema.NullOr(Schema.String), { exact: true }),
  type: Schema.Literal("message"),
  role: Schema.Literal("assistant"),
  content: Schema.Union(
    Schema.Array(Schema.Union(OutputTextContentParamSchema, RefusalContentParamSchema)),
    Schema.String,
  ),
  status: Schema.optionalWith(Schema.NullOr(Schema.String), { exact: true }),
});

const FunctionCallItemParamSchema = Schema.Struct({
  id: Schema.optionalWith(Schema.NullOr(Schema.String), { exact: true }),
  call_id: Schema.String,
  type: Schema.Literal("function_call"),
  name: Schema.String,
  arguments: Schema.String,
  status: Schema.optionalWith(Schema.NullOr(FunctionCallStatusSchema), { exact: true }),
});

const FunctionCallOutputItemParamSchema = Schema.Struct({
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

const ItemParamSchema = Schema.Union(
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

const EmptyModelParamSchema = Schema.Record({ key: Schema.String, value: Schema.Unknown });

const FunctionToolParamSchema = Schema.Struct({
  name: Schema.String,
  description: Schema.optionalWith(Schema.NullOr(Schema.String), { exact: true }),
  parameters: Schema.optionalWith(Schema.NullOr(EmptyModelParamSchema), { exact: true }),
  strict: Schema.optionalWith(Schema.Boolean, { exact: true }),
  type: Schema.Literal("function"),
});

const SpecificFunctionParamSchema = Schema.Struct({
  type: Schema.Literal("function"),
  name: Schema.String,
});

const AllowedToolsParamSchema = Schema.Struct({
  type: Schema.Literal("allowed_tools"),
  tools: Schema.Array(SpecificFunctionParamSchema),
  mode: Schema.optionalWith(ToolChoiceValueEnumSchema, { exact: true }),
});

const ToolChoiceParamSchema = Schema.Union(
  SpecificFunctionParamSchema,
  ToolChoiceValueEnumSchema,
  AllowedToolsParamSchema,
);

const MetadataParamSchema = Schema.Record({ key: Schema.String, value: Schema.String });

const TextResponseFormatSchema = Schema.Struct({
  type: Schema.Literal("text"),
});

const JsonSchemaResponseFormatParamSchema = Schema.Struct({
  type: Schema.optionalWith(Schema.Literal("json_schema"), { exact: true }),
  description: Schema.optionalWith(Schema.String, { exact: true }),
  name: Schema.optionalWith(Schema.String, { exact: true }),
  schema: Schema.optionalWith(Schema.Record({ key: Schema.String, value: Schema.Unknown }), {
    exact: true,
  }),
  strict: Schema.optionalWith(Schema.NullOr(Schema.Boolean), { exact: true }),
});

const TextFormatParamSchema = Schema.Union(
  TextResponseFormatSchema,
  JsonSchemaResponseFormatParamSchema,
);

const TextParamSchema = Schema.Struct({
  format: Schema.optionalWith(Schema.NullOr(TextFormatParamSchema), { exact: true }),
  verbosity: Schema.optionalWith(VerbosityEnumSchema, { exact: true }),
});

const StreamOptionsParamSchema = Schema.Struct({
  include_obfuscation: Schema.optionalWith(Schema.Boolean, { exact: true }),
});

const ReasoningParamSchema = Schema.Struct({
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

const MessageStatusSchema = Schema.Literal("in_progress", "completed", "incomplete");
const MessageRoleSchema = Schema.Literal("user", "assistant", "system", "developer");

const InputTextContentSchema = Schema.Struct({
  type: Schema.Literal("input_text"),
  text: Schema.String,
});

const UrlCitationBodySchema = Schema.Struct({
  type: Schema.Literal("url_citation"),
  url: Schema.String,
  start_index: Schema.Number,
  end_index: Schema.Number,
  title: Schema.String,
});

const TopLogProbSchema = Schema.Struct({
  token: Schema.String,
  logprob: Schema.Number,
  bytes: Schema.Array(Schema.Number),
});

const LogProbSchema = Schema.Struct({
  token: Schema.String,
  logprob: Schema.Number,
  bytes: Schema.Array(Schema.Number),
  top_logprobs: Schema.Array(TopLogProbSchema),
});

const OutputTextContentSchema = Schema.Struct({
  type: Schema.Literal("output_text"),
  text: Schema.String,
  annotations: Schema.Array(UrlCitationBodySchema),
  logprobs: Schema.Array(LogProbSchema),
});

const TextContentSchema = Schema.Struct({
  type: Schema.Literal("text_content"),
  text: Schema.String,
});

const SummaryTextContentSchema = Schema.Struct({
  type: Schema.Literal("summary_text"),
  text: Schema.String,
});

const ReasoningTextContentSchema = Schema.Struct({
  type: Schema.Literal("reasoning"),
  text: Schema.String,
});

const RefusalContentSchema = Schema.Struct({
  type: Schema.Literal("refusal"),
  refusal: Schema.String,
});

const InputImageContentSchema = Schema.Struct({
  type: Schema.Literal("input_image"),
  image_url: Schema.NullOr(Schema.String),
  detail: ImageDetailSchema,
});

const InputFileContentSchema = Schema.Struct({
  type: Schema.Literal("input_file"),
  filename: Schema.optionalWith(Schema.String, { exact: true }),
  file_url: Schema.optionalWith(Schema.String, { exact: true }),
});

const ResponseContentPartSchema = Schema.Union(
  InputTextContentSchema,
  OutputTextContentSchema,
  TextContentSchema,
  SummaryTextContentSchema,
  ReasoningTextContentSchema,
  RefusalContentSchema,
  InputImageContentSchema,
  InputFileContentSchema,
);

const MessageContentPartSchema = Schema.Union(
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

const MessageSchema = Schema.Struct({
  type: Schema.Literal("message"),
  id: Schema.String,
  status: MessageStatusSchema,
  role: MessageRoleSchema,
  content: Schema.Array(MessageContentPartSchema),
});

const FunctionCallSchema = Schema.Struct({
  type: Schema.Literal("function_call"),
  id: Schema.String,
  call_id: Schema.String,
  name: Schema.String,
  arguments: Schema.String,
  status: FunctionCallStatusSchema,
});

const FunctionCallOutputSchema = Schema.Struct({
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

const ReasoningBodySchema = Schema.Struct({
  type: Schema.Literal("reasoning"),
  id: Schema.String,
  content: Schema.optionalWith(Schema.Array(ResponseContentPartSchema), { exact: true }),
  summary: Schema.Array(ResponseContentPartSchema),
  encrypted_content: Schema.optionalWith(Schema.String, { exact: true }),
});

const ItemFieldSchema = Schema.Union(
  MessageSchema,
  FunctionCallSchema,
  FunctionCallOutputSchema,
  ReasoningBodySchema,
);

const ItemFieldWithoutTypeSchema = Schema.Struct({ id: Schema.String });

const AnnotationWithoutTypeSchema = Schema.Struct({
  url: Schema.String,
  start_index: Schema.Number,
  end_index: Schema.Number,
  title: Schema.String,
});

const IncompleteDetailsSchema = Schema.Struct({ reason: Schema.String });

const ResponseErrorSchema = Schema.Struct({
  code: Schema.String,
  message: Schema.String,
});

const FunctionToolSchema = Schema.Struct({
  type: Schema.Literal("function"),
  name: Schema.String,
  description: Schema.NullOr(Schema.String),
  parameters: Schema.NullOr(Schema.Record({ key: Schema.String, value: Schema.Unknown })),
  strict: Schema.NullOr(Schema.Boolean),
});

const FunctionToolChoiceSchema = Schema.Struct({
  type: Schema.Literal("function"),
  name: Schema.optionalWith(Schema.String, { exact: true }),
});

const AllowedToolChoiceSchema = Schema.Struct({
  type: Schema.Literal("allowed_tools"),
  tools: Schema.Array(FunctionToolChoiceSchema),
  mode: ToolChoiceValueEnumSchema,
});

const ResponseToolChoiceSchema = Schema.Union(
  FunctionToolChoiceSchema,
  ToolChoiceValueEnumSchema,
  AllowedToolChoiceSchema,
);

const JsonObjectResponseFormatSchema = Schema.Struct({
  type: Schema.Literal("json_object"),
});

const JsonSchemaResponseFormatSchema = Schema.Struct({
  type: Schema.Literal("json_schema"),
  name: Schema.String,
  description: Schema.NullOr(Schema.String),
  schema: Schema.Null,
  strict: Schema.Boolean,
});

const TextFieldFormatSchema = Schema.Union(
  TextResponseFormatSchema,
  JsonObjectResponseFormatSchema,
  JsonSchemaResponseFormatSchema,
);

const TextFieldSchema = Schema.Struct({
  format: TextFieldFormatSchema,
  verbosity: Schema.optionalWith(VerbosityEnumSchema, { exact: true }),
});

const ReasoningSchema = Schema.Struct({
  effort: Schema.NullOr(ReasoningEffortEnumSchema),
  summary: Schema.NullOr(ReasoningSummaryEnumSchema),
});

const InputTokensDetailsSchema = Schema.Struct({ cached_tokens: Schema.Number });
const OutputTokensDetailsSchema = Schema.Struct({ reasoning_tokens: Schema.Number });

const UsageSchema = Schema.Struct({
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

const ResponseCreatedStreamingEventSchema = Schema.Struct({
  type: Schema.Literal("ResponseCreatedStreamingEvent"),
  sequence_number: Schema.Number,
  response: ResponseResourceSchema,
});

const ResponseQueuedStreamingEventSchema = Schema.Struct({
  type: Schema.Literal("ResponseQueuedStreamingEvent"),
  sequence_number: Schema.Number,
  response: ResponseResourceSchema,
});

const ResponseInProgressStreamingEventSchema = Schema.Struct({
  type: Schema.Literal("ResponseInProgressStreamingEvent"),
  sequence_number: Schema.Number,
  response: ResponseResourceSchema,
});

const ResponseCompletedStreamingEventSchema = Schema.Struct({
  type: Schema.Literal("ResponseCompletedStreamingEvent"),
  sequence_number: Schema.Number,
  response: ResponseResourceSchema,
});

const ResponseFailedStreamingEventSchema = Schema.Struct({
  type: Schema.Literal("ResponseFailedStreamingEvent"),
  sequence_number: Schema.Number,
  response: ResponseResourceSchema,
});

const ResponseIncompleteStreamingEventSchema = Schema.Struct({
  type: Schema.Literal("ResponseIncompleteStreamingEvent"),
  sequence_number: Schema.Number,
  response: ResponseResourceSchema,
});

const ResponseOutputItemAddedStreamingEventSchema = Schema.Struct({
  type: Schema.Literal("ResponseOutputItemAddedStreamingEvent"),
  sequence_number: Schema.Number,
  output_index: Schema.Number,
  item: Schema.NullOr(ItemFieldWithoutTypeSchema),
});

const ResponseOutputItemDoneStreamingEventSchema = Schema.Struct({
  type: Schema.Literal("ResponseOutputItemDoneStreamingEvent"),
  sequence_number: Schema.Number,
  output_index: Schema.Number,
  item: Schema.NullOr(ItemFieldWithoutTypeSchema),
});

const ResponseReasoningSummaryPartAddedStreamingEventSchema = Schema.Struct({
  type: Schema.Literal("ResponseReasoningSummaryPartAddedStreamingEvent"),
  sequence_number: Schema.Number,
  item_id: Schema.String,
  output_index: Schema.Number,
  summary_index: Schema.Number,
  part: ResponseContentPartSchema,
});

const ResponseReasoningSummaryPartDoneStreamingEventSchema = Schema.Struct({
  type: Schema.Literal("ResponseReasoningSummaryPartDoneStreamingEvent"),
  sequence_number: Schema.Number,
  item_id: Schema.String,
  output_index: Schema.Number,
  summary_index: Schema.Number,
  part: ResponseContentPartSchema,
});

const ResponseContentPartAddedStreamingEventSchema = Schema.Struct({
  type: Schema.Literal("ResponseContentPartAddedStreamingEvent"),
  sequence_number: Schema.Number,
  item_id: Schema.String,
  output_index: Schema.Number,
  content_index: Schema.Number,
  part: ResponseContentPartSchema,
});

const ResponseContentPartDoneStreamingEventSchema = Schema.Struct({
  type: Schema.Literal("ResponseContentPartDoneStreamingEvent"),
  sequence_number: Schema.Number,
  item_id: Schema.String,
  output_index: Schema.Number,
  content_index: Schema.Number,
  part: ResponseContentPartSchema,
});

const ResponseOutputTextDeltaStreamingEventSchema = Schema.Struct({
  type: Schema.Literal("ResponseOutputTextDeltaStreamingEvent"),
  sequence_number: Schema.Number,
  item_id: Schema.String,
  output_index: Schema.Number,
  content_index: Schema.Number,
  delta: Schema.String,
  logprobs: Schema.Array(LogProbSchema),
  obfuscation: Schema.optionalWith(Schema.String, { exact: true }),
});

const ResponseOutputTextDoneStreamingEventSchema = Schema.Struct({
  type: Schema.Literal("ResponseOutputTextDoneStreamingEvent"),
  sequence_number: Schema.Number,
  item_id: Schema.String,
  output_index: Schema.Number,
  content_index: Schema.Number,
  text: Schema.String,
  logprobs: Schema.Array(LogProbSchema),
});

const ResponseRefusalDeltaStreamingEventSchema = Schema.Struct({
  type: Schema.Literal("ResponseRefusalDeltaStreamingEvent"),
  sequence_number: Schema.Number,
  item_id: Schema.String,
  output_index: Schema.Number,
  content_index: Schema.Number,
  delta: Schema.String,
});

const ResponseRefusalDoneStreamingEventSchema = Schema.Struct({
  type: Schema.Literal("ResponseRefusalDoneStreamingEvent"),
  sequence_number: Schema.Number,
  item_id: Schema.String,
  output_index: Schema.Number,
  content_index: Schema.Number,
  refusal: Schema.String,
});

const ResponseReasoningDeltaStreamingEventSchema = Schema.Struct({
  type: Schema.Literal("ResponseReasoningDeltaStreamingEvent"),
  sequence_number: Schema.Number,
  item_id: Schema.String,
  output_index: Schema.Number,
  content_index: Schema.Number,
  delta: Schema.String,
  obfuscation: Schema.optionalWith(Schema.String, { exact: true }),
});

const ResponseReasoningDoneStreamingEventSchema = Schema.Struct({
  type: Schema.Literal("ResponseReasoningDoneStreamingEvent"),
  sequence_number: Schema.Number,
  item_id: Schema.String,
  output_index: Schema.Number,
  content_index: Schema.Number,
  text: Schema.String,
});

const ResponseReasoningSummaryDeltaStreamingEventSchema = Schema.Struct({
  type: Schema.Literal("ResponseReasoningSummaryDeltaStreamingEvent"),
  sequence_number: Schema.Number,
  item_id: Schema.String,
  output_index: Schema.Number,
  summary_index: Schema.Number,
  delta: Schema.String,
  obfuscation: Schema.optionalWith(Schema.String, { exact: true }),
});

const ResponseReasoningSummaryDoneStreamingEventSchema = Schema.Struct({
  type: Schema.Literal("ResponseReasoningSummaryDoneStreamingEvent"),
  sequence_number: Schema.Number,
  item_id: Schema.String,
  output_index: Schema.Number,
  summary_index: Schema.Number,
  text: Schema.String,
});

const ResponseOutputTextAnnotationAddedStreamingEventSchema = Schema.Struct({
  type: Schema.Literal("ResponseOutputTextAnnotationAddedStreamingEvent"),
  sequence_number: Schema.Number,
  item_id: Schema.String,
  output_index: Schema.Number,
  content_index: Schema.Number,
  annotation_index: Schema.Number,
  annotation: Schema.NullOr(AnnotationWithoutTypeSchema),
});

const ResponseFunctionCallArgumentsDeltaStreamingEventSchema = Schema.Struct({
  type: Schema.Literal("ResponseFunctionCallArgumentsDeltaStreamingEvent"),
  sequence_number: Schema.Number,
  item_id: Schema.String,
  output_index: Schema.Number,
  delta: Schema.String,
  obfuscation: Schema.optionalWith(Schema.String, { exact: true }),
});

const ResponseFunctionCallArgumentsDoneStreamingEventSchema = Schema.Struct({
  type: Schema.Literal("ResponseFunctionCallArgumentsDoneStreamingEvent"),
  sequence_number: Schema.Number,
  item_id: Schema.String,
  output_index: Schema.Number,
  arguments: Schema.String,
});

const ErrorPayloadSchema = Schema.Struct({
  type: Schema.String,
  code: Schema.NullOr(Schema.String),
  message: Schema.String,
  param: Schema.NullOr(Schema.String),
  headers: Schema.optionalWith(Schema.Record({ key: Schema.String, value: Schema.String }), {
    exact: true,
  }),
});

const ErrorStreamingEventSchema = Schema.Struct({
  type: Schema.Literal("ErrorStreamingEvent"),
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
