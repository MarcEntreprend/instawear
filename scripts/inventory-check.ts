// scripts/inventory-check.ts
// P-G drift detection: compare supabase/functions/openapi.json vs supabase/functions/*/index.ts
// Run via: npx tsx scripts/inventory-check.ts (CI check, fail si drift)

import { readdirSync, readFileSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = "supabase/functions";
if (!existsSync(ROOT)) { console.error("supabase/functions introuvable"); process.exit(2); }

const dirs = readdirSync(ROOT).filter((d) => {
  const p = join(ROOT, d);
  return statSync(p, { throwIfNoEntry: false })?.isDirectory();
});

const deployed = new Set(dirs.filter((d) => existsSync(join(ROOT, d, "index.ts"))));

const spec = JSON.parse(readFileSync(join(ROOT, "openapi.json"), "utf-8"));
const specPaths = new Set(
  Object.keys(spec.paths || {}).map((p) => p.replace(/^\//, "")),
);

const missingSpec = [...deployed].filter((d) => !specPaths.has(d));
const extraSpec = [...specPaths].filter((p) => !deployed.has(p));

if (missingSpec.length || extraSpec.length) {
  console.error("Drift détecté !");
  if (missingSpec.length) console.error("  Edges déployés sans entrée openapi.json:", missingSpec);
  if (extraSpec.length) console.error("  Entrées openapi.json sans edge:", extraSpec);
  process.exit(1);
}
console.log("OK inventory: " + deployed.size + " edges alignés avec openapi.json");
