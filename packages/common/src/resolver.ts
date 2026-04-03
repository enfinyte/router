import { Schema } from "effect";

export const ResolvedResponseSchema = Schema.Struct({
  model: Schema.String,
  provider: Schema.String,
  category: Schema.NullOr(Schema.String),
});

export type ResolvedResponse = Schema.Schema.Type<typeof ResolvedResponseSchema>;
