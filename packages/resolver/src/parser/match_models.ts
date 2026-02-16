import type { ParsedModelId } from "./parse_model_id.ts";

export function modelsMatch(a: ParsedModelId, b: ParsedModelId): boolean {
  return (
    a.family === b.family &&
    normalizeGeneration(a.generation) === normalizeGeneration(b.generation) &&
    normalizeOptional(a.tier) === normalizeOptional(b.tier) &&
    normalizeOptional(a.variant) === normalizeOptional(b.variant) &&
    normalizeOptional(a.sizeBillions) === normalizeOptional(b.sizeBillions) &&
    normalizeOptional(a.activeBillions) === normalizeOptional(b.activeBillions) &&
    normalizeBool(a.isOpenSource) === normalizeBool(b.isOpenSource) &&
    normalizeBool(a.isSafety) === normalizeBool(b.isSafety)
  );
}

function normalizeGeneration(gen: string): string {
  return gen.replace(/\.0$/, "");
}

function normalizeOptional<T>(value: T | undefined | null): T | null {
  return value === undefined || value === null ? null : value;
}

function normalizeBool(value: boolean | undefined): boolean {
  return value === true;
}
