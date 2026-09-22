// scripts/check-edge-env.ts
// Complémentaire de tests/checkout-to-email-flow.test.ts (env SIMULÉ) :
// vérifie les secrets requis des 8 edges critiques contre le VRAI
// environnement — variables système + fichier `.env` local (avec mapping
// VITE_SUPABASE_URL -> SUPABASE_URL). Usage :
//   npx tsx scripts/check-edge-env.ts
// Sortie 1 si au moins une edge répondrait 503 (utile en CI/pre-deploy).
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  missingEnv,
  missingEnvOneOf,
  envMissingResponse,
  BASE_ENV,
} from "../supabase/functions/_shared/env.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function loadDotEnv(): Record<string, string> {
  const out: Record<string, string> = {};
  const p = join(root, ".env");
  if (!existsSync(p)) return out;
  for (const raw of readFileSync(p, "utf-8").split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq < 0) continue;
    let v = line.slice(eq + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    )
      v = v.slice(1, -1);
    out[line.slice(0, eq).trim()] = v;
  }
  return out;
}

const dotEnv = loadDotEnv();
const real: Record<string, string | undefined> = { ...dotEnv, ...process.env };
// Mapping front -> serveur (même projet Supabase en local).
if (!real.SUPABASE_URL && real.VITE_SUPABASE_URL)
  real.SUPABASE_URL = real.VITE_SUPABASE_URL;

const STRIPE_KEY = ["STRIPE_SECRET_KEY_TEST", "STRIPE_SECRET_KEY"];
const EDGES: Array<{
  edge: string;
  required: string[];
  oneOf: string[][];
}> = [
  { edge: "stripe-checkout", required: [...BASE_ENV], oneOf: [STRIPE_KEY] },
  {
    edge: "stripe-webhook",
    required: [...BASE_ENV, "STRIPE_WEBHOOK_SECRET"],
    oneOf: [STRIPE_KEY],
  },
  { edge: "stripe-refund", required: [...BASE_ENV], oneOf: [STRIPE_KEY] },
  { edge: "create-printful-order", required: [...BASE_ENV], oneOf: [] },
  {
    edge: "printful-webhook",
    required: [...BASE_ENV, "PRINTFUL_WEBHOOK_SECRET"],
    oneOf: [],
  },
  {
    edge: "send-email",
    required: [...BASE_ENV, "RESEND_API_KEY"],
    oneOf: [],
  },
  { edge: "order-status-update", required: [...BASE_ENV], oneOf: [] },
  { edge: "sync-printful", required: [...BASE_ENV], oneOf: [] },
];

let bad = 0;
for (const { edge, required, oneOf } of EDGES) {
  const read = (k: string) => real[k];
  const missing = [
    ...missingEnv(required, read),
    ...oneOf.flatMap((g) => missingEnvOneOf(g, read)),
  ];
  if (missing.length === 0) {
    console.log(`OK        ${edge}`);
  } else {
    bad++;
    console.log(`MANQUANT  ${edge} : ${missing.join(", ")}`);
    const res = envMissingResponse(missing);
    console.log(
      `  -> répondrait HTTP ${res.status} : ${(
        await res.text()
      ).slice(0, 110)}…`,
    );
  }
}
if (bad > 0) {
  console.log(`\n${bad} edge(s) répondraient 503.`);
  process.exitCode = 1;
} else {
  console.log("\nToutes les edges critiques sont configurées.");
}
