# Hero Studio : lots 4 et 5 (HTML collé, propagation, Deploy Hook)

D'abord tes trois gardes en échec, puis les lots 4 et 5.

---

## 0. Les 3 gardes de `promo-hero-p1.test.ts`

Ce sont des gardes statiques (présence d'une chaîne dans un fichier). Le comportement qu'elles protègent existe toujours, mais il a déménagé : `App.tsx` et `HeroCarousel.tsx` n'en sont plus propriétaires. Je n'ai pas ce fichier de test sous les yeux, donc je te donne le **fichier à lire et la chaîne à chercher** pour chacun. Retrouve les trois tests par leur titre avec Ctrl+F.

| Titre du test            | Fichier à lire désormais           | Chaîne à chercher                                                              |
| ------------------------ | ---------------------------------- | ------------------------------------------------------------------------------ |
| « branche par slide »    | `src/lib/heroSchema.ts`            | `const split = l.layout === "split";`                                          |
|                          | `src/components/HeroSlideView.tsx` | `config.layers.map((layer, i) => {`                                            |
| « kind par défaut »      | `src/lib/heroSchema.ts`            | `const kind = l.kind === "image" \|\| l.kind === "grid" ? l.kind : "product";` |
| « prioritaire au rendu » | `src/components/HeroSlideView.tsx` | `layer.src \|\| p?.image \|\| null`                                            |

- **Sens des gardes** : le layout est choisi par slide, le kind retombe sur `"product"`, et l'image du slide prime sur celle du produit.
- **Équivalents comportementaux** : ils sont déjà couverts par `tests/hero-lot2.test.ts` (« legacy product/split », « resolve », etc.).
- **Si tu veux les blocs de test réécrits** : colle-moi les 3 blocs et je te renvoie le code exact.

---

## Ce que je déclare avant le code

**Lecture et écriture de `html` et `css`.**

- **Écriture** : seul un `super_admin` peut écrire. C'est une policy RLS, plus un trigger. Le panneau du studio et l'API vérifient aussi le rôle avant l'appel.
- **Lecture** : le HTML d'un slide **publié** est lisible par tous, par définition, puisque la boutique l'affiche. Le HTML d'un **brouillon** n'est lisible que par un `super_admin`. L'édition de la source brute est réservée au `super_admin`.

**Changement de structure par rapport au lot 1.** Les colonnes `html` et `css` quittent `hero_promotions` pour une table `hero_slide_html`. Raisons :

- `select *` sur `hero_promotions` ne ramène plus jamais de HTML ;
- un éditeur ne lit jamais le brouillon ;
- la garde devient une policy RLS ;
- le prerender n'est pas affecté.

Les colonnes sont vides aujourd'hui, donc rien à migrer.

**Régressions visuelles et de comportement : aucune sur tes 5 slides.** Les changements réels sont les suivants :

1. La boutique charge version et slides en **1 requête** (RPC `get_hero_snapshot`) au lieu de 1 requête table. Repli automatique sur l'ancienne voie si la migration n'est pas appliquée.
2. Un slide HTML n'apparaît qu'**une fois son HTML chargé**.
3. DOMPurify (≈ 7 Ko gzip) est un chunk chargé **uniquement** quand un slide HTML est monté.
4. Les contrôles du carrousel (points, flèche) suivent le fond du slide. Sur un slide HTML, règle le « Fond » du studio pour qu'ils restent lisibles.
5. **Prerender** : tant que `scripts/prerender.ts` ne filtre pas `starts_at` / `ends_at`, un slide planifié en position 1 peut s'afficher un instant comme slide d'amorçage avant d'être retiré par le runtime. Colle-moi `prerender.ts` et j'ajoute le filtre (quelques lignes).

---

# LOT 4 : HTML collé

## 4.0 Dépendance

```bash
npm i dompurify
```

Si `tsc` réclame des types : `npm i -D @types/dompurify`.

## 4.1 Migration (backend) : nouveau fichier

```sql
-- supabase/migrations/20261035_hero_html_table.sql
-- Hero Studio — Lot 4 : le HTML/CSS collé quitte hero_promotions pour sa propre table.
-- (1) select * sur hero_promotions ne ramène plus jamais de HTML ;
-- (2) la garde super_admin devient une policy RLS (plus un trigger) ;
-- (3) le HTML d'un brouillon n'est lisible que par un super_admin.
-- Idempotent. Pas de BEGIN/COMMIT (db push encapsule déjà).

-- ─── 1) Table ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.hero_slide_html (
  slide_id   text        PRIMARY KEY REFERENCES public.hero_promotions(id) ON DELETE CASCADE,
  html       text        NOT NULL DEFAULT '',
  css        text        NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT hero_slide_html_cap_check
    CHECK (octet_length(html) + octet_length(css) <= 51200)
);

-- ─── 2) Reprise d'un éventuel contenu des anciennes colonnes ────────────
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'hero_promotions' AND column_name = 'html'
  ) THEN
    INSERT INTO public.hero_slide_html (slide_id, html, css)
    SELECT id, html, css FROM public.hero_promotions WHERE html <> '' OR css <> ''
    ON CONFLICT (slide_id) DO NOTHING;
  END IF;
END $$;

-- ─── 3) Retrait du trigger, de la contrainte et des colonnes du lot 1 ───
DROP TRIGGER IF EXISTS hero_promotions_guard_html ON public.hero_promotions;
DROP FUNCTION IF EXISTS public.hero_promotions_guard_html();
ALTER TABLE public.hero_promotions DROP CONSTRAINT IF EXISTS hero_promotions_payload_cap_check;
ALTER TABLE public.hero_promotions DROP COLUMN IF EXISTS html, DROP COLUMN IF EXISTS css;

-- ─── 4) RLS ─────────────────────────────────────────────────────────────
ALTER TABLE public.hero_slide_html ENABLE ROW LEVEL SECURITY;

-- Lecture publique : UNIQUEMENT le HTML des slides publiés (c'est ce que la boutique affiche).
DROP POLICY IF EXISTS hero_slide_html_select_public ON public.hero_slide_html;
CREATE POLICY hero_slide_html_select_public ON public.hero_slide_html
  FOR SELECT TO anon, authenticated
  USING (EXISTS (
    SELECT 1 FROM public.hero_promotions h
    WHERE h.id = slide_id AND h.is_active = true
  ));

-- Brouillons : super_admin seulement.
DROP POLICY IF EXISTS hero_slide_html_select_super ON public.hero_slide_html;
CREATE POLICY hero_slide_html_select_super ON public.hero_slide_html
  FOR SELECT TO authenticated
  USING (public.is_super_admin());

-- Écriture : super_admin seulement (aucune exception de rôle, contrairement à un trigger).
DROP POLICY IF EXISTS hero_slide_html_insert_super ON public.hero_slide_html;
CREATE POLICY hero_slide_html_insert_super ON public.hero_slide_html
  FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS hero_slide_html_update_super ON public.hero_slide_html;
CREATE POLICY hero_slide_html_update_super ON public.hero_slide_html
  FOR UPDATE TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS hero_slide_html_delete_super ON public.hero_slide_html;
CREATE POLICY hero_slide_html_delete_super ON public.hero_slide_html
  FOR DELETE TO authenticated
  USING (public.is_super_admin());

-- ─── 5) Triggers : updated_at + compteur de version ─────────────────────
CREATE OR REPLACE FUNCTION public.hero_slide_html_touch()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS hero_slide_html_touch ON public.hero_slide_html;
CREATE TRIGGER hero_slide_html_touch
  BEFORE UPDATE ON public.hero_slide_html
  FOR EACH ROW EXECUTE FUNCTION public.hero_slide_html_touch();

DROP TRIGGER IF EXISTS hero_slide_html_bump_version ON public.hero_slide_html;
CREATE TRIGGER hero_slide_html_bump_version
  AFTER INSERT OR UPDATE OR DELETE ON public.hero_slide_html
  FOR EACH STATEMENT EXECUTE FUNCTION public.hero_bump_version();

UPDATE public.hero_version SET version = version + 1, updated_at = now() WHERE id = true;

NOTIFY pgrst, 'reload schema';
```

**Vérification** (à me coller) :

```sql
-- A. Colonnes parties, table présente, 5 policies
SELECT column_name FROM information_schema.columns
WHERE table_schema='public' AND table_name='hero_promotions' AND column_name IN ('html','css');  -- 0 ligne
SELECT policyname, cmd, roles FROM pg_policies
WHERE schemaname='public' AND tablename='hero_slide_html' ORDER BY policyname;                    -- 5 lignes
SELECT tgname FROM pg_trigger WHERE tgrelid='public.hero_slide_html'::regclass AND NOT tgisinternal;
-- B. Les policies Phase 0 de hero_promotions sont intactes
SELECT policyname, cmd FROM pg_policies WHERE schemaname='public' AND tablename='hero_promotions' ORDER BY policyname;
-- C. Le plafond refuse (doit échouer sur hero_slide_html_cap_check) :
BEGIN;
INSERT INTO public.hero_slide_html (slide_id, html)
SELECT id, repeat('a', 60000) FROM public.hero_promotions LIMIT 1;
ROLLBACK;
```

## 4.2 `src/lib/heroCss.ts` (nouveau, pur)

```ts
// src/lib/heroCss.ts — filtre CSS PUR pour le HTML collé (Shadow DOM). Zéro dépendance,
// importable en node (tests). Principe : tout ce qui est douteux est REFUSÉ (jamais "réparé"
// en silence) — l'admin voit pourquoi. Les contrôles portent sur le texte DÉCODÉ (échappements
// CSS résolus) : `u\72l(` est vu comme `url(`.

export interface HeroCssResult {
  /** CSS nettoyé ; "" si au moins une erreur. */
  css: string;
  errors: string[];
  warnings: string[];
}

const ALLOWED_AT = new Set([
  "media",
  "supports",
  "keyframes",
  "-webkit-keyframes",
  "container",
  "layer",
]);

function decodeCssEscapes(s: string): string {
  return s.replace(
    /\\([0-9a-fA-F]{1,6})[ \t\n\r\f]?|\\([^\n])/g,
    (_m, hex?: string, ch?: string) => {
      if (hex) {
        const cp = parseInt(hex, 16);
        return cp > 0 && cp <= 0x10ffff ? String.fromCodePoint(cp) : "\uFFFD";
      }
      return ch ?? "";
    },
  );
}

/** html / body / :root n'existent pas dans un shadow root : on vise l'hôte. */
function rewriteRoots(css: string): { css: string; changed: boolean } {
  let changed = false;
  const out = css.replace(
    /(^|[{},;>+~(]\s*|\s)(html|body|:root)(?![\w-])/gi,
    (_m, pre: string) => {
      changed = true;
      return `${pre}:host`;
    },
  );
  return { css: out.replace(/:host(\s+:host)+/g, ":host"), changed };
}

const urlOk = (u: string) =>
  /^https:\/\//i.test(u) || /^\/(?!\/)/.test(u) || u.startsWith("#");

export function sanitizeHeroCss(raw: string): HeroCssResult {
  const src = typeof raw === "string" ? raw : "";
  const stripped = src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\u0000/g, "")
    .trim();
  const { css, changed } = rewriteRoots(stripped);
  const dec = decodeCssEscapes(css);
  const low = dec.toLowerCase();
  const errors: string[] = [];
  const warnings: string[] = [];
  const add = (m: string) => {
    if (!errors.includes(m)) errors.push(m);
  };

  for (const m of low.matchAll(/@([a-z-]+)/g)) {
    if (!ALLOWED_AT.has(m[1])) add(`Règle @${m[1]} non autorisée.`);
  }
  if (
    /expression\s*\(|javascript:|vbscript:|-moz-binding|behavior\s*:|<\/?style|<\/?script|<!--|-->/.test(
      low,
    )
  ) {
    add(
      "Construction CSS dangereuse refusée (expression, javascript:, behavior, balises…).",
    );
  }
  if (/image-set\s*\(|cross-fade\s*\(|element\s*\(/.test(low)) {
    add(
      "image-set(), cross-fade() et element() ne sont pas autorisés : utilise url().",
    );
  }

  const urls = Array.from(
    dec.matchAll(/url\(\s*(?:"([^"]*)"|'([^']*)'|([^)'"\s][^)]*?))\s*\)/gi),
  );
  const urlCalls = (low.match(/url\(/g) || []).length;
  if (urls.length !== urlCalls) add("Une url() n'a pas pu être analysée.");
  for (const m of urls) {
    const u = (m[1] ?? m[2] ?? m[3] ?? "").trim();
    if (!urlOk(u)) {
      add(
        /^data:/i.test(u)
          ? "Image en base64 dans le CSS refusée : héberge-la puis utilise son URL https://."
          : `url(${u.slice(0, 40)}) refusée : seules les URL https://, /chemin ou #ancre sont acceptées.`,
      );
    }
  }

  const open = (css.match(/\{/g) || []).length;
  const close = (css.match(/\}/g) || []).length;
  if (open !== close) add("Accolades non équilibrées.");

  if (changed)
    warnings.push("Sélecteurs html / body / :root remplacés par :host.");
  return { css: errors.length ? "" : css, errors, warnings };
}

