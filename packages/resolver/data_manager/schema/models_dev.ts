import { Schema } from "effect";

export const ModalitiesSchema = Schema.Struct({
  input: Schema.Array(Schema.String),
  output: Schema.Array(Schema.String),
});

export const CostSchema = Schema.Struct({
  input: Schema.Number,
  output: Schema.Number,
});

export const LimitSchema = Schema.Struct({
  context: Schema.Number,
  output: Schema.Number,
});

export const ModelSchema = Schema.Struct({
  id: Schema.String,
  // name: Schema.String,
  // family: Schema.optional(Schema.String),
  // attachment: Schema.Boolean,
  // reasoning: Schema.Boolean,
  // tool_call: Schema.Boolean,
  // structured_output: Schema.optional(Schema.Boolean),
  // temperature: Schema.optional(Schema.Boolean),
  // knowledge: Schema.optional(Schema.String),
  // release_date: Schema.String,
  // last_updated: Schema.String,
  // modalities: ModalitiesSchema,
  // open_weights: Schema.Boolean,
  // cost: Schema.optional(CostSchema),
  // limit: LimitSchema,
});

export const ModelMapSchema = Schema.Record({
  key: Schema.String,
  value: ModelSchema,
});

export const ProvdierSchema = Schema.Struct({
  id: Schema.String,
  // env: Schema.Array(Schema.String),
  // npm: Schema.String,
  // api: Schema.optional(Schema.String),
  // name: Schema.String,
  // doc: Schema.String,
  models: ModelMapSchema,
});

export const RootSchema = Schema.Record({
  key: Schema.String,
  value: ProvdierSchema,
});
