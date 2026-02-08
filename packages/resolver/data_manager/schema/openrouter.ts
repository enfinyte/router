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
