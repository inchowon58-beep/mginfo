"use client";

import { createContext, useContext } from "react";
import { DEFAULT_CATEGORIES } from "@/lib/categories";
import type { Category } from "@/lib/types";

const CategoriesContext = createContext<Category[]>(DEFAULT_CATEGORIES);

export function CategoriesProvider({
  categories,
  children,
}: {
  categories: Category[];
  children: React.ReactNode;
}) {
  return (
    <CategoriesContext.Provider value={categories.length ? categories : DEFAULT_CATEGORIES}>
      {children}
    </CategoriesContext.Provider>
  );
}

export function useCategories(): Category[] {
  return useContext(CategoriesContext);
}
