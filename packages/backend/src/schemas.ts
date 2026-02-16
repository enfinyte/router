import { Schema } from "effect";
import { SUPPORTED_PROVIDERS } from "common";

const SupportedProvider = Schema.Literal(...SUPPORTED_PROVIDERS);

export const ToggleEnabledBodySchema = Schema.Struct({
  enabled: Schema.Boolean,
});

export const VerifyApiKeyBodySchema = Schema.Struct({
  key: Schema.String.pipe(Schema.minLength(1)),
});

export const CreateSecretBodySchema = Schema.Struct({
  provider: SupportedProvider,
  keys: Schema.Record({
    key: Schema.String,
    value: Schema.String.pipe(Schema.minLength(1)),
  }),
}).pipe(
  Schema.filter((body) => Object.keys(body.keys).length > 0, {
    message: () => "At least one non-empty key is required",
  }),
);

export const IntervalSchema = Schema.Literal("15M", "1H", "1D", "7D");

export type ToggleEnabledBody = Schema.Schema.Type<typeof ToggleEnabledBodySchema>;
export type VerifyApiKeyBody = Schema.Schema.Type<typeof VerifyApiKeyBodySchema>;
export type CreateSecretBody = Schema.Schema.Type<typeof CreateSecretBodySchema>;
