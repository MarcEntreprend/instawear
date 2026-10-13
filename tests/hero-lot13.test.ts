// tests/hero-lot13.test.ts — prerender du hero : images, cadre, payload, variante A/B, assainisseur Node, DSD.
import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { sanitizeHeroConfig } from "../src/lib/heroSchema.ts";
import { resolveHeroSlides } from "../src/lib/heroResolve.ts";
import {
  buildSupabaseRenderUrl,
  HERO_IMG_OPTS,
} from "../src/lib/heroImages.ts";
import { heroFrameVars } from "../src/lib/heroFrame.ts";
import {
  LEAD_VARIANT_SCRIPT,
  buildLeadPayload,
  parseLeadPayload,
} from "../src/lib/heroLead.ts";
import {
  composeHeroLead,
  prepareLeadSlide,
  sanitizeHeroHtmlNode,
} from "../scripts/hero-lead.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p: string) => readFileSync(join(root, p), "utf8");
const hasParse5 = await import("parse5").then(
  () => true,
  () => false,
);

const HOST = "abc.supabase.co";
const SRC = `https://${HOST}/storage/v1/object/public/hero/a.png`;
const PRODUCTS = [
  {
    id: "p1",
    title: "Hoodie",
    description: "Warm",
    image: "https://cdn.x/p.webp",
    isActive: true,
  },
];
const studio = (layers: unknown[]) =>
  sanitizeHeroConfig({ origin: "studio", layers });
const promo = (
  id: string,
  config: ReturnType<typeof studio>,
  productId = "",
) => ({
  id,
  order: 0,
  isActive: true,
  productId,
  config,
});
const imageSlide = (id = "s1") =>
  resolveHeroSlides(
    [promo(id, studio([{ type: "image", src: null }]), "p1")],
    PRODUCTS,
  )[0];
const htmlSlide = (html: string, id = "s2") =>
  resolveHeroSlides(
    [promo(id, studio([{ type: "html" }]))],
    [],
    Date.now(),
    { [id]: { html, css: "" } },
    null,
  )[0];

test("images : URL identique à l'ancienne formule, passthrough hors Supabase", () => {
  assert.equal(
    buildSupabaseRenderUrl(HOST, SRC, HERO_IMG_OPTS.fill),
    `https://${HOST}/storage/v1/render/image/public/hero/a.png?width=1280&quality=75&format=webp`,
  );
  assert.equal(
    buildSupabaseRenderUrl(HOST, "https://other.com/a.png", HERO_IMG_OPTS.fill),
    "https://other.com/a.png",
  );
  assert.equal(buildSupabaseRenderUrl(null, SRC), SRC);
  assert.equal(buildSupabaseRenderUrl(HOST, "/a.png"), "/a.png");
});

test("cadre : variables auto / fixe", () => {
  assert.deepEqual(
    heroFrameVars({
      mode: "fixed",
      width: "full",
      height: { unit: "vh", value: 78 },
    }),
    {
      "--hero-h": "clamp(420px, 78vh, 760px)",
      "--hero-hm": "clamp(420px, 78vh, 760px)",
    },
  );
  assert.deepEqual(
    heroFrameVars({
      mode: "auto",
      width: "full",
      ratio: { desktop: 2.4, mobile: 0.9 },
    }),
    { "--hero-r": 2.4, "--hero-rm": 0.9 },
  );
});

test("payload : aller-retour JSON, id 'lead', produit et HTML conservés ; entrées invalides => null", () => {
  const slide = imageSlide();
  const payload = JSON.parse(JSON.stringify(buildLeadPayload(slide)));
  const back = parseLeadPayload(payload)!;
  assert.equal(payload.id, "s1");
  assert.equal(back.id, "lead");
  assert.equal(back.product?.title, "Hoodie");
  assert.deepEqual(back.config, slide.config);

  const h = htmlSlide("<p>x</p>");
  const hp = JSON.parse(JSON.stringify(buildLeadPayload(h)));
  assert.deepEqual(parseLeadPayload(hp)!.html, { html: "<p>x</p>", css: "" });
  assert.equal(
    parseLeadPayload({ ...hp, html: null }),
    null,
    "slide HTML sans HTML = écarté",
  );

  for (const bad of [null, 1, {}, { id: "x" }, { id: "x", config: { v: 2 } }]) {
    assert.equal(parseLeadPayload(bad), null);
  }
});

const hashAB = (sid: string) => {
  let h = 0;
  for (let i = 0; i < sid.length; i++) h = (h * 31 + sid.charCodeAt(i)) >>> 0;
  return h % 2 === 0 ? "A" : "B";
};
const runScript = (ls: unknown) => {
  const out: Record<string, string> = {};
  vm.runInNewContext(LEAD_VARIANT_SCRIPT, {
    window: { crypto: {} },
    localStorage: ls,
    Date,
    Math,
    document: {
      documentElement: { setAttribute: (k: string, v: string) => (out[k] = v) },
    },
  });
  return out["data-hero-v"];
};

