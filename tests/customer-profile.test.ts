// tests/customer-profile.test.ts — mapping profil (bug DOB : le RPC renvoie
// un tableau, la lecture directe sur le tableau effaçait la DOB).
import { test } from "node:test";
import assert from "node:assert/strict";
import { mapCustomerProfile } from "../src/api/customerMapping.ts";

const ROW = {
  id: "7806c0b4",
  email: "a@b.c",
  name: "Marc",
  registration_date: "2026-06-16",
  last_login_date: "2026-10-04",
  email_preferences: { promotions: true },
  date_of_birth: "2003-06-09",
};

test("mapCustomerProfile : déballe le tableau RPC (cas réel)", () => {
  const c = mapCustomerProfile([ROW]);
  assert.equal(c?.date_of_birth, "2003-06-09");
  assert.equal(c?.id, "7806c0b4");
  assert.equal(c?.email, "a@b.c");
});

test("mapCustomerProfile : objet direct toléré, vide -> null", () => {
  assert.equal(mapCustomerProfile(ROW)?.date_of_birth, "2003-06-09");
  assert.equal(mapCustomerProfile([]), null);
  assert.equal(mapCustomerProfile(null), null);
  assert.equal(mapCustomerProfile(undefined), null);
  // Sans DOB en base -> null (input vide légitime, pas un effacement).
  assert.equal(mapCustomerProfile([{ ...ROW, date_of_birth: null }])?.date_of_birth, null);
});