/** Valeur d'un attribut style="" : mêmes règles, sans accolade ni at-rule. */
export function isSafeStyleAttr(v: string): boolean {
  if (/[{}@]/.test(v)) return false;
  return sanitizeHeroCss(`x{${v}}`).errors.length === 0;
}
```

## 4.3 `src/lib/heroHtml.ts` (nouveau, navigateur)

```ts
// src/lib/heroHtml.ts — assainissement du HTML collé (navigateur). DOMPurify est chargé À LA
// DEMANDE : ni la boutique (sans slide HTML) ni l'admin hors studio ne le téléchargent.
import { cleanHeroLink } from "./heroSchema";
import { isSafeStyleAttr } from "./heroCss";

const FORBID_TAGS = [
  "style",
  "script",
  "iframe",
  "object",
  "embed",
  "form",
  "input",
  "textarea",
  "select",
  "option",
  "button",
  "link",
  "meta",
  "base",
  "template",
  "slot",
  "noscript",
  "frame",
  "frameset",
  "audio",
  "video",
  "canvas",
  "dialog",
  "marquee",
];
const FORBID_ATTR = [
  "srcdoc",
  "formaction",
  "ping",
  "action",
  "autofocus",
  "contenteditable",
  "target",
];
const CFG = {
  USE_PROFILES: { html: true, svg: true },
  FORBID_TAGS,
  FORBID_ATTR,
  ALLOW_UNKNOWN_PROTOCOLS: false,
};

let sink: string[] = [];
const warn = (m: string) => {
  if (!sink.includes(m)) sink.push(m);
};
const urlOk = (u: string) => /^https:\/\//i.test(u) || /^\/(?!\/)/.test(u);

let purifyP: Promise<any> | null = null;
function getPurify(): Promise<any> {
  if (!purifyP) {
    purifyP = import("dompurify").then((mod: any) => {
      const base = mod.default ?? mod;
      // Instance PRIVÉE : nos hooks ne touchent pas l'instance globale.
      const p = typeof base === "function" ? base(window) : base;
      p.addHook("uponSanitizeAttribute", (node: Element, data: any) => {
        const name = String(data.attrName || "").toLowerCase();
        const val = String(data.attrValue ?? "");
        if (name === "style") {
          if (!isSafeStyleAttr(val)) {
            data.keepAttr = false;
            warn("Un attribut style non autorisé a été retiré.");
          }
          return;
        }
        if (name === "href" || name === "xlink:href") {
          if (node.nodeName.toLowerCase() === "a") {
            const link = cleanHeroLink(val);
            if (link) {
              data.attrValue = link;
              return;
            }
            if (val.trim().startsWith("#")) return;
            data.keepAttr = false;
            warn(
              "Lien externe ou invalide retiré (seuls les liens internes « /… » sont acceptés).",
            );
            return;
          }
          if (!urlOk(val.trim())) {
            data.keepAttr = false;
            warn(
              "Référence de média non autorisée retirée (https:// ou /… uniquement).",
            );
          }
          return;
        }
        if (name === "src" || name === "poster") {
          if (!urlOk(val.trim())) {
            data.keepAttr = false;
            warn(
              /^data:/i.test(val.trim())
                ? "Image en base64 retirée : héberge-la puis colle son URL."
                : "Source de média non autorisée retirée (https:// ou /… uniquement).",
            );
          }
          return;
        }
        if (name === "srcset") {
          const ok = val
            .split(",")
            .every((part) => urlOk((part.trim().split(/\s+/)[0] ?? "").trim()));
          if (!ok) {
            data.keepAttr = false;
            warn("srcset non autorisé retiré.");
          }
        }
      });
      p.addHook("afterSanitizeAttributes", (node: Element) => {
        if (node.nodeName.toLowerCase() === "a") {
          node.removeAttribute("target");
          node.setAttribute("rel", "noopener noreferrer");
        }
      });
      return p;
    });
  }
  return purifyP;
}

async function run(raw: string): Promise<{
  fragment: DocumentFragment;
  extractedCss: string;
  warnings: string[];
}> {
  const text = String(raw ?? "");
  const warnings: string[] = [];
  // DOMParser : document inerte (aucun script exécuté, aucune ressource chargée).
  const doc = new DOMParser().parseFromString(text, "text/html");
  let extractedCss = "";
  doc.querySelectorAll("style").forEach((s) => {
    extractedCss += (s.textContent ?? "") + "\n";
    s.remove();
  });
  if (doc.querySelector('link[rel~="stylesheet"]')) {
    warnings.push(
      "<link> de feuille de style ignoré : colle le CSS dans le champ CSS.",
    );
  }
  if (doc.querySelector("script, iframe, object, embed, form")) {
    warnings.push(
      "Scripts / iframes / formulaires retirés (le JavaScript n'est pas supporté).",
    );
  }
  const b64 = (text.match(/data:[a-z]+\/[a-z0-9.+-]+;base64,/gi) || []).length;
  if (b64 > 0) {
    warnings.push(
      `${b64} image(s) en base64 retirée(s) : héberge-les puis colle leur URL.`,
    );
  }
  const purify = await getPurify();
  sink = warnings;
  const fragment = purify.sanitize(doc.body, {
    ...CFG,
    RETURN_DOM_FRAGMENT: true,
  }) as DocumentFragment;
  sink = [];
  return { fragment, extractedCss, warnings };
}

export interface HeroHtmlSanitized {
  html: string;
  /** Contenu des <style> trouvés dans le HTML collé (à fusionner avec le champ CSS). */
  extractedCss: string;
  warnings: string[];
}

/** Version "stockage" : chaîne HTML nettoyée. */
export async function sanitizeHeroHtml(
  raw: string,
): Promise<HeroHtmlSanitized> {
  const r = await run(raw);
  const holder = document.createElement("div");
  holder.appendChild(r.fragment);
  return {
    html: holder.innerHTML,
    extractedCss: r.extractedCss,
    warnings: r.warnings,
  };
}

/** Version "rendu" : fragment DOM direct (pas de re-sérialisation → pas de mXSS). */
export async function sanitizeHeroHtmlToFragment(
  raw: string,
): Promise<DocumentFragment> {
  return (await run(raw)).fragment;
}
```

## 4.4 `src/components/HeroHtmlBlock.tsx` (nouveau)

```tsx
// src/components/HeroHtmlBlock.tsx — rendu ISOLÉ du HTML collé (Shadow DOM).
// Le CSS du site n'entre pas, le CSS collé ne sort pas ; les variables (--color-*) traversent
// la frontière : le HTML peut s'adapter au thème avec var(--color-ink) etc.
import { useEffect, useRef, type MouseEvent } from "react";
import { sanitizeHeroCss } from "../lib/heroCss";
import { cleanHeroLink } from "../lib/heroSchema";

const BASE_CSS =
  ":host{display:block;position:absolute;inset:0;overflow:hidden;contain:layout paint style;" +
  "color:var(--color-ink);font-family:var(--font-sans);line-height:1.4}" +
  "*,*::before,*::after{box-sizing:border-box}img,svg,picture{max-width:100%}";

// Cache du fragment nettoyé (un slide démonté/remonté ne re-passe pas le filtre).
const cache = new Map<string, Promise<DocumentFragment>>();
function cleanFragment(html: string): Promise<DocumentFragment> {
  let p = cache.get(html);
  if (!p) {
    p = import("../lib/heroHtml").then((m) =>
      m.sanitizeHeroHtmlToFragment(html),
    );
    cache.set(html, p);
    if (cache.size > 12) cache.delete(cache.keys().next().value as string);
  }
  return p;
}

