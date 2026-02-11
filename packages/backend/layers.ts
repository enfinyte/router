import { Layer } from "effect";
import { VaultServiceLive } from "vault";

import { AuthServiceLive } from "./auth";
import { DatabasePoolLive } from "./pool";

export const AppLive = AuthServiceLive.pipe(
  Layer.provideMerge(DatabasePoolLive),
  Layer.provideMerge(VaultServiceLive),
);
