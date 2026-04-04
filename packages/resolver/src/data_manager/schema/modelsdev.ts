import { Schema } from "effect";

const ProviderSchema = Schema.Struct({
  models: Schema.Record({
    key: Schema.String,
    value: Schema.Struct({
      cost: Schema.optional(
        Schema.Struct({
          input: Schema.Number,
          output: Schema.Number,
        }),
      ),
    }),
  }),
});

export const ProvidersSchema = Schema.Record({
  key: Schema.String,
  value: ProviderSchema,
});

export const ProviderModelMapSchema = Schema.transform(
  ProvidersSchema,
  Schema.Record({
    key: Schema.String,
    value: Schema.Array(Schema.String),
  }),
  {
    strict: false,
    decode: (providers) =>
      Object.fromEntries(
        Object.entries(providers).map(([providerName, provider]) => [
          providerName,
          Object.keys(provider.models ?? {}),
        ]),
      ),
    encode: (a) => a,
  },
);

export const ProviderModelToCostSchema = Schema.transform(
  ProvidersSchema,
  Schema.Record({
    key: Schema.String,
    value: Schema.Array(
      Schema.Struct({
        input: Schema.Number,
        output: Schema.Number,
        model: Schema.String,
      }),
    ),
  }),
  {
    strict: false,
    decode: (providers) =>
      Object.fromEntries(
        Object.entries(providers).map(([provider, { models }]) => [
          provider,
          Object.entries(models).map(([modelName, { cost }]) => ({
            input: cost?.input ?? 0,
            output: cost?.output ?? 0,
            model: modelName,
          })),
        ]),
      ),
    encode: (a) => a,
  },
);