/** Monte (et re-nettoie) html+css dans un shadow root. Partagé avec la mesure du studio. */
export async function mountHeroHtml(
  host: HTMLElement,
  html: string,
  css: string,
  isCurrent: () => boolean = () => true,
): Promise<void> {
  const frag = await cleanFragment(html);
  if (!isCurrent()) return;
  const root = host.shadowRoot ?? host.attachShadow({ mode: "open" });
  const c = sanitizeHeroCss(css);
  const st = document.createElement("style");
  st.textContent = BASE_CSS + (c.errors.length ? "" : c.css);
  root.replaceChildren(st, frag.cloneNode(true));
}

export default function HeroHtmlBlock({
  html,
  css,
  onLink,
}: {
  html: string;
  css: string;
  onLink?: (link: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = ref.current;
    if (!host) return;
    let alive = true;
    mountHeroHtml(host, html, css, () => alive).catch(() => {
      if (alive) host.shadowRoot?.replaceChildren();
    });
    return () => {
      alive = false;
    };
  }, [html, css]);

  // Liens internes du HTML collé → routeur de l'app (jamais de rechargement complet).
  const onClick = (e: MouseEvent<HTMLDivElement>) => {
    const a = e.nativeEvent
      .composedPath()
      .find((n): n is HTMLAnchorElement => n instanceof HTMLAnchorElement);
    if (!a) return;
    e.preventDefault();
    const link = cleanHeroLink(a.getAttribute("href"));
    if (link && onLink) onLink(link);
  };

  return (
    <div
      ref={ref}
      onClick={onClick}
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        contain: "layout paint style",
      }}
    />
  );
}
```

## 4.5 `src/lib/heroResolve.ts` : remplacement complet

Quatre zones changent (interface, `make`, `resolveHeroSlides`, `resolveHeroSlideForPreview`), donc je te donne le fichier entier.

```ts
// src/lib/heroResolve.ts — PUR. Promos + produits (+ HTML publié) → slides prêts à rendre.
import {
  buildHeroConfigFromLegacy,
  isHeroScheduledLive,
  resolveHeroConfig,
  type HeroConfig,
  type LegacyHeroFields,
} from "./heroSchema.ts";
import { heroBackground, isLightHeroBg } from "./heroStyle.ts";

export interface HeroProductLite {
  id: string;
  title: string;
  description?: string | null;
  image?: string | null;
  isActive?: boolean | null;
}

export interface HeroHtmlPayload {
  html: string;
  css: string;
}

export interface HeroPromoLike extends LegacyHeroFields {
  id: string;
  order: number;
  isActive?: boolean | null;
  startsAt?: string | null;
  endsAt?: string | null;
  config?: HeroConfig | null;
}

export interface ResolvedHeroSlide {
  id: string;
  /** Produit principal (cible par défaut des CTA). null = slide sans produit. */
  productId: string | null;
  product: HeroProductLite | null;
  config: HeroConfig;
  /** Fond CSS final (fallback appliqué). */
  bg: string;
  /** true = encre sombre pour les contrôles (fond clair, aucune image plein cadre). */
  lightBg: boolean;
  /** HTML/CSS de la couche "html" (chargés à part, jamais dans la liste publique). */
  html?: HeroHtmlPayload | null;
}

function make(
  id: string,
  productId: string | null,
  product: HeroProductLite | null,
  config: HeroConfig,
  html: HeroHtmlPayload | null = null,
): ResolvedHeroSlide {
  const bg = heroBackground(config.background.gradient);
  const hasFill = config.layers.some((l) => l.type === "image");
  return {
    id,
    productId,
    product,
    config,
    bg,
    lightBg: !hasFill && isLightHeroBg(bg),
    html,
  };
}

/** Le slide porte-t-il une couche HTML ? (décide s'il faut aller chercher son HTML) */
export function heroHasHtml(p: { config?: HeroConfig | null }): boolean {
  return !!p.config && p.config.layers.some((l) => l.type === "html");
}

/** Un slide SANS produit doit porter son propre visuel, sinon il est vide. */
function hasStandaloneContent(c: HeroConfig): boolean {
  return c.layers.some(
    (l) =>
      l.type === "html" ||
      (l.type === "image" && !!l.src) ||
      (l.type === "card" && !!l.src) ||
      (l.type === "tiles" && (!!l.main?.src || l.items.length > 0)),
  );
}

/**
 * Règles (boutique) :
 *  - slide actif et dans sa fenêtre de planification ;
 *  - avec produit : le produit doit exister ET être actif (règle historique) ;
 *  - sans produit : seulement si origin "studio" ET un visuel propre ;
 *  - couche HTML : le slide n'apparaît qu'une fois son HTML chargé (htmlById) ;
 *  - tri par order puis id (déterministe).
 */
export function resolveHeroSlides(
  promos: HeroPromoLike[],
  products: HeroProductLite[],
  now: number = Date.now(),
  htmlById: Record<string, HeroHtmlPayload> = {},
): ResolvedHeroSlide[] {
  const byId = new Map(products.map((p) => [p.id, p]));
  return [...promos]
    .filter(
      (p) =>
        p.isActive !== false && isHeroScheduledLive(p.startsAt, p.endsAt, now),
    )
    .sort(
      (a, b) => a.order - b.order || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
    )
    .flatMap((p) => {
      const pid = p.productId || null;
      const product = pid ? (byId.get(pid) ?? null) : null;
      if (pid && (!product || product.isActive === false)) return [];
      const config = resolveHeroConfig(p);
      if (!pid && (config.origin === "legacy" || !hasStandaloneContent(config)))
        return [];
      const wantsHtml = config.layers.some((l) => l.type === "html");
      const html = wantsHtml ? (htmlById[p.id] ?? null) : null;
      if (wantsHtml && !html) return [];
      return [make(p.id, pid, product, config, html)];
    });
}

/** Preview studio : aucun filtre (on veut voir le brouillon tel quel). */
export function resolveHeroSlideForPreview(
  p: HeroPromoLike,
  product: HeroProductLite | null,
  html: HeroHtmlPayload | null = null,
): ResolvedHeroSlide {
  return make(
    p.id || "preview",
    p.productId || null,
    product,
    resolveHeroConfig(p),
    html,
  );
}

/** Prochain instant (ms) où la planification change l'ensemble des slides visibles. */
export function nextHeroScheduleChange(
  promos: {
    isActive?: boolean | null;
    startsAt?: string | null;
    endsAt?: string | null;
  }[],
  now: number = Date.now(),
): number | null {
  let next: number | null = null;
  for (const p of promos) {
    if (p.isActive === false) continue;
    for (const iso of [p.startsAt, p.endsAt]) {
      const t = iso ? Date.parse(iso) : NaN;
      if (!Number.isNaN(t) && t > now && (next === null || t < next)) next = t;
    }
  }
  return next;
}

/**
 * Slide d'amorçage embarqué par le prerender (<script id="lead-hero-data">), format
 * legacy déjà résolu. Validation minimale, jamais d'exception.
 */
export function parseLeadHero(raw: unknown): ResolvedHeroSlide | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.image !== "string" || !r.image) return null;
  if (typeof r.headline !== "string" || !r.headline) return null;
  const sub = typeof r.sub === "string" ? r.sub : "";
  const productId =
    typeof r.productId === "string" && r.productId ? r.productId : null;
  const tiles = Array.isArray(r.tiles)
    ? r.tiles
        .filter(
          (t) => !!t && typeof (t as { image?: unknown }).image === "string",
        )
        .slice(0, 3)
    : null;
  const config = buildHeroConfigFromLegacy({
    kind: r.kind === "image" || r.kind === "grid" ? r.kind : "product",
    layout: r.layout === "split" ? "split" : "full",
    headline: r.headline,
    sub,
    cta: typeof r.cta === "string" && r.cta ? r.cta : "Discover",
    tag: typeof r.tag === "string" ? r.tag : "⚡ PROMOTION",
    showTag: r.showTag !== false,
    image: r.image,
    bgGradient: typeof r.bgGradient === "string" ? r.bgGradient : "",
    linkUrl: typeof r.linkUrl === "string" ? r.linkUrl : null,
    tiles,
    productId,
  });
  return make(
    "lead",
    productId,
    {
      id: productId ?? "lead",
      title: r.headline,
      description: sub,
      image: r.image,
    },
    config,
  );
}
```

## 4.6 `src/components/HeroSlideView.tsx` : 2 modifications

**1)** Juste après la ligne `import { ArrowRight } from "lucide-react";`, ajoute :

```tsx
import HeroHtmlBlock from "./HeroHtmlBlock";
```

**2)** Remplace la ligne `return null; // "text" rendu après ; "html" = lot 4` (dans `config.layers.map`) par :

```tsx
if (layer.type === "html") {
  if (!slide.html) return null;
  return (
    <HeroHtmlBlock
      key={i}
      html={slide.html.html}
      css={slide.html.css}
      onLink={onLink}
    />
  );
}
return null; // "text" : rendu après les couches
```

## 4.7 `src/admin/HeroPreviewFrame.tsx` : remplacement complet

Ajoute la mesure du HTML (même rendu que la boutique).