test("variante : le script inline = getVariant() (sid existant, créé, stockage KO)", () => {
  for (const sid of [
    "a",
    "abc",
    "550e8400-e29b-41d4-a716-446655440000",
    "1760000000000-k3j2h1",
  ]) {
    assert.equal(runScript({ getItem: () => sid, setItem() {} }), hashAB(sid));
  }
  assert.equal(
    runScript({
      getItem() {
        throw new Error("x");
      },
      setItem() {},
    }),
    hashAB("memory-session"),
  );
  let stored = "";
  const v = runScript({
    getItem: () => null,
    setItem: (_k: string, s: string) => (stored = s),
  });
  assert.ok(stored.length > 0);
  assert.equal(v, hashAB(stored));

  const e = read("src/lib/engagement.ts");
  assert.ok(e.includes("h = (h * 31 + sid.charCodeAt(i)) >>> 0"));
  assert.ok(e.includes('h % 2 === 0 ? "A" : "B"'));
  assert.ok(
    e.includes('"instawear-engagement-sid"') && e.includes('"memory-session"'),
  );
});

const jsonOf = (markup: string) => {
  const m = markup.match(
    /<script id="lead-hero-data" type="application\/json">(.*?)<\/script>/s,
  );
  assert.ok(m, "JSON embarqué");
  return { raw: m![1], doc: JSON.parse(m![1]) };
};

test("composition : slide unique (même slide A et B) => pas de script ni de data-lead-v", async () => {
  const p = await prepareLeadSlide(imageSlide());
  const r = composeHeroLead(p, p, HOST)!;
  assert.ok(
    r.markup.includes("data-lead-hero") && r.markup.includes('class="hero-box'),
  );
  assert.ok(
    !r.markup.includes("data-lead-v") &&
      !r.markup.includes("<script>(function"),
  );
  const { doc, raw } = jsonOf(r.markup);
  assert.equal(doc.v, 2);
  assert.equal(doc.lead.id, "s1");
  assert.ok(!raw.includes("<"), "aucun < brut dans le JSON");
  assert.equal(r.preload, null);
});

test("composition : slides différents par variante => deux blocs, style et script de choix", async () => {
  const a = await prepareLeadSlide(imageSlide("s1"));
  const b = await prepareLeadSlide(imageSlide("s9"));
  const r = composeHeroLead(a, b, HOST)!;
  assert.ok(
    r.markup.includes('data-lead-v="A"') &&
      r.markup.includes('data-lead-v="B"'),
  );
  assert.ok(r.markup.includes(LEAD_VARIANT_SCRIPT));
  const { doc } = jsonOf(r.markup);
  assert.equal(doc.A.id, "s1");
  assert.equal(doc.B.id, "s9");
  const onlyA = composeHeroLead(a, null, HOST)!;
  assert.ok(!onlyA.markup.includes('<section data-lead-v="B"'));
  assert.equal(jsonOf(onlyA.markup).doc.B, null);
  assert.equal(composeHeroLead(null, null, HOST), null);
});

test("composition : l'image statique utilise l'URL dimensionnée du slide final", async () => {
  const slide = resolveHeroSlides(
    [promo("s1", studio([{ type: "image", src: SRC, dim: 1, scrim: "none" }]))],
    [],
  )[0];
  const r = composeHeroLead(
    await prepareLeadSlide(slide),
    await prepareLeadSlide(slide),
    HOST,
  )!;
  assert.ok(r.markup.includes(`render/image/public/hero/a.png?width=1280`));
});

test(
  "DSD : slide HTML => template shadowrootmode + préchargement de la 1re image",
  { skip: !hasParse5 },
  async () => {
    const slide = htmlSlide(
      '<h1>Promo</h1><img src="https://cdn.x/a.webp" alt="a"><a href="/promotions">Go</a>',
    );
    const p = await prepareLeadSlide(slide);
    assert.ok(p && p.clean);
    const r = composeHeroLead(p, p, HOST)!;
    assert.ok(r.markup.includes('<template shadowrootmode="open"><style>'));
    assert.ok(r.markup.includes("data-lead-html"));
    assert.ok(r.markup.includes("<h2>Promo</h2>"), "h1 => h2");
    assert.ok(r.markup.includes('rel="noopener noreferrer"'));
    assert.ok(r.preload?.includes('href="https://cdn.x/a.webp"'));
    assert.ok(!jsonOf(r.markup).raw.includes("<"));
    assert.deepEqual(jsonOf(r.markup).doc.lead.html.html, p!.clean!.html);
  },
);

