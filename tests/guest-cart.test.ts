// tests/guest-cart.test.ts
// Persistance panier invité : validation, round-trip, résolution prix frais.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  loadGuestCart,
  saveGuestCart,
  clearGuestCart,
  toGuestLines,
  resolveCartLines,
  GUEST_CART_KEY,
} from "../src/lib/guestCart.ts";

function fakeProducts(): any[] {
  return [
    {
      id: "p1",
      price: 20,
      sizeSurcharge: { XL: 2 },
      variants: [
        { color: "#fff", sizes: { M: { price: 18 }, XL: { price: 22 } } },
      ],
    },
    { id: "p2", price: 10 },
  ];
}

test("toGuestLines: ne garde que les refs (pas d'objets produits)", () => {
  const out = toGuestLines([
    {
      product: { id: "p1" },
      selectedColor: "#fff",
      selectedSize: "M",
      quantity: 2,
      unitPrice: 999,
    } as any,
  ]);
  assert.deepEqual(out, [
    { productId: "p1", selectedColor: "#fff", selectedSize: "M", quantity: 2 },
  ]);
  assert.deepEqual(toGuestLines([]), []);
  assert.deepEqual(toGuestLines(null as any), []);
});

test("resolveCartLines: prix frais, lignes inconnues écartées", () => {
  const out = resolveCartLines(
    [
      { productId: "p1", selectedColor: "#fff", selectedSize: "XL", quantity: 1 },
      { productId: "p1", selectedColor: "#fff", selectedSize: "M", quantity: 3 },
      { productId: "ghost", selectedColor: "", selectedSize: "", quantity: 1 },
    ],
    fakeProducts(),
  );
  assert.equal(out.length, 2);
  assert.equal(out[0].unitPrice, 22);
  assert.equal(out[1].unitPrice, 18);
  assert.equal(out[1].quantity, 3);
});

test("resolveCartLines: fallback prix produit + surcharge", () => {
  const out = resolveCartLines(
    [{ productId: "p2", selectedColor: "", selectedSize: "", quantity: 1 }],
    fakeProducts(),
  );
  assert.equal(out[0].unitPrice, 10);
});

test("loadGuestCart: JSON invalide / version / lignes sales → []", () => {
  const store: Record<string, string> = {};
  (globalThis as any).localStorage = {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => {
      store[k] = v;
    },
    removeItem: (k: string) => {
      delete store[k];
    },
  };
  store[GUEST_CART_KEY] = "pas-du-json{{{";
  assert.deepEqual(loadGuestCart(), []);
  store[GUEST_CART_KEY] = JSON.stringify({ v: 999, items: [] });
  assert.deepEqual(loadGuestCart(), []);
  store[GUEST_CART_KEY] = JSON.stringify({
    v: 1,
    items: [
      { productId: "p1", selectedColor: "c", selectedSize: "s", quantity: 2 },
      { productId: "", selectedColor: "c", selectedSize: "s", quantity: 1 },
      { productId: "p1", selectedColor: "c", selectedSize: "s", quantity: 0 },
      { productId: "p1", selectedColor: "c", selectedSize: "s", quantity: 500 },
      "nimporte-quoi",
      null,
    ],
  });
  // Seule la 1re ligne est valide (qté 0/500 rejetées, pas clampées au load).
  const loaded = loadGuestCart();
  assert.equal(loaded.length, 1);
  assert.equal(loaded[0].quantity, 2);
});

test("save + clear: round-trip best-effort", () => {
  const store: Record<string, string> = {};
  (globalThis as any).localStorage = {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => {
      store[k] = v;
    },
    removeItem: (k: string) => {
      delete store[k];
    },
  };
  saveGuestCart([
    {
      product: { id: "p1" },
      selectedColor: "c",
      selectedSize: "s",
      quantity: 1,
      unitPrice: 5,
    } as any,
  ]);
  assert.equal(loadGuestCart().length, 1);
  // Le save clampe (500 → 99) au lieu de jeter
  saveGuestCart([
    {
      product: { id: "p1" },
      selectedColor: "c",
      selectedSize: "s",
      quantity: 500,
      unitPrice: 5,
    } as any,
  ]);
  assert.equal(loadGuestCart()[0].quantity, 99);
  clearGuestCart();
  assert.deepEqual(loadGuestCart(), []);
  delete (globalThis as any).localStorage;
});
