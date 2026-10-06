// tests/usd-lock.test.ts — verrou mono-devise : aucun affichage converti.
// Les prix en base sont en USD (settings = devise de charge Stripe) :
// toute conversion d'affichage serait mensongère (affiché ≠ débité).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const SRC = join(dirname(fileURLToPath(import.meta.url)), "..", "src");

function walk(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(e)) out.push(p);
  }
  return out;
}

test("usd-lock : aucune conversion d'affichage (formatPrice/rateFromEur)", () => {
  const hits: string[] = [];
  for (const f of walk(SRC)) {
    const src = readFileSync(f, "utf8");
    for (const pat of ["formatPrice(", "rateFromEur", "COUNTRY_CURRENCY"]) {
      if (src.includes(pat)) hits.push(`${f}: ${pat}`);
    }
  }
  assert.deepEqual(hits, [], "conversion d'affichage résiduelle");
});

test("usd-lock : settings figé sur USD", () => {
  const src = readFileSync(
    join(SRC, "admin", "SettingsPage.tsx"),
    "utf8",
  );
  assert.ok(!src.includes('value="BRL"'), "plus de choix BRL");
  assert.ok(!src.includes('value="EUR"'), "plus de choix EUR");
  assert.ok(src.includes("mono-devise"), "mention mono-devise");
});
