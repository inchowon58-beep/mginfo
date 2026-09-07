"use client";

import { createContext, useContext } from "react";
import {
  DEFAULT_COMMENT_MAX,
  DEFAULT_COMMENT_MIN,
  DEFAULT_LIKE_MAX,
  DEFAULT_LIKE_MIN,
  type EngagementRange,
} from "@/lib/engagement";

const DEFAULT_RANGE: EngagementRange = {
  likeMin: DEFAULT_LIKE_MIN,
  likeMax: DEFAULT_LIKE_MAX,
  commentMin: DEFAULT_COMMENT_MIN,
  commentMax: DEFAULT_COMMENT_MAX,
};

const EngagementContext = createContext<EngagementRange>(DEFAULT_RANGE);

export function EngagementProvider({
  value,
  children,
}: {
  value: EngagementRange;
  children: React.ReactNode;
}) {
  return <EngagementContext.Provider value={value}>{children}</EngagementContext.Provider>;
}

export function useEngagement(): EngagementRange {
  return useContext(EngagementContext);
}
