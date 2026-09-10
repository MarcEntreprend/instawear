// tests/ops-monitoring.test.ts
// Gaps 13+14 : teste le VRAI module partagé (importable en node : aucune
// dépendance Deno — fetch/setTimeout/JSON uniquement).
// - fetchWithRetry : 429/5xx + Retry-After + idempotence + réseau
// - reportError : insert edge_errors, notif critical dédupliquée, never-throw

import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import {
  fetchWithRetry,
  isRetriableStatus,
  reportError,
} from "../supabase/functions/_shared/opsUtils.ts";

// ─── isRetriableStatus ──────────────────────────────────────────────────────

test("429 retentable dans les deux modes", () => {
  assert.equal(isRetriableStatus(429, true), true);
  assert.equal(isRetriableStatus(429, false), true);
});

test("502/503/504 retentables seulement si idempotent", () => {
  for (const s of [502, 503, 504]) {
    assert.equal(isRetriableStatus(s, true), true, `idempotent ${s}`);
    assert.equal(isRetriableStatus(s, false), false, `non-idempotent ${s}`);
  }
});

test("400/401/403/404/409 jamais retentés", () => {
  for (const s of [400, 401, 403, 404, 409, 200]) {
    assert.equal(isRetriableStatus(s, true), false, `${s}`);
    assert.equal(isRetriableStatus(s, false), false, `${s}`);
  }
});

// ─── fetchWithRetry (fetch global mocké) ────────────────────────────────────

const realFetch = globalThis.fetch;

function mockFetch(
  handler: (url: string, call: number) => { ok: boolean; status: number; headers?: Record<string, string> },
) {
  let calls = 0;
  const seen: string[] = [];
  (globalThis as any).fetch = async (url: string, _init: any) => {
    calls++;
    seen.push(String(url));
    const r = handler(String(url), calls);
    return {
      ok: r.ok,
      status: r.status,
      headers: { get: (k: string) => (r.headers || {})[k.toLowerCase()] ?? null },
      json: async () => ({}),
      text: async () => "",
    };
  };
  return {
    count: () => calls,
    urls: () => seen,
  };
}

afterEach(() => {
  (globalThis as any).fetch = realFetch;
});

test("succès 1er essai (attempts=1)", async () => {
  const m = mockFetch(() => ({ ok: true, status: 200 }));
  const r = await fetchWithRetry("https://x.test/", {}, { baseMs: 1 });
  assert.equal(r.attempts, 1);
  assert.ok(r.res?.ok);
  assert.equal(m.count(), 1);
});

test("429 puis succès (Retry-After respecté)", async () => {
  const m = mockFetch((_u, call) =>
    call === 1
      ? { ok: false, status: 429, headers: { "retry-after": "0" } }
      : { ok: true, status: 200 },
  );
  const r = await fetchWithRetry("https://x.test/", {}, { baseMs: 1 });
  assert.equal(r.attempts, 2);
  assert.ok(r.res?.ok);
  assert.equal(m.count(), 2);
});

test("400 → pas de retry", async () => {
  const m = mockFetch(() => ({ ok: false, status: 400 }));
  const r = await fetchWithRetry("https://x.test/", {}, { baseMs: 1 });
  assert.equal(r.attempts, 1);
  assert.equal(r.error, "HTTP 400");
  assert.equal(m.count(), 1);
});

test("500 idempotent → 3 essais puis échec", async () => {
  const m = mockFetch(() => ({ ok: false, status: 503 }));
  const r = await fetchWithRetry("https://x.test/", {}, { baseMs: 1 });
  assert.equal(r.attempts, 3);
  assert.equal(r.error, "HTTP 503");
  assert.equal(m.count(), 3);
});

test("500 non-idempotent → 1 seul essai", async () => {
  const m = mockFetch(() => ({ ok: false, status: 500 }));
  const r = await fetchWithRetry(
    "https://x.test/",
    { method: "POST" },
    { baseMs: 1, idempotent: false },
  );
  assert.equal(r.attempts, 1);
  assert.equal(m.count(), 1);
});

test("erreur réseau → retry puis abandon avec message", async () => {
  let calls = 0;
  (globalThis as any).fetch = async () => {
    calls++;
    throw new Error("boom");
  };
  const r = await fetchWithRetry("https://x.test/", {}, { baseMs: 1, attempts: 2 });
  assert.equal(r.attempts, 2);
  assert.equal(r.res, null);
  assert.equal(r.error, "boom");
  assert.equal(calls, 2);
});

