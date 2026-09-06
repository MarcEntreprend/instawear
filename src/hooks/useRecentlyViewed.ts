// src/hooks/useRecentlyViewed.ts — V2 port
import { useCallback, useState } from "react";

const STORAGE_KEY = "instawear-recently-viewed";
const MAX_ITEMS = 12;

function readIds(): string[] {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function useRecentlyViewed() {
  const [ids, setIds] = useState<string[]>(readIds);

  const addViewed = useCallback((productId: string) => {
    setIds((prev) => {
      const next = [productId, ...prev.filter((id) => id !== productId)].slice(0, MAX_ITEMS);
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  return { ids, addViewed };
}
