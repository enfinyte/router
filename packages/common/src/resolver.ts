import { Schema } from "effect";

export const ResolvedResponseSchema = Schema.Struct({
  model: Schema.String,
  provider: Schema.String,
});

export type ResolvedResponse = Schema.Schema.Type<typeof ResolvedResponseSchema>;
