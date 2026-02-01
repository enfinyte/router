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

export class IntentError extends Data.TaggedError("IntentError")<{
  readonly reason: "InvalidIntent";
  readonly message: string;
}> {}