```tsx
// src/admin/HeroPreviewFrame.tsx — page chargée DANS l'iframe d'aperçu du studio.
// Garde admin : rien ne s'affiche sans session admin ; les messages ne sont acceptés
// que du parent same-origin.
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import HeroCarousel from "../components/HeroCarousel";
import { mountHeroHtml } from "../components/HeroHtmlBlock";
import { sanitizeHeroConfig } from "../lib/heroSchema";
import type { ResolvedHeroSlide } from "../lib/heroResolve";
import { HERO_FRAME_SOURCE, HERO_STUDIO_SOURCE } from "../lib/heroStudio";

/** Mesure la hauteur du HTML à une largeur donnée (dans un conteneur hors écran). */
async function measureHtml(m: {
  id: number;
  html: string;
  css: string;
  width: number;
}) {
  const reply = (height: number | null) =>
    window.parent.postMessage(
      { source: HERO_FRAME_SOURCE, type: "measured", id: m.id, height },
      window.location.origin,
    );
  const w = Math.max(200, Math.min(2400, Number(m.width) || 1280));
  const wrap = document.createElement("div");
  wrap.style.cssText = `position:fixed;left:-99999px;top:0;width:${w}px;visibility:hidden;pointer-events:none;`;
  const inner = document.createElement("div");
  // Les styles posés ici l'emportent sur les règles :host du shadow root.
  inner.style.cssText =
    "position:relative;inset:auto;overflow:visible;contain:none;width:100%;";
  wrap.appendChild(inner);
  document.body.appendChild(wrap);
  try {
    await mountHeroHtml(inner, String(m.html ?? ""), String(m.css ?? ""));
    const imgs = Array.from(inner.shadowRoot?.querySelectorAll("img") ?? []);
    imgs.forEach((im) => {
      im.loading = "eager"; // hors écran, un lazy ne se chargerait jamais
    });
    await Promise.race([
      Promise.all(
        imgs.map((im) =>
          im.complete
            ? null
            : new Promise<void>((r) => {
                im.addEventListener("load", () => r(), { once: true });
                im.addEventListener("error", () => r(), { once: true });
              }),
        ),
      ),
      new Promise((r) => setTimeout(r, 1500)),
    ]);
    const h = Math.round(inner.getBoundingClientRect().height);
    reply(h > 0 ? h : null);
  } catch {
    reply(null);
  } finally {
    wrap.remove();
  }
}

export default function HeroPreviewFrame() {
  const [ok, setOk] = useState<boolean | null>(null);
  const [slide, setSlide] = useState<ResolvedHeroSlide | null>(null);

  useEffect(() => {
    supabase.rpc("is_admin").then(
      ({ data }) => setOk(!!data),
      () => setOk(false),
    );
  }, []);

  useEffect(() => {
    if (!ok) return;
    const onMsg = (e: MessageEvent) => {
      if (e.origin !== window.location.origin || e.source !== window.parent)
        return;
      const m = e.data;
      if (!m || m.source !== HERO_STUDIO_SOURCE) return;
      if (m.type === "measure") {
        void measureHtml(m);
        return;
      }
      if (m.type !== "set" || !m.slide) return;
      setSlide({ ...m.slide, config: sanitizeHeroConfig(m.slide.config) });
      const dark = m.theme === "dark";
      document.documentElement.setAttribute(
        "data-theme",
        dark ? "dark" : "light",
      );
      document.documentElement.style.background = dark ? "#121110" : "#fafaf8";
    };
    window.addEventListener("message", onMsg);
    window.parent.postMessage(
      { source: HERO_FRAME_SOURCE, type: "ready" },
      window.location.origin,
    );
    return () => window.removeEventListener("message", onMsg);
  }, [ok]);

  // Rapporte le rectangle réel du cadre hero (le studio y ancre ses poignées CTA).
  useEffect(() => {
    if (!ok || !slide) return;
    const el = document.querySelector(".hero-box");
    const report = () => {
      const box = document.querySelector(".hero-box");
      if (!box) return;
      const r = box.getBoundingClientRect();
      window.parent.postMessage(
        {
          source: HERO_FRAME_SOURCE,
          type: "rect",
          rect: { x: r.x, y: r.y, w: r.width, h: r.height },
        },
        window.location.origin,
      );
    };
    report();
    const ro = new ResizeObserver(report);
    if (el) ro.observe(el);
    window.addEventListener("resize", report);
    const t = setTimeout(report, 300);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", report);
      clearTimeout(t);
    };
  }, [ok, slide]);

  if (!ok || !slide) return null;
  return (
    <div style={{ minHeight: "100vh", background: "var(--color-bg)" }}>
      <HeroCarousel slides={[slide]} loading={false} onSlideAction={() => {}} />
    </div>
  );
}
```

## 4.8 `src/admin/HeroHtmlPanel.tsx` (nouveau)

```tsx
// src/admin/HeroHtmlPanel.tsx — édition du HTML/CSS collé d'un slide (super_admin uniquement).
// Un non super_admin ne voit que le HTML PUBLIÉ, en lecture seule (c'est du contenu public).
import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useState,
} from "react";
import { AlertTriangle, FileUp, Ruler, ShieldCheck } from "lucide-react";
import { heroHtmlApi } from "../api/supabaseApi";
import { formInputStyle } from "./adminStyles";
import { heroPayloadBudget } from "../lib/heroSchema";
import { sanitizeHeroCss } from "../lib/heroCss";
import { sanitizeHeroHtml } from "../lib/heroHtml";

export interface HeroHtmlPanelHandle {
  /** Appelé par le studio APRÈS l'enregistrement du slide. Lève une Error lisible si refus. */
  save: (slideId: string, hasLayer: boolean) => Promise<void>;
}

interface Props {
  slideId: string | null;
  hasLayer: boolean;
  isSuper: boolean;
  isFirst: boolean;
  onLive: (v: { html: string; css: string } | null) => void;
  onDirty: (d: boolean) => void;
  measure: (html: string, css: string, width: number) => Promise<number | null>;
  onRatios: (r: { desktop: number; mobile: number }) => void;
}

const mono: React.CSSProperties = {
  ...formInputStyle,
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
  fontSize: 12,
  minHeight: 150,
  resize: "vertical",
  whiteSpace: "pre",
  overflow: "auto",
};
const small: React.CSSProperties = {
  fontSize: 12,
  color: "var(--color-ink3)",
  margin: 0,
};
const smallBtn: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "7px 12px",
  borderRadius: 10,
  border: "1px solid var(--color-border)",
  background: "var(--color-surface2)",
  color: "var(--color-ink2)",
  fontWeight: 600,
  fontSize: 12,
  cursor: "pointer",
};

const mergeCss = (extracted: string, css: string) =>
  [extracted.trim(), css.trim()].filter(Boolean).join("\n");

const HeroHtmlPanel = forwardRef<HeroHtmlPanelHandle, Props>(
  function HeroHtmlPanel(props, ref) {
    const {
      slideId,
      hasLayer,
      isSuper,
      isFirst,
      onLive,
      onDirty,
      measure,
      onRatios,
    } = props;
    const [html, setHtml] = useState("");
    const [css, setCss] = useState("");
    const [base, setBase] = useState({ html: "", css: "" });
    const [existed, setExisted] = useState(false);
    const [busy, setBusy] = useState(false);
    const [note, setNote] = useState<{ ok: boolean; lines: string[] } | null>(
      null,
    );
    const readOnly = !isSuper;

    // Chargement : super_admin = source (brouillon inclus, garde RLS) ; autres = HTML publié.
    useEffect(() => {
      if (!slideId) return;
      let alive = true;
      (async () => {
        try {
          const row = isSuper
            ? await heroHtmlApi.getForEdit(slideId)
            : ((await heroHtmlApi.getPublished([slideId]))[slideId] ?? null);
          if (!alive) return;
          setExisted(!!row);
          if (row) {
            setHtml(row.html);
            setCss(row.css);
            setBase({ html: row.html, css: row.css });
          }
        } catch (e: any) {
          if (alive)
            setNote({
              ok: false,
              lines: [e?.message || "Lecture impossible."],
            });
        }
      })();
      return () => {
        alive = false;
      };
    }, [slideId, isSuper]);

    // Aperçu live (le rendu applique lui-même le filtre : jamais de contenu brut exécuté).
    useEffect(() => {
      const t = setTimeout(() => onLive(hasLayer ? { html, css } : null), 200);
      return () => clearTimeout(t);
    }, [html, css, hasLayer]);
    useEffect(() => {
      onDirty(!readOnly && (html !== base.html || css !== base.css));
    }, [html, css, base, readOnly]);
    useEffect(
      () => () => {
        onDirty(false);
        onLive(null);
      },
      [],
    );

    const cssCheck = useMemo(() => sanitizeHeroCss(css), [css]);
    const budget = useMemo(() => heroPayloadBudget(html, css), [html, css]);

    useImperativeHandle(
      ref,
      () => ({
        async save(id, hasL) {
          if (!isSuper) return;
          if (!hasL) {
            if (existed) {
              await heroHtmlApi.remove(id);
              setExisted(false);
              setBase({ html: "", css: "" });
            }
            return;
          }
          const r = await sanitizeHeroHtml(html);
          const merged = mergeCss(r.extractedCss, css);
          const c = sanitizeHeroCss(merged);
          if (c.errors.length) throw new Error(`CSS refusé : ${c.errors[0]}`);
          const b = heroPayloadBudget(r.html, c.css);
          if (b.level === "over") {
            throw new Error(
              `HTML + CSS trop lourds (${b.bytes} / ${b.capBytes} octets).`,
            );
          }
          await heroHtmlApi.save(id, r.html, c.css);
          setHtml(r.html);
          setCss(c.css);
          setBase({ html: r.html, css: c.css });
          setExisted(true);
        },
      }),
      [isSuper, html, css, existed],
    );

    const clean = async () => {
      setBusy(true);
      setNote(null);
      try {
        const r = await sanitizeHeroHtml(html);
        const merged = mergeCss(r.extractedCss, css);
        const c = sanitizeHeroCss(merged);
        setHtml(r.html);
        setCss(c.errors.length ? merged : c.css);
        setNote({
          ok: c.errors.length === 0,
          lines: [
            ...c.errors,
            ...r.warnings,
            ...c.warnings,
            ...(c.errors.length ? [] : ["HTML et CSS nettoyés."]),
          ],
        });
      } catch (e: any) {
        setNote({ ok: false, lines: [e?.message || "Nettoyage impossible."] });
      } finally {
        setBusy(false);
      }
    };

    const onFile = async (f: File | undefined) => {
      if (!f) return;
      if (f.size > 400_000) {
        setNote({
          ok: false,
          lines: [
            "Fichier trop volumineux (> 400 Ko) : le plafond est ~50 Ko.",
          ],
        });
        return;
      }
      setHtml(await f.text());
      setNote({
        ok: true,
        lines: ["Fichier chargé. Clique « Nettoyer & vérifier »."],
      });
    };

    const doMeasure = async () => {
      setBusy(true);
      setNote(null);
      try {
        const r = await sanitizeHeroHtml(html);
        const c = sanitizeHeroCss(mergeCss(r.extractedCss, css));
        const useCss = c.errors.length ? "" : c.css;
        const d = await measure(r.html, useCss, 1280);
        const m = await measure(r.html, useCss, 390);
        if (!d || !m) throw new Error("Mesure impossible (aperçu non prêt ?).");
        const ratios = {
          desktop: Math.round((1280 / d) * 100) / 100,
          mobile: Math.round((390 / m) * 100) / 100,
        };
        onRatios(ratios);
        setNote({
          ok: true,
          lines: [
            `Ratio mesuré : desktop ${ratios.desktop}, mobile ${ratios.mobile}. Dimensions passées en mode Auto.`,
          ],
        });
      } catch (e: any) {
        setNote({ ok: false, lines: [e?.message || "Mesure impossible."] });
      } finally {
        setBusy(false);
      }
    };

    if (!hasLayer && !isSuper) return null;

    const pct = Math.min(100, (budget.bytes / budget.capBytes) * 100);
    const color =
      budget.level === "over"
        ? "#ef4444"
        : budget.level === "warn"
          ? "#d97706"
          : "var(--color-success)";

    return (
      <>
        {readOnly && (
          <p style={small}>
            Le HTML collé est réservé aux super-administrateurs. Aperçu en
            lecture seule du HTML publié.
          </p>
        )}
        {isSuper && !hasLayer && (
          <p style={small}>
            Ajoute une couche « HTML collé » (section Couches) pour afficher ce
            contenu.
            {existed
              ? " Le HTML déjà enregistré sera supprimé à l'enregistrement."
              : ""}
          </p>
        )}
        {(hasLayer || existed) && (
          <>
            {isFirst && hasLayer && (
              <p style={{ ...small, color: "#92400e" }}>
                <AlertTriangle size={12} style={{ verticalAlign: "middle" }} />{" "}
                Slide n°1 : le HTML est rendu après le JavaScript, le LCP n'est
                pas garanti. Une image plein cadre en slide n°1 est recommandée.
              </p>
            )}
            <label
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: "var(--color-ink2)",
              }}
            >
              HTML
            </label>
            <textarea
              style={mono}
              value={html}
              readOnly={readOnly}
              spellCheck={false}
              onChange={(e) => setHtml(e.target.value)}
              placeholder="<div class='promo'>…</div>  (les <style> collés sont déplacés dans le champ CSS)"
            />
            <label
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: "var(--color-ink2)",
              }}
            >
              CSS
            </label>
            <textarea
              style={mono}
              value={css}
              readOnly={readOnly}
              spellCheck={false}
              onChange={(e) => setCss(e.target.value)}
              placeholder=".promo{ color: var(--color-ink); }   /* var(--color-*) = thème clair/sombre */"
            />

            <div>
              <div style={{ fontSize: 12, color: "var(--color-ink2)" }}>
                HTML + CSS : <strong>{budget.bytes}</strong> / {budget.capBytes}{" "}
                octets
                {budget.level === "warn" && " — proche du plafond"}
                {budget.level === "over" &&
                  " — trop lourd, enregistrement refusé"}
              </div>
              <div
                style={{
                  height: 6,
                  borderRadius: 99,
                  background: "var(--color-surface2)",
                  marginTop: 6,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${pct}%`,
                    height: "100%",
                    background: color,
                  }}
                />
              </div>
            </div>

            {cssCheck.errors.length > 0 && (
              <div style={{ fontSize: 12, color: "#991b1b" }}>
                {cssCheck.errors.map((m, i) => (
                  <div key={i}>⛔ {m}</div>
                ))}
              </div>
            )}

            {!readOnly && (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button
                  type="button"
                  style={smallBtn}
                  disabled={busy}
                  onClick={clean}
                >
                  <ShieldCheck size={13} /> Nettoyer & vérifier
                </button>
                <label style={{ ...smallBtn, cursor: "pointer" }}>
                  <FileUp size={13} /> Importer un .html
                  <input
                    type="file"
                    accept=".html,.htm,text/html"
                    style={{ display: "none" }}
                    onChange={(e) => {
                      void onFile(e.target.files?.[0]);
                      e.currentTarget.value = "";
                    }}
                  />
                </label>
                <button
                  type="button"
                  style={smallBtn}
                  disabled={busy || !html}
                  onClick={doMeasure}
                >
                  <Ruler size={13} /> Mesurer pour le mode Auto
                </button>
              </div>
            )}

            {note && (
              <div
                style={{
                  fontSize: 12,
                  color: note.ok ? "var(--color-ink2)" : "#991b1b",
                }}
              >
                {note.lines.map((m, i) => (
                  <div key={i}>{m}</div>
                ))}
              </div>
            )}
            <p style={small}>
              Le JavaScript, les formulaires, les iframes et les polices
              externes ne sont pas supportés. Les liens internes « /… »
              fonctionnent ; les boutons d'action se règlent dans « Boutons ».
            </p>
          </>
        )}
      </>
    );
  },
);

