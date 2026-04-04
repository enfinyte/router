import type { ProviderModelPair } from "common";

import { Context } from "effect";

export interface RequestParams {
  readonly userId: string;
  readonly userProviders: readonly string[];
  readonly fallbackProviderModelPair: ProviderModelPair;
  readonly analysisTarget: string;
}

export class RequestContext extends Context.Tag("RequestContext")<
  RequestContext,
  RequestParams
>() {}
