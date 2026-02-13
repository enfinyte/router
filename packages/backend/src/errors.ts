import { Data } from "effect";

export class UnauthorizedError extends Data.TaggedError("UnauthorizedError")<{
  message?: string;
}> {}

export class AuthApiError extends Data.TaggedError("AuthApiError")<{
  cause?: unknown;
  message?: string;
}> {}

export class RequestValidationError extends Data.TaggedError("RequestValidationError")<{
  cause?: unknown;
  message?: string;
}> {}

export class ApiKeyAlreadyExistsError extends Data.TaggedError("ApiKeyAlreadyExistsError")<{
  message?: string;
}> {}

export class ApiKeyNotFoundError extends Data.TaggedError("ApiKeyNotFoundError")<{
  message?: string;
}> {}

export class ProviderNotConfiguredError extends Data.TaggedError("ProviderNotConfiguredError")<{
  provider: string;
}> {}
