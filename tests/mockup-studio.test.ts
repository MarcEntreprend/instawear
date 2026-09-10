// tests/mockup-studio.test.ts
// Phases 1+2 Mockup Studio : file découplée.
// - needsMockups : sélection des produits à mettre en file
// - pacing : bornes d'appels (rate limit Printful 10 req/60s)
// - worker : sélection queued + processing périmés, statuts finaux
// - non-régression : écritures finalize identiques au legacy
// Miroirs (edge Deno non importable), sauf needsMockups (vrai code).

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { needsMockups } from "../src/admin/MockupStudio.tsx";
import { mockupCoverage } from "../src/admin/MockupStudio.tsx";
import { latestJobForProduct } from "../src/admin/MockupStudio.tsx";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const syncSource = readFileSync(
  join(root, "supabase/functions/sync-printful/index.ts"),
  "utf-8",
);

// ─── needsMockups (vrai code importé) ───────────────────────────────────────

test("sans external_product_id : jamais en file (non-Printful)", () => {
  assert.equal(
    needsMockups({ externalProductId: null, variants: [] }),
    false,
  );
  assert.equal(needsMockups({ variants: [] } as any), false);
});

test("sans variantes : à mettre en file", () => {
  assert.equal(
    needsMockups({ externalProductId: "123", variants: [] }),
    true,
  );
  assert.equal(
    needsMockups({ externalProductId: "123", variants: null }),
    true,
  );
});

test("variantes toutes imagées : rien à faire", () => {
  assert.equal(
    needsMockups({
      externalProductId: "123",
      variants: [{ image: "a.jpg" }, { image: "b.jpg" }],
    }),
    false,
  );
});

test("une variante sans image : à mettre en file", () => {
  assert.equal(
    needsMockups({
      externalProductId: "123",
      variants: [{ image: "a.jpg" }, { image: "" }],
    }),
    true,
  );
  assert.equal(
    needsMockups({
      externalProductId: "123",
      variants: [{ image: "a.jpg" }, {}],
    }),
    true,
  );
});

// ─── Pacing file (miroir constantes edge) ───────────────────────────────────

const MOCKUP_MAX_PER_QUEUE_CALL = 5;
const MOCKUP_CREATE_PACING_MS = 7000;
const MOCKUP_MAX_PER_WORKER_RUN = 25;

test("borne par appel : 5 produits max", () => {
  const ids = Array.from({ length: 12 }, (_, i) => `p${i}`);
  assert.equal(ids.slice(0, MOCKUP_MAX_PER_QUEUE_CALL).length, 5);
});

test("pacing création : ≤8/min sous la limite 10 req/60s", () => {
  const perMinute = 60000 / MOCKUP_CREATE_PACING_MS;
  assert.ok(perMinute < 10, `${perMinute}/min doit rester < 10`);
  assert.ok(perMinute >= 5, "pas trop lent non plus");
});

test("1000 produits : file complète en ~200 appels bornés", () => {
  const calls = Math.ceil(1000 / MOCKUP_MAX_PER_QUEUE_CALL);
  assert.equal(calls, 200);
});

// ─── Worker : sélection et statuts (miroir logique edge) ────────────────────

interface Job {
  id: string;
  status: string;
  updated_at: string;
}

function pickJobs(jobs: Job[], limit: number, stuckMinutes: number): Job[] {
  const cutoff = new Date(Date.now() - stuckMinutes * 60000).toISOString();
  const q = jobs
    .filter((j) => j.status === "queued")
    .sort((a, b) => (a.updated_at < b.updated_at ? -1 : 1));
  const stale = jobs
    .filter(
      (j) => j.status === "processing" && j.updated_at < cutoff,
    )
    .sort((a, b) => (a.updated_at < b.updated_at ? -1 : 1));
  return [...q, ...stale].slice(0, limit);
}

const now = Date.now();
const iso = (msAgo: number) => new Date(now - msAgo).toISOString();
const JOBS: Job[] = [
  { id: "q1", status: "queued", updated_at: iso(60000) },
  { id: "q2", status: "queued", updated_at: iso(120000) },
  { id: "p-stuck", status: "processing", updated_at: iso(20 * 60000) },
  { id: "p-fresh", status: "processing", updated_at: iso(60000) },
  { id: "d1", status: "done", updated_at: iso(60000) },
  { id: "f1", status: "failed", updated_at: iso(60000) },
];