export default HeroHtmlPanel;
```

## 4.9 `src/api/supabaseApi.ts` : 4 modifications

**1)** Dans l'import qui contient `parseHeroConfig,` (venant de `../lib/heroSchema`), ajoute `heroPayloadBudget,` à la liste.

**2)** Dans `mapHeroPromotion` (bloc qui commence par `const mapHeroPromotion = (row: any): HeroPromotion => ({`), supprime ces 4 lignes (les colonnes n'existent plus) :

```ts
  // html/css absents des requêtes publiques : undefined (jamais "" → un update
  // spreadé depuis la liste ne peut PAS écraser un HTML existant).
  html: typeof row.html === "string" ? row.html : undefined,
  css: typeof row.css === "string" ? row.css : undefined,
```

**3)** Dans `heroPromotionsApi`, supprime ces 2 lignes dans `create` :

```ts
        ...(promo.html !== undefined ? { html: promo.html } : {}),
        ...(promo.css !== undefined ? { css: promo.css } : {}),
```

et ces 2 lignes dans `update` :

```ts
if (promo.html !== undefined) patch.html = promo.html;
if (promo.css !== undefined) patch.css = promo.css;
```

**4)** Juste **avant** la ligne `export const reviewApi = {`, ajoute :

```ts
// ─── Hero : HTML/CSS collé (table hero_slide_html) ────────────────────────
// Écriture : super_admin (RLS) + garde ici. Lecture publique = HTML des slides PUBLIÉS
// uniquement (RLS) ; le brouillon n'est lisible que par un super_admin (RLS).
export interface HeroHtmlRow {
  slideId: string;
  html: string;
  css: string;
}

async function requireSuperAdmin(): Promise<string> {
  const me = await adminUserApi.getMyRole();
  if (!me || me.role !== "super_admin") {
    throw new Error("HTML collé : réservé aux super-administrateurs.");
  }
  return me.email;
}

export const heroHtmlApi = {
  /** Boutique : HTML des slides publiés. Jamais appelé sans ids. */
  async getPublished(
    ids: string[],
  ): Promise<Record<string, { html: string; css: string }>> {
    if (ids.length === 0) return {};
    const { data, error } = await supabase
      .from("hero_slide_html")
      .select("slide_id, html, css")
      .in("slide_id", ids);
    if (error) throw error;
    return Object.fromEntries(
      (data ?? []).map((r: any) => [
        r.slide_id,
        { html: r.html ?? "", css: r.css ?? "" },
      ]),
    );
  },
  /** Studio : source brute (brouillon inclus). super_admin uniquement. */
  async getForEdit(slideId: string): Promise<HeroHtmlRow | null> {
    await requireSuperAdmin();
    const { data, error } = await supabase
      .from("hero_slide_html")
      .select("slide_id, html, css")
      .eq("slide_id", slideId)
      .maybeSingle();
    if (error) throw error;
    return data
      ? { slideId: data.slide_id, html: data.html ?? "", css: data.css ?? "" }
      : null;
  },
  async save(slideId: string, html: string, css: string): Promise<void> {
    const email = await requireSuperAdmin();
    const budget = heroPayloadBudget(html, css);
    if (budget.level === "over") {
      throw new Error(
        `HTML + CSS trop lourds (${budget.bytes} / ${budget.capBytes} octets).`,
      );
    }
    const { error } = await supabase
      .from("hero_slide_html")
      .upsert({ slide_id: slideId, html, css }, { onConflict: "slide_id" });
    if (error) throw error;
    adminAuditApi
      .create({
        actorEmail: email,
        action: "hero_html_save",
        targetType: "hero_slide",
        targetId: slideId,
        after: { bytes: budget.bytes },
      })
      .catch(() => {});
  },
  async remove(slideId: string): Promise<void> {
    const email = await requireSuperAdmin();
    const { error } = await supabase
      .from("hero_slide_html")
      .delete()
      .eq("slide_id", slideId);
    if (error) throw error;
    adminAuditApi
      .create({
        actorEmail: email,
        action: "hero_html_remove",
        targetType: "hero_slide",
        targetId: slideId,
      })
      .catch(() => {});
  },
};
```

## 4.10 `src/admin/adminTypes.ts` : 1 suppression

Dans `HeroPromotion`, supprime ces 3 lignes :

```ts
  /** HTML/CSS collés (Phase 4). undefined = non chargés (liste publique : jamais). */
  html?: string;
  css?: string;
```

## 4.11 `src/admin/HeroStudioPage.tsx` : 9 modifications

**1) Imports.** Remplace la ligne `import { heroPromotionsApi, productApi } from "../api/supabaseApi";` par :

```tsx
import {
  adminUserApi,
  heroPromotionsApi,
  productApi,
} from "../api/supabaseApi";
```

Puis juste après la ligne `import { normalizeHeroLink } from "../lib/heroStyle";`, ajoute :

```tsx
import HeroHtmlPanel, { type HeroHtmlPanelHandle } from "./HeroHtmlPanel";
```

**2) États.** Juste après la ligne `const dragId = useRef<string | null>(null);`, ajoute :

```tsx
const [isSuper, setIsSuper] = useState(false);
const [liveHtml, setLiveHtml] = useState<{ html: string; css: string } | null>(
  null,
);
const [htmlDirty, setHtmlDirty] = useState(false);
const htmlRef = useRef<HeroHtmlPanelHandle>(null);
```

**3) Rôle + mesure.** Juste **avant** la ligne de commentaire `// Largeur disponible pour l'aperçu.`, ajoute :

```tsx
// Rôle : le HTML collé n'est éditable que par un super_admin (RLS en base + garde UI).
useEffect(() => {
  adminUserApi.getMyRole().then(
    (me) => setIsSuper(me?.role === "super_admin"),
    () => setIsSuper(false),
  );
}, []);

// Mesure du HTML dans l'iframe (même rendu que la boutique).
const measureSeq = useRef(0);
const measurePending = useRef(new Map<number, (h: number | null) => void>());
const measureHtml = (html: string, css: string, width: number) =>
  new Promise<number | null>((resolve) => {
    const win = frameRef.current?.contentWindow;
    if (!win) return resolve(null);
    const id = ++measureSeq.current;
    const timer = setTimeout(() => {
      measurePending.current.delete(id);
      resolve(null);
    }, 6000);
    measurePending.current.set(id, (h) => {
      clearTimeout(timer);
      resolve(h);
    });
    win.postMessage(
      { source: HERO_STUDIO_SOURCE, type: "measure", id, html, css, width },
      window.location.origin,
    );
  });
```

**4) `dirty`.** Remplace la ligne `const dirty = !!draft && serialize(draft) !== baseline;` par :

```tsx
const dirty = (!!draft && serialize(draft) !== baseline) || htmlDirty;
```

**5) Messages de l'iframe.** Remplace le bloc qui **commence** par `// Messages de l'iframe (ready / rect).` et se termine par `}, []);` (le premier après ce commentaire) par :

```tsx
// Messages de l'iframe (ready / rect / measured).
useEffect(() => {
  const onMsg = (e: MessageEvent) => {
    if (
      e.origin !== window.location.origin ||
      e.source !== frameRef.current?.contentWindow
    )
      return;
    const m = e.data;
    if (!m || m.source !== HERO_FRAME_SOURCE) return;
    if (m.type === "ready") setReadyTick((t) => t + 1);
    if (m.type === "rect" && m.rect) setRect(m.rect as Rect);
    if (m.type === "measured") {
      const done = measurePending.current.get(m.id);
      measurePending.current.delete(m.id);
      done?.(typeof m.height === "number" ? m.height : null);
    }
  };
  window.addEventListener("message", onMsg);
  return () => window.removeEventListener("message", onMsg);
}, []);
```

**6) Aperçu avec HTML.** Remplace le bloc qui **commence** par `const resolved = useMemo(` et se termine par `[draft, product],` suivi de `);` par :

```tsx
const resolved = useMemo(
  () =>
    draft
      ? resolveHeroSlideForPreview(
          {
            id: draft.id ?? "preview",
            order: 0,
            productId: draft.productId,
            config: draft.config,
          },
          product,
          liveHtml,
        )
      : null,
  [draft, product, liveHtml],
);
```

**7) Enregistrement.** Remplace le bloc qui **commence** par `const saved = draft.id` et se termine par `await load(saved.id);` par :

```tsx
const saved = draft.id
  ? await heroPromotionsApi.update(draft.id, payload)
  : await heroPromotionsApi.create({ ...payload, order: slides.length } as Omit<
      HeroPromotion,
      "id"
    >);
