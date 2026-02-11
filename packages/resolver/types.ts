import { Data, Schema } from "effect";

export type { ResponseCreateParams } from "openai/resources/responses/responses";

export const Intent = Schema.Literal(
  "auto",
  "academia",
  "finance",
  "health",
  "legal",
  "marketing",
  "programming",
  "roleplay",
  "science",
  "seo",
  "technology",
  "translation",
  "trivia",
);
export type Intent = Schema.Schema.Type<typeof Intent>;

export const INTENTS: ReadonlyArray<Intent> = Intent.literals;

/** All intents except "auto", used for data fetching categories. */
export const CATEGORIES: ReadonlyArray<Intent> = INTENTS.filter(
  (i): i is Exclude<Intent, "auto"> => i !== "auto",
);

export const IntentPolicy = Schema.Literal(
  "most-popular",
  "pricing-low-to-high",
  "pricing-high-to-low",
  "context-high-to-low",
  "latency-low-to-high",
  "throughput-high-to-low",
);
export type IntentPolicy = Schema.Schema.Type<typeof IntentPolicy>;

export const INTENT_POLICIES: ReadonlyArray<IntentPolicy> = IntentPolicy.literals;

export class IntentPair extends Data.TaggedClass("IntentPair")<{
  readonly intent: Intent;
  readonly intentPolicy: IntentPolicy;
}> {}

export class ProviderModelPair extends Data.TaggedClass("ProviderModelPair")<{
  readonly model: string;
  readonly provider: string;
}> {}

export const ResolvedResponseSchema = Schema.Struct({
  model: Schema.String,
  provider: Schema.String,
});
export type ResolvedResponse = Schema.Schema.Type<typeof ResolvedResponseSchema>;

export class ResolveError extends Data.TaggedError("ResolveError")<{
  readonly reason: "InvalidModelType";
  readonly message: string;
}> {}

export class ProviderModelParseError extends Data.TaggedError("ProviderModelParseError")<{
  readonly reason: "BadFormatting" | "InvalidCharacters" | "EmptyProvider" | "EmptyModel";
  readonly message: string;
}> {}

export class IntentParseError extends Data.TaggedError("IntentParseError")<{
  readonly reason: "BadFormatting" | "InvalidCharacters" | "EmptyIntent" | "EmptyIntentPolicy";
  readonly message: string;
}> {}

export class DataFetchError extends Data.TaggedError("DataFetchError")<{
  readonly reason: "APICallFailed" | "JSONParseFailed" | "DataParseFailed";
  readonly message: string;
  readonly cause?: unknown;
}> {}

export class NoProviderAvailableError extends Data.TaggedError("NoProviderAvailableError")<{
  readonly reason: "NoProviderConfigured";
  readonly message: string;
}> {}
