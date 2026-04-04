import { hoursToMilliseconds } from "date-fns";

export const TTL = hoursToMilliseconds(10);

export const REDIS_PREFIX = {
  lastFetchPoint: "enfinyte:lastFetchPoint",
  categories: "enfinyte:categories",
  modelToProviders: "enfinyte:model_to_providers:",
  providerToModels: "enfinyte:provider_to_models:",
  modelToCost: "enfinyte:model_to_cost:",
  classificationCache: "classification_cache",
} as const;