// HTML collé : écrit APRÈS le slide, uniquement si super_admin (garde RLS + API).
let htmlErr: string | null = null;
try {
  await htmlRef.current?.save(
    saved.id,
    config.layers.some((l) => l.type === "html"),
  );
} catch (e: any) {
  htmlErr = e?.message || "HTML refusé.";
}
window.dispatchEvent(new Event("storefront:invalidate"));
await load(saved.id);
if (htmlErr) throw new Error(`Slide enregistré, mais ${htmlErr}`);
```

**8) Couches : bouton « HTML collé » + suppression gardée.**

a) Juste **avant** la balise `<p` qui contient le texte `Ordre : la 1re couche est tout au fond`, ajoute :

```tsx
{
  isSuper &&
    !config.layers.some((l) => l.type === "html") &&
    config.layers.length < HERO_MAX_LAYERS && (
      <button
        type="button"
        style={btn}
        onClick={() => {
          patchConfig((c) => ({
            ...c,
            layers: [...c.layers, { type: "html" }],
          }));
          setLayerSel(config.layers.length);
        }}
      >
        <Plus size={12} /> HTML collé
      </button>
    );
}
```

b) Dans le `<button` qui porte `aria-label="Supprimer"` (boucle `config.layers.map((l, i) => (`), ajoute juste après `aria-label="Supprimer"` l'attribut :

```tsx
disabled={l.type === "html" && !isSuper}
```

**9) Panneau HTML.** Juste **avant** la ligne `<Section title="Contrôle qualité" open={false}>`, ajoute :

```tsx
<Section title="HTML collé">
  <HeroHtmlPanel
    key={draft.id ?? "new"}
    ref={htmlRef}
    slideId={draft.id}
    hasLayer={config.layers.some((l) => l.type === "html")}
    isSuper={isSuper}
    isFirst={
      slides.findIndex((s) => s.id === draft.id) === 0 ||
      (draft.id === null && slides.length === 0)
    }
    onLive={setLiveHtml}
    onDirty={setHtmlDirty}
    measure={measureHtml}
    onRatios={(r) =>
      patchConfig((c) => ({
        ...c,
        sizing: { mode: "auto", width: c.sizing.width, ratio: r },
      }))
    }
  />
</Section>
```

## 4.12 `tests/hero-lot4.test.ts` (nouveau)

```ts
// tests/hero-lot4.test.ts — filtre CSS, résolution des slides HTML, gardes SQL (lot 4).
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { sanitizeHeroCss, isSafeStyleAttr } from "../src/lib/heroCss.ts";
import { resolveHeroSlides, heroHasHtml } from "../src/lib/heroResolve.ts";
import { sanitizeHeroConfig } from "../src/lib/heroSchema.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const sql4 = readFileSync(
  join(root, "supabase/migrations/20261035_hero_html_table.sql"),
  "utf8",
);

test("css : refus (jamais de réparation silencieuse)", () => {
  const bad = [
    '@import url("https://x/y.css");',
    "a{background:url(data:image/png;base64,AAA)}",
    "a{background:url(http://x/y.png)}",
    "a{background:u\\72l(//x/y)}", // échappement : u\72l( = url(
    "a{width:expression(alert(1))}",
    "a{behavior:url(x.htc)}",
    "@font-face{font-family:x;src:url(https://x/f.woff2)}",
    'a{background:image-set("x.png" 1x)}',
    "a{color:red",
    "a{}</style><script>",
  ];
  for (const b of bad) {
    const r = sanitizeHeroCss(b);
    assert.ok(r.errors.length > 0, b);
    assert.equal(r.css, "", b);
  }
});

test("css : autorisé (media, keyframes, url https, échappement dans une chaîne)", () => {
  const r = sanitizeHeroCss(
    "@media (max-width:767px){.a{color:red}} @keyframes k{from{opacity:0}to{opacity:1}} " +
      '.b{background:url(https://cdn.example.com/a.webp)} .c{content:"\\201C"}',
  );
  assert.deepEqual(r.errors, []);
  assert.ok(r.css.includes("@keyframes k"));
});

test("css : html/body/:root → :host (+ avertissement)", () => {
  const r = sanitizeHeroCss("body{margin:0} html,:root{--x:1}");
  assert.equal(r.errors.length, 0);
  assert.ok(r.css.startsWith(":host{margin:0}"));
  assert.ok(r.css.includes(":host,:host{--x:1}"));
  assert.ok(r.warnings.length > 0);
});

test("attribut style : valeurs sûres seulement", () => {
  assert.equal(isSafeStyleAttr("color:red;margin:0"), true);
  assert.equal(isSafeStyleAttr("background:url(javascript:alert(1))"), false);
  assert.equal(isSafeStyleAttr("a:b}x{c:d"), false);
});

const P = [
  {
    id: "p1",
    title: "Tee",
    description: "d",
    image: "https://cdn.example.com/a.webp",
    isActive: true,
  },
];
const studioHtml = sanitizeHeroConfig({
  origin: "studio",
  layers: [{ type: "html" }],
});
const promo = (o: Record<string, unknown>) =>
  ({
    id: "h1",
    order: 0,
    isActive: true,
    productId: "",
    config: studioHtml,
    ...o,
  }) as any;

test("resolve : un slide HTML n'apparaît qu'une fois son HTML chargé", () => {
  assert.equal(heroHasHtml({ config: studioHtml }), true);
  assert.equal(heroHasHtml({}), false);
  assert.equal(resolveHeroSlides([promo({})], P).length, 0);
  const r = resolveHeroSlides([promo({})], P, Date.now(), {
    h1: { html: "<p>x</p>", css: "" },
  });
  assert.equal(r.length, 1);
  assert.equal(r[0].html?.html, "<p>x</p>");
});

test("SQL lot 4 : écriture super_admin, lecture publique = publiés, jamais USING (true)", () => {
  assert.ok(sql4.includes("ENABLE ROW LEVEL SECURITY"));
  for (const op of ["INSERT", "UPDATE", "DELETE"]) {
    assert.ok(sql4.includes(`FOR ${op} TO authenticated`), op);
  }
  assert.ok(sql4.includes("WITH CHECK (public.is_super_admin())"));
  assert.ok(
    sql4.includes("h.is_active = true"),
    "lecture publique = slides publiés",
  );
  assert.ok(!/USING\s*\(\s*true\s*\)/i.test(sql4), "plus de lecture large");
  assert.ok(sql4.includes("<= 51200"), "plafond 50 Ko en base");
});
```

---

# LOT 5 : propagation et Deploy Hook

Le studio émet déjà `storefront:invalidate` à l'enregistrement. Les trois vitesses :

1. **Même onglet** (admin → boutique) : instantané.
2. **Visiteurs** : contrôle de version au retour de focus, au plus une fois par minute, **sans timer** (pas de polling).
3. **Prerender** : rebuild Vercel déclenché par la base, débouncé 10 min, **seulement si la vue publique a réellement changé**.

## 5.1 Migration (backend) : nouveau fichier

```sql
-- supabase/migrations/20261036_hero_sync.sql
-- Hero Studio — Lot 5 : snapshot public atomique, empreinte publique, Deploy Hook débouncé.
-- Idempotent. Pré-requis lot 4 (hero_slide_html). Pas de BEGIN/COMMIT.

-- ─── 1) Empreinte du dernier build déclenché ────────────────────────────
ALTER TABLE public.hero_version ADD COLUMN IF NOT EXISTS last_fingerprint text;

-- ─── 2) Snapshot public : version + slides dans UNE requête / UNE transaction ──
-- INVOKER : la RLS s'applique (anon = slides publiés seulement). Pas de html/css ici.
CREATE OR REPLACE FUNCTION public.get_hero_snapshot()
RETURNS jsonb
LANGUAGE sql
STABLE
AS $$
  SELECT jsonb_build_object(
    'version', (SELECT version FROM public.hero_version LIMIT 1),
    'slides',  COALESCE(
      (SELECT jsonb_agg(to_jsonb(h) ORDER BY h."order", h.id) FROM public.hero_promotions h),
      '[]'::jsonb)
  );
