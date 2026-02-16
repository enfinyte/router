import { Schema } from "effect";

const ProviderSchema = Schema.Struct({
  models: Schema.Record({
    key: Schema.String,
    value: Schema.Unknown,
  }),
});

const ProvidersSchema = Schema.Record({
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
