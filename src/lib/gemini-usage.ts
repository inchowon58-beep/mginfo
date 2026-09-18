import type { TokenUsage } from "./page-plan-types";

/** Safely read Gemini usageMetadata — never invent estimates. */
export function readGeminiTokenUsage(response: {
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    totalTokenCount?: number;
  };
} | null | undefined): TokenUsage {
  const meta = response?.usageMetadata;
  if (!meta) {
    return { inputTokens: null, outputTokens: null, totalTokens: null };
  }
  const input =
    typeof meta.promptTokenCount === "number" && Number.isFinite(meta.promptTokenCount)
      ? meta.promptTokenCount
      : null;
  const output =
    typeof meta.candidatesTokenCount === "number" && Number.isFinite(meta.candidatesTokenCount)
      ? meta.candidatesTokenCount
      : null;
  const total =
    typeof meta.totalTokenCount === "number" && Number.isFinite(meta.totalTokenCount)
      ? meta.totalTokenCount
      : input != null && output != null
        ? input + output
        : null;
  return { inputTokens: input, outputTokens: output, totalTokens: total };
}

export function mergeTokenUsage(a?: TokenUsage, b?: TokenUsage): TokenUsage | undefined {
  if (!a && !b) return undefined;
  if (!a) return b;
  if (!b) return a;
  const sum = (x: number | null, y: number | null) =>
    x == null && y == null ? null : (x || 0) + (y || 0);
  return {
    inputTokens: sum(a.inputTokens, b.inputTokens),
    outputTokens: sum(a.outputTokens, b.outputTokens),
    totalTokens: sum(a.totalTokens, b.totalTokens),
  };
}
