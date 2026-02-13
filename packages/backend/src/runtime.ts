import { Effect, type Layer, ManagedRuntime } from "effect";
import { AppLive } from "./layers";

export type AppRequirements = Layer.Layer.Success<typeof AppLive>;

export const appRuntime = ManagedRuntime.make(AppLive);

export const runHandler = <A>(effect: Effect.Effect<A, never, AppRequirements>) =>
  appRuntime.runPromise(effect);
