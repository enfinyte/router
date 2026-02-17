import { Context } from "effect";

interface RequestContextImpl {
  readonly userId: string;
  readonly userProviders: readonly string[];
  readonly fallbackProviderModelPair: string | undefined;
  readonly analysisTarget: string | undefined;
}

export class RequestContext extends Context.Tag("RequestContext")<
  RequestContext,
  RequestContextImpl
>() {}
