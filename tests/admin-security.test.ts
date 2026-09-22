// tests/admin-security.test.ts
// Vague A : gardes anti-lockout (src/admin/adminGuards.ts, pur) +
// validation invitation (edge admin-invite/_shared/validate.ts, pur).
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  canDeleteAdmin,
  canChangeRole,
  emailExists,
} from "../src/admin/adminGuards.ts";
import { validateInvite } from "../supabase/functions/admin-invite/_shared/validate.ts";
import type { AdminUser } from "../src/admin/adminTypes.ts";

const SA1: AdminUser = {
  id: "1",
  email: "boss@shop.com",
  role: "super_admin",
  createdAt: "2026-01-01",
};
const SA2: AdminUser = {
  id: "2",
  email: "Second@shop.com",
  role: "super_admin",
  createdAt: "2026-01-02",
};
const ED: AdminUser = {
  id: "3",
  email: "ed@shop.com",
  role: "editor",
  createdAt: "2026-01-03",
};

// ─── canDeleteAdmin ─────────────────────────────────────────────────────────

test("suppression normale autorisée", () => {
  assert.deepEqual(canDeleteAdmin([SA1, SA2, ED], "boss@shop.com", ED), {
    ok: true,
  });
});

test("jamais soi-même (insensible à la casse)", () => {
  const r = canDeleteAdmin([SA1, ED], "BOSS@shop.com", SA1);
  assert.equal(r.ok, false);
  assert.match(r.reason ?? "", /propre compte/);
});

test("jamais le dernier super_admin", () => {
  const r = canDeleteAdmin([SA1, ED], "ed@shop.com", SA1);
  assert.equal(r.ok, false);
  assert.match(r.reason ?? "", /dernier super-administrateur/);
});

test("avant-dernier super_admin : autorisé s'il en reste un", () => {
  assert.deepEqual(canDeleteAdmin([SA1, SA2], "boss@shop.com", SA2), {
    ok: true,
  });
});

// ─── canChangeRole ──────────────────────────────────────────────────────────

test("changement sans effet : autorisé", () => {
  assert.deepEqual(canChangeRole([SA1], "boss@shop.com", ED, "editor"), {
    ok: true,
  });
});

test("jamais sa propre rétrogradation", () => {
  const r = canChangeRole([SA1, SA2], "boss@shop.com", SA1, "editor");
  assert.equal(r.ok, false);
  assert.match(r.reason ?? "", /propre rôle/);
});

test("jamais rétrograder le dernier super_admin", () => {
  const r = canChangeRole([SA1, ED], "ed@shop.com", SA1, "editor");
  assert.equal(r.ok, false);
  assert.match(r.reason ?? "", /dernier super-administrateur/);
});

test("promouvoir un éditeur : autorisé", () => {
  assert.deepEqual(canChangeRole([SA1, ED], "boss@shop.com", ED, "super_admin"), {
    ok: true,
  });
});

// ─── emailExists ────────────────────────────────────────────────────────────

test("emailExists insensible à la casse", () => {
  assert.equal(emailExists([SA1], "BOSS@SHOP.COM"), true);
  assert.equal(emailExists([SA1], "nouveau@shop.com"), false);
  assert.equal(emailExists([SA1], ""), false);
  assert.equal(emailExists([], "boss@shop.com"), false);
});

// ─── validateInvite ─────────────────────────────────────────────────────────

test("invitation valide (normalisée minuscules)", () => {
  assert.deepEqual(validateInvite({ email: "  New@Shop.COM ", role: "editor" }), {
    email: "new@shop.com",
    role: "editor",
  });
  assert.deepEqual(
    validateInvite({ email: "boss@shop.com", role: "super_admin" }),
    { email: "boss@shop.com", role: "super_admin" },
  );
});

test("invitation rejetée : email invalide", () => {
  assert.equal(validateInvite({ email: "", role: "editor" }), null);
  assert.equal(validateInvite({ email: "pas-un-email", role: "editor" }), null);
  assert.equal(validateInvite({ email: "a@b", role: "editor" }), null);
  assert.equal(validateInvite({ email: null, role: "editor" }), null);
  assert.equal(validateInvite(null), null);
  assert.equal(validateInvite("x@y.zz"), null);
});

test("invitation rejetée : rôle hors liste blanche", () => {
  assert.equal(validateInvite({ email: "a@b.cc", role: "admin" }), null);
  assert.equal(validateInvite({ email: "a@b.cc", role: "" }), null);
  assert.equal(validateInvite({ email: "a@b.cc" }), null);
});
