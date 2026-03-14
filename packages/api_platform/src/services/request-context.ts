import { Context } from "effect";
import type { ProviderModelPair } from "resolver/src/types";

interface RequestContextImpl {
  readonly userId: string;
  readonly userProviders: readonly string[];
  readonly fallbackProviderModelPair: ProviderModelPair | undefined;
  readonly analysisTarget: string | undefined;
}

export class RequestContext extends Context.Tag("RequestContext")<
  RequestContext,
  RequestContextImpl
>() {}
