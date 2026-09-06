// tests/inventory.test.ts
// P-G: drift detection entre supabase/functions/* et openapi.json
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

test("inventory-check.ts existe", () => {
  assert.ok(existsSync(join(root, "scripts/inventory-check.ts")));
});

test("openapi.json liste 10 paths", () => {
  const spec = JSON.parse(readFileSync(join(root, "supabase/functions/openapi.json"), "utf-8"));
  const paths = Object.keys(spec.paths).sort();
  assert.equal(paths.length, 10, `paths=${JSON.stringify(paths)}`);
  const attendu = [
    "/auth-welcome", "/contact-message", "/create-printful-order", "/delete-account", "/health",
    "/printful-webhook", "/send-email", "/stripe-checkout",
    "/stripe-webhook", "/sync-printful",
  ].sort();
  assert.deepEqual(paths, attendu, "paths doivent correspondre a l'inventaire");
});

test("chaque edge reference dans openapi.json a un dossier local", () => {
  const spec = JSON.parse(readFileSync(join(root, "supabase/functions/openapi.json"), "utf-8"));
  const paths = Object.keys(spec.paths);
  for (const p of paths) {
    const folder = p.slice(1);
    assert.ok(existsSync(join(root, "supabase/functions", folder, "index.ts")),
      `edge ${folder}/index.ts manquant`);
  }
});

test("edges locaux avec index.ts sont tous dans openapi.json", async () => {
  const { readdirSync } = await import("node:fs");
  const folders = readdirSync(join(root, "supabase/functions"), { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .filter((n) => n !== "_shared");
  const spec = JSON.parse(readFileSync(join(root, "supabase/functions/openapi.json"), "utf-8"));
  const inSpec = Object.keys(spec.paths).map((p) => p.slice(1));
  for (const f of folders) {
    assert.ok(inSpec.includes(f), `edge ${f} sans entree dans openapi.json`);
  }
});