test("worker : queued d'abord (plus anciens), puis processing périmés", () => {
  const picked = pickJobs(JOBS, 25, 15).map((j) => j.id);
  assert.deepEqual(picked, ["q2", "q1", "p-stuck"]);
});

test("worker : processing récent non repris", () => {
  const picked = pickJobs(JOBS, 25, 15).map((j) => j.id);
  assert.ok(!picked.includes("p-fresh"));
});

test("worker : done/failed jamais repris", () => {
  const picked = pickJobs(JOBS, 25, 15).map((j) => j.id);
  assert.ok(!picked.includes("d1"));
  assert.ok(!picked.includes("f1"));
});

test("worker : limite respectée", () => {
  assert.equal(pickJobs(JOBS, 2, 15).length, 2);
});

// ─── Non-régression finalize (contrat d'écriture legacy) ────────────────────

test("finalize écrit variants[].image + color_images + gallery + image", () => {
  assert.ok(syncSource.includes("return { ...v, image: storageUrl }"));
  assert.ok(syncSource.includes("updatePayload.color_images = newColorImages"));
  assert.ok(syncSource.includes("updatePayload.image = firstMockupUrl"));
  assert.ok(syncSource.includes(".from(\"product_mockups\").insert(mockupInserts)"));
  assert.ok(syncSource.includes("newGallery.push(storageUrl)"));
});

test("legacy generate-mockups orchestre les mêmes helpers", () => {
  assert.ok(syncSource.includes("await prepareMockupTask("));
  assert.ok(syncSource.includes("await createMockupTask("));
  assert.ok(syncSource.includes("await pollMockupTask("));
  assert.ok(syncSource.includes("await finalizeMockupTask("));
});

test("queue/worker/status exposés comme actions", () => {
  assert.ok(syncSource.includes('body.action === "queue-mockups"'));
  assert.ok(syncSource.includes('body.action === "mockup-status"'));
  assert.ok(syncSource.includes('body.action === "mockup-worker"'));
});

test("action mockup-templates exposée", () => {
  assert.ok(syncSource.includes('body.action === "mockup-templates"'));
});

// ─── Couverture par produit (vrai code) ─────────────────────────────────────

test("couverture : X/Y variantes imagées", () => {
  assert.deepEqual(
    mockupCoverage({ variants: [{ image: "a.jpg" }, { image: "" }, {}] } as any),
    { total: 3, imaged: 1 },
  );
});

test("couverture : sans variantes → 0/0", () => {
  assert.deepEqual(mockupCoverage({ variants: [] } as any), { total: 0, imaged: 0 });
  assert.deepEqual(mockupCoverage({} as any), { total: 0, imaged: 0 });
});

// ─── Marqueur file par produit (vrai code) ──────────────────────────────────

const PJOBS: { product_id: string; status: string; updated_at: string }[] = [
  { product_id: "p1", status: "done", updated_at: "2026-01-01T10:00:00Z" },
  { product_id: "p1", status: "queued", updated_at: "2026-01-02T10:00:00Z" },
  { product_id: "p2", status: "done", updated_at: "2026-01-01T10:00:00Z" },
  { product_id: "p2", status: "failed", updated_at: "2026-01-03T10:00:00Z" },
  { product_id: "p3", status: "done", updated_at: "2026-01-01T10:00:00Z" },
  { product_id: "p3", status: "done", updated_at: "2026-01-05T10:00:00Z" },
];

test("sans job → null (bouton Mettre en file)", () => {
  assert.equal(latestJobForProduct(PJOBS, "px"), null);
});

test("en-cours prioritaire sur terminé (bouton En file…)", () => {
  assert.equal(latestJobForProduct(PJOBS, "p1")?.status, "queued");
});

test("échoué prioritaire sur terminé (bouton Relancer)", () => {
  assert.equal(latestJobForProduct(PJOBS, "p2")?.status, "failed");
});

test("à égalité : le plus récent gagne", () => {
  assert.equal(
    latestJobForProduct(PJOBS, "p3")?.updated_at,
    "2026-01-05T10:00:00Z",
  );
});

// ─── buildMockupFiles : 1 fichier par placement (miroir edge) ───────────────

