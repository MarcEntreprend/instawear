// tests/sync-imagekit.test.ts
// Helper ImageKit côté edge (sync-printful) : whitelist, format, idempotence.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  validateImageSource,
  isImagekitUrl,
  imagekitUrl,
  displayImageUrl,
  imagekitEndpoint,
  imagekitOriginal,
  normalizeImagekitUrl,
  hasImagekitPrivateKey,
  signImagekitUrl,
  signImagekitDeep,
} from "../supabase/functions/sync-printful/_shared/imagekit.ts";

const PF = "https://files.cdn.printful.com/o/uploaded-url/test.jpg";
const SB = "https://hkbybsycaylobvbnnwak.supabase.co/storage/v1/object/public/x/y.jpg";

test("validateImageSource: Printful + Supabase OK, reste rejeté", () => {
  process.env.SUPABASE_URL = "https://hkbybsycaylobvbnnwak.supabase.co";
  assert.equal(validateImageSource(PF), true);
  assert.equal(validateImageSource(SB), true);
  assert.equal(validateImageSource("https://printful.com.evil.com/x.jpg"), false);
  assert.equal(validateImageSource("http://169.254.169.254/x"), false);
  assert.equal(validateImageSource("javascript:alert(1)"), false);
  assert.equal(validateImageSource("https://example.com/x.jpg"), false);
  assert.equal(validateImageSource(""), false);
});

test("sans endpoint: passthrough (jamais d'image cassée)", () => {
  delete process.env.IMAGEKIT_URL_ENDPOINT;
  assert.equal(imagekitEndpoint(), "");
  assert.equal(imagekitUrl(PF, { quality: 80, format: "webp" }), PF);
  assert.equal(displayImageUrl(PF), PF);
});

test("avec endpoint: format brut + idempotent + normalize", () => {
  process.env.IMAGEKIT_URL_ENDPOINT = "https://ik.imagekit.io/testid/";
  delete process.env.IMAGEKIT_ENABLED;
  const out = imagekitUrl(PF, { quality: 80, format: "webp", width: 800 });
  assert.equal(out, `https://ik.imagekit.io/testid/tr:w-800,q-80,f-webp/${PF}`);
  assert.ok(isImagekitUrl(out));
  assert.equal(
    imagekitUrl(out, { quality: 80, format: "webp", width: 800 }),
    out,
  );
  const legacy = `https://ik.imagekit.io/testid/tr:q-80,f-webp/${encodeURIComponent(PF)}`;
  assert.equal(normalizeImagekitUrl(legacy), `https://ik.imagekit.io/testid/${PF}`);
  assert.equal(imagekitOriginal(legacy), PF);
  assert.equal(
    displayImageUrl(SB),
    `https://ik.imagekit.io/testid/tr:q-80,f-webp/${SB}`,
  );
});

test("coupe-circuit IMAGEKIT_ENABLED=false : originales", () => {
  process.env.IMAGEKIT_URL_ENDPOINT = "https://ik.imagekit.io/testid";
  process.env.IMAGEKIT_ENABLED = "false";
  const ik = `https://ik.imagekit.io/testid/tr:q-80,f-webp/${PF}`;
  assert.equal(imagekitUrl(PF, { quality: 80, format: "webp" }), PF);
  assert.equal(imagekitUrl(ik), PF);
  delete process.env.IMAGEKIT_ENABLED;
});

test("signature HMAC-SHA1 (ik-t TOUJOURS : restriction l'exige, vérifié live)", async () => {
  process.env.IMAGEKIT_URL_ENDPOINT = "https://ik.imagekit.io/testid";
  process.env.IMAGEKIT_PRIVATE_KEY = "test_private_key_123";
  assert.equal(hasImagekitPrivateKey(), true);
  const src = "https://files.cdn.printful.com/x.jpg";
  const unsigned = `https://ik.imagekit.io/testid/tr:q-80,f-webp/${src}`;
  const realNow = Date.now;
  (Date as any).now = () => 1710000000000 - 5000;
  try {
    // Expiry explicite : vecteur exact
    const signed = await signImagekitUrl(unsigned, 5);
    assert.equal(
      signed,
      `${unsigned}?ik-t=1710000000&ik-s=883865fe375755827d7b24fab9688d3d68c3f822`,
    );
    // Défaut : ik-t = now + 10 ans (déterministe ici)
    const def = await signImagekitUrl(unsigned);
    assert.ok(def.includes(`ik-t=${1710000000 - 5 + 10 * 365 * 86400}`));
    assert.ok(/[?&]ik-s=[0-9a-f]{40}$/.test(def));
  } finally {
    (Date as any).now = realNow;
    delete process.env.IMAGEKIT_PRIVATE_KEY;
  }
  // Déjà signée → inchangée (jamais de double signature)
  process.env.IMAGEKIT_PRIVATE_KEY = "test_private_key_123";
  const once = await signImagekitUrl(unsigned, 5);
  const realNow2 = Date.now;
  (Date as any).now = () => 1710000000000 - 5000;
  try {
    assert.equal(await signImagekitUrl(once, 5), once);
  } finally {
    (Date as any).now = realNow2;
    delete process.env.IMAGEKIT_PRIVATE_KEY;
  }
  // Non-IK → inchangée
  process.env.IMAGEKIT_PRIVATE_KEY = "test_private_key_123";
  assert.equal(await signImagekitUrl(PF), PF);
  delete process.env.IMAGEKIT_PRIVATE_KEY;
});

test("signImagekitDeep: signe tout l'arbre, ignore le reste", async () => {
  process.env.IMAGEKIT_URL_ENDPOINT = "https://ik.imagekit.io/testid";
  process.env.IMAGEKIT_PRIVATE_KEY = "test_private_key_123";
  const src = "https://files.cdn.printful.com/x.jpg";
  const unsigned = `https://ik.imagekit.io/testid/tr:q-80,f-webp/${src}`;
  const out: any = await signImagekitDeep({
    image: unsigned,
    gallery: [unsigned, "plain"],
    variants: [{ image: unsigned, sizes: { S: { price: 10 } } }],
    n: 3,
    b: null,
  });
  assert.ok(out.image.includes("ik-s="));
  assert.ok(out.image.includes("ik-t="));
  assert.ok(out.gallery[0].includes("ik-s="));
  assert.equal(out.gallery[1], "plain");
  assert.ok(out.variants[0].image.includes("ik-s="));
  assert.equal(out.variants[0].sizes.S.price, 10);
  assert.equal(out.n, 3);
  delete process.env.IMAGEKIT_PRIVATE_KEY;
});

test("sans clé privée: pas de signature (gracieux)", async () => {
  delete process.env.IMAGEKIT_PRIVATE_KEY;
  const unsigned = `https://ik.imagekit.io/testid/tr:q-80,f-webp/${PF}`;
  assert.equal(hasImagekitPrivateKey(), false);
  assert.equal(await signImagekitUrl(unsigned), unsigned);
});
