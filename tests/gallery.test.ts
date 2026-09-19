// tests/gallery.test.ts
// Curation galerie (_shared/gallery.ts) : jamais de brut, jamais de doublon
// front, jamais de blank fantôme, kept:false définitif.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildGalleryMeta,
  galleryUrls,
  type GalleryMetaItem,
} from "../supabase/functions/sync-printful/_shared/gallery.ts";

const GEN = (url: string, color?: string, placement = "front") => ({
  url,
  color,
  placement,
  source: "generated" as const,
});
const BLANK = (url: string, color?: string) => ({
  url,
  color,
  placement: null,
  source: "blank" as const,
});
const RAW = (url: string) => ({ url, source: "raw" as const });

test("build: brut exclu, fronts exclus, fantômes exclus", () => {
  const meta = buildGalleryMeta(
    [
      GEN("g1", "#aaa"),
      RAW("raw1"),
      BLANK("b1", "#aaa"),
      BLANK("bX", "#xxx"),
      GEN("g1", "#aaa"),
    ],
    {
      variantFronts: ["g1"],
      importedColors: ["#aaa", "#bbb"],
    },
  );
  const urls = galleryUrls(meta);
  assert.ok(!urls.includes("raw1"), "brut exclu");
  assert.ok(!urls.includes("g1"), "front (section Color) exclu");
  assert.ok(!urls.includes("bX"), "blank hors-set exclu");
  assert.ok(!urls.includes("b1"), "blank supplanté par le généré");
  const meta2 = buildGalleryMeta([BLANK("b2", "#bbb")], {
    importedColors: ["#aaa", "#bbb"],
  });
  assert.deepEqual(
    galleryUrls(meta2),
    ["b2"],
    "blank gardé sans généré (plancher)",
  );
});

test("build: généré supplante le blank de même couleur", () => {
  const meta = buildGalleryMeta([GEN("g1", "#aaa"), BLANK("b1", "#aaa")], {});
  const byUrl = new Map(meta.map((m) => [m.url, m]));
  assert.equal(byUrl.get("g1")?.kept, true);
  assert.equal(byUrl.get("b1")?.kept, false);
  assert.deepEqual(galleryUrls(meta), ["g1"]);
});

test("build: kept:false définitif (anti-résurrection)", () => {
  const prev: GalleryMetaItem[] = [
    { url: "b1", color: "#aaa", placement: null, source: "blank", kept: false },
  ];
  const meta = buildGalleryMeta([BLANK("b1", "#aaa"), GEN("g9", "#zzz")], {
    existingMeta: prev,
  });
  assert.deepEqual(galleryUrls(meta), ["g9"]);
  assert.equal(
    meta.find((m) => m.url === "b1")?.kept,
    false,
    "mémoire conservée",
  );
});

test("build: droits acquis customs + cap + hostile", () => {  const meta = buildGalleryMeta([], {
    existingGallery: ["https://posters/x.jpg", "g1"],
  });
  assert.deepEqual(galleryUrls(meta, 12), [
    "https://posters/x.jpg",
    "g1",
  ]);
  assert.deepEqual(galleryUrls(null), []);
  assert.deepEqual(
    buildGalleryMeta(null as any, {}),
    [],
  );
  assert.deepEqual(
    galleryUrls(
      [
        { url: "a", kept: true },
        { url: "a", kept: true },
        { url: "", kept: true },
        null,
      ] as any,
      1,
    ),
    ["a"],
  );
});

test("build: identity stable (brut vs signé du même fichier)", () => {
  const raw = "https://cdn/x.jpg";
  const signed = "https://ik/x/tr:q-80/" + raw;
  // Symétrique : même fichier sous deux formes -> même clé.
  const idOf = (u: string) => u.split("https://").pop() as string;
  const meta = buildGalleryMeta([{ url: raw, source: "custom" as const }], {
    existingMeta: [{ url: signed, color: "red", kept: false }],
    identity: idOf,
  });
  // Même fichier reconnu malgré les formes -> mémoire kept:false respectée.
  assert.deepEqual(galleryUrls(meta), []);
  assert.equal(
    meta.find((m) => m.url === signed)?.kept,
    false,
  );
});

test("build: fronts comparés par identité (pas de doublon déguisé)", () => {
  const idOf = (u: string) => u.split("https://").pop() as string;
  const meta = buildGalleryMeta(
    [{ url: "https://cdn/x.jpg", source: "generated" as const }],
    {
      variantFronts: ["https://ik/x/tr:q-80/https://cdn/x.jpg"],
      identity: idOf,
    },
  );
  assert.deepEqual(galleryUrls(meta), []);
});
