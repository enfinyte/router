import { Effect } from "effect";
import { fileTypeFromBuffer } from "file-type";
import { makeTokenizer } from "@tokenizer/http";
import { fileTypeFromTokenizer } from "file-type";

export const detectMimeTypeFromBase64EncodedString = (dataContent: string) =>
  Effect.gen(function* () {
    const buf = Buffer.from(dataContent, "base64");
    const fileType = yield* Effect.tryPromise(() => fileTypeFromBuffer(buf));
    return fileType?.mime ?? "application/octet-stream";
  });

export const detectMimeTypeFromURL = (dataURL: string) =>
  Effect.gen(function* () {
    const httpTokenizer = yield* Effect.tryPromise(() => makeTokenizer(dataURL));
    const fileType = yield* Effect.tryPromise(() => fileTypeFromTokenizer(httpTokenizer));
    return fileType?.mime ?? "application/octet-stream";
  });
