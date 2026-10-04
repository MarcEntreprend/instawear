// tests/supabase-image.test.ts — variantes render/image (buckets publics).
import { test } from "node:test";
import assert from "node:assert/strict";
import { supabaseImageUrl } from "../src/lib/supabaseImage.ts";

const SB = "https://hkbybsycaylobvbnnwak.supabase.co";
const PNG = `${SB}/storage/v1/object/public/product-images/hero/1791002807916-image.png`;

test("supabaseImageUrl : construit la variante webp dimensionnée", () => {
  process.env.VITE_SUPABASE_URL = SB;
  assert.equal(
    supabaseImageUrl(PNG, { width: 1280, quality: 75 }),
    `${SB}/storage/v1/render/image/public/product-images/hero/1791002807916-image.png?width=1280&quality=75&format=webp`,
  );
  assert.ok(
    supabaseImageUrl(PNG).includes("format=webp"),
    "webp par défaut",
  );
});

test("supabaseImageUrl : passthrough gracieux (jamais cassé)", () => {
  process.env.VITE_SUPABASE_URL = SB;
  const tmp =
    "https://printful-upload.s3-accelerate.amazonaws.com/tmp/x/y.jpg";
  assert.equal(supabaseImageUrl(tmp, { width: 300 }), tmp);
  assert.equal(supabaseImageUrl("/relative/x.jpg", { width: 300 }), "/relative/x.jpg");
  assert.equal(supabaseImageUrl("", { width: 300 }), "");
  const already = `${SB}/storage/v1/render/image/public/a/b.jpg?width=100`;
  assert.equal(supabaseImageUrl(already, { width: 300 }), already);
  delete process.env.VITE_SUPABASE_URL;
  assert.equal(supabaseImageUrl(PNG, { width: 300 }), PNG);
});
