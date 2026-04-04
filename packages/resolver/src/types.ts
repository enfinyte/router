import { Data } from "effect";

export {
  Intent,
  type Intent as IntentType,
  INTENTS,
  CATEGORIES,
  IntentPolicy,
  type IntentPolicy as IntentPolicyType,
  INTENT_POLICIES,
  ORDERS,
  IntentPair,
  ProviderModelPair,
} from "common";

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
