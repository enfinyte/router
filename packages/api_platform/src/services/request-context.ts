import type { ProviderModelPair } from "resolver/src/types";

import { Context } from "effect";

interface RequestContextImpl {
  readonly userId: string;
  readonly userProviders: readonly string[];
  readonly fallbackProviderModelPair: ProviderModelPair;
  readonly analysisTarget: string;
}

export class RequestContext extends Context.Tag("RequestContext")<
  RequestContext,
  RequestContextImpl
>() {}
