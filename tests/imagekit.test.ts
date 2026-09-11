// tests/imagekit.test.ts
// Helper ImageKit : whitelist, anti-SSRF, format fetch, idempotence, mode gracieux.
// La config lit l'env à chaque appel (lazy) : les tests peuvent changer l'env.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  validateSourceUrl,
  imageKitUrl,
  isImageKitUrl,
} from "../src/lib/imagekit.ts";

const PF = "https://files.cdn.printful.com/o/uploaded-url/test.jpg";
const SB = "https://hkbybsycaylobvbnnwak.supabase.co/storage/v1/object/public/x/y.jpg";

test("validateSourceUrl: accepte Printful + Supabase, rejette le reste", () => {
  process.env.VITE_SUPABASE_URL = "https://hkbybsycaylobvbnnwak.supabase.co";
  assert.equal(validateSourceUrl(PF), true);
  assert.equal(validateSourceUrl(SB), true);
  assert.equal(validateSourceUrl("https://images.printful.com/x.jpg"), true);
  // Lookalike (un startsWith serait piégé) doit être rejeté
  assert.equal(validateSourceUrl("https://printful.com.evil.com/x.jpg"), false);
  assert.equal(validateSourceUrl("https://evilprintful.com/x.jpg"), false);
  // SSRF : IPs privées / localhost
  assert.equal(validateSourceUrl("http://169.254.169.254/latest"), false);
  assert.equal(validateSourceUrl("http://10.0.0.5/x.jpg"), false);
  assert.equal(validateSourceUrl("http://localhost:3000/x.jpg"), false);
  // Schémas dangereux
  assert.equal(validateSourceUrl("javascript:alert(1)"), false);
  assert.equal(validateSourceUrl("data:image/png;base64,xx"), false);
  assert.equal(validateSourceUrl("file:///etc/passwd"), false);
  // Invalides / hors whitelist
  assert.equal(validateSourceUrl(""), false);
  assert.equal(validateSourceUrl("/relative/path.jpg"), false);
  assert.equal(validateSourceUrl("https://example.com/x.jpg"), false);
});

test("imageKitUrl: sans endpoint → originale (jamais d'image cassée)", () => {
  delete process.env.VITE_IMAGEKIT_URL_ENDPOINT;
  assert.equal(
    imageKitUrl(PF, { quality: 80, format: "webp", width: 800 }),
    PF,
  );
});

test("imageKitUrl: format fetch ImageKit correct", () => {
  process.env.VITE_IMAGEKIT_URL_ENDPOINT = "https://ik.imagekit.io/testid";
  const out = imageKitUrl(PF, { quality: 80, format: "webp", width: 800 });
  assert.equal(
    out,
    "https://ik.imagekit.io/testid/tr:w-800,q-80,f-webp/" + encodeURIComponent(PF),
  );
});

test("imageKitUrl: idempotent (jamais de fetch-dans-fetch)", () => {
  process.env.VITE_IMAGEKIT_URL_ENDPOINT = "https://ik.imagekit.io/testid";
  const once = imageKitUrl(PF, { quality: 80, format: "webp" });
  assert.ok(isImageKitUrl(once));
  assert.equal(imageKitUrl(once, { quality: 80, format: "webp" }), once);
});
