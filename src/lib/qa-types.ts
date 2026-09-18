import type { GenerationLog, PagePlan } from "./page-plan-types";
import type { QualityCheck } from "./quality-codes";

export type QaMode = "planner" | "legacy" | "compare";

export type QaResult = {
  id: string;
  keyword: string;
  mode: QaMode;
  title: string;
  excerpt?: string;
  metaDescription?: string;
  bodyHtml: string;
  faqItems?: Array<{ question: string; answer: string }>;
  pageType?: string;
  contentAngle?: string;
  contentStrategy?: { summary: string; rationale: string };
  searchIntent?: PagePlan["searchIntent"];
  sections?: PagePlan["sections"];
  pagePlan?: PagePlan;
  verifiedBlocksAvailable?: string[];
  verifiedBlocksRendered?: string[];
  validationIssues?: GenerationLog["validationIssues"];
  qualityChecks?: QualityCheck[];
  generationMode?: string;
  pipelineVersion?: string;
  plannerPromptVersion?: string;
  writerPromptVersion?: string;
  plannerCalls?: number;
  writerCalls?: number;
  plannerTokens?: GenerationLog["plannerTokens"];
  writerTokens?: GenerationLog["writerTokens"];
  bodyLength: number;
  generationLog?: GenerationLog;
  /** Paired legacy result id when mode=compare */
  compareWithId?: string;
  generatedAt: string;
};

export type QaStore = {
  results: QaResult[];
  updatedAt: string;
};
