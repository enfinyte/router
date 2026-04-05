import type { ParsedBareId } from "../types";

/**
 * Parse Llama model names.
 * Bedrock: llama{GEN}[-{MINOR}]-{SIZE}b-instruct
 * Azure: [meta-]llama-{GEN}[-{SIZE}b][-variant]-instruct
 */
export function parseLlama(rest: string): ParsedBareId {
  const result: ParsedBareId = {
    family: "llama",
    generation: "",
  };

  let working = rest;

  working = working.replace(/^meta-?/i, "");
  working = working.replace(/^llama-?/i, "");

  const tokens = working.split(/[-_]/).filter((t) => t.length > 0);

  const genParts: string[] = [];
  let i = 0;
  if (tokens[0] !== undefined && /^\d/.test(tokens[0])) {
    if (tokens[0].includes(".")) {
      genParts.push(tokens[0]);
      i = 1;
    } else {
      genParts.push(tokens[0]);
      i = 1;
      while (i < tokens.length) {
        const tok = tokens[i];
        if (tok === undefined || !/^\d+$/.test(tok) || parseInt(tok) >= 10) break;
        genParts.push(tok);
        i++;
      }
    }
  }

  result.generation = genParts.length > 1 ? genParts.join(".") : (genParts[0] ?? "");

  for (; i < tokens.length; i++) {
    const tok = tokens[i]?.toLowerCase() ?? "";

    const sMatch = tok.match(/^(\d+)b$/i);
    if (sMatch && sMatch[1] !== undefined) {
      result.sizeBillions = parseInt(sMatch[1]);
      continue;
    }

    if (/^\d+e$/i.test(tok)) continue;

    const qMatch = tok.match(/^fp(\d+)$/i);
    if (qMatch) {
      result.quantization = tok.toLowerCase();
      continue;
    }

    const ctxMatch = tok.match(/^(\d+)k$/i);
    if (ctxMatch && ctxMatch[1] !== undefined) {
      result.contextK = parseInt(ctxMatch[1]);
      continue;
    }

    if (tok === "instruct" || tok === "vision" || tok === "it") {
      result.variant = result.variant ? `${result.variant}-${tok}` : tok;
      continue;
    }

    if (tok === "scout" || tok === "maverick") {
      result.tier = tok;
      continue;
    }

    if (/^v\d+$/.test(tok)) continue;
  }

  return result;
}
