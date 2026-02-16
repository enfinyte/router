import type { CreateResponseBody, ResponseResource } from "common";

export const resolveToolChoice = (
  tc: CreateResponseBody["tool_choice"],
): ResponseResource["tool_choice"] => {
  if (!tc) return "none";
  if (typeof tc === "string") return tc;
  if (tc.type === "function") return tc;
  return { ...tc, mode: tc.mode ?? "auto" };
};

export const resolveTools = (tools: CreateResponseBody["tools"]): ResponseResource["tools"] =>
  tools?.map((t) => ({
    type: "function" as const,
    name: t.name,
    description: t.description ?? null,
    parameters: t.parameters ?? null,
    strict: t.strict ?? null,
  })) ?? [];

export const resolveReasoning = (
  reasoning: CreateResponseBody["reasoning"],
): ResponseResource["reasoning"] =>
  reasoning ? { effort: reasoning.effort ?? null, summary: reasoning.summary ?? null } : null;
