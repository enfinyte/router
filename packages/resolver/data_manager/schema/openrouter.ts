import { Schema } from "effect";

export const EndpointSchema = Schema.Struct({
  // name: Schema.String,
  // model_variant_slug: Schema.String,
  // model_variant_permaslug: Schema.String,
  // adapter_name: Schema.String,
  provider_name: Schema.String,
  provider_display_name: Schema.String,
  provider_slug: Schema.String,
  // provider_model_id: Schema.String,
});

export const ModelSchema = Schema.Struct({
  slug: Schema.String,
  // name: Schema.String,
  // short_name: Schema.String,
  // author: Schema.String,
  // permaslug: Schema.String,
  // endpoint: EndpointSchema,
});

export const Models = Schema.Struct({
  models: Schema.ArrayEnsure(ModelSchema),
});

export const RootSchema = Schema.Struct({
  data: Models,
});
