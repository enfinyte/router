import { Effect } from "effect";
import { intentMap, IntentError, Intent } from "./types";
import type { ResolvedResponse } from "./types";

export const isIntent = (model: string) => {
  return intentMap[model.toLowerCase()] !== undefined;
};

export const toIntent = (model: string): Effect.Effect<Intent, IntentError> =>
  Effect.gen(function* () {
    if (!isIntent(model)) {
      return yield* Effect.fail(
        new IntentError({
          reason: "InvalidIntent",
          message: `Not a valid intent literal, got: "${model}"`,
        }),
      );
    }

    return intentMap[model.toLowerCase()]!;
  });

export const intentImpl = (intent: string): Effect.Effect<ResolvedResponse, Error> =>
  Effect.gen(function* () {
    switch (yield* toIntent(intent)) {
      case Intent.Auto:
        return yield* autoIntent;
      case Intent.Academia:
        return yield* academiaIntent;
      case Intent.Finance:
        return yield* financeIntent;
      case Intent.Health:
        return yield* healthIntent;
      case Intent.Legal:
        return yield* legalIntent;
      case Intent.Marketing:
        return yield* marketingIntent;
      case Intent.Programming:
        return yield* programmingIntent;
      case Intent.Roleplay:
        return yield* roleplayIntent;
      case Intent.Science:
        return yield* scienceIntent;
      case Intent.Seo:
        return yield* seoIntent;
      case Intent.Technology:
        return yield* technologyIntent;
      case Intent.Translation:
        return yield* translationIntent;
      case Intent.Trivia:
        return yield* triviaIntent;
    }
  });

const academiaIntent = Effect.gen(function* () {
  return {
    model: "",
    provider: "",
  };
});

const financeIntent = Effect.gen(function* () {
  return {
    model: "",
    provider: "",
  };
});

const healthIntent = Effect.gen(function* () {
  return {
    model: "",
    provider: "",
  };
});

const legalIntent = Effect.gen(function* () {
  return {
    model: "",
    provider: "",
  };
});

const marketingIntent = Effect.gen(function* () {
  return {
    model: "",
    provider: "",
  };
});

const programmingIntent = Effect.gen(function* () {
  return {
    model: "",
    provider: "",
  };
});

const roleplayIntent = Effect.gen(function* () {
  return {
    model: "",
    provider: "",
  };
});

const scienceIntent = Effect.gen(function* () {
  return {
    model: "",
    provider: "",
  };
});

const seoIntent = Effect.gen(function* () {
  return {
    model: "",
    provider: "",
  };
});

const technologyIntent = Effect.gen(function* () {
  return {
    model: "",
    provider: "",
  };
});

const translationIntent = Effect.gen(function* () {
  return {
    model: "",
    provider: "",
  };
});

const triviaIntent = Effect.gen(function* () {
  return {
    model: "",
    provider: "",
  };
});

const autoIntent = Effect.gen(function* () {
  return {
    model: "",
    provider: "",
  };
});
