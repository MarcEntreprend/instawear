// src/admin/HeroStudioEditor.tsx — éditeur visuel hero (lot 3).
// Compose la colonne `config` (couches + CTA + dimensions + fond) avec
// aperçu live (HeroSlideView, WYSIWYG). Invariants : chaque frappe passe
// par sanitizeHeroConfig (jamais d'état invalide), origin forcée "studio"
// à l'enregistrement (l'ancien formulaire ne peut plus écraser), html/css
// intouchés (lot 4). Produit optionnel : "" = slide autonome.
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowDown, ArrowUp, Copy, Eye, EyeOff, Lock, LockOpen, Monitor, Moon, Plus, Redo2, Smartphone, Sun, Trash2, Undo2, X } from "lucide-react";
import { heroPromotionsApi } from "../api/supabaseApi";
import {
  HERO_MAX_LAYERS,
  buildHeroConfigFromLegacy,
  heroPayloadBudget,
  sanitizeHeroConfig,
  type HeroConfig,
  type HeroCta,
  type HeroLayer,
} from "../lib/heroSchema";
import { selectHeroSlides, type HeroSlideData } from "../lib/heroSelect";
import {
  HERO_ANCHORS,
  HERO_BG_PRESETS,
  HERO_CTA_POSITIONS,
  HERO_CTA_STYLES,
  HERO_TONES,
  blankStudioConfig,
  createHeroCta,
  createHeroLayer,
  duplicateItem,
  heroHistoryInit,
  heroHistoryPush,
  heroHistoryRedo,
  heroHistoryUndo,
  heroStudioCaps,
  moveItem,
  type HeroHistory,
} from "../lib/heroStudio";
import { HERO_TEMPLATES } from "../lib/heroTemplates";
import { HERO_FONT_FAMILIES } from "../lib/heroSchema";
import HeroSlideView from "../components/HeroSlideView";
import { normalizeHeroLink } from "../components/HeroCarousel";
import AdminImageInput from "./ui/AdminImageInput";
import { formInputStyle, formLabelStyle } from "./adminStyles";
import type { AdminProduct, HeroPromotion } from "./adminTypes";

interface HeroStudioEditorProps {
  /** null = nouveau slide. */
  slideId: string | null;
  products: AdminProduct[];
  nextOrder: number;
  onClose: () => void;
  onSaved: () => void;
}

/** Sélection 02 : slide entier, couche i, ou bouton i. */
export type StudioSelection =
  | { kind: "slide" }
  | { kind: "layer"; index: number }
  | { kind: "cta"; index: number };

function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div>
      <label style={formLabelStyle}>{label}</label>
      {children}
      {hint && (
        <p style={{ fontSize: 11, color: "var(--color-ink4)", marginTop: 4 }}>
          {hint}
        </p>
      )}
    </div>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
        gap: 10,
      }}
    >
      {children}
    </div>
  );
}

const num = (v: string, fallback: number): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

