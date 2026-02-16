import { Data, Schema } from "effect";

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
  "auto",
  "most-popular",
  "pricing-low-to-high",
  "pricing-high-to-low",
  "context-high-to-low",
  "latency-low-to-high",
  "throughput-high-to-low",
);
export type IntentPolicy = Schema.Schema.Type<typeof IntentPolicy>;

export const INTENT_POLICIES: ReadonlyArray<IntentPolicy> = IntentPolicy.literals;

/** All intents except "auto", used for data fetching orders. */
export const ORDERS: ReadonlyArray<IntentPolicy> = INTENT_POLICIES.filter(
  (i): i is Exclude<IntentPolicy, "auto"> => i !== "auto",
);

export class IntentPair extends Data.TaggedClass("IntentPair")<{
  readonly intent: Intent;
  readonly intentPolicy: IntentPolicy;
}> {}

export class ProviderModelPair extends Data.TaggedClass("ProviderModelPair")<{
  readonly model: string;
  readonly provider: string;
}> {}

export class ResolveError extends Data.TaggedError("ResolveError")<{
  readonly reason: "InvalidModelType" | "UnsupportedInputType";
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