function buildMockupFiles(
  printFileUrl: string,
  requested: string[] | undefined,
  printfiles: any[],
  fallback: { placement: string; width: number; height: number },
) {
  const wanted =
    requested && requested.length > 0
      ? [...new Set(requested)].slice(0, 5)
      : [fallback.placement];
  return wanted.map((placement) => {
    const entry = (printfiles || []).find((p: any) => p?.placement === placement);
    const width = Number(entry?.width) > 0 ? Number(entry.width) : fallback.width;
    const height = Number(entry?.height) > 0 ? Number(entry.height) : fallback.height;
    return {
      placement,
      image_url: printFileUrl,
      position: { area_width: width, area_height: height, width, height, top: 0, left: 0 },
    };
  });
}

const PF = [
  { placement: "front", width: 1800, height: 2400 },
  { placement: "back", width: 1500, height: 2000 },
];
const FB = { placement: "front", width: 1800, height: 2400 };

test("sans placements demandés : 1 fichier legacy exact", () => {
  assert.deepEqual(buildMockupFiles("u", undefined, PF, FB), [
    {
      placement: "front",
      image_url: "u",
      position: {
        area_width: 1800, area_height: 2400, width: 1800, height: 2400, top: 0, left: 0,
      },
    },
  ]);
});

test("front+back : 2 fichiers, géométries par placement", () => {
  const files = buildMockupFiles("u", ["front", "back"], PF, FB);
  assert.equal(files.length, 2);
  assert.equal(files[1].placement, "back");
  assert.equal(files[1].position.width, 1500);
});

test("placement inconnu : géométrie de repli", () => {
  const files = buildMockupFiles("u", ["sleeve"], PF, FB);
  assert.equal(files[0].placement, "sleeve");
  assert.equal(files[0].position.width, 1800);
});

test("déduplique et borne à 5 placements", () => {
  const files = buildMockupFiles(
    "u",
    ["front", "front", "back", "a", "b", "c", "d"],
    PF,
    FB,
  );
  assert.equal(files.length, 5);
});

// ─── Validation options queue (miroir edge) ─────────────────────────────────

function validateQueueOptions(raw: any): { ok: boolean; error?: string; clean?: any } {
  const placements: string[] | undefined = Array.isArray(raw?.placements)
    ? ([...new Set(
        raw.placements
          .filter((x: any) => typeof x === "string" && x.trim().length > 0 && x.trim().length <= 40)
          .map((x: string) => x.trim()),
      )] as string[]).slice(0, 5)
    : undefined;
  const format = raw?.format === "png" ? "png" : raw?.format === "jpg" ? "jpg" : undefined;
  if (raw?.format !== undefined && !format) return { ok: false, error: "format invalide (jpg|png)" };
  const width = raw?.width !== undefined ? Number(raw.width) : undefined;
  if (width !== undefined && (!Number.isInteger(width) || width < 50 || width > 2000)) {
    return { ok: false, error: "width invalide (50-2000)" };
  }
  return { ok: true, clean: { placements, format, width } };
}

test("options valides acceptées", () => {
  const r = validateQueueOptions({ placements: ["front", "back"], format: "png", width: 1500 });
  assert.ok(r.ok);
  assert.deepEqual(r.clean?.placements, ["front", "back"]);
});

test("format/width invalides rejetés", () => {
  assert.equal(validateQueueOptions({ format: "gif" }).ok, false);
  assert.equal(validateQueueOptions({ width: 49 }).ok, false);
  assert.equal(validateQueueOptions({ width: 2001 }).ok, false);
  assert.equal(validateQueueOptions({ width: 1500 }).ok, true);
});

// ─── Chemin storage par placement (miroir edge) ─────────────────────────────

function storagePath(productId: string, hex: string, placement: string): string {
  const safeHex = hex.replace("#", "");
  return placement === "front"
    ? `${productId}/${safeHex}.jpg`
    : `${productId}/${safeHex}-${placement}.jpg`;
}

test("front : chemin legacy inchangé (URLs existantes préservées)", () => {
  assert.equal(storagePath("p1", "#aabbcc", "front"), "p1/aabbcc.jpg");
});

test("autres placements : suffixés (pas d'écrasement)", () => {
  assert.equal(storagePath("p1", "#aabbcc", "back"), "p1/aabbcc-back.jpg");
});