export default function HeroStudioEditor({
  slideId,
  products,
  nextOrder,
  onClose,
  onSaved,
}: HeroStudioEditorProps) {
  const [loading, setLoading] = useState(slideId !== null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [converted, setConverted] = useState(false);
  // Historique undo/redo (02) : `config` = présent ; chaque commit pousse
  // (coalescé < 800 ms : la frappe reste 1 entrée). Cap 20.
  const [hist, setHist] = useState<HeroHistory>(() =>
    heroHistoryInit(blankStudioConfig()),
  );
  const config = hist.present;
  // Sélection 02 : slide | couche | bouton (panneau gauche → inspecteur).
  const [selection, setSelection] =
    useState<StudioSelection>({ kind: "slide" });
  // Verrous 02 (session uniquement, jamais persistés) : bloque contenu +
  // réorganisation, pas la visibilité.
  const [locked, setLocked] = useState<Set<string>>(new Set());
  // Thème du studio 02 (outil seul, jamais le hero) : persisté local.
  const [studioTheme, setStudioTheme] = useState<
    "light" | "grey" | "dark"
  >(() => {
    const v =
      typeof localStorage !== "undefined"
        ? localStorage.getItem("hero-studio-theme")
        : null;
    return v === "light" || v === "dark" ? v : "grey";
  });
  const [productId, setProductId] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [startsAt, setStartsAt] = useState<string | null>(null);
  const [endsAt, setEndsAt] = useState<string | null>(null);
  // HTML/CSS collés (lot 4) : chargés via getFull, écrits seulement si
  // modifiés (un non-super_admin ne doit jamais heurter la garde 42501
  // en sauvegardant un autre champ).
  const [html, setHtml] = useState("");
  const [css, setCss] = useState("");
  const initialHtml = useRef({ html: "", css: "" });
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");

  useEffect(() => {
    if (!slideId) return;
    heroPromotionsApi
      .getFull(slideId)
      .then((row) => {
        if (!row) {
          setError("Slide introuvable.");
          return;
        }
        const parsed =
          row.config ??
          buildHeroConfigFromLegacy(row as unknown as Parameters<
            typeof buildHeroConfigFromLegacy
          >[0]);
        setConverted(parsed.origin !== "studio");
        setHist(
          heroHistoryInit(sanitizeHeroConfig({ ...parsed, origin: "studio" })),
        );
        setSelection({ kind: "slide" });
        setLocked(new Set());
        setProductId(row.productId || "");
        setIsActive(row.isActive !== false);
        setStartsAt(row.startsAt ?? null);
        setEndsAt(row.endsAt ?? null);
        setHtml(typeof row.html === "string" ? row.html : "");
        setCss(typeof row.css === "string" ? row.css : "");
        initialHtml.current = {
          html: typeof row.html === "string" ? row.html : "",
          css: typeof row.css === "string" ? row.css : "",
        };
      })
      .catch((e) => setError(String((e as Error)?.message || e)))
      .finally(() => setLoading(false));
  }, [slideId]);

  // Commit (historisé) + patch immuable normalisé (jamais d'invalide).
  const commit = (next: HeroConfig) =>
    setHist((h) => heroHistoryPush(h, sanitizeHeroConfig(next)));
  const patchConfig = (fn: (draft: HeroConfig) => void) => {
    setHist((h) => {
      const next = JSON.parse(JSON.stringify(h.present)) as HeroConfig;
      fn(next);
      return heroHistoryPush(h, sanitizeHeroConfig(next));
    });
  };
  const isLocked = (key: string) => locked.has(key);
  const patchLayer = (index: number, fn: (l: HeroLayer) => void) => {
    if (isLocked(`l:${index}`)) return;
    patchConfig((c) => {
      const l = c.layers[index];
      if (l) fn(l);
    });
  };
  const patchCta = (index: number, fn: (cta: HeroCta) => void) => {
    if (isLocked(`c:${index}`)) return;
    patchConfig((c) => {
      const t = c.ctas[index];
      if (t) fn(t);
    });
  };
  // Opération structurelle (verrous réinitialisés : les index changent).
  const structural = (fn: (c: HeroConfig) => void) => {
    setLocked(new Set());
    patchConfig(fn);
  };

  // ─── Panneau couches 02 : œil, verrou, pills Hide-on, scroll ─────────
  const layerHiddenOf = (index: number) => {
    const l = config.layers[index] as
      | { hidden?: { mobile?: boolean; desktop?: boolean } }
      | undefined;
    return l?.hidden;
  };
  const ctaHiddenOf = (index: number) => config.ctas[index]?.hidden;
  const setLayerHidden = (
    index: number,
    h: { mobile?: boolean; desktop?: boolean } | undefined,
  ) =>
    patchConfig((c) => {
      const l = c.layers[index] as
        | { hidden?: { mobile?: boolean; desktop?: boolean } }
        | undefined;
      if (l) l.hidden = h;
    });
  const setCtaHidden = (
    index: number,
    h: { mobile?: boolean; desktop?: boolean } | undefined,
  ) =>
    patchConfig((c) => {
      const t = c.ctas[index];
      if (t) t.hidden = h;
    });
  const toggleEye = (sel: StudioSelection) => {
    const cur =
      sel.kind === "layer"
        ? layerHiddenOf(sel.index)
        : sel.kind === "cta"
          ? ctaHiddenOf(sel.index)
          : undefined;
    const next =
      cur?.mobile && cur?.desktop ? undefined : { mobile: true, desktop: true };
    if (sel.kind === "layer") setLayerHidden(sel.index, next);
    else if (sel.kind === "cta") setCtaHidden(sel.index, next);
  };
  const togglePill = (
    sel: StudioSelection,
    axis: "mobile" | "desktop",
  ) => {
    const cur =
      sel.kind === "layer"
        ? layerHiddenOf(sel.index)
        : sel.kind === "cta"
          ? ctaHiddenOf(sel.index)
          : undefined;
    const next = { ...(cur ?? {}) };
    if (next[axis]) delete next[axis];
    else next[axis] = true;
    const clean =
      !next.mobile && !next.desktop
        ? undefined
        : (next as { mobile?: boolean; desktop?: boolean });
    if (sel.kind === "layer") setLayerHidden(sel.index, clean);
    else if (sel.kind === "cta") setCtaHidden(sel.index, clean);
  };
  const eyeOff = (sel: StudioSelection) => {
    const cur =
      sel.kind === "layer"
        ? layerHiddenOf(sel.index)
        : sel.kind === "cta"
          ? ctaHiddenOf(sel.index)
          : undefined;
    return !!cur && !!cur.mobile && !!cur.desktop;
  };
  const scrollToId = (id: string) => {
    setSelection(
      id === "hero-slide"
        ? { kind: "slide" }
        : id.startsWith("hero-layer-")
          ? { kind: "layer", index: Number(id.slice(11)) }
          : { kind: "cta", index: Number(id.slice(9)) },
    );
    requestAnimationFrame(() => {
      document
        .getElementById(id)
        ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  };

  const productsLite = useMemo(
    () =>
      products.map((p) => ({
        id: p.id,
        isActive: p.isActive,
        title: p.title,
        description: p.description,
        image: p.image,
      })),
    [products],
  );
  // Aperçu : le brouillon passe par la VRAIE sélection boutique (mêmes
  // fallbacks, même résolution). Forcé actif pour prévisualiser aussi un
  // slide désactivé (badge dédié).
  const preview: HeroSlideData | null = useMemo(() => {
    const draft = {
      id: slideId ?? "studio-draft",
      productId,
      order: 0,
      isActive: true,
      title: "",
      headline: "",
      sub: "",
      cta: "",
      bgGradient: "",
      tag: "",
      image: "",
      showTag: true,
      showTitle: true,
      layout: "full",
      kind: "product",
      linkUrl: null,
      tiles: null,
      config: sanitizeHeroConfig({ ...config, origin: "studio" }),
      html,
      css,
      startsAt,
      endsAt,
    } as unknown as HeroPromotion;
    return selectHeroSlides([draft], productsLite, Date.now())[0] ?? null;
  }, [config, productId, slideId, startsAt, endsAt, productsLite, html, css]);

  const caps = heroStudioCaps(config);
  const budget = heroPayloadBudget(html, css);
  const htmlDirty =
    html !== initialHtml.current.html || css !== initialHtml.current.css;

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      if (budget.level === "over") {
        setError(
          `HTML+CSS : ${budget.bytes.toLocaleString("fr-FR")} octets > plafond 50 000 — réduisez avant d'enregistrer.`,
        );
        return;
      }
      const clean = sanitizeHeroConfig({ ...config, origin: "studio" });
      // La couche {type:"html"} suit le contenu : ajoutée si HTML/CSS
      // présent, retirée si vidé (jamais de couche orpheline).
      const wantsHtml = html !== "" || css !== "";
      const layers = clean.layers.some((l) => l.type === "html")
        ? wantsHtml
          ? clean.layers
          : clean.layers.filter((l) => l.type !== "html")
        : wantsHtml
          ? [...clean.layers, { type: "html" } as const]
          : clean.layers;
      const final = sanitizeHeroConfig({ ...clean, layers });
      // html/css écrits seulement si modifiés : un non-super_admin qui
      // retouche un autre champ ne heurte jamais la garde 42501.
      const htmlPatch = htmlDirty ? { html, css } : {};
      if (slideId) {
        await heroPromotionsApi.update(slideId, {
          config: final,
          productId,
          isActive,
          startsAt,
          endsAt,
          ...htmlPatch,
        });
      } else {
        await heroPromotionsApi.create({
          productId,
          order: nextOrder,
          isActive,
          startsAt,
          endsAt,
          ...htmlPatch,
          config: final,
        } as Omit<HeroPromotion, "id">);
      }
      // Propagation instantanée même onglet (lot 5) : la boutique ré-écoute
      // via storefront:invalidate ; le cross-client passe par le polling.
      window.dispatchEvent(new Event("storefront:invalidate"));
      onSaved();
    } catch (e) {
      const msg = String((e as Error)?.message || e);
      setError(
        msg.includes("42501") || msg.includes("super_admin")
          ? "HTML/CSS réservés aux super_admin : enregistrez sans modifier ces champs, ou demandez un accès."
          : msg,
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={card}>
        <p style={{ fontSize: 13, color: "var(--color-ink3)" }}>
          Chargement du slide…
        </p>
      </div>
    );
  }

  const themeBg =
    studioTheme === "dark"
      ? "#0A0A0B"
      : studioTheme === "light"
        ? "#FFFFFF"
        : "#F4F4F5";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 12,
        background: themeBg,
        borderRadius: 16,
        padding: 12,
      }}
    >
      {/* Barre haute 02 : retour, titre, thème studio, device, undo/redo, sauver */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          flexWrap: "wrap",
          position: "sticky",
          top: 0,
          zIndex: 30,
          background: themeBg,
          padding: "4px 0",
        }}
      >
        <button type="button" onClick={onClose} style={secondaryBtn} title="Retour aux promotions">
          <X size={14} />
        </button>
        <h3 style={{ fontWeight: 800, fontSize: 16, margin: 0, flex: 1, minWidth: 140 }}>
          {slideId ? "Studio — modifier le slide" : "Studio — nouveau slide"}
        </h3>
        <div style={{ display: "flex", gap: 4 }} title="Thème du studio (outil seul)">
          {(
            [
              { id: "light", label: "Studio clair", bg: "#FFFFFF", icon: Sun },
              { id: "grey", label: "Studio neutre (calibrage)", bg: "#F4F4F5", icon: null },
              { id: "dark", label: "Studio sombre", bg: "#0A0A0B", icon: Moon },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              title={t.label}
              onClick={() => {
                setStudioTheme(t.id);
                try {
                  localStorage.setItem("hero-studio-theme", t.id);
                } catch {
                  /* stockage indisponible : thème session seule */
                }
              }}
              style={{
                width: 26,
                height: 26,
                borderRadius: "50%",
                border:
                  studioTheme === t.id
                    ? "2px solid #FF6B21"
                    : "1px solid var(--color-border2)",
                background: t.bg,
                color: t.id === "dark" ? "#fff" : "#111",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {t.icon ? <t.icon size={13} /> : null}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 4 }} title="Aperçu">
          {(
            [
              { id: "desktop", icon: Monitor, label: "Aperçu desktop" },
              { id: "mobile", icon: Smartphone, label: "Aperçu mobile" },
            ] as const
          ).map((d) => (
            <button
              key={d.id}
              type="button"
              title={d.label}
              onClick={() => setDevice(d.id)}
              style={{
                ...chipBtn,
                ...(device === d.id ? chipBtnActive : null),
              }}
            >
              <d.icon size={13} />
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          <button
            type="button"
            title="Annuler (historique)"
            disabled={hist.past.length === 0}
            onClick={() => {
              setHist((h) => heroHistoryUndo(h));
              setSelection({ kind: "slide" });
            }}
            style={miniBtn}
          >
            <Undo2 size={13} />
          </button>
          <button
            type="button"
            title="Rétablir (historique)"
            disabled={hist.future.length === 0}
            onClick={() => {
              setHist((h) => heroHistoryRedo(h));
              setSelection({ kind: "slide" });
            }}
            style={miniBtn}
          >
            <Redo2 size={13} />
          </button>
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          style={primaryBtn}
        >
          {saving ? "Enregistrement…" : "Enregistrer"}
        </button>
      </div>

      {error && (
        <p style={{ fontSize: 13, color: "#ef4444" }}>{error}</p>
      )}
      {converted && (
        <p style={notice}>
          Converti depuis l'ancien format : ce slide est désormais piloté par
          le studio — l'ancien formulaire ne l'écrasera plus.
        </p>
      )}
      {!isActive && (
        <p style={notice}>
          Slide désactivé : invisible en boutique (l'aperçu ci-dessous le
          montre quand même).
        </p>
      )}

      {/* Corps 3 panneaux 02 : couches | canvas | inspecteur */}
      <div
        style={{
          display: "flex",
          gap: 12,
          alignItems: "flex-start",
          flexWrap: "wrap",
        }}
      >
        {/* Panneau couches 02 : z-stack, œil, verrou, pills Hide-on */}
        <div style={{ ...card, width: 250, flexShrink: 0, padding: 12 }}>
          <button
            type="button"
            onClick={() => scrollToId("hero-slide")}
            style={{
              ...layerRow,
              ...(selection.kind === "slide" ? layerRowActive : null),
            }}
          >
            <span style={{ fontWeight: 700, fontSize: 13 }}>Slide</span>
            <span style={hint}>fond · dimensions</span>
          </button>
          <p style={groupTitle}>Partir de… (remplace, annulable)</p>
          <select
            value=""
            onChange={(e) => {
              const t = HERO_TEMPLATES.find((x) => x.id === e.target.value);
              if (t) {
                commit(t.build());
                setSelection({ kind: "slide" });
              }
              e.target.value = "";
            }}
            style={formInputStyle}
            title="Gabarit (la config courante est remplaçable via Annuler)"
          >
            <option value="">Choisir un gabarit…</option>
            {HERO_TEMPLATES.map((t) => (
              <option key={t.id} value={t.id} title={t.hint}>
                {t.label}
              </option>
            ))}
          </select>
          <p style={groupTitle}>Couches ({config.layers.length})</p>          {config.layers.map((layer, i) => {
            const sel: StudioSelection = { kind: "layer", index: i };
            const h = layerHiddenOf(i);
            return (
              <div
                key={i}
                style={{
                  ...layerRow,
                  ...(selection.kind === "layer" && selection.index === i
                    ? layerRowActive
                    : null),
                }}
              >
                <button
                  type="button"
                  onClick={() => scrollToId(`hero-layer-${i}`)}
                  style={layerName}
                  title={`${layerLabel(layer.type)} #${i + 1}`}
                >
                  <span style={layerDot} />
                  <span style={{ fontWeight: 600, fontSize: 12 }}>
                    {layerLabel(layer.type)} #{i + 1}
                  </span>
                  {isLocked(`l:${i}`) && <Lock size={11} />}
                </button>
                <div style={{ display: "flex", gap: 2, alignItems: "center" }}>
                  <button
                    type="button"
                    title={eyeOff(sel) ? "Afficher partout" : "Masquer partout"}
                    onClick={() => toggleEye(sel)}
                    style={miniBtn}
                  >
                    {eyeOff(sel) ? <EyeOff size={11} /> : <Eye size={11} />}
                  </button>
                  {(["D", "M"] as const).map((axis) => {
                    const key = axis === "D" ? "desktop" : "mobile";
                    const on = !!h?.[key];
                    return (
                      <button
                        key={axis}
                        type="button"
                        title={`Masquer sur ${axis === "D" ? "desktop" : "mobile"}`}
                        onClick={() => togglePill(sel, key)}
                        style={{
                          ...miniBtn,
                          ...(on ? miniBtnActive : null),
                          fontSize: 10,
                          fontWeight: 800,
                        }}
                      >
                        {axis}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
          <p style={groupTitle}>Boutons ({config.ctas.length})</p>
          {config.ctas.map((cta, i) => {
            const sel: StudioSelection = { kind: "cta", index: i };
            const h = ctaHiddenOf(i);
            return (
              <div
                key={cta.id}
                style={{
                  ...layerRow,
                  ...(selection.kind === "cta" && selection.index === i
                    ? layerRowActive
                    : null),
                }}
              >
                <button
                  type="button"
                  onClick={() => scrollToId(`hero-cta-${i}`)}
                  style={layerName}
                  title={cta.label || `Bouton ${i + 1}`}
                >
                  <span style={ctaBadge}>TOP</span>
                  <span style={{ fontWeight: 600, fontSize: 12 }}>
                    {(cta.label || `Bouton ${i + 1}`).slice(0, 18)}
                  </span>
                  {isLocked(`c:${i}`) && <Lock size={11} />}
                </button>
                <div style={{ display: "flex", gap: 2, alignItems: "center" }}>
                  <button
                    type="button"
                    title={eyeOff(sel) ? "Afficher partout" : "Masquer partout"}
                    onClick={() => toggleEye(sel)}
                    style={miniBtn}
                  >
                    {eyeOff(sel) ? <EyeOff size={11} /> : <Eye size={11} />}
                  </button>
                  {(["D", "M"] as const).map((axis) => {
                    const key = axis === "D" ? "desktop" : "mobile";
                    const on = !!h?.[key];
                    return (
                      <button
                        key={axis}
                        type="button"
                        title={`Masquer sur ${axis === "D" ? "desktop" : "mobile"}`}
                        onClick={() => togglePill(sel, key)}
                        style={{
                          ...miniBtn,
                          ...(on ? miniBtnActive : null),
                          fontSize: 10,
                          fontWeight: 800,
                        }}
                      >
                        {axis}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Canvas central */}
        <div style={{ flex: 1, minWidth: 300 }}>
      {/* Aperçu live */}
      <div style={card}>
        <p style={sectionTitle}>Aperçu live (WYSIWYG)</p>
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            background: "var(--color-surface2)",
            borderRadius: 12,
            padding: 12,
          }}
        >
          <div
            style={{
              position: "relative",
              width: device === "mobile" ? 390 : "100%",
              maxWidth: "100%",
              height: previewHeight(config),
              overflow: "hidden",
              borderRadius: 12,
            }}
          >
            {preview ? (
              <HeroSlideView
                slide={preview}
                eager
                onAction={() => {}}
                onLink={() => {}}
                mobilePreview={device === "mobile"}
              />
            ) : (
              <p style={{ fontSize: 13, color: "var(--color-ink3)" }}>
                Rien à prévisualiser (slide filtré : dates ou produit ?).
              </p>
            )}
          </div>
        </div>
        <p style={hint}>
          Aperçu indicatif : les variantes `sm:` suivent la fenêtre, pas le
          cadre.
        </p>
      </div>
        </div>

        {/* Inspecteur droit : sections slide + cartes couches/boutons */}
        <div
          style={{ flex: 1.4, minWidth: 320, display: "flex", flexDirection: "column", gap: 16 }}
        >
      {/* Général */}
      <div style={card} id="hero-slide">
        <p style={sectionTitle}>Général</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Field label="Produit (vide = slide autonome, sans fiche)">
            <select
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              style={formInputStyle}
            >
              <option value="">Aucun (slide autonome)</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
          </Field>
          <Row>
            <label style={checkRow}>
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
              />{" "}
              Actif (visible en boutique)
            </label>
          </Row>
          <Row>
            <Field label="Début (vide = immédiat)">
              <input
                type="datetime-local"
                value={startsAt ? startsAt.slice(0, 16) : ""}
                onChange={(e) =>
                  setStartsAt(
                    e.target.value
                      ? new Date(e.target.value).toISOString()
                      : null,
                  )
                }
                style={formInputStyle}
              />
            </Field>
            <Field label="Fin (vide = permanent)">
              <input
                type="datetime-local"
                value={endsAt ? endsAt.slice(0, 16) : ""}
                onChange={(e) =>
                  setEndsAt(
                    e.target.value
                      ? new Date(e.target.value).toISOString()
                      : null,
                  )
                }
                style={formInputStyle}
              />
            </Field>
          </Row>
          <Row>
            <Field
              label="Police globale (blocs non verrouillés)"
              hint="Chargée display=swap, une seule fois."
            >
              <select
                value={config.fontFamily ?? ""}
                onChange={(e) =>
                  patchConfig((c) => {
                    if (!e.target.value) delete c.fontFamily;
                    else c.fontFamily = e.target.value;
                  })
                }
                style={formInputStyle}
              >
                <option value="">Défaut navigateur</option>
                {HERO_FONT_FAMILIES.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </Field>
          </Row>
          <p
            style={{
              ...hint,
              color:
                budget.level === "over"
                  ? "#ef4444"
                  : budget.level === "warn"
                    ? "#d97706"
                    : undefined,
            }}
          >
            Config : {JSON.stringify(config).length.toLocaleString("fr-FR")}{" "}
            / 20 000 caractères · HTML+CSS :{" "}
            {budget.bytes.toLocaleString("fr-FR")} / 50 000 octets (
            {budget.pct} %){budget.level === "over" ? " — TROP LOURD" : ""}
          </p>
        </div>
      </div>

      {/* Dimensions */}
      <div style={card}>
        <p style={sectionTitle}>Dimensions</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Row>
            <Field label="Mode">
              <select
                value={config.sizing.mode}
                onChange={(e) =>
                  patchConfig((c) => {
                    const mode = e.target.value as "fixed" | "auto";
                    c.sizing =
                      mode === "auto"
                        ? {
                            mode: "auto",
                            width: c.sizing.width,
                            ratio: { desktop: 2.4, mobile: 0.9 },
                          }
                        : {
                            mode: "fixed",
                            width: c.sizing.width,
                            height: { unit: "vh", value: 78 },
                          };
                  })
                }
                style={formInputStyle}
              >
                <option value="fixed">Fixe (hauteur explicite)</option>
                <option value="auto">Auto (ratio figé, zéro JS)</option>
              </select>
            </Field>
            <Field label="Largeur">
              <select
                value={config.sizing.width}
                onChange={(e) =>
                  patchConfig((c) => {
                    c.sizing.width = e.target.value as "full" | "contained";
                  })
                }
                style={formInputStyle}
              >
                <option value="full">Pleine largeur</option>
                <option value="contained">Contenue (centrée)</option>
              </select>
            </Field>
          </Row>
          {config.sizing.mode === "fixed" ? (
            <Row>
              <Field label="Hauteur (30–100 vh / 200–1200 px)">
                <div style={{ display: "flex", gap: 6 }}>
                  <input
                    type="number"
                    value={config.sizing.height.value}
                    onChange={(e) =>
                      patchConfig((c) => {
                        if (c.sizing.mode === "fixed")
                          c.sizing.height.value = num(
                            e.target.value,
                            c.sizing.mode === "fixed"
                              ? c.sizing.height.value
                              : 78,
                          );
                      })
                    }
                    style={formInputStyle}
                  />
                  <select
                    value={config.sizing.height.unit}
                    onChange={(e) =>
                      patchConfig((c) => {
                        if (c.sizing.mode === "fixed")
                          c.sizing.height.unit = e.target.value as "vh" | "px";
                      })
                    }
                    style={formInputStyle}
                  >
                    <option value="vh">vh</option>
                    <option value="px">px</option>
                  </select>
                </div>
              </Field>
              <Field label="Hauteur mobile (vide = même)">
                <input
                  type="number"
                  value={config.sizing.heightMobile?.value ?? ""}
                  placeholder="Identique"
                  onChange={(e) =>
                    patchConfig((c) => {
                      if (c.sizing.mode !== "fixed") return;
                      if (!e.target.value) {
                        delete c.sizing.heightMobile;
                        return;
                      }
                      c.sizing.heightMobile = {
                        unit: c.sizing.height.unit,
                        value: num(e.target.value, c.sizing.height.value),
                      };
                    })
                  }
                  style={formInputStyle}
                />
              </Field>
            </Row>
          ) : (
            <Row>
              <Field label="Ratio desktop (largeur / hauteur)">
                <input
                  type="number"
                  step="0.1"
                  value={config.sizing.ratio.desktop}
                  onChange={(e) =>
                    patchConfig((c) => {
                      if (c.sizing.mode === "auto")
                        c.sizing.ratio.desktop = num(
                          e.target.value,
                          c.sizing.ratio.desktop,
                        );
                    })
                  }
                  style={formInputStyle}
                />
              </Field>
              <Field label="Ratio mobile">
                <input
                  type="number"
                  step="0.1"
                  value={config.sizing.ratio.mobile}
                  onChange={(e) =>
                    patchConfig((c) => {
                      if (c.sizing.mode === "auto")
                        c.sizing.ratio.mobile = num(
                          e.target.value,
                          c.sizing.ratio.mobile,
                        );
                    })
                  }
                  style={formInputStyle}
                />
              </Field>
            </Row>
          )}
        </div>
      </div>

      {/* Fond */}
      <div style={card}>
        <p style={sectionTitle}>Fond</p>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
          {HERO_BG_PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              title={p.label}
              onClick={() =>
                patchConfig((c) => {
                  c.background.gradient = p.value;
                })
              }
              style={{
                width: 40,
                height: 28,
                borderRadius: 8,
                border:
                  config.background.gradient === p.value
                    ? "2px solid var(--color-accent)"
                    : "1px solid var(--color-border)",
                background: p.value,
                cursor: "pointer",
              }}
            />
          ))}
        </div>
        <Field label="CSS libre (dégradé / couleur, jamais d'url())">
          <input
            type="text"
            value={config.background.gradient}
            onChange={(e) =>
              patchConfig((c) => {
                c.background.gradient = e.target.value;
              })
            }
            style={formInputStyle}
          />
        </Field>
      </div>

      {/* Couches */}
      <div style={card}>
        <p style={sectionTitle}>
          Couches ({config.layers.length}) — l'ordre = l'empilement
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {config.layers.map((layer, i) => (
            <div
              key={i}
              id={`hero-layer-${i}`}
              style={{
                ...layerCard,
                ...(selection.kind === "layer" && selection.index === i
                  ? selectedCard
                  : null),
              }}
            >
              <div style={layerHead}>
                <strong style={{ fontSize: 13 }}>
                  {layerLabel(layer.type)} #{i + 1}
                </strong>
                <div style={{ display: "flex", gap: 4 }}>
                  <button
                    type="button"
                    title={
                      isLocked(`l:${i}`) ? "Verrouillé" : "Monter"
                    }
                    disabled={isLocked(`l:${i}`)}
                    onClick={() =>
                      structural((c) => {
                        c.layers = moveItem(c.layers, i, i - 1);
                      })
                    }
                    style={miniBtn}
                  >
                    <ArrowUp size={12} />
                  </button>
                  <button
                    type="button"
                    title={
                      isLocked(`l:${i}`) ? "Verrouillé" : "Descendre"
                    }
                    disabled={isLocked(`l:${i}`)}
                    onClick={() =>
                      structural((c) => {
                        c.layers = moveItem(c.layers, i, i + 1);
                      })
                    }
                    style={miniBtn}
                  >
                    <ArrowDown size={12} />
                  </button>
                  <button
                    type="button"
                    title={
                      isLocked(`l:${i}`) ? "Verrouillé" : "Dupliquer"
                    }
                    disabled={isLocked(`l:${i}`)}
                    onClick={() =>
                      structural((c) => {
                        c.layers = duplicateItem(c.layers, i).slice(
                          0,
                          HERO_MAX_LAYERS,
                        );
                      })
                    }
                    style={miniBtn}
                  >
                    <Copy size={12} />
                  </button>
                  <button
                    type="button"
                    title="Verrouiller / déverrouiller (session)"
                    onClick={() =>
                      setLocked((s) => {
                        const next = new Set(s);
                        const k = `l:${i}`;
                        if (next.has(k)) next.delete(k);
                        else next.add(k);
                        return next;
                      })
                    }
                    style={{
                      ...miniBtn,
                      ...(isLocked(`l:${i}`) ? miniBtnActive : null),
                    }}
                  >
                    {isLocked(`l:${i}`) ? (
                      <Lock size={12} />
                    ) : (
                      <LockOpen size={12} />
                    )}
                  </button>
                  <button
                    type="button"
                    title="Supprimer"
                    onClick={() =>
                      structural((c) => {
                        c.layers.splice(i, 1);
                      })
                    }
                    style={{ ...miniBtn, color: "#ef4444" }}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
              <LayerEditor
                layer={layer}
                products={products}
                onPatch={(fn) => patchLayer(i, fn)}
              />
            </div>
          ))}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {(
              ["image", "card", "tiles", "text"] as const
            ).map((t) => (
              <button
                key={t}
                type="button"
                disabled={caps.layersLeft <= 0}
                onClick={() => {
                  const created = createHeroLayer(t);
                  if (created)
                    patchConfig((c) => {
                      c.layers.push(created);
                    });
                }}
                style={secondaryBtn}
              >
                <Plus size={13} /> {layerLabel(t)}
              </button>
            ))}
            <span style={hint}>HTML : lot 4.</span>
          </div>
        </div>
      </div>

      {/* CTAs */}
      <div style={card}>
        <p style={sectionTitle}>Boutons ({config.ctas.length} / 4)</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {config.ctas.map((cta, i) => (
            <div
              key={cta.id}
              id={`hero-cta-${i}`}
              style={{
                ...layerCard,
                ...(selection.kind === "cta" && selection.index === i
                  ? selectedCard
                  : null),
              }}
            >
              <div style={layerHead}>
                <strong style={{ fontSize: 13 }}>
                  {cta.label || `Bouton ${i + 1}`}
                </strong>
                <div style={{ display: "flex", gap: 4 }}>
                  <button
                    type="button"
                    title={isLocked(`c:${i}`) ? "Verrouillé" : "Monter"}
                    disabled={isLocked(`c:${i}`)}
                    onClick={() =>
                      structural((c) => {
                        c.ctas = moveItem(c.ctas, i, i - 1);
                      })
                    }
                    style={miniBtn}
                  >
                    <ArrowUp size={12} />
                  </button>
                  <button
                    type="button"
                    title={isLocked(`c:${i}`) ? "Verrouillé" : "Descendre"}
                    disabled={isLocked(`c:${i}`)}
                    onClick={() =>
                      structural((c) => {
                        c.ctas = moveItem(c.ctas, i, i + 1);
                      })
                    }
                    style={miniBtn}
                  >
                    <ArrowDown size={12} />
                  </button>
                  <button
                    type="button"
                    title="Verrouiller / déverrouiller (session)"
                    onClick={() =>
                      setLocked((s) => {
                        const next = new Set(s);
                        const k = `c:${i}`;
                        if (next.has(k)) next.delete(k);
                        else next.add(k);
                        return next;
                      })
                    }
                    style={{
                      ...miniBtn,
                      ...(isLocked(`c:${i}`) ? miniBtnActive : null),
                    }}
                  >
                    {isLocked(`c:${i}`) ? (
                      <Lock size={12} />
                    ) : (
                      <LockOpen size={12} />
                    )}
                  </button>
                  <button
                    type="button"
                    title="Supprimer"
                    onClick={() =>
                      structural((c) => {
                        c.ctas.splice(i, 1);
                      })
                    }
                    style={{ ...miniBtn, color: "#ef4444" }}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
              <Row>
                <Field label="Libellé">
                  <input
                    type="text"
                    value={cta.label}
                    maxLength={40}
                    onChange={(e) =>
                      patchCta(i, (t) => {
                        t.label = e.target.value;
                      })
                    }
                    style={formInputStyle}
                  />
                </Field>
                <Field label="Lien (vide = fiche produit)">
                  <input
                    type="text"
                    value={cta.link ?? ""}
                    placeholder="/promotions"
                    onBlur={(e) => {
                      const clean = normalizeHeroLink(e.target.value);
                      patchCta(i, (t) => {
                        t.link = clean;
                      });
                    }}
                    onChange={(e) =>
                      patchCta(i, (t) => {
                        t.link = e.target.value || null;
                      })
                    }
                    style={formInputStyle}
                  />
                </Field>
              </Row>
              <Row>
                <Field label="Style">
                  <select
                    value={cta.style}
                    onChange={(e) =>
                      patchCta(i, (t) => {
                        t.style = e.target.value as HeroCta["style"];
                      })
                    }
                    style={formInputStyle}
                  >
                    {HERO_CTA_STYLES.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Position">
                  <select
                    value={matchCtaPresetId(cta.pos)}
                    onChange={(e) => {
                      const preset = HERO_CTA_POSITIONS.find(
                        (p) => p.id === e.target.value,
                      );
                      patchCta(i, (t) => {
                        t.pos = preset
                          ? preset.id === "custom"
                            ? (t.pos ?? {
                                desktop: { x: 50, y: 50 },
                              })
                            : (JSON.parse(
                                JSON.stringify(preset.pos),
                              ) as HeroCta["pos"])
                          : null;
                      });
                    }}
                    style={formInputStyle}
                  >
                    {HERO_CTA_POSITIONS.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </Field>
              </Row>
              {cta.pos !== null && (
                <Row>
                  <Field label="Desktop X / Y (%)">
                    <div style={{ display: "flex", gap: 6 }}>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={cta.pos.desktop.x}
                        onChange={(e) =>
                          patchCta(i, (t) => {
                            if (t.pos) t.pos.desktop.x = num(e.target.value, 50);
                          })
                        }
                        style={formInputStyle}
                      />
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={cta.pos.desktop.y}
                        onChange={(e) =>
                          patchCta(i, (t) => {
                            if (t.pos) t.pos.desktop.y = num(e.target.value, 50);
                          })
                        }
                        style={formInputStyle}
                      />
                    </div>
                  </Field>
                  <Field
                    label="Mobile X / Y (défaut = desktop)"
                    hint={
                      cta.pos.mobile
                        ? "Coordonnées mobiles distinctes."
                        : "Suit le desktop."
                    }
                  >
                    <div style={{ display: "flex", gap: 6 }}>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={cta.pos.mobile?.x ?? cta.pos.desktop.x}
                        onChange={(e) =>
                          patchCta(i, (t) => {
                            if (!t.pos) return;
                            t.pos.mobile = {
                              x: num(e.target.value, t.pos.desktop.x),
                              y: t.pos.mobile?.y ?? t.pos.desktop.y,
                            };
                          })
                        }
                        style={formInputStyle}
                      />
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={cta.pos.mobile?.y ?? cta.pos.desktop.y}
                        onChange={(e) =>
                          patchCta(i, (t) => {
                            if (!t.pos) return;
                            t.pos.mobile = {
                              x: t.pos.mobile?.x ?? t.pos.desktop.x,
                              y: num(e.target.value, t.pos.desktop.y),
                            };
                          })
                        }
                        style={formInputStyle}
                      />
                      {cta.pos.mobile && (
                        <button
                          type="button"
                          title="Mobile = desktop"
                          onClick={() =>
                            patchCta(i, (t) => {
                              if (t.pos) delete t.pos.mobile;
                            })
                          }
                          style={miniBtn}
                        >
                          <X size={12} />
                        </button>
                      )}
                    </div>
                  </Field>
                </Row>
              )}
            </div>
          ))}
          <div>
            <button
              type="button"
              disabled={caps.ctasLeft <= 0}
              onClick={() =>
                patchConfig((c) => {
                  c.ctas.push(createHeroCta(c.ctas.length));
                })
              }
              style={secondaryBtn}
            >
              <Plus size={13} /> Bouton
            </button>
          </div>
        </div>
      </div>

      {/* HTML collé (lot 4) : super_admin uniquement, sandboxé + nettoyé. */}
      <div style={card}>
        <p style={sectionTitle}>
          HTML personnalisé
          {htmlDirty ? " (modifié)" : ""}
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <p style={notice}>
            Super-admin uniquement : tout autre rôle reçoit une erreur 42501
            à l'enregistrement. Rendu sandboxé (Shadow DOM, styles scopés)
            + nettoyé (scripts, handlers, iframes, URL javascript: refusés).
            La couche HTML est ajoutée/retirée automatiquement selon le
            contenu.
          </p>
          <Field
            label="HTML (overlay plein slide)"
            hint="Balises sûres uniquement. Les <script> et handlers sont retirés au rendu."
          >
            <textarea
              value={html}
              rows={6}
              spellCheck={false}
              onChange={(e) => setHtml(e.target.value)}
              style={{ ...formInputStyle, resize: "vertical", fontFamily: "monospace", fontSize: 12 }}
              placeholder='<div class="promo">…</div>'
            />
          </Field>
          <Field label="CSS (scopé au slide)">
            <textarea
              value={css}
              rows={4}
              spellCheck={false}
              onChange={(e) => setCss(e.target.value)}
              style={{ ...formInputStyle, resize: "vertical", fontFamily: "monospace", fontSize: 12 }}
              placeholder=".promo { … }"
            />
          </Field>
        </div>
      </div>
        </div>
      </div>
    </div>
  );
}

// ─── Sous-éditeurs ──────────────────────────────────────────────────────
/** Preset correspondant à une position (comparaison exacte), sinon custom. */
function matchCtaPresetId(pos: HeroCta["pos"]): string {
  if (pos === null) return "inline";
  const found = HERO_CTA_POSITIONS.find(
    (p) =>
      p.id !== "custom" &&
      p.pos !== null &&
      JSON.stringify(p.pos) === JSON.stringify(pos),
  );
  return found ? found.id : "custom";
}

function layerLabel(type: string): string {
  switch (type) {
    case "image":
      return "Image";
    case "card":
      return "Carte";
    case "tiles":
      return "Tuiles";
    case "text":
      return "Texte";
    default:
      return type;
  }
}

function previewHeight(config: HeroConfig): number | string {
  const s = config.sizing;
  if (s.mode === "auto") return 420;
  if (s.height.unit === "px") return Math.min(760, Math.max(220, s.height.value));
  return `${Math.min(90, Math.max(40, s.height.value))}vh`;
}

function LayerEditor({
  layer,
  products,
  onPatch,
}: {
  layer: HeroLayer;
  products: AdminProduct[];
  onPatch: (fn: (l: HeroLayer) => void) => void;
}) {
  switch (layer.type) {
    case "image":
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <AdminImageInput
            label="Image (vide = image du produit)"
            value={layer.src}
            onChange={(url) =>
              onPatch((l) => {
                if (l.type === "image") l.src = url || null;
              })
            }
            folder="hero"
          />
          <AdminImageInput
            label="Image mobile (optionnel)"
            value={layer.srcMobile}
            onChange={(url) =>
              onPatch((l) => {
                if (l.type === "image")
                  l.srcMobile = url || undefined;
              })
            }
            folder="hero"
          />
          <Row>
            <Field label="Texte alt">
              <input
                type="text"
                value={layer.alt}
                maxLength={140}
                onChange={(e) =>
                  onPatch((l) => {
                    if (l.type === "image") l.alt = e.target.value;
                  })
                }
                style={formInputStyle}
              />
            </Field>
            <Field label="Ajustement">
              <select
                value={layer.fit}
                onChange={(e) =>
                  onPatch((l) => {
                    if (l.type === "image")
                      l.fit = e.target.value as "cover" | "contain";
                  })
                }
                style={formInputStyle}
              >
                <option value="cover">Remplir (cover)</option>
                <option value="contain">Contenir (contain)</option>
              </select>
            </Field>
          </Row>
          <Row>
            <Field label={`Opacité image (${Math.round(layer.dim * 100)} %)`}>
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(layer.dim * 100)}
                onChange={(e) =>
                  onPatch((l) => {
                    if (l.type === "image")
                      l.dim = num(e.target.value, 100) / 100;
                  })
                }
                style={{ width: "100%" }}
              />
            </Field>
            <Field label="Voile">
              <select
                value={layer.scrim}
                onChange={(e) =>
                  onPatch((l) => {
                    if (l.type === "image")
                      l.scrim = e.target.value as "none" | "left" | "bottom";
                  })
                }
                style={formInputStyle}
              >
                <option value="none">Aucun</option>
                <option value="left">Gauche</option>
                <option value="bottom">Bas</option>
              </select>
            </Field>
          </Row>
        </div>
      );
    case "card":
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <Row>
            <Field label="Côté">
              <select
                value={layer.side}
                onChange={(e) =>
                  onPatch((l) => {
                    if (l.type === "card")
                      l.side = e.target.value as "left" | "right";
                  })
                }
                style={formInputStyle}
              >
                <option value="right">Droite</option>
                <option value="left">Gauche</option>
              </select>
            </Field>
            <Field label="Produit (vide = produit du slide)">
              <select
                value={layer.productId ?? ""}
                onChange={(e) =>
                  onPatch((l) => {
                    if (l.type === "card")
                      l.productId = e.target.value || null;
                  })
                }
                style={formInputStyle}
              >
                <option value="">Produit du slide</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </select>
            </Field>
          </Row>
          <AdminImageInput
            label="Visuel (vide = image du produit)"
            value={layer.src}
            onChange={(url) =>
              onPatch((l) => {
                if (l.type === "card") l.src = url || null;
              })
            }
            folder="hero"
          />
        </div>
      );
    case "tiles":
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <AdminImageInput
            label="Visuel principal (vide = image du produit)"
            value={layer.main?.src}
            onChange={(url) =>
              onPatch((l) => {
                if (l.type === "tiles" && l.main) l.main.src = url || null;
              })
            }
            folder="hero"
          />
          <Row>
            <Field label="Étiquette (vide = titre produit)">
              <input
                type="text"
                value={layer.main?.label ?? ""}
                maxLength={60}
                onChange={(e) =>
                  onPatch((l) => {
                    if (l.type === "tiles" && l.main)
                      l.main.label = e.target.value;
                  })
                }
                style={formInputStyle}
              />
            </Field>
            <Field label="Lien principal">
              <input
                type="text"
                value={layer.main?.link ?? ""}
                placeholder="/promotions"
                onBlur={(e) => {
                  const clean = normalizeHeroLink(e.target.value);
                  onPatch((l) => {
                    if (l.type === "tiles" && l.main) l.main.link = clean;
                  });
                }}
                onChange={(e) =>
                  onPatch((l) => {
                    if (l.type === "tiles" && l.main)
                      l.main.link = e.target.value || null;
                  })
                }
                style={formInputStyle}
              />
            </Field>
          </Row>
          {layer.items.map((t, ti) => (
            <div key={ti} style={tileRow}>
              <AdminImageInput
                label={`Tuile ${ti + 1}`}
                value={t.src}
                onChange={(url) =>
                  onPatch((l) => {
                    if (l.type === "tiles" && l.items[ti])
                      l.items[ti].src = url;
                  })
                }
                folder="hero"
              />
              <div style={{ display: "flex", gap: 6 }}>
                <input
                  type="text"
                  value={t.label}
                  maxLength={40}
                  placeholder="Étiquette"
                  onChange={(e) =>
                    onPatch((l) => {
                      if (l.type === "tiles" && l.items[ti])
                        l.items[ti].label = e.target.value;
                    })
                  }
                  style={formInputStyle}
                />
                <input
                  type="text"
                  value={t.link ?? ""}
                  placeholder="Lien"
                  onBlur={(e) => {
                    const clean = normalizeHeroLink(e.target.value);
                    onPatch((l) => {
                      if (l.type === "tiles" && l.items[ti])
                        l.items[ti].link = clean;
                    });
                  }}
                  onChange={(e) =>
                    onPatch((l) => {
                      if (l.type === "tiles" && l.items[ti])
                        l.items[ti].link = e.target.value || null;
                    })
                  }
                  style={formInputStyle}
                />
                <button
                  type="button"
                  title="Retirer la tuile"
                  onClick={() =>
                    onPatch((l) => {
                      if (l.type === "tiles") l.items.splice(ti, 1);
                    })
                  }
                  style={{ ...miniBtn, color: "#ef4444" }}
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))}
          {layer.items.length < 3 && (
            <div>
              <button
                type="button"
                onClick={() =>
                  onPatch((l) => {
                    if (l.type === "tiles")
                      l.items.push({ src: "", label: "", link: null });
                  })
                }
                style={secondaryBtn}
              >
                <Plus size={13} /> Tuile
              </button>
            </div>
          )}
        </div>
      );
    case "text":
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <Row>
            <Field label="Position">
              <select
                value={layer.anchor}
                onChange={(e) =>
                  onPatch((l) => {
                    if (l.type === "text")
                      l.anchor = e.target.value as typeof layer.anchor;
                  })
                }
                style={formInputStyle}
              >
                {HERO_ANCHORS.map((a) => (
                  <option key={a.value} value={a.value}>
                    {a.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Ton">
              <select
                value={layer.tone}
                onChange={(e) =>
                  onPatch((l) => {
                    if (l.type === "text")
                      l.tone = e.target.value as typeof layer.tone;
                  })
                }
                style={formInputStyle}
              >
                {HERO_TONES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </Field>
          </Row>
          <Row>
            <Field label="Police du bloc (vide = globale)">
              <select
                value={layer.font ?? ""}
                onChange={(e) =>
                  onPatch((l) => {
                    if (l.type !== "text") return;
                    if (!e.target.value) delete l.font;
                    else l.font = e.target.value;
                  })
                }
                style={formInputStyle}
              >
                <option value="">Globale du slide</option>
                {HERO_FONT_FAMILIES.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Graisse (vide = auto)">
              <select
                value={layer.fontWeight ?? ""}
                onChange={(e) =>
                  onPatch((l) => {
                    if (l.type !== "text") return;
                    if (!e.target.value) delete l.fontWeight;
                    else l.fontWeight = Number(e.target.value);
                  })
                }
                style={formInputStyle}
              >
                <option value="">Auto (400)</option>
                {[100, 200, 300, 400, 500, 600, 700, 800, 900].map((w) => (
                  <option key={w} value={w}>
                    {w}
                  </option>
                ))}
              </select>
            </Field>
          </Row>
          <Row>
            <Field label="Verrou police (ignore la globale)">
              <select
                value={layer.fontLocked ? "yes" : "no"}
                onChange={(e) =>
                  onPatch((l) => {
                    if (l.type !== "text") return;
                    if (e.target.value === "yes") l.fontLocked = true;
                    else delete l.fontLocked;
                  })
                }
                style={formInputStyle}
              >
                <option value="no">Non (suit la globale)</option>
                <option value="yes">Oui (verrouillée)</option>
              </select>
            </Field>
            <Field label="Interlignage (0.9–2.0, vide = auto)">              <input
                type="number"
                step="0.05"
                min={0.9}
                max={2}
                value={layer.lineHeight ?? ""}
                placeholder="Auto"
                onChange={(e) =>
                  onPatch((l) => {
                    if (l.type !== "text") return;
                    if (e.target.value === "") delete l.lineHeight;
                    else l.lineHeight = num(e.target.value, 1);
                  })
                }
                style={formInputStyle}
              />
            </Field>
            <Field label="Chasse em (−0.05–0.1, vide = auto)">
              <input
                type="number"
                step="0.01"
                min={-0.05}
                max={0.1}
                value={layer.letterSpacing ?? ""}
                placeholder="Auto"
                onChange={(e) =>
                  onPatch((l) => {
                    if (l.type !== "text") return;
                    if (e.target.value === "") delete l.letterSpacing;
                    else l.letterSpacing = num(e.target.value, 0);
                  })
                }
                style={formInputStyle}
              />
            </Field>
          </Row>
          <Row>
            <Field label="Alignement">
              <select
                value={layer.align ?? ""}
                onChange={(e) =>
                  onPatch((l) => {
                    if (l.type !== "text") return;
                    if (!e.target.value) delete l.align;
                    else
                      l.align = e.target.value as NonNullable<
                        typeof layer.align
                      >;
                  })
                }
                style={formInputStyle}
              >
                <option value="">Défaut (gauche)</option>
                <option value="left">Gauche</option>
                <option value="center">Centre</option>
                <option value="right">Droite</option>
                <option value="justify">Justifié</option>
              </select>
            </Field>
            <Field label="Casse">
              <select
                value={layer.transform ?? ""}
                onChange={(e) =>
                  onPatch((l) => {
                    if (l.type !== "text") return;
                    if (!e.target.value) delete l.transform;
                    else
                      l.transform = e.target.value as NonNullable<
                        typeof layer.transform
                      >;
                  })
                }
                style={formInputStyle}
              >
                <option value="">Aucune</option>
                <option value="uppercase">MAJUSCULES</option>
                <option value="lowercase">minuscules</option>
                <option value="capitalize">Capitalisé</option>
              </select>
            </Field>
          </Row>
          <Row>
            <Field label="Largeur max (ex. 34ch, 80% — vide = auto)">
              <input
                type="text"
                value={layer.maxWidth ?? ""}
                placeholder="Auto"
                maxLength={12}
                onChange={(e) =>
                  onPatch((l) => {
                    if (l.type !== "text") return;
                    if (!e.target.value.trim()) delete l.maxWidth;
                    else l.maxWidth = e.target.value.trim();
                  })
                }
                style={formInputStyle}
              />
            </Field>
            <Field label="Équilibre des lignes">
              <select
                value={layer.balance ? "yes" : "no"}
                onChange={(e) =>
                  onPatch((l) => {
                    if (l.type !== "text") return;
                    if (e.target.value === "yes") l.balance = true;
                    else delete l.balance;
                  })
                }
                style={formInputStyle}
              >
                <option value="no">Non</option>
                <option value="yes">Oui (balance)</option>
              </select>
            </Field>
          </Row>
          <Row>
            <Field label="Tag">
              <input
                type="text"
                value={layer.tag}
                maxLength={40}
                onChange={(e) =>
                  onPatch((l) => {
                    if (l.type === "text") l.tag = e.target.value;
                  })
                }
                style={formInputStyle}
              />
            </Field>            <Field label="Afficher le tag">
              <select
                value={layer.showTag ? "yes" : "no"}
                onChange={(e) =>
                  onPatch((l) => {
                    if (l.type === "text")
                      l.showTag = e.target.value === "yes";
                  })
                }
                style={formInputStyle}
              >
                <option value="yes">Oui</option>
                <option value="no">Non</option>
              </select>
            </Field>
          </Row>
          <Field
            label="Titre (vide = titre du produit)"
            hint="Ligne 2 en italique sur desktop (style historique)."
          >
            <textarea
              value={layer.headline}
              rows={2}
              maxLength={200}
              onChange={(e) =>
                onPatch((l) => {
                  if (l.type === "text") l.headline = e.target.value;
                })
              }
              style={{ ...formInputStyle, resize: "vertical" }}
            />
          </Field>
          <Row>
            <Field label="Lignes du titre">
              <select
                value={layer.headlineLines}
                onChange={(e) =>
                  onPatch((l) => {
                    if (l.type === "text")
                      l.headlineLines = e.target.value as "all" | "first";
                  })
                }
                style={formInputStyle}
              >
                <option value="all">Toutes</option>
                <option value="first">Première seule</option>
              </select>
            </Field>
            <Field label="Remplir depuis le produit">
              <select
                value={layer.fromProduct ? "yes" : "no"}
                onChange={(e) =>
                  onPatch((l) => {
                    if (l.type === "text")
                      l.fromProduct = e.target.value === "yes";
                  })
                }
                style={formInputStyle}
              >
                <option value="yes">Oui (champs vides)</option>
                <option value="no">Non (texte seul)</option>
              </select>
            </Field>
          </Row>
          <Field label="Sous-titre (vide = description du produit)">
            <textarea
              value={layer.sub}
              rows={2}
              maxLength={400}
              onChange={(e) =>
                onPatch((l) => {
                  if (l.type === "text") l.sub = e.target.value;
                })
              }
              style={{ ...formInputStyle, resize: "vertical" }}
            />
          </Field>
          <label style={checkRow}>
            <input
              type="checkbox"
              checked={layer.showSub}
              onChange={(e) =>
                onPatch((l) => {
                  if (l.type === "text") l.showSub = e.target.checked;
                })
              }
            />{" "}
            Afficher le sous-titre
          </label>
        </div>
      );
    default:
      return null;
  }
}

// ─── Styles locaux (même langage que PromotionsPage) ─────────────────────
const card: React.CSSProperties = {
  background: "var(--color-surface)",
  border: "1px solid var(--color-border)",
  borderRadius: 16,
  padding: 20,
};

const sectionTitle: React.CSSProperties = {
  fontWeight: 700,
  fontSize: 14,
  color: "var(--color-ink)",
  margin: "0 0 12px 0",
};

const hint: React.CSSProperties = {
  fontSize: 11,
  color: "var(--color-ink4)",
  marginTop: 4,
};

const notice: React.CSSProperties = {
  fontSize: 13,
  color: "var(--color-ink2)",
  background: "var(--color-surface2)",
  border: "1px solid var(--color-border)",
  borderRadius: 10,
  padding: "10px 14px",
  margin: 0,
};

const primaryBtn: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  padding: "8px 16px",
  borderRadius: 10,
  border: "none",
  background: "var(--color-accent)",
  color: "white",
  fontWeight: 700,
  fontSize: 13,
  cursor: "pointer",
};

const secondaryBtn: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "8px 16px",
  borderRadius: 10,
  border: "1.5px solid var(--color-border2)",
  background: "var(--color-surface)",
  color: "var(--color-ink2)",
  fontWeight: 600,
  fontSize: 13,
  cursor: "pointer",
};

const chipBtn: React.CSSProperties = {
  padding: "6px 12px",
  borderRadius: 8,
  border: "1px solid var(--color-border)",
  background: "var(--color-surface)",
  color: "var(--color-ink2)",
  fontSize: 12,
  fontWeight: 600,
  cursor: "pointer",
};

const chipBtnActive: React.CSSProperties = {
  background: "var(--color-ink)",
  color: "var(--color-surface)",
  borderColor: "var(--color-ink)",
};

const miniBtn: React.CSSProperties = {
  background: "var(--color-surface2)",
  border: "1px solid var(--color-border)",
  borderRadius: 6,
  padding: "4px 6px",
  cursor: "pointer",
  color: "var(--color-ink2)",
  display: "flex",
  alignItems: "center",
};

const miniBtnActive: React.CSSProperties = {
  background: "var(--color-ink)",
  color: "var(--color-surface)",
  borderColor: "var(--color-ink)",
};

const checkRow: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  fontSize: 13,
  color: "var(--color-ink2)",
};

const layerCard: React.CSSProperties = {
  border: "1px solid var(--color-border)",
  borderRadius: 12,
  padding: 12,
  background: "var(--color-surface)",
};

const layerHead: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  marginBottom: 10,
};

const tileRow: React.CSSProperties = {
  border: "1px dashed var(--color-border2)",
  borderRadius: 10,
  padding: 10,
  display: "flex",
  flexDirection: "column",
  gap: 8,
};

// ─── Panneau couches 02 ─────────────────────────────────────────────────
const groupTitle: React.CSSProperties = {
  fontWeight: 800,
  fontSize: 11,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  color: "var(--color-ink4)",
  margin: "12px 0 6px 0",
};

const layerRow: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 6,
  width: "100%",
  padding: "6px 8px",
  borderRadius: 8,
  border: "1px solid transparent",
  background: "transparent",
  cursor: "pointer",
  marginBottom: 2,
};

const layerRowActive: React.CSSProperties = {
  border: "1px solid #FF6B21",
  background: "color-mix(in srgb, #FF6B21 8%, transparent)",
};

const layerName: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  background: "none",
  border: "none",
  padding: 0,
  cursor: "pointer",
  color: "var(--color-ink)",
  minWidth: 0,
  flex: 1,
};

const layerDot: React.CSSProperties = {
  width: 8,
  height: 8,
  borderRadius: "50%",
  background: "var(--color-accent)",
  flexShrink: 0,
};

const ctaBadge: React.CSSProperties = {
  fontSize: 9,
  fontWeight: 800,
  background: "#FF6B21",
  color: "#fff",
  borderRadius: 4,
  padding: "1px 4px",
  flexShrink: 0,
};

const selectedCard: React.CSSProperties = {
  border: "1px solid #FF6B21",
  boxShadow: "0 0 0 1px #FF6B21",
};
