// tests/catalog-newest.test.ts — tri "Newest" = récence réelle (createdAt).
import { test } from "node:test";
import assert from "node:assert/strict";
import { sortByNewest } from "../src/components/CatalogSection.tsx";

test("sortByNewest : createdAt desc, sans date en dernier, stable", () => {
  const list = [
    { id: "old", createdAt: "2026-01-01T00:00:00Z" },
    { id: "new", createdAt: "2026-10-01T00:00:00Z" },
    { id: "nodate", createdAt: null },
    { id: "mid", createdAt: "2026-05-01T00:00:00Z" },
  ];
  const out = sortByNewest(list);
  assert.deepEqual(
    out.map((p) => p.id),
    ["new", "mid", "old", "nodate"],
  );
  // Non-mutant (nouveau tableau).
  assert.equal(list[0].id, "old");
});

test("sortByNewest : dates invalides en dernier, jamais de crash", () => {
  const out = sortByNewest([
    { id: "bad", createdAt: "pas-une-date" },
    { id: "ok", createdAt: "2026-06-01T00:00:00Z" },
  ]);
  assert.deepEqual(
    out.map((p) => p.id),
    ["ok", "bad"],
  );
  assert.deepEqual(sortByNewest([]), []);
});