$$;
GRANT EXECUTE ON FUNCTION public.get_hero_snapshot() TO anon, authenticated;

-- ─── 3) Empreinte de ce que le PUBLIC voit MAINTENANT (slides publiés, fenêtre de
--        planification, HTML, produits liés). Change aussi quand un slide entre/sort
--        de sa fenêtre : le prerender se met à jour sans action humaine. ──────
CREATE OR REPLACE FUNCTION public.hero_public_fingerprint()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT md5(COALESCE((
    SELECT string_agg(
      concat_ws('|',
        h.id, h."order"::text, COALESCE(h.product_id, ''), h.config::text,
        COALESCE(h.image, ''), COALESCE(h.headline, ''), COALESCE(h.sub, ''),
        COALESCE(h.cta, ''), COALESCE(h.tag, ''), COALESCE(h.bg_gradient, ''),
        h.kind, h.layout, COALESCE(h.link_url, ''), COALESCE(h.tiles::text, ''),
        COALESCE(p.title, ''), COALESCE(p.description, ''), COALESCE(p.image, ''),
        COALESCE(p.is_active::text, ''),
        COALESCE(x.html, ''), COALESCE(x.css, '')),
      E'\n' ORDER BY h."order", h.id)
    FROM public.hero_promotions h
    LEFT JOIN public.products p        ON p.id = h.product_id
    LEFT JOIN public.hero_slide_html x ON x.slide_id = h.id
    WHERE h.is_active = true
      AND (h.starts_at IS NULL OR h.starts_at <= now())
      AND (h.ends_at   IS NULL OR h.ends_at   >  now())
  ), ''));
$$;

-- ─── 4) Déclencheur du Deploy Hook (débounce 10 min, leading + trailing) ──
-- L'URL du hook vit dans Vault (secret 'vercel_deploy_hook_url'), JAMAIS dans git.
CREATE OR REPLACE FUNCTION public.hero_flush_deploy_hook(p_force boolean DEFAULT false)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v        public.hero_version%ROWTYPE;
  fp       text;
  hook_url text;
  min_gap  interval := interval '10 minutes';
BEGIN
  SELECT * INTO v FROM public.hero_version WHERE id = true FOR UPDATE;
  IF NOT FOUND THEN RETURN 'no-row'; END IF;

  fp := public.hero_public_fingerprint();

  -- Rien n'a changé pour le public : aucun build.
  IF NOT p_force AND v.last_fingerprint IS NOT DISTINCT FROM fp THEN
    IF v.hook_pending THEN
      UPDATE public.hero_version SET hook_pending = false WHERE id = true;
    END IF;
    RETURN 'unchanged';
  END IF;

  -- Débounce : un build récent → on réessaiera (le cron repasse chaque minute).
  IF NOT p_force AND v.last_hook_at IS NOT NULL AND now() - v.last_hook_at < min_gap THEN
    IF NOT v.hook_pending THEN
      UPDATE public.hero_version SET hook_pending = true WHERE id = true;
    END IF;
    RETURN 'debounced';
  END IF;

  BEGIN
    EXECUTE 'SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = $1 LIMIT 1'
      INTO hook_url USING 'vercel_deploy_hook_url';
  EXCEPTION WHEN OTHERS THEN
    hook_url := NULL;
  END;
  IF hook_url IS NULL OR hook_url = '' THEN
    UPDATE public.hero_version SET hook_pending = true WHERE id = true;
    RETURN 'no-secret';
  END IF;

  BEGIN
    PERFORM net.http_post(url := hook_url, body := '{}'::jsonb);
  EXCEPTION WHEN OTHERS THEN
    RETURN 'error: ' || SQLERRM;
  END;

  UPDATE public.hero_version
  SET last_hook_at = now(), last_fingerprint = fp, hook_pending = false
  WHERE id = true;
  RETURN 'triggered';
END;
$$;

REVOKE ALL ON FUNCTION public.hero_public_fingerprint() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.hero_flush_deploy_hook(boolean) FROM PUBLIC, anon, authenticated;

-- Pas de build "fantôme" à l'installation : on part de l'état actuel du public.
UPDATE public.hero_version
SET last_fingerprint = public.hero_public_fingerprint()
WHERE id = true AND last_fingerprint IS NULL;

-- ─── 5) RPC admin : état + "republier maintenant" ───────────────────────
CREATE OR REPLACE FUNCTION public.hero_sync_status()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v          public.hero_version%ROWTYPE;
  configured boolean := false;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'hero_sync_status: admin requis' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO v FROM public.hero_version WHERE id = true;
  BEGIN
    EXECUTE 'SELECT EXISTS (SELECT 1 FROM vault.decrypted_secrets WHERE name = $1)'
      INTO configured USING 'vercel_deploy_hook_url';
  EXCEPTION WHEN OTHERS THEN
    configured := false;
  END;
  RETURN jsonb_build_object(
    'version', v.version,
    'lastHookAt', v.last_hook_at,
    'pending', v.last_fingerprint IS DISTINCT FROM public.hero_public_fingerprint(),
    'hookConfigured', configured);
END;
$$;

CREATE OR REPLACE FUNCTION public.hero_request_rebuild()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'hero_request_rebuild: admin requis' USING ERRCODE = '42501';
  END IF;
  RETURN public.hero_flush_deploy_hook(true);
END;
$$;

REVOKE ALL ON FUNCTION public.hero_sync_status()    FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.hero_request_rebuild() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.hero_sync_status()    TO authenticated;
GRANT EXECUTE ON FUNCTION public.hero_request_rebuild() TO authenticated;

