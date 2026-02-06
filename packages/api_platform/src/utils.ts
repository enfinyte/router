import { Effect } from "effect";
import { fileTypeFromBuffer } from "file-type";
import { makeTokenizer } from "@tokenizer/http";
import { fileTypeFromTokenizer } from "file-type";

export const detectMimeTypeFromBase64EncodedString = (
  dataContent: string,
): Effect.Effect<string, never, never> =>
  Effect.gen(function* () {
    const buf = Buffer.from(dataContent, "base64");
    const fileType = yield* Effect.tryPromise(() => fileTypeFromBuffer(buf)).pipe(
      Effect.catchAll(() => Effect.succeed(null)),
    );
    return fileType?.mime ?? "application/octet-stream";
  });

export const detectMimeTypeFromURL = (dataURL: string): Effect.Effect<string, never, never> =>
  Effect.gen(function* () {
    const httpTokenizer = yield* Effect.tryPromise(() => makeTokenizer(dataURL)).pipe(
      Effect.catchAll(() => Effect.succeed(null)),
    );
    if (!httpTokenizer) return "application/octet-stream";
    const fileType = yield* Effect.tryPromise(() => fileTypeFromTokenizer(httpTokenizer)).pipe(
      Effect.catchAll(() => Effect.succeed(null)),
    );
    return fileType?.mime ?? "application/octet-stream";
  });

export function isValidUrl(maybeUrl: string): boolean {
  try {
    new URL(maybeUrl);
    return true;
  } catch {
    return false;
  }
}