test(
  "assainisseur Node : vecteurs d'attaque, échappement, idempotence",
  { skip: !hasParse5 },
  async () => {
    const run = async (html: string, css = "") =>
      (await sanitizeHeroHtmlNode(html, css))!;
    assert.equal(
      (await run("<p>ok</p><script>alert(1)</script>")).html,
      "<p>ok</p>",
    );
    assert.ok(
      !/onerror|alert/i.test((await run("<img src=x onerror=alert(1)>")).html),
    );
    assert.ok(
      !/javascript|alert/i.test(
        (await run('<a href="javascript:alert(1)">x</a>')).html,
      ),
    );
    assert.ok(
      !/evil/.test((await run('<a href="https://evil.com/x">x</a>')).html),
    );
    assert.ok(
      !/evil/.test(
        (await run('<a href="/\\evil.com">x</a><img src="/\\evil.com/a.png">'))
          .html,
      ),
    );
    assert.ok(
      !/svg|script|alert|javascript/i.test(
        (
          await run(
            '<svg><script>alert(1)</script><a xlink:href="javascript:alert(1)">x</a></svg>',
          )
        ).html,
      ),
    );
    assert.ok(
      !/javascript|url\(/i.test(
        (await run('<div style="background:url(javascript:alert(1))">x</div>'))
          .html,
      ),
    );
    assert.ok(
      !/iframe|object|embed|evil/i.test(
        (
          await run(
            '<iframe src="https://evil.com"></iframe><object data="https://evil.com"></object><embed src="https://evil.com">',
          )
        ).html,
      ),
    );
    assert.ok(
      !/form|input|evil/i.test(
        (
          await run(
            '<form action="https://evil.com"><input name=a><button>go</button></form>',
          )
        ).html,
      ),
    );
    assert.ok(
      !/onerror|alert/i.test(
        (await run("<noscript><img src=x onerror=alert(1)></noscript>")).html,
      ),
    );
    assert.ok(
      !/data:/i.test(
        (await run('<img src="data:image/png;base64,AAAA">')).html,
      ),
    );
    assert.ok(
      !/evil|<base|<meta|<link/i.test(
        (
          await run(
            '<base href="https://evil.com"><meta http-equiv="refresh" content="0;url=https://evil.com"><link rel="stylesheet" href="https://evil.com/a.css"><p>x</p>',
          )
        ).html,
      ),
    );
    const mx = await run(
      '<svg></p><style><a id="</style><img src=1 onerror=alert(1)>">',
    );
    assert.ok(!/onerror|alert|<style/i.test(mx.html));

    const st = await run(
      "<style>@import url(https://evil.com/x.css)</style><p>a</p>",
    );
    assert.equal(st.html, "<p>a</p>");
    assert.equal(st.css, "", "CSS refusé => vide");

    assert.equal(
      (await run("<p>1 &lt; 2 &amp; 3</p>")).html,
      "<p>1 &lt; 2 &amp; 3</p>",
    );
    assert.equal((await run("<h1>t</h1>")).html, "<h2>t</h2>");
    assert.equal(
      (await run('<img src="https://cdn.x/a.webp" alt="a">')).firstImg,
      "https://cdn.x/a.webp",
    );

    for (const src of [
      '<div class="a"><p>un</p><a href="/faq">lien</a></div>',
      "<ul><li>a</li><li>b</li></ul>",
    ]) {
      const once = await run(src);
      assert.equal(
        (await run(once.html)).html.replace(/ rel="noopener noreferrer"/g, ""),
        once.html.replace(/ rel="noopener noreferrer"/g, ""),
      );
    }
  },
);

test("gardes : branchements des fichiers modifiés", () => {
  const pre = read("scripts/prerender.ts");
  assert.ok(pre.includes("buildHeroLead") && !pre.includes("leadHero"));
  const car = read("src/components/HeroCarousel.tsx");
  assert.ok(
    car.includes("readLeadSlide(getVariant())") &&
      !car.includes("readLeadHero"),
  );
  assert.ok(read("src/App.tsx").includes("leadHtmlSeed(getVariant())"));
  const view = read("src/components/HeroSlideView.tsx");
  assert.ok(
    view.includes("instant={!!isLead}") && view.includes("HERO_IMG_OPTS.fill"),
  );
  const blk = read("src/components/HeroHtmlBlock.tsx");
  assert.ok(
    blk.includes("instant") &&
      blk.includes('from "../lib/heroHtmlBase"') &&
      !blk.includes("const BASE_CSS"),
  );
  assert.ok(read("src/lib/heroLead.ts").includes('LEAD_SLIDE_ID = "lead"'));
});