test("attempts borné à [1..5]", async () => {
  const m = mockFetch(() => ({ ok: false, status: 503 }));
  const r = await fetchWithRetry("https://x.test/", {}, { baseMs: 1, attempts: 99 });
  assert.equal(r.attempts, 5);
  assert.equal(m.count(), 5);
});

// ─── reportError (supabaseAdmin factice) ────────────────────────────────────

function fakeAdmin(tables: { edge_errors: any[]; notifications: any[] }) {
  return {
    from: (table: "edge_errors" | "notifications") => ({
      insert: async (row: any) => {
        tables[table].push(row);
        return { error: null };
      },
      select: (_cols: string) => {
        const chain: any = {
          eq: (_f: string, _v: unknown) => chain,
          gte: (_f: string, _v: unknown) => chain,
          limit: async (_n: number) => ({ data: tables[table] }),
        };
        return chain;
      },
    }),
  };
}

test("insert edge_errors avec champs normalisés", async () => {
  const tables = { edge_errors: [] as any[], notifications: [] as any[] };
  await reportError(fakeAdmin(tables) as any, {
    fn: "create-printful-order",
    action: "create",
    error: new Error("boom"),
    meta: { orderId: "ORD-2026-000001" },
    severity: "high",
  });
  assert.equal(tables.edge_errors.length, 1);
  const row = tables.edge_errors[0];
  assert.equal(row.function_name, "create-printful-order");
  assert.equal(row.severity, "high");
  assert.equal(row.message, "boom");
  assert.deepEqual(row.meta, { orderId: "ORD-2026-000001" });
  assert.equal(tables.notifications.length, 0); // high = pas de notif
});

test("critical → notif admin catégorie api + lien monitoring", async () => {
  const tables = { edge_errors: [] as any[], notifications: [] as any[] };
  await reportError(fakeAdmin(tables) as any, {
    fn: "stripe-checkout",
    action: "handler",
    error: "paiement cassé",
    severity: "critical",
  });
  assert.equal(tables.notifications.length, 1);
  const n = tables.notifications[0];
  assert.equal(n.category, "api");
  assert.equal(n.priority, "high");
  assert.match(n.title, /stripe-checkout/);
  assert.equal(n.metadata.linkTo, "/admin/monitoring");
  assert.equal(n.metadata.source, "edge-monitor");
});

test("critical dédupliquée (même fn+action < 30 min)", async () => {
  const tables = { edge_errors: [] as any[], notifications: [] as any[] };
  const admin: any = fakeAdmin(tables);
  await reportError(admin, { fn: "f", action: "a", error: "x", severity: "critical", dedupeMinutes: 30 });
  await reportError(admin, { fn: "f", action: "a", error: "y", severity: "critical", dedupeMinutes: 30 });
  assert.equal(tables.edge_errors.length, 2); // les 2 lignes tracées
  assert.equal(tables.notifications.length, 1); // 1 seule notif
});

test("actions différentes → 2 notifs", async () => {
  const tables = { edge_errors: [] as any[], notifications: [] as any[] };
  const admin: any = fakeAdmin(tables);
  await reportError(admin, { fn: "f", action: "a", error: "x", severity: "critical" });
  await reportError(admin, { fn: "f", action: "b", error: "x", severity: "critical" });
  assert.equal(tables.notifications.length, 2);
});

test("never-throw même si la DB est en panne", async () => {
  const admin = {
    from: () => ({
      insert: async () => {
        throw new Error("db down");
      },
    }),
  };
  await reportError(admin as any, {
    fn: "f",
    action: "a",
    error: "x",
    severity: "critical",
  });
  // résolu sans exception = le flux appelant continue
  assert.ok(true);
});

test("message tronqué à 1000 chars, meta JSON-safe", async () => {
  const tables = { edge_errors: [] as any[], notifications: [] as any[] };
  const circular: any = { a: 1 };
  circular.self = circular;
  await reportError(fakeAdmin(tables) as any, {
    fn: "f",
    action: "a",
    error: "x".repeat(5000),
    meta: circular,
    severity: "medium",
  });
  assert.ok(tables.edge_errors[0].message.length <= 1000);
  assert.ok(JSON.stringify(tables.edge_errors[0].meta).length <= 2000);
});
