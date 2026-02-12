import { Schema } from "effect";

export const ModelSchema = Schema.Struct({
  slug: Schema.String,
});

export const Models = Schema.Struct({
  models: Schema.ArrayEnsure(ModelSchema),
});

export const RootSchema = Schema.Struct({
  data: Models,
});

export const OpenRouterMapSchema = Schema.transform(RootSchema, Schema.Array(Schema.String), {
  strict: false,
  decode: (root) => {
    return root.data.models.map((model) => model.slug);
  },
  encode: (a) => a,
});
