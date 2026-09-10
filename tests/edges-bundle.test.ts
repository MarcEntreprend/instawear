// tests/edges-bundle.test.ts
// Pré-launch : chaque Edge Function doit BUNDLER sans erreur (esbuild,
// comme le fait `supabase functions deploy`).
// Contexte : supabase/functions est EXCLU du tsconfig (tsc ne voit rien) et
// les fichiers portent @ts-nocheck — sans ce test, une erreur de syntaxe
// (ex: double déclaration `const serviceRoleKey` dans health) ne se révèle
// qu'en production par un BOOT_ERROR. Les imports https:/npm: sont externes
// (non résolus, comme au deploy).

import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { buildSync } from "esbuild";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const functionsDir = join(root, "supabase", "functions");

const edges = readdirSync(functionsDir, { withFileTypes: true })
  .filter((d) => d.isDirectory() && d.name !== "_shared")
  .map((d) => d.name)
  .sort();

test("au moins une edge à vérifier", () => {
  assert.ok(edges.length > 0, "aucune edge trouvée");
});

for (const edge of edges) {
  test(`bundle OK : ${edge}/index.ts`, () => {
    let errors: string[] = [];
    try {
      buildSync({
        entryPoints: [join(functionsDir, edge, "index.ts")],
        bundle: true,
        platform: "neutral",
        format: "esm",
        external: ["https://*", "npm:*"],
        write: false,
        logLevel: "silent",
      });
    } catch (e: any) {
      errors = (e?.errors || []).map(
        (e: any) => `${e.location?.file}:${e.location?.line} ${e.text}`,
      );
      if (errors.length === 0) errors = [String(e?.message || e)];
    }
    assert.deepEqual(errors, [], `erreurs de bundle:\n${errors.join("\n")}`);
  });
}
