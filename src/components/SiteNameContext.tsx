"use client";

import { createContext, useContext } from "react";
import { displaySiteName } from "@/lib/categories";

const SiteNameContext = createContext(displaySiteName());

export function SiteNameProvider({
  name,
  children,
}: {
  name: string;
  children: React.ReactNode;
}) {
  return <SiteNameContext.Provider value={displaySiteName(name)}>{children}</SiteNameContext.Provider>;
}

export function useSiteName() {
  return useContext(SiteNameContext);
}
