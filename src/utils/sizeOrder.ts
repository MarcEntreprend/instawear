// src\utils\sizeOrder.ts

export const SIZE_OPTIONS_US = [
  "XS",
  "S",
  "M",
  "L",
  "XL",
  "XXL",
  "3XL",
  "4XL",
  "5XL",
  "6XL",
] as const;

const SIZE_RANK: Record<string, number> = Object.fromEntries(
  SIZE_OPTIONS_US.map((size, index) => [size, index]),
);

export function normalizeSize(size: unknown): string {
  const value = typeof size === "string" ? size.trim() : String(size ?? "");
  const upper = value.toUpperCase();

  if (upper === "2XL") return "XXL";
  if (upper === "XXL") return "XXL";
  if (upper === "3XL") return "3XL";
  if (upper === "4XL") return "4XL";
  if (upper === "5XL") return "5XL";
  if (upper === "6XL") return "6XL";

  return upper;
}

export function sortSizes(sizes: Iterable<unknown>): string[] {
  const unique = [...new Set(Array.from(sizes, (size) => normalizeSize(size)))];

  return [...unique].sort((a, b) => {
    const rankA = SIZE_RANK[a] ?? 999;
    const rankB = SIZE_RANK[b] ?? 999;

    if (rankA !== rankB) return rankA - rankB;
    return a.localeCompare(b);
  });
}
