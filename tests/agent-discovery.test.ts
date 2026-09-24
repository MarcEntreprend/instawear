// tests/agent-discovery.test.ts
// Agentic (Lighthouse ard-schema + llms-txt) : le manifeste DOIT suivre
// ARD Spec 1.0 (specVersion, entries[], URN RFC 8141, displayName, type,
// url XOR data) et llms.txt DOIT avoir H1 + liens + marqueurs PRODUCTS
// (remplis au prebuild). Sinon : fallback SPA servi -> FAIL audits.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const URN = /^urn:air:[a-zA-Z0-9.-]+(:[a-zA-Z0-9._-]+)+$/;

test("ai-catalog.json : manifeste ARD 1.0 valide", () => {
  const p = join(root, "public/ai-catalog.json");
  assert.ok(existsSync(p), "manifeste présent");
  const m = JSON.parse(readFileSync(p, "utf-8"));
  assert.equal(m.specVersion, "1.0");
  assert.ok(Array.isArray(m.entries) && m.entries.length > 0, "entries");
  for (const e of m.entries) {
    assert.ok(URN.test(e.identifier), `URN valide : ${e.identifier}`);
    assert.ok(typeof e.displayName === "string" && e.displayName, "displayName");
    assert.ok(typeof e.type === "string" && e.type, "type");
    assert.ok(
      (e.url && !e.data) || (!e.url && e.data),
      "url XOR data",
    );
  }
});

test("ai-catalog découvert via <link> dans index.html", () => {
  const html = readFileSync(join(root, "index.html"), "utf-8");
  assert.ok(
    html.includes('rel="ai-catalog" href="/ai-catalog.json"'),
    "lien découverte",
  );
});

test("llms.txt : H1 + liens + marqueurs PRODUCTS (prebuild)", () => {
  const p = join(root, "public/llms.txt");
  assert.ok(existsSync(p), "llms.txt présent");
  const raw = readFileSync(p, "utf-8");
  assert.equal(raw.charCodeAt(0), 35, "pas de BOM, commence par #");
  assert.ok(/^# .+/m.test(raw), "H1 présent");
  assert.ok(raw.includes("]("), "liens présents");
  assert.ok(
    raw.includes("<!-- PRODUCTS:START -->") &&
      raw.includes("<!-- PRODUCTS:END -->"),
    "marqueurs prebuild",
  );
});
