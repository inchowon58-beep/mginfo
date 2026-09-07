export const DEFAULT_GEMINI_NOTES =
  "매거진 특집 톤. 과장 없이, 현장 관찰과 실질 조언. 가짜 실명 후기는 쓰지 말 것.";

export function resolveGeminiNotes(custom?: string, categoryNotes?: string) {
  return (custom || "").trim() || (categoryNotes || "").trim() || DEFAULT_GEMINI_NOTES;
}
