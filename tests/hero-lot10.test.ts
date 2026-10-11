// tests/hero-lot10.test.ts — stats, A/B, gardes statiques (migration 42, consentement, preview).
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { compareCtr, ctr, normalCdf } from "../src/lib/heroStats.ts";
import { sanitizeHeroConfig } from "../src/lib/heroSchema.ts";
import { resolveHeroSlides } from "../src/lib/heroResolve.ts";
import { heroStudioWarnings } from "../src/lib/heroStudio.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p: string) => readFileSync(join(root, p), "utf8");
const IMG = "https://cdn.example.com/a.webp";
const arm = (n: number, c: number) => ({ impSessions: n, clickSessions: c });

test("normalCdf et ctr", () => {
  assert.ok(Math.abs(normalCdf(1.96) - 0.975) < 0.001);
  assert.ok(Math.abs(normalCdf(0) - 0.5) < 1e-6);
  assert.equal(ctr(arm(0, 0)), null);
  assert.equal(ctr(arm(200, 20)), 0.1);
});

test("compareCtr : insuffisant, aucune différence, gagnant A ou B", () => {
  assert.equal(compareCtr(arm(50, 5), arm(50, 9)).verdict, "insufficient");
  assert.equal(compareCtr(arm(0, 0), arm(0, 0)).verdict, "insufficient");
  assert.equal(compareCtr(arm(1000, 100), arm(1000, 105)).verdict, "none");
  const b = compareCtr(arm(1000, 100), arm(1000, 150));
  assert.equal(b.verdict, "b");
  assert.ok(b.p !== null && b.p < 0.001);
  assert.equal(compareCtr(arm(1000, 150), arm(1000, 100)).verdict, "a");
  assert.equal(compareCtr(arm(1000, 0), arm(1000, 0)).verdict, "none"); // dégénéré : pas de verdict
});

test("A/B : la clé ab n'existe que si posée, valeurs strictes, idempotent", () => {
  assert.equal("ab" in sanitizeHeroConfig({}), false);
  assert.equal("ab" in sanitizeHeroConfig({ ab: "C" }), false);
  const a = sanitizeHeroConfig({ ab: "A", origin: "studio" });
  assert.equal(a.ab, "A");
  assert.deepEqual(sanitizeHeroConfig(a), a);
});

test("resolve : un slide limité à une variante n'est servi qu'à celle-ci", () => {
  const mk = (id: string, ab?: string) =>
    ({
      id,
      order: id === "a" ? 0 : id === "b" ? 1 : 2,
      isActive: true,
      productId: "",
      config: sanitizeHeroConfig({
        origin: "studio",
        ...(ab ? { ab } : {}),
        layers: [{ type: "image", src: IMG }],
      }),
    }) as any;
  const promos = [mk("a", "A"), mk("b", "B"), mk("c")];
  const ids = (v: "A" | "B" | null) =>
    resolveHeroSlides(promos, [], Date.now(), {}, v).map((s) => s.id);
  assert.deepEqual(ids("A"), ["a", "c"]);
  assert.deepEqual(ids("B"), ["b", "c"]);
  assert.deepEqual(ids(null), ["a", "b", "c"]); // preview / sans variante : tout
});

test("studio : avertissement A/B sur le slide n°1", () => {
  const c = sanitizeHeroConfig({
    origin: "studio",
    ab: "A",
    layers: [{ type: "image", src: IMG }],
  });
  const w = heroStudioWarnings(c, { isFirst: true, hasProduct: false });
  assert.ok(w.some((x) => /variante A\/B/.test(x.text)));
  assert.ok(
    !heroStudioWarnings(c, { isFirst: false, hasProduct: false }).some((x) =>
      /variante A\/B/.test(x.text),
    ),
  );
});

test("garde : événements hero déclarés dans engagement.ts (consentement inchangé)", () => {
  const e = read("src/lib/engagement.ts");
  for (const k of ['"hero_impression"', '"hero_click"', '"hero_slide"'])
    assert.ok(e.includes(k), k);
  assert.ok(
    e.includes("consentGranted()"),
    "la garde de consentement doit rester",
  );
});

test("garde : le suivi ignore le slide d'amorçage, dédoublonne, et la preview ne mesure rien", () => {
  const t = read("src/lib/heroTracking.ts");
  assert.ok(t.includes('slideId === "lead"'));
  assert.ok(t.includes("seen.has(slideId)"));
  assert.ok(read("src/admin/HeroPreviewFrame.tsx").includes("noTrack"));
  assert.ok(read("src/App.tsx").includes("noTrack={isAdmin}"));
});

test("SQL lot 10 : CHECK étendu sans perdre les anciennes valeurs ; RPC admin, jamais anon", () => {
  const sql = read("supabase/migrations/20261042_hero_stats.sql");
  for (const v of [
    "section_impression",
    "product_click",
    "search",
    "filter_applied",
    "add_to_cart",
    "favourite",
    "hero_impression",
    "hero_click",
  ]) {
    assert.ok(sql.includes(`'${v}'`), v);
  }
  assert.ok(sql.includes("engagement_events_event_type_check"));
  assert.ok(sql.includes("IF NOT public.is_admin()"));
  assert.ok(
    sql.includes(
      "REVOKE ALL ON FUNCTION public.hero_stats(integer) FROM PUBLIC, anon",
    ),
  );
  assert.ok(sql.includes("SET search_path = public"));
  assert.ok(!/TO\s+anon/i.test(sql.replace(/REVOKE[^;]*;/gi, "")));
});
