import { Context } from "effect";

interface RequestContextImpl {
  readonly userId: string;
  readonly userProviders: readonly string[];
}

export class RequestContext extends Context.Tag("RequestContext")<
  RequestContext,
  RequestContextImpl
>() {}
