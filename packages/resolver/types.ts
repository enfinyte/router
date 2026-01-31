import { Data } from "effect";

export type { ResponseCreateParams } from "openai/resources/responses/responses";

export type ResolvedResponse = {
    model: string,
    provider: string
}

export class ResolveError extends Data.TaggedError("ResolveError")<{
    readonly reason: "InvalidModelType";
    readonly message: string;
}> { }

export class ParseError extends Data.TaggedError("ParseError")<{
    readonly reason: "BadFormatting" | "InvalidCharacters" | "EmptyProvider" | "EmptyModel";
    readonly message: string;
}> { }