-- ─── 6) Cron : repasse chaque minute (ne fait rien si l'empreinte n'a pas changé) ──
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    DELETE FROM cron.job WHERE jobname = 'hero-deploy-hook';
    PERFORM cron.schedule(
      'hero-deploy-hook', '* * * * *',
      $cmd$ SELECT public.hero_flush_deploy_hook(false) $cmd$);
  ELSE
    RAISE NOTICE 'pg_cron absent : active-le (Database → Extensions) puis rejoue ce bloc DO.';
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
```

**Étapes manuelles, hors git :**

1. Supabase Dashboard → **Database → Extensions** : active **pg_cron** et **pg_net**. Si pg_cron n'était pas actif au moment de la migration, rejoue seulement le bloc `DO $$ … $$;` de l'étape 6.
2. Vercel → _Project Settings → Git → Deploy Hooks_ : crée un hook (branche de production) et copie l'URL.
3. Dans le SQL Editor (le secret ne passe jamais par git) :

```sql
select vault.create_secret('https://api.vercel.com/v1/integrations/deploy/…', 'vercel_deploy_hook_url', 'Deploy hook Vercel (hero)');
```

4. Test : `SELECT public.hero_flush_deploy_hook(false);` doit renvoyer `unchanged`. Modifie un slide actif, relance : `triggered`. Les autres retours possibles sont `debounced`, `no-secret` et `error: …`.

## 5.2 `src/api/supabaseApi.ts` : 2 ajouts

**1)** Dans `heroPromotionsApi`, juste **avant** la ligne `async create(promo: Omit<HeroPromotion, "id">): Promise<HeroPromotion> {`, ajoute :

```ts
  /** Boutique : version + slides publiés en UNE requête atomique (RPC). Repli : list(). */
  async getSnapshot(): Promise<{ version: number | null; slides: HeroPromotion[] }> {
    const { data, error } = await supabase.rpc("get_hero_snapshot");
    const snap = data as { version?: unknown; slides?: unknown } | null;
    if (!error && snap && Array.isArray(snap.slides)) {
      const v = Number(snap.version);
      return {
        version: Number.isFinite(v) ? v : null,
        slides: (snap.slides as any[]).map(mapHeroPromotion),
      };
    }
    return { version: null, slides: await this.list() };
  },
  /** Compteur de version (trigger Postgres) : ~100 octets, contrôle de fraîcheur. */
  async getVersion(): Promise<number | null> {
    // Pas de filtre sur `id` : anon n'a le droit de lire que version et updated_at.
    const { data, error } = await supabase
      .from("hero_version")
      .select("version")
      .limit(1)
      .maybeSingle();
    if (error || !data) return null;
    const n = Number(data.version);
    return Number.isFinite(n) ? n : null;
  },
```

**2)** Juste **avant** la ligne `export const reviewApi = {` (donc après le bloc `heroHtmlApi` du lot 4), ajoute :

```ts
// ─── Hero : état du déploiement (Deploy Hook) ───────────────────────────────
export interface HeroSyncStatus {
  version: number;
  lastHookAt: string | null;
  /** true = le public voit autre chose que le dernier build. */
  pending: boolean;
  hookConfigured: boolean;
}

export const heroSyncApi = {
  async status(): Promise<HeroSyncStatus | null> {
    const { data, error } = await supabase.rpc("hero_sync_status");
    if (error || !data) return null;
    return data as HeroSyncStatus;
  },
  /** Force un build maintenant (ignore le débounce). Renvoie le code du flush. */
  async rebuild(): Promise<string> {
    const { data, error } = await supabase.rpc("hero_request_rebuild");
    if (error) throw error;
    return String(data);
  },
};
```

## 5.3 `src/hooks/useHeroSync.ts` (nouveau)

```ts
// src/hooks/useHeroSync.ts — contrôle de fraîcheur du hero SANS timer ni socket.
// Déclenché au retour sur l'onglet / focus / retour réseau, au plus une fois par minute.
import { useEffect, useRef } from "react";

export function useHeroSync(
  check: () => Promise<void> | void,
  minGapMs = 60_000,
) {
  const fn = useRef(check);
  useEffect(() => {
    fn.current = check;
  });
  const last = useRef(Date.now());

  useEffect(() => {
    const run = () => {
      if (document.visibilityState === "hidden") return;
      const now = Date.now();
      if (now - last.current < minGapMs) return;
      last.current = now;
      void Promise.resolve(fn.current()).catch(() => {});
    };
    document.addEventListener("visibilitychange", run);
    window.addEventListener("focus", run);
    window.addEventListener("online", run);
    return () => {
      document.removeEventListener("visibilitychange", run);
      window.removeEventListener("focus", run);
      window.removeEventListener("online", run);
    };
  }, [minGapMs]);
}
```

## 5.4 `src/admin/HeroSyncBadge.tsx` (nouveau)

```tsx
// src/admin/HeroSyncBadge.tsx — état du prerender (Deploy Hook) dans l'en-tête du studio.
import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { heroSyncApi, type HeroSyncStatus } from "../api/supabaseApi";

const MSG: Record<string, string> = {
  triggered: "Build lancé : la boutique sera à jour dans quelques minutes.",
  "no-secret": "Deploy Hook non configuré (secret Vault manquant).",
  unchanged: "Rien à republier : la boutique est déjà à jour.",
  debounced: "Un build récent est déjà en cours.",
};

export default function HeroSyncBadge() {
  const [st, setSt] = useState<HeroSyncStatus | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState<string | null>(null);

  const refresh = useCallback(
    () => heroSyncApi.status().then(setSt, () => setSt(null)),
    [],
  );

  useEffect(() => {
    void refresh();
    const on = () => setTimeout(() => void refresh(), 1500);
    window.addEventListener("storefront:invalidate", on);
    return () => window.removeEventListener("storefront:invalidate", on);
  }, [refresh]);

  if (st === undefined) return null;
  const base: React.CSSProperties = {
    fontSize: 12,
    color: "var(--color-ink3)",
    marginTop: 4,
  };
  if (st === null) {
    return (
      <p style={base}>
        Statut du build indisponible (migration du lot 5 non appliquée ?).
      </p>
    );
  }

  const label = !st.hookConfigured
    ? "Rebuild automatique : non configuré"
    : st.pending
      ? "Build de la boutique en attente (≤ 10 min)"
      : "Boutique à jour";

  const rebuild = async () => {
    if (!window.confirm("Relancer la construction de la boutique maintenant ?"))
      return;
    setBusy(true);
    setInfo(null);
    try {
      const code = await heroSyncApi.rebuild();
      setInfo(MSG[code] ?? code);
      void refresh();
    } catch (e: any) {
      setInfo(e?.message || "Échec.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      style={{
        ...base,
        display: "flex",
        alignItems: "center",
        gap: 8,
        flexWrap: "wrap",
      }}
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: !st.hookConfigured
            ? "#d97706"
            : st.pending
              ? "var(--color-accent)"
              : "var(--color-success)",
        }}
      />
      <span>
        {label}
        {st.lastHookAt
          ? ` · dernier build ${new Date(st.lastHookAt).toLocaleString("fr-FR")}`
          : ""}
      </span>
      {st.hookConfigured && (
        <button
          type="button"
          onClick={rebuild}
          disabled={busy}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            padding: "3px 8px",
            borderRadius: 8,
            border: "1px solid var(--color-border)",
            background: "var(--color-surface2)",
            color: "var(--color-ink2)",
            fontSize: 11,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          <RefreshCw size={11} /> Republier maintenant
        </button>
      )}
      {info && <span>{info}</span>}
    </div>
  );
}
```

**Branchement dans `src/admin/HeroStudioPage.tsx`** (2 petites modifications) :

1. Juste après la ligne `import HeroHtmlPanel, { type HeroHtmlPanelHandle } from "./HeroHtmlPanel";`, ajoute :

```tsx
import HeroSyncBadge from "./HeroSyncBadge";
```

2. Juste après la balise `</p>` du paragraphe qui contient le texte `Compose le hero de la boutique`, ajoute :

```tsx
<HeroSyncBadge />
```

## 5.5 `src/App.tsx` : 6 modifications

**1) Imports.** Remplace la ligne `import { resolveHeroSlides, nextHeroScheduleChange } from "./lib/heroResolve";` par :

```tsx
import {
  resolveHeroSlides,
  nextHeroScheduleChange,
  heroHasHtml,
} from "./lib/heroResolve";
import { useHeroSync } from "./hooks/useHeroSync";
```

Puis, dans l'import venant de `./api/supabaseApi` qui contient `heroPromotionsApi,`, ajoute `heroHtmlApi,` à la liste.

**2) Chargement du hero.** Remplace le bloc qui **commence** par `useEffect(() => {` suivi de `fetchProducts();` puis `// fetchSettings();`, et se termine par `.finally(() => setPromotionsLoading(false));` suivi de `}, []);` par :

```tsx
// Hero : version + slides en UNE requête atomique (RPC), puis le HTML des seuls slides concernés.
const heroVersionRef = useRef<number | null>(null);
const [heroHtml, setHeroHtml] = useState<
  Record<string, { html: string; css: string }>
>({});
const loadHero = async () => {
  try {
    const snap = await heroPromotionsApi.getSnapshot();
    heroVersionRef.current = snap.version;
    setHeroPromotions(snap.slides);
    const ids = snap.slides.filter((p) => heroHasHtml(p)).map((p) => p.id);
    if (ids.length === 0) setHeroHtml({});
    else
      heroHtmlApi
        .getPublished(ids)
        .then(setHeroHtml)
        .catch(() => {});
  } catch {
    /* on garde l'état précédent */
  }
};

useEffect(() => {
  fetchProducts();
  loadHero().finally(() => setPromotionsLoading(false));
}, []);

// Visiteurs : contrôle de version au retour de focus (≤ 1 fois / min, sans timer).
useHeroSync(async () => {
  const v = await heroPromotionsApi.getVersion();
  if (v != null && v !== heroVersionRef.current) await loadHero();
});
```

**3) Même onglet (admin → boutique).** Remplace le bloc qui **commence** par `// Refresh catalog when admin modifies a product` et se termine par le `}, []);` de cet effet par :

```tsx
// Refresh catalog + hero when admin modifies a product / a slide
useEffect(() => {
  const handler = () => {
    fetchProducts();
    void loadHero();
  };
  window.addEventListener("storefront:invalidate", handler);
  return () => window.removeEventListener("storefront:invalidate", handler);
}, []);
```

**4) Slides résolus avec HTML.** Remplace le bloc qui **commence** par `const heroSlides = useMemo(` et se termine par `[heroPromotions, products, heroNow],` suivi de `);` par :

```tsx
const heroSlides = useMemo(
  () => resolveHeroSlides(heroPromotions, products, heroNow, heroHtml),
  [heroPromotions, products, heroNow, heroHtml],
);
```

## 5.6 `tests/hero-lot5.test.ts` (nouveau)

```ts
// tests/hero-lot5.test.ts — gardes statiques de la migration lot 5 (secret, droits, empreinte).
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const sql = readFileSync(
  join(root, "supabase/migrations/20261036_hero_sync.sql"),
  "utf8",
);

test("lot 5 : aucune URL de hook dans git, secret lu depuis Vault", () => {
  assert.ok(!sql.includes("api.vercel.com"));
  assert.ok(sql.includes("vault.decrypted_secrets"));
});

test("lot 5 : fonctions internes inaccessibles au public ; RPC admin vérifient is_admin()", () => {
  assert.ok(
    sql.includes(
      "REVOKE ALL ON FUNCTION public.hero_flush_deploy_hook(boolean) FROM PUBLIC, anon, authenticated",
    ),
  );
  assert.ok(
    sql.includes(
      "REVOKE ALL ON FUNCTION public.hero_public_fingerprint() FROM PUBLIC, anon, authenticated",
    ),
  );
  assert.equal((sql.match(/IF NOT public\.is_admin\(\)/g) || []).length, 2);
});

test("lot 5 : le snapshot public reste INVOKER (la RLS s'applique) et sans html/css", () => {
  const fn = sql.slice(
    sql.indexOf("get_hero_snapshot()"),
    sql.indexOf("hero_public_fingerprint()"),
  );
  assert.ok(!/SECURITY DEFINER/.test(fn));
  assert.ok(!/\bhtml\b|\bcss\b/.test(fn));
});

test("lot 5 : débounce + empreinte (pas de build si le public n'a rien vu changer)", () => {
  assert.ok(sql.includes("interval '10 minutes'"));
  assert.ok(sql.includes("IS NOT DISTINCT FROM fp"));
  assert.ok(sql.includes("h.is_active = true"));
});
```

---

# Vérifications, dans cet ordre

**Lot 4**

1. `npm i dompurify`, puis lancer la migration `20261035` et les requêtes A, B, C (colle-moi le résultat).
2. Appliquer 4.2 à 4.12. `npm run lint` et `npm test`.
3. Studio, **connecté en super_admin** : `+ HTML collé`, colle un bloc HTML + CSS, puis « Nettoyer & vérifier ».
4. Colle ces cas, qui doivent être refusés ou nettoyés avec un message :
   - `<script>alert(1)</script>` ;
   - `<img src="x" onerror="alert(1)">` ;
   - `<a href="https://evil.com">` ;
   - un `<style>@import url(...)</style>` ;
   - une image `data:` ;
   - un `style="background:url(javascript:…)"`.
5. Teste « Mesurer pour le mode Auto », puis enregistre et recharge la boutique.
6. **Connecté en `editor`** (si tu as un compte) : tu dois voir uniquement le message en lecture seule, sans le bouton `+ HTML collé`. Vérifie aussi dans le SQL Editor qu'un `INSERT` sur `hero_slide_html` avec un JWT éditeur est refusé.
7. **Boutique** : tes 5 slides actuels, avant et après, ne doivent pas bouger d'un pixel.

**Lot 5** 8. Migration `20261036`, étapes manuelles (extensions, secret Vault), puis `SELECT public.hero_flush_deploy_hook(false);`. 9. Appliquer 5.2 à 5.6 (y compris les 2 petits branchements dans `HeroStudioPage.tsx`). 10. **Propagation** : ouvre la boutique dans un 2e onglet, modifie un slide dans l'admin, reviens sur le 2e onglet. Le changement apparaît au focus, avec au plus 1 min de latence. 11. **Deploy Hook** : le badge du studio passe de « en attente » à « Boutique à jour » après le build.

**Dette connue et assumée**

- Le prerender ne filtre pas encore la planification (voir plus haut).
- Une modification de **produit** (titre, image) est prise en compte par l'empreinte seulement pour les slides qui le référencent.
- Si tu veux le rebuild aussi sur les changements de catalogue, dis-le-moi.

Prochaine étape suggérée : tu me colles `scripts/prerender.ts` pour le filtre de planification, plus l'émission du slide 0 HTML en shadow DOM déclaratif (phase 2).
