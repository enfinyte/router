export interface ParsedModelId {
  readonly raw: string;

  /** The platform/provider the model ID originates from. */
  readonly platform: string;

  /** Bedrock region prefix: "us" | "eu" | "global". */
  readonly region?: string | undefined;

  /** The upstream vendor extracted from provider-prefixed IDs. */
  readonly vendor?: string | undefined;

  /** Bedrock deployment version suffix, e.g. "v1:0". */
  readonly deploymentVersion?: string | undefined;

  /** Vertex-Anthropic routing tag, e.g. "20250514" or "default". */
  readonly routingTag?: string | undefined;

  /** Whether the "-maas" suffix was present (Google Vertex). */
  readonly maasSuffix?: boolean | undefined;

  // -- Core matching features (the canonical identity) ----------------------

  /** Model family root: "claude", "gpt", "gemini", "llama", "grok", "glm", etc. */
  readonly family: string;

  /**
   * Normalized generation string using dots: "4.5", "3.7", "2.0", "4o".
   * Empty string when no generation is detected.
   */
  readonly generation: string;

  /** Size/quality tier: "opus", "sonnet", "haiku", "mini", "nano", "flash", "pro", etc. */
  readonly tier?: string | undefined;

  /**
   * Capability/mode variant: "codex", "chat", "coder", "fast", "instruct",
   * "thinking", "reasoning", "vision", "vl", etc.
   */
  readonly variant?: string | undefined;

  // -- Secondary features ---------------------------------------------------

  /** Total parameter count in billions. */
  readonly sizeBillions?: number | undefined;

  /** MoE active parameter count in billions. */
  readonly activeBillions?: number | undefined;

  /** Release/snapshot date normalized to "YYYYMMDD". */
  readonly date?: string | undefined;

  /** Context window in thousands (e.g. 128 for 128k). */
  readonly contextK?: number | undefined;

  /** Quantization format, e.g. "fp8", "fp16". */
  readonly quantization?: string | undefined;

  // -- Flags ----------------------------------------------------------------

  /** Model marketed as open-source/open-weight (e.g. gpt-oss). */
  readonly isOpenSource?: boolean | undefined;

  /** Safety/guard/safeguard model. */
  readonly isSafety?: boolean | undefined;

  /** Explicitly a preview release. */
  readonly isPreview?: boolean | undefined;
}

export interface ParsedBareId {
  family: string;
  generation: string;
  tier?: string | undefined;
  variant?: string | undefined;
  sizeBillions?: number | undefined;
  activeBillions?: number | undefined;
  date?: string | undefined;
  contextK?: number | undefined;
  quantization?: string | undefined;
  isOpenSource?: boolean | undefined;
  isSafety?: boolean | undefined;
  isPreview?: boolean | undefined;
}
