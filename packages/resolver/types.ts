import { Data } from "effect";

export type { ResponseCreateParams } from "openai/resources/responses/responses";

export enum Intent {
  Auto,
  Academia,
  Finance,
  Health,
  Legal,
  Marketing,
  Programming,
  Roleplay,
  Science,
  Seo,
  Technology,
  Translation,
  Trivia,
}

export const intentMap: Record<string, Intent> = {
  auto: Intent.Auto,
  academia: Intent.Academia,
  finance: Intent.Finance,
  health: Intent.Health,
  legal: Intent.Legal,
  marketing: Intent.Marketing,
  programming: Intent.Programming,
  roleplay: Intent.Roleplay,
  science: Intent.Science,
  seo: Intent.Seo,
  technology: Intent.Technology,
  translation: Intent.Translation,
  trivia: Intent.Trivia,
};

export const intentReverseMap: Record<Intent, string> = Object.fromEntries(
  Object.entries(intentMap).map(([k, v]) => [v, k]),
) as Record<Intent, string>;

export enum IntentPolicy {
  MostPopular,
  PricingLowToHigh,
  PricingHighToLow,
  ContextHightToLow,
  LatencyLowToHigh,
  ThroughputHighToLow,
}

export class IntentPair extends Data.TaggedClass("IntentPair")<{
  readonly intent: Intent;
  readonly intentPolicy: IntentPolicy;
}> {}

export const intentPolicyMap: Record<string, IntentPolicy> = {
  "most-popular": IntentPolicy.MostPopular,
  "pricing-low-to-high": IntentPolicy.PricingLowToHigh,
  "pricing-high-to-low": IntentPolicy.PricingHighToLow,
  "context-high-to-low": IntentPolicy.ContextHightToLow,
  "latency-low-to-high": IntentPolicy.LatencyLowToHigh,
  "throughput-high-to-low": IntentPolicy.ThroughputHighToLow,
};

export const intentPolicyReverseMap: Record<IntentPolicy, string> = Object.fromEntries(
  Object.entries(intentPolicyMap).map(([k, v]) => [v, k]),
) as Record<IntentPolicy, string>;

export class ProviderModelPair extends Data.TaggedClass("ProviderModelPair")<{
  readonly model: string;
  readonly provider: string;
}> {}

export type ResolvedResponse = {
  model: string;
  provider: string;
};

export class ResolveError extends Data.TaggedError("ResolveError")<{
  readonly reason: "InvalidModelType";
  readonly message: string;
}> {}

export class ParseError extends Data.TaggedError("ParseError")<{
  readonly reason: "BadFormatting" | "InvalidCharacters" | "EmptyProvider" | "EmptyModel";
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

export class IntentError extends Data.TaggedError("IntentError")<{
  readonly reason: "InvalidIntent";
  readonly message: string;
}> {}

export class APICallError extends Data.TaggedError("IntentError")<{
  readonly reason: "CallFailed";
  readonly message: string;
}> {}

export class NoProviderAvailableError extends Data.TaggedError("NoProviderAvailableError")<{
  readonly reason: "NoProviderConfigured";
  readonly message: string;
}> {}
