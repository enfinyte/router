import type { CreateResponseBody } from "common";

export const extractTextFromInput = (
  input: CreateResponseBody["input"],
  roles: Array<"user" | "system" | "developer">,
): string | null => {
  if (roles.includes("user") && typeof input === "string") {
    return input;
  }

  if (Array.isArray(input)) {
    const textContent = input
      .filter((item) => roles.includes(item.role as "user" | "system" | "developer"))
      .map((item) => item.content.text)
      .join(" ");

    return textContent || null;
  }

  return null;
};

/**
 * Extracts the appropriate text for auto-classification based on analysisTarget.
 *
 * - "per_system_prompt": prioritizes system/developer prompt and instructions.
 *   Returns null if none found (caller should use fallback model).
 * - "per_prompt" (default): prioritizes user prompt, then instructions, then system prompt.
 */
export const extractAnalysisText = (
  options: CreateResponseBody,
  analysisTarget: string,
): { text: string; source: string } | null => {
  if (analysisTarget === "per_system_prompt") {
    const systemPrompt = extractTextFromInput(options.input, ["system", "developer"]);
    if (systemPrompt) return { text: systemPrompt, source: "per_system_prompt" };

    if (typeof options.instructions === "string" && options.instructions.length > 0) {
      return { text: options.instructions, source: "per_system_prompt" };
    }

    return null;
  }

  const userPrompt = extractTextFromInput(options.input, ["user"]);
  if (userPrompt) return { text: userPrompt, source: "per_prompt" };

  return null;
};
