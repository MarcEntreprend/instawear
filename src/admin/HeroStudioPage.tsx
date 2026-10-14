// src/admin/HeroStudioPage.tsx — Hero Studio : liste des slides · preview fidèle · inspecteur.
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Save,
  Eye,
  EyeOff,
  Monitor,
  Tablet,
  Smartphone,
  Sun,
  Moon,
  AlertTriangle,
  Info,
  Ruler,
  Undo2,
  Redo2,
  BarChart3,
  ChevronsUpDown,
} from "lucide-react";
import {
  adminUserApi,
  heroHistoryApi,
  heroHtmlApi,
  heroPromotionsApi,
  heroTemplatesApi,
  productApi,
  type HeroUserTemplate,
} from "../api/supabaseApi";
import type { AdminProduct, HeroPromotion } from "./adminTypes";
import AdminImageInput from "./ui/AdminImageInput";
import {
  formInputStyle as inputStyle,
  formLabelStyle as labelStyle,
} from "./adminStyles";
import {
  sanitizeHeroConfig,
  resolveHeroConfig,
  HERO_FONT_FAMILIES,
  HERO_MAX_CTAS,
  HERO_MAX_LAYERS,
  HERO_MAX_TILES,
  cleanHeroFontUrl,
  parseHeroFontUrlFamilies,
  type HeroConfig,
  type HeroCta,
  type HeroLayer,
  type HeroSizing,
} from "../lib/heroSchema";
import { normalizeHeroLink } from "../lib/heroStyle";
import HeroHtmlPanel, { type HeroHtmlPanelHandle } from "./HeroHtmlPanel";
import HeroHistoryPanel, { HeroTrashPanel } from "./HeroHistoryPanel";
import HeroStatsPanel from "./HeroStatsPanel";
import HeroGridPicker from "./HeroGridPicker";
import HeroFlagButtons from "./HeroFlagButtons";
import HeroSyncBadge from "./HeroSyncBadge";
import HeroWeightCheck from "./HeroWeightCheck";
import { resolveHeroSlideForPreview } from "../lib/heroResolve";
import {
  HERO_BG_PRESETS,
  HERO_CONFIG_CAP_BYTES,
  HERO_FRAME_SOURCE,
  HERO_PREVIEW_PATH,
  HERO_STUDIO_SOURCE,
  HERO_TEMPLATES,
  HERO_TILES_TEMPLATES,
  heroConfigBytes,
  heroConfigToLegacy,
  heroReservedBottomPx,
  heroStudioWarnings,
  isoToLocalInput,
  localInputToIso,
  moveItem,
  newCta,
  newLayer,
  snapHeroPoint,
} from "../lib/heroStudio";

type DeviceKey = "desktop" | "tablet" | "mobile";
interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}
interface Draft {
  id: string | null;
  productId: string;
  isActive: boolean;
  startsAt: string | null;
  endsAt: string | null;
  config: HeroConfig;
}

const DEVICES: Record<
  DeviceKey,
  { label: string; w: number; h: number; Icon: typeof Monitor }
> = {
  desktop: { label: "Desktop", w: 1280, h: 800, Icon: Monitor },
  tablet: { label: "Tablette", w: 820, h: 1000, Icon: Tablet },
  mobile: { label: "Mobile", w: 390, h: 760, Icon: Smartphone },
};

const panel: React.CSSProperties = {
  background: "var(--color-surface)",
  border: "1px solid var(--color-border)",
  borderRadius: 16,
};
const btn: React.CSSProperties = {
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
const btnAccent: React.CSSProperties = {
  ...btn,
  background: "var(--color-accent)",
  color: "#fff",
  border: "none",
};

const toDraft = (p: HeroPromotion): Draft => ({
  id: p.id,
  productId: p.productId || "",
  isActive: p.isActive !== false,
  startsAt: p.startsAt ?? null,
  endsAt: p.endsAt ?? null,
  config: resolveHeroConfig(p),
});
const serialize = (d: Draft) =>
  JSON.stringify({
    p: d.productId,
    a: d.isActive,
    s: d.startsAt,
    e: d.endsAt,
    c: d.config,
  });

// ─── Petits composants ──────────────────────────────────────────────────
function Section({
  title,
  children,
  open = true,
}: {
  title: string;
  children: React.ReactNode;
  open?: boolean;
}) {
  return (
    <details
      open={open}
      style={{ borderBottom: "1px solid var(--color-border)" }}
    >
      <summary
        style={{
          cursor: "pointer",
          padding: "12px 16px",
          fontWeight: 700,
          fontSize: 13,
          color: "var(--color-ink)",
        }}
      >
        {title}
      </summary>
      <div
        style={{
          padding: "0 16px 14px",
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        {children}
      </div>
    </details>
  );
}
function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  );
}
function Seg({
  value,
  options,
  onChange,
}: {
  value: string;
  options: [string, string][];
  onChange: (v: string) => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        gap: 4,
        padding: 3,
        borderRadius: 10,
        background: "var(--color-surface2)",
        border: "1px solid var(--color-border)",
      }}
    >
      {options.map(([v, label]) => (
        <button
          key={v}
          type="button"
          onClick={() => onChange(v)}
          style={{
            flex: 1,
            padding: "6px 8px",
            borderRadius: 8,
            border: "none",
            cursor: "pointer",
            fontSize: 12,
            fontWeight: 600,
            background: value === v ? "var(--color-accent)" : "transparent",
            color: value === v ? "#fff" : "var(--color-ink2)",
          }}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
function Num({
  value,
  onChange,
  min,
  max,
  step = 1,
}: {
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <input
      type="number"
      value={value}
      min={min}
      max={max}
      step={step}
      onChange={(e) => onChange(Number(e.target.value))}
      style={inputStyle}
    />
  );
}

function measureRatio(src: string): Promise<number | null> {
  return new Promise((resolve) => {
    const im = new Image();
    im.onload = () =>
      resolve(
        im.naturalHeight
          ? Math.round((im.naturalWidth / im.naturalHeight) * 100) / 100
          : null,
      );
    im.onerror = () => resolve(null);
    im.src = src;
  });
}

// ─── Éditeur d'une couche ───────────────────────────────────────────────
function LayerEditor({
  layer,
  onChange,
}: {
  layer: HeroLayer;
  onChange: (l: HeroLayer) => void;
}) {
  if (layer.type === "image") {
    return (
      <>
        <AdminImageInput
          label="Image (vide = image du produit)"
          value={layer.src ?? ""}
          onChange={(u) => onChange({ ...layer, src: u || null })}
          folder="hero"
          placeholder="https://… (lien, import, dépôt, Ctrl+V)"
        />
        <AdminImageInput
          label="Image mobile (optionnel)"
          value={layer.srcMobile ?? ""}
          onChange={(u) => {
            const { srcMobile, ...rest } = layer;
            onChange(u ? { ...rest, srcMobile: u } : rest);
          }}
          folder="hero"
          placeholder="Cadrage différent sur mobile"
        />
        <Field label="Texte alternatif">
          <input
            style={inputStyle}
            value={layer.alt}
            onChange={(e) => onChange({ ...layer, alt: e.target.value })}
          />
        </Field>
        <Field label="Cadrage">
          <Seg
            value={layer.fit}
            options={[
              ["cover", "Remplir"],
              ["contain", "Contenir"],
            ]}
            onChange={(v) =>
              onChange({ ...layer, fit: v as "cover" | "contain" })
            }
          />
        </Field>
        <Field label={`Opacité de l'image : ${Math.round(layer.dim * 100)} %`}>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={layer.dim}
            onChange={(e) =>
              onChange({ ...layer, dim: Number(e.target.value) })
            }
          />
        </Field>
        <Field label="Voile de lisibilité">
          <Seg
            value={layer.scrim}
            options={[
              ["none", "Aucun"],
              ["left", "Gauche"],
              ["bottom", "Bas"],
            ]}
            onChange={(v) =>
              onChange({ ...layer, scrim: v as "none" | "left" | "bottom" })
            }
          />
        </Field>
      </>
    );
  }
  if (layer.type === "card") {
    return (
      <>
        <AdminImageInput
          label="Visuel (vide = image du produit)"
          value={layer.src ?? ""}
          onChange={(u) => onChange({ ...layer, src: u || null })}
          folder="hero"
          placeholder="https://…"
        />
        <Field label="Côté">
          <Seg
            value={layer.side}
            options={[
              ["left", "Gauche"],
              ["right", "Droite"],
            ]}
            onChange={(v) =>
              onChange({ ...layer, side: v as "left" | "right" })
            }
          />
        </Field>
        <Field label="Texte alternatif">
          <input
            style={inputStyle}
            value={layer.alt}
            onChange={(e) => onChange({ ...layer, alt: e.target.value })}
          />
        </Field>
      </>
    );
  }
  if (layer.type === "tiles") {
    const main = layer.main ?? {
      src: null,
      link: null,
      label: "",
      ctaLabel: "",
      fromProduct: true,
    };
    const setItem = (
      i: number,
      patch: Partial<{ src: string; label: string; link: string | null }>,
    ) =>
      onChange({
        ...layer,
        items: layer.items.map((t, ti) => (ti === i ? { ...t, ...patch } : t)),
      });
    return (
      <>
        <Field label="Disposition (écrans ≥ 640 px)">
          <HeroGridPicker
            value={layer.variant ?? "split"}
            count={Math.min(5, Math.max(1, layer.items.length))}
            onChange={(v) => {
              const { variant: _old, ...rest } = layer;
              onChange(
                (v === "split" ? rest : { ...rest, variant: v }) as typeof layer,
              );
            }}
          />
        </Field>
        <AdminImageInput
          label="Visuel principal (vide = produit)"
          value={main.src ?? ""}
          onChange={(u) =>
            onChange({ ...layer, main: { ...main, src: u || null } })
          }
          folder="hero"
          placeholder="https://…"
        />
        <Field label="Libellé (vide = titre du produit)">
          <input
            style={inputStyle}
            value={main.label}
            onChange={(e) =>
              onChange({ ...layer, main: { ...main, label: e.target.value } })
            }
          />
        </Field>
        <Field label="Bouton">
          <input
            style={inputStyle}
            value={main.ctaLabel}
            onChange={(e) =>
              onChange({
                ...layer,
                main: { ...main, ctaLabel: e.target.value },
              })
            }
          />
        </Field>
        <Field label="Lien (/…, vide = produit)">
          <input
            style={inputStyle}
            value={main.link ?? ""}
            onChange={(e) =>
              onChange({
                ...layer,
                main: { ...main, link: e.target.value || null },
              })
            }
            onBlur={(e) =>
              onChange({
                ...layer,
                main: {
                  ...main,
                  link: normalizeHeroLink(e.target.value) || null,
                },
              })
            }
            placeholder="/promotions"
          />
        </Field>
        <label style={labelStyle}>
          Tuiles ({layer.items.length}/{HERO_MAX_TILES})
        </label>
        {layer.items.map((t, i) => (
          <div
            key={i}
            style={{
              padding: 10,
              borderRadius: 10,
              border: "1px solid var(--color-border)",
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            <AdminImageInput
              value={t.src}
              onChange={(u) => setItem(i, { src: u })}
              folder="hero"
              placeholder="Image https://…"
            />
            {!(t.src || "").trim() && (
              <span style={{ fontSize: 11, color: "#92400e" }}>
                Sans image, cette tuile sera ignorée à l'enregistrement.
              </span>
            )}
            <input
              style={inputStyle}
              value={t.label}
              placeholder="Libellé"
              onChange={(e) => setItem(i, { label: e.target.value })}
            />
            <input
              style={inputStyle}
              value={t.link ?? ""}
              placeholder="Lien /…"
              onChange={(e) => setItem(i, { link: e.target.value || null })}
              onBlur={(e) =>
                setItem(i, { link: normalizeHeroLink(e.target.value) || null })
              }
            />
            <button
              type="button"
              style={{ ...btn, color: "#ef4444", alignSelf: "flex-start" }}
              onClick={() =>
                onChange({
                  ...layer,
                  items: layer.items.filter((_, ti) => ti !== i),
                })
              }
            >
              <Trash2 size={13} /> Retirer
            </button>
          </div>
        ))}
        {layer.items.length < HERO_MAX_TILES && (
          <button
            type="button"
            style={btn}
            onClick={() =>
              onChange({
                ...layer,
                items: [
                  ...layer.items,
                  {
                    src: "https://placehold.co/400x400",
                    label: "",
                    link: null,
                  },
                ],
              })
            }
          >
            <Plus size={13} /> Ajouter une tuile
          </button>
        )}
      </>
    );
  }
  if (layer.type === "text") {
    return (
      <>
        <Field label="Position">
          <select
            style={inputStyle}
            value={layer.anchor}
            onChange={(e) =>
              onChange({
                ...layer,
                anchor: e.target.value as typeof layer.anchor,
              })
            }
          >
            <option value="left-middle">Gauche, centré</option>
            <option value="center">Centre</option>
            <option value="right-middle">Droite, centré</option>
            <option value="bottom-left">Bas gauche (compact)</option>
          </select>
        </Field>
        <Field label="Couleur du texte">
          <Seg
            value={layer.tone}
            options={[
              ["auto", "Auto"],
              ["light", "Clair"],
              ["dark", "Sombre"],
            ]}
            onChange={(v) =>
              onChange({ ...layer, tone: v as "auto" | "light" | "dark" })
            }
          />
        </Field>
        {/* Typo fine (PORT-15B) : vide = rendu historique. */}
        <Field label="Interlignage (0.9–2.0, vide = auto)">
          <input
            style={inputStyle}
            type="number"
            step="0.05"
            min={0.9}
            max={2}
            value={layer.lineHeight ?? ""}
            placeholder="Auto"
            onChange={(e) => {
              const { lineHeight: _d, ...rest } = layer;
              onChange(
                e.target.value === ""
                  ? rest
                  : { ...rest, lineHeight: Number(e.target.value) },
              );
            }}
          />
        </Field>
        <Field label="Chasse em (−0.05–0.1, vide = auto)">
          <input
            style={inputStyle}
            type="number"
            step="0.01"
            min={-0.05}
            max={0.1}
            value={layer.letterSpacing ?? ""}
            placeholder="Auto"
            onChange={(e) => {
              const { letterSpacing: _d, ...rest } = layer;
              onChange(
                e.target.value === ""
                  ? rest
                  : { ...rest, letterSpacing: Number(e.target.value) },
              );
            }}
          />
        </Field>
        <Field label="Alignement (vide = ancre)">
          <select
            style={inputStyle}
            value={layer.align ?? ""}
            onChange={(e) => {
              const { align: _d, ...rest } = layer;
              onChange(
                e.target.value
                  ? {
                      ...rest,
                      align: e.target.value as NonNullable<
                        typeof layer.align
                      >,
                    }
                  : rest,
              );
            }}
          >
            <option value="">Ancre</option>
            <option value="left">Gauche</option>
            <option value="center">Centre</option>
            <option value="right">Droite</option>
            <option value="justify">Justifié</option>
          </select>
        </Field>
        <Field label="Casse (vide = aucune)">
          <select
            style={inputStyle}
            value={layer.transform ?? ""}
            onChange={(e) => {
              const { transform: _d, ...rest } = layer;
              onChange(
                e.target.value
                  ? {
                      ...rest,
                      transform: e.target.value as NonNullable<
                        typeof layer.transform
                      >,
                    }
                  : rest,
              );
            }}
          >
            <option value="">Aucune</option>
            <option value="uppercase">MAJUSCULES</option>
            <option value="lowercase">minuscules</option>
            <option value="capitalize">Capitalisé</option>
          </select>
        </Field>
        <Field label="Largeur max (ex. 34ch, 80% — vide = auto)">
          <input
            style={inputStyle}
            type="text"
            maxLength={12}
            value={layer.maxWidth ?? ""}
            placeholder="Auto"
            onChange={(e) => {
              const { maxWidth: _d, ...rest } = layer;
              onChange(
                e.target.value.trim()
                  ? { ...rest, maxWidth: e.target.value.trim() }
                  : rest,
              );
            }}
          />
        </Field>
        <label
          style={{
            ...labelStyle,
            display: "flex",
            gap: 6,
            alignItems: "center",
          }}
        >
          <input
            type="checkbox"
            checked={layer.balance === true}
            onChange={(e) => {
              const { balance: _d, ...rest } = layer;
              onChange(
                e.target.checked ? { ...rest, balance: true } : rest,
              );
            }}
          />{" "}
          Équilibrer les lignes (balance)
        </label>
        {/* Police du bloc (PORT-15B P3) : vide = globale puis défaut. */}
        <Field label="Police du bloc (vide = globale)">
          <select
            style={inputStyle}
            value={layer.font ?? ""}
            onChange={(e) => {
              const { font: _d, ...rest } = layer;
              onChange(
                e.target.value ? { ...rest, font: e.target.value } : rest,
              );
            }}
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
            style={inputStyle}
            value={layer.fontWeight ?? ""}
            onChange={(e) => {
              const { fontWeight: _d, ...rest } = layer;
              onChange(
                e.target.value
                  ? { ...rest, fontWeight: Number(e.target.value) }
                  : rest,
              );
            }}
          >
            <option value="">Auto (400)</option>
            {[100, 200, 300, 400, 500, 600, 700, 800, 900].map((w) => (
              <option key={w} value={w}>
                {w}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Verrou police (ignore la globale)">
          <select
            style={inputStyle}
            value={layer.fontLocked ? "yes" : "no"}
            onChange={(e) => {
              const { fontLocked: _d, ...rest } = layer;
              onChange(
                e.target.value === "yes"
                  ? { ...rest, fontLocked: true }
                  : rest,
              );
            }}
          >
            <option value="no">Non (suit la globale)</option>
            <option value="yes">Oui (verrouillée)</option>
          </select>
        </Field>
        <Field label="Badge">
          <input
            style={inputStyle}
            value={layer.tag}
            onChange={(e) => onChange({ ...layer, tag: e.target.value })}
            placeholder="Nouveau"
          />
        </Field>
        <label
          style={{
            ...labelStyle,
            display: "flex",
            gap: 6,
            alignItems: "center",
          }}
        >
          <input
            type="checkbox"
            checked={layer.showTag}
            onChange={(e) => onChange({ ...layer, showTag: e.target.checked })}
          />{" "}
          Afficher le badge
        </label>
        <Field label="Titre (2e ligne = italique)">
          <textarea
            style={{ ...inputStyle, minHeight: 64, resize: "vertical" }}
            value={layer.headline}
            onChange={(e) => onChange({ ...layer, headline: e.target.value })}
          />
        </Field>
        <label
          style={{
            ...labelStyle,
            display: "flex",
            gap: 6,
            alignItems: "center",
          }}
        >
          <input
            type="checkbox"
            checked={layer.headlineLines === "first"}
            onChange={(e) =>
              onChange({
                ...layer,
                headlineLines: e.target.checked ? "first" : "all",
              })
            }
          />{" "}
          Première ligne seulement
        </label>
        <Field label="Sous-titre">
          <input
            style={inputStyle}
            value={layer.sub}
            onChange={(e) => onChange({ ...layer, sub: e.target.value })}
          />
        </Field>
        <label
          style={{
            ...labelStyle,
            display: "flex",
            gap: 6,
            alignItems: "center",
          }}
        >
          <input
            type="checkbox"
            checked={layer.showSub}
            onChange={(e) => onChange({ ...layer, showSub: e.target.checked })}
          />{" "}
          Afficher le sous-titre
        </label>
        <label
          style={{
            ...labelStyle,
            display: "flex",
            gap: 6,
            alignItems: "center",
          }}
        >
          <input
            type="checkbox"
            checked={layer.fromProduct}
            onChange={(e) =>
              onChange({ ...layer, fromProduct: e.target.checked })
            }
          />{" "}
          Reprendre le produit si vide
        </label>
      </>
    );
  }
  if (layer.type === "marquee") {
    // PORT-15B P4 : bandeau CSS-only. Éviter le slide en position 1 (LCP) :
    // le prerender l'exclut du lead de toute façon.
    return (
      <>
        <p style={{ fontSize: 11, color: "var(--color-ink4)" }}>
          Bandeau défilant (CSS seul). Évitez le slide en position 1 (LCP) :
          le prerender l'exclut du lead de toute façon.
        </p>
        <Field label="Texte (vide = couche ignorée)">
          <input
            type="text"
            style={inputStyle}
            value={layer.text}
            onChange={(e) => onChange({ ...layer, text: e.target.value })}
          />
        </Field>
        <Field label="Vitesse (secondes/boucle, 5–120)">
          <Num
            value={layer.speed}
            min={5}
            max={120}
            onChange={(n) =>
              onChange({
                ...layer,
                speed: Math.min(120, Math.max(5, Math.round(n || 20))),
              })
            }
          />
        </Field>
        <Field label="Direction">
          <select
            style={inputStyle}
            value={layer.direction}
            onChange={(e) =>
              onChange({
                ...layer,
                direction: e.target.value as "left" | "right",
              })
            }
          >
            <option value="left">Gauche</option>
            <option value="right">Droite</option>
          </select>
        </Field>
        <Field label="Ton">
          <select
            style={inputStyle}
            value={layer.tone}
            onChange={(e) =>
              onChange({ ...layer, tone: e.target.value as "light" | "dark" })
            }
          >
            <option value="dark">Sombre (texte clair)</option>
            <option value="light">Clair (texte sombre)</option>
          </select>
        </Field>
      </>
    );
  }
  if (layer.type === "countdown") {
    // PORT-15B P5 : hydratation cliente (jamais figé au build) et exclu du lead.
    return (
      <>
        <p style={{ fontSize: 11, color: "var(--color-ink4)" }}>
          Hydratation cliente (jamais figé au build) et exclu du lead.
          Fuseau : heure locale du navigateur.
        </p>
        <Field label="Échéance">
          <input
            type="datetime-local"
            style={inputStyle}
            value={isoToLocalInput(layer.targetAt)}
            onChange={(e) => {
              if (!e.target.value) return;
              const iso = localInputToIso(e.target.value);
              if (iso) onChange({ ...layer, targetAt: iso });
            }}
          />
        </Field>
        <Field label="Étiquette (vide = aucune)">
          <input
            type="text"
            style={inputStyle}
            value={layer.label}
            onChange={(e) => onChange({ ...layer, label: e.target.value })}
          />
        </Field>
        <Field label="Texte une fois expiré">
          <input
            type="text"
            style={inputStyle}
            value={layer.expiredText}
            maxLength={60}
            onChange={(e) =>
              onChange({ ...layer, expiredText: e.target.value })
            }
          />
        </Field>
        <Field label="Ton">
          <select
            style={inputStyle}
            value={layer.tone}
            onChange={(e) =>
              onChange({ ...layer, tone: e.target.value as "light" | "dark" })
            }
          >
            <option value="dark">Sombre (texte clair)</option>
            <option value="light">Clair (texte sombre)</option>
          </select>
        </Field>
      </>
    );
  }
  return null;
}

const LAYER_LABEL: Record<string, string> = {
  image: "Image de fond",
  card: "Carte visuelle",
  tiles: "Tuiles",
  text: "Texte",
  marquee: "Bandeau",
  countdown: "Compte à rebours",
  html: "HTML",
};

// ─── Page ───────────────────────────────────────────────────────────────
export default function HeroStudioPage() {
  const [slides, setSlides] = useState<HeroPromotion[]>([]);
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [fontUrlDraft, setFontUrlDraft] = useState("");
  const [fontUrlError, setFontUrlError] = useState<string | null>(null);
  const [baseline, setBaseline] = useState("");
  const [device, setDevice] = useState<DeviceKey>("desktop");
  const [theme, setTheme] = useState<"light" | "dark">(() =>
    document.documentElement.getAttribute("data-theme") === "dark"
      ? "dark"
      : "light",
  );
  const [guides, setGuides] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [layerSel, setLayerSel] = useState(0);
  const [selCta, setSelCta] = useState<string | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);
  const [rect, setRect] = useState<Rect | null>(null);
  const [readyTick, setReadyTick] = useState(0);
  const [avail, setAvail] = useState(0);
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const dragId = useRef<string | null>(null);
  const [isSuper, setIsSuper] = useState(false);
  const [liveHtml, setLiveHtml] = useState<{ html: string; css: string } | null>(
    null,
  );
  const [htmlDirty, setHtmlDirty] = useState(false);
  const htmlRef = useRef<HeroHtmlPanelHandle>(null);
  const [userTpls, setUserTpls] = useState<HeroUserTemplate[]>([]);
  const [seedHtml, setSeedHtml] = useState<{ html: string; css: string } | null>(
    null,
  );
  const [draftSeq, setDraftSeq] = useState(0);
  const [histTick, setHistTick] = useState(0);
  const [showStats, setShowStats] = useState(false);
  // Thème du studio (PORT-15B) : chrome de l'outil seul (fond du conteneur),
  // jamais le hero ni le reste de l'admin. Persisté en local.
  const [studioTheme, setStudioTheme] = useState<"light" | "grey" | "dark">(
    () => {
      const v =
        typeof localStorage !== "undefined"
          ? localStorage.getItem("hero-studio-theme")
          : null;
      return v === "light" || v === "dark" ? v : "grey";
    },
  );
  const studioThemeBg =
    studioTheme === "dark"
      ? "#0A0A0B"
      : studioTheme === "light"
        ? "#FFFFFF"
        : "#F4F4F5";
  // Groupes repliés en bloc (02) : null = état initial par section, sinon tout replié/déplié.
  // Appliqué via clé de remontage (les <details> natifs ne sont pas contrôlés).
  const [secMode, setSecMode] = useState<"all" | "none" | null>(null);
  const [restoreBackup, setRestoreBackup] = useState<Draft | null>(null);
  const seenVersion = useRef<string | null>(null);
  const draftRef = useRef<Draft | null>(null);
  draftRef.current = draft;
  const undoStack = useRef<HeroConfig[]>([]);
  const redoStack = useRef<HeroConfig[]>([]);
  const lastPush = useRef(0);
  const [, setUndoTick] = useState(0);

  const dirty = (!!draft && serialize(draft) !== baseline) || htmlDirty;
  const dev = DEVICES[device];
  const scale = avail ? Math.min(1, (avail - 4) / dev.w) : 1;

  const load = useCallback(async (selectId?: string | null) => {
    const [list, prods] = await Promise.all([
      heroPromotionsApi.list(),
      productApi.list(),
    ]);
    setSlides(list);
    setProducts(prods);
    const target =
      (selectId && list.find((s) => s.id === selectId)) || list[0] || null;
    if (target) {
      const d = toDraft(target);
      setDraft(d);
      setBaseline(serialize(d));
    }
  }, []);

  useEffect(() => {
    load()
      .catch((e) =>
        setMsg({ ok: false, text: e?.message || "Chargement impossible." }),
      )
      .finally(() => setLoading(false));
  }, [load]);

  // Rôle : le HTML collé n'est éditable que par un super_admin (RLS en base + garde UI).
  useEffect(() => {
    adminUserApi.getMyRole().then(
      (me) => setIsSuper(me?.role === "super_admin"),
      () => setIsSuper(false),
    );
  }, []);

  // Modèles perso (config seule, sans HTML).
  const reloadTemplates = () =>
    heroTemplatesApi.list().then(setUserTpls, () => setUserTpls([]));
  useEffect(() => {
    void reloadTemplates();
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

  // Largeur disponible pour l'aperçu.
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setAvail(el.clientWidth));
    ro.observe(el);
    setAvail(el.clientWidth);
    return () => ro.disconnect();
  }, [loading]);

  // Garde "modifications non enregistrées" + Ctrl/Cmd+S.
  useEffect(() => {
    const onUnload = (e: BeforeUnloadEvent) => {
      if (dirty) e.preventDefault();
    };
    window.addEventListener("beforeunload", onUnload);
    return () => window.removeEventListener("beforeunload", onUnload);
  });

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

  const product = useMemo(
    () => products.find((p) => p.id === draft?.productId) ?? null,
    [products, draft?.productId],
  );
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

  // Envoi de l'état courant à l'aperçu (live, sans passer par la base).
  useEffect(() => {
    if (!resolved) return;
    frameRef.current?.contentWindow?.postMessage(
      { source: HERO_STUDIO_SOURCE, type: "set", slide: resolved, theme },
      window.location.origin,
    );
  }, [resolved, theme, readyTick, device]);

  const patchConfig = (fn: (c: HeroConfig) => HeroConfig) => {
    const d = draftRef.current;
    if (!d) return;
    const next = fn(d.config);
    if (next === d.config) return;
    pushUndo(d.config);
    const nd = { ...d, config: next };
    draftRef.current = nd;
    setDraft(nd);
  };
  // ── Annuler / Rétablir (session) : les modifs rapprochées (≤ 600 ms) = un seul pas. ──
  const pushUndo = (c: HeroConfig) => {
    const now = Date.now();
    if (now - lastPush.current > 600) {
      undoStack.current.push(c);
      if (undoStack.current.length > 60) undoStack.current.shift();
    }
    lastPush.current = now;
    redoStack.current = [];
    setUndoTick((n) => n + 1);
  };
  const undo = () => {
    const d = draftRef.current;
    const prev = undoStack.current.pop();
    if (!d || !prev) return;
    redoStack.current.push(d.config);
    lastPush.current = 0;
    const nd = { ...d, config: prev };
    draftRef.current = nd;
    setDraft(nd);
    setUndoTick((n) => n + 1);
  };
  const redo = () => {
    const d = draftRef.current;
    const next = redoStack.current.pop();
    if (!d || !next) return;
    undoStack.current.push(d.config);
    lastPush.current = 0;
    const nd = { ...d, config: next };
    draftRef.current = nd;
    setDraft(nd);
    setUndoTick((n) => n + 1);
  };

  // Ctrl+Z / Ctrl+Y (ou Ctrl+Maj+Z) — jamais pendant la saisie dans un champ.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      const t = e.target as HTMLElement | null;
      if (
        t &&
        (t.tagName === "INPUT" ||
          t.tagName === "TEXTAREA" ||
          t.tagName === "SELECT" ||
          t.isContentEditable)
      )
        return;
      const k = e.key.toLowerCase();
      if (k === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if (k === "y" || (k === "z" && e.shiftKey)) {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // Changer de slide : piles d'annulation et sauvegarde de restauration repartent à zéro.
  useEffect(() => {
    undoStack.current = [];
    redoStack.current = [];
    lastPush.current = 0;
    setUndoTick((n) => n + 1);
    setRestoreBackup(null);
  }, [draft?.id, draftSeq]);

  // Détection de conflit : dernière version vue à l'ouverture du slide.
  useEffect(() => {
    seenVersion.current = null;
    if (!draft?.id) return;
    let alive = true;
    heroHistoryApi.latest(draft.id).then(
      (l) => {
        if (alive) seenVersion.current = l?.id ?? null;
      },
      () => {},
    );
    return () => {
      alive = false;
    };
  }, [draft?.id]);

  // Charge une version de l'historique dans l'éditeur (non enregistrée).
  const loadVersion = (
    parts: { productId: string; config: HeroConfig },
    when: string,
  ) => {
    const cur = draftRef.current;
    if (!cur) return;
    setRestoreBackup(cur);
    pushUndo(cur.config);
    const nd = { ...cur, productId: parts.productId, config: parts.config };
    draftRef.current = nd;
    setDraft(nd);
    setLayerSel(0);
    setSelCta(null);
    setMsg({
      ok: true,
      text: `Version du ${when} chargée (visibilité et planification inchangées). Enregistre pour la restaurer, ou « Annuler la restauration ».`,
    });
  };
  const patchDraft = (p: Partial<Draft>) =>
    setDraft((d) => (d ? { ...d, ...p } : d));

  const confirmLeave = () =>
    !dirty || window.confirm("Modifications non enregistrées. Continuer ?");

  const openSlide = (s: HeroPromotion) => {
    if (!confirmLeave()) return;
    const d = toDraft(s);
    setDraft(d);
    setBaseline(serialize(d));
    setFontUrlDraft(d.config.fontUrl ?? "");
    setFontUrlError(null);
    setLayerSel(0);
    setSelCta(null);
    setMsg(null);
  };

  const startNew = (build: () => HeroConfig) => {
    if (!confirmLeave()) return;
    const d: Draft = {
      id: null,
      productId: "",
      isActive: false,
      startsAt: null,
      endsAt: null,
      config: build(),
    };
    setDraft(d);
    setBaseline("");
    setFontUrlDraft("");
    setFontUrlError(null);
    setLayerSel(0);
    setSelCta(null);
    setShowTemplates(false);
    setSeedHtml(null);
    setDraftSeq((n) => n + 1);
    setMsg(null);
  };

  const save = async () => {
    if (!draft || saving) return;
    setSaving(true);
    setMsg(null);
    try {
      // Conflit : un autre admin a-t-il enregistré ce slide depuis ton ouverture ?
      if (draft.id) {
        const latest = await heroHistoryApi.latest(draft.id).catch(() => null);
        if (latest && seenVersion.current && latest.id !== seenVersion.current) {
          const ok = window.confirm(
            `Ce slide a été modifié par ${latest.createdBy ?? "un autre administrateur"} le ${new Date(latest.createdAt).toLocaleString("fr-FR")} depuis ton ouverture.\nÉcraser ses changements ?`,
          );
          if (!ok) return;
        }
      }
      const config = sanitizeHeroConfig({ ...draft.config, origin: "studio" });
      if (heroConfigBytes(config) > HERO_CONFIG_CAP_BYTES)
        throw new Error("Configuration trop lourde (> 20 000 octets).");
      const m = heroConfigToLegacy(config);
      const payload = {
        productId: draft.productId,
        isActive: draft.isActive,
        startsAt: draft.startsAt,
        endsAt: draft.endsAt,
        config,
        // Miroir legacy : le prerender du slide n°1 et les anciennes lectures continuent de marcher.
        kind: m.kind,
        layout: m.layout,
        headline: m.headline,
        sub: m.sub,
        tag: m.tag,
        showTag: m.showTag,
        cta: m.cta,
        linkUrl: m.linkUrl,
        bgGradient: m.bgGradient,
        image: m.image,
        tiles: m.tiles,
      };
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
      seenVersion.current =
        (await heroHistoryApi.latest(saved.id).catch(() => null))?.id ?? null;
      setRestoreBackup(null);
      setHistTick((n) => n + 1);
      if (htmlErr) throw new Error(`Slide enregistré, mais ${htmlErr}`);
      setMsg({
        ok: true,
        text: draft.isActive
          ? "Enregistré — visible en boutique après rechargement."
          : "Brouillon enregistré (non visible en boutique).",
      });
    } catch (e: any) {
      setMsg({ ok: false, text: e?.message || "Enregistrement impossible." });
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void save();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const duplicate = async () => {
    if (!draft || !confirmLeave()) return;
    // HTML : on emporte ce qui est dans le panneau (modifs non enregistrées incluses).
    let seed = liveHtml;
    if (
      !seed &&
      isSuper &&
      draft.id &&
      draft.config.layers.some((l) => l.type === "html")
    ) {
      try {
        const r = await heroHtmlApi.getForEdit(draft.id);
        if (r) seed = { html: r.html, css: r.css };
      } catch {
        /* copie sans HTML */
      }
    }
    setSeedHtml(seed);
    setDraftSeq((n) => n + 1);
    setDraft({
      ...draft,
      id: null,
      isActive: false,
      startsAt: null,
      endsAt: null,
      config: { ...draft.config, origin: "studio" },
    });
    setBaseline("");
    setMsg({
      ok: true,
      text: "Copie créée en brouillon : enregistre-la pour la conserver.",
    });
  };

  const saveAsTemplate = async () => {
    if (!draft) return;
    const name = window.prompt("Nom du modèle ?", "")?.trim();
    if (!name) return;
    try {
      await heroTemplatesApi.create(name, draft.config);
      await reloadTemplates();
      setMsg({
        ok: true,
        text: `Modèle « ${name} » enregistré (structure et réglages, sans HTML ni produit).`,
      });
    } catch (e: any) {
      setMsg({
        ok: false,
        text: e?.message || "Enregistrement du modèle impossible.",
      });
    }
  };

  const applySizingToAll = async () => {
    if (!draft) return;
    if (dirty) {
      setMsg({
        ok: false,
        text: "Enregistre d'abord le slide courant, puis applique ses dimensions à tous.",
      });
      return;
    }
    if (!window.confirm(`Appliquer ces dimensions aux ${slides.length} slides ?`))
      return;
    try {
      for (const s of slides) {
        if (s.id === draft.id) continue;
        await heroPromotionsApi.update(s.id, {
          config: sanitizeHeroConfig({
            ...resolveHeroConfig(s),
            origin: "studio",
            sizing: draft.config.sizing,
          }),
        });
      }
      window.dispatchEvent(new Event("storefront:invalidate"));
      await load(draft.id);
      setMsg({ ok: true, text: "Dimensions appliquées à tous les slides." });
    } catch (e: any) {
      setMsg({ ok: false, text: e?.message || "Application impossible." });
    }
  };

  const remove = async () => {
    if (!draft?.id || !window.confirm("Supprimer ce slide définitivement ?"))
      return;
    try {
      await heroPromotionsApi.delete(draft.id);
      window.dispatchEvent(new Event("storefront:invalidate"));
      setDraft(null);
      setBaseline("");
      await load();
      setHistTick((n) => n + 1);
    } catch (e: any) {
      setMsg({ ok: false, text: e?.message || "Suppression impossible." });
    }
  };

  const moveSlide = async (i: number, dir: -1 | 1) => {
    const next = moveItem(slides, i, dir);
    if (next === slides) return;
    setSlides(next);
    try {
      await heroPromotionsApi.reorder(next.map((s) => s.id));
    } catch (e: any) {
      setMsg({ ok: false, text: e?.message || "Réordonnancement impossible." });
      await load(draft?.id);
    }
  };

  // ─── CTA : poignées déplaçables sur l'aperçu ───────────────────────────
  const setCtaPoint = (id: string, x: number, y: number) =>
    patchConfig((c) => ({
      ...c,
      ctas: c.ctas.map((cta) =>
        cta.id !== id
          ? cta
          : {
              ...cta,
              pos:
                device === "mobile"
                  ? { desktop: cta.pos?.desktop ?? { x, y }, mobile: { x, y } }
                  : {
                      desktop: { x, y },
                      ...(cta.pos?.mobile ? { mobile: cta.pos.mobile } : {}),
                    },
            },
      ),
    }));
  const onHandleDown = (e: React.PointerEvent<HTMLButtonElement>, id: string) => {
    setSelCta(id);
    if (config?.ctas.find((x) => x.id === id)?.lock) return; // verrouillé : sélection seule
    e.currentTarget.setPointerCapture(e.pointerId);
    dragId.current = id;
  };
  const onHandleMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    const id = dragId.current;
    const box = overlayRef.current?.getBoundingClientRect();
    if (!id || !box || !box.width || !box.height) return;
    const x = snapHeroPoint(((e.clientX - box.left) / box.width) * 100);
    const y = snapHeroPoint(((e.clientY - box.top) / box.height) * 100);
    setDrag({ x, y });
    setCtaPoint(id, x, y);
  };
  const onHandleUp = () => {
    dragId.current = null;
    setDrag(null);
  };
  const onHandleKey = (
    e: React.KeyboardEvent<HTMLButtonElement>,
    cta: HeroCta,
  ) => {
    if (cta.lock) return;
    const step = e.shiftKey ? 5 : 1;
    const p =
      device === "mobile"
        ? (cta.pos?.mobile ?? cta.pos?.desktop)
        : cta.pos?.desktop;
    if (!p) return;
    const d: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    };
    const v = d[e.key];
    if (!v) return;
    e.preventDefault();
    setCtaPoint(cta.id, snapHeroPoint(p.x + v[0]), snapHeroPoint(p.y + v[1]));
  };

  if (loading) {
    return (
      <div
        style={{ display: "flex", justifyContent: "center", paddingTop: 60 }}
      >
        <div
          className="animate-spin"
          style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            border: "3px solid var(--color-border)",
            borderTopColor: "var(--color-accent)",
          }}
        />
      </div>
    );
  }

  const config = draft?.config;
  const warnings =
    draft && config
      ? heroStudioWarnings(config, {
          isFirst:
            slides.findIndex((s) => s.id === draft.id) === 0 ||
            (draft.id === null && slides.length === 0),
          hasProduct: !!draft.productId,
        })
      : [];
  const bytes = config ? heroConfigBytes(config) : 0;
  const layer = config?.layers[layerSel] ?? null;
  const reserved = heroReservedBottomPx(dev.w);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 14,
        background: studioThemeBg,
        borderRadius: 16,
        padding: 12,
      }}
    >
      <style>{`
        .hs-grid{display:grid;grid-template-columns:250px minmax(0,1fr) 350px;gap:16px;align-items:start}
        .hs-panel{max-height:calc(100dvh - 170px);overflow-y:auto}
        @media(max-width:1180px){.hs-grid{grid-template-columns:1fr}.hs-panel{max-height:none}}
      `}</style>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 10,
        }}
      >
        <div>
          <h2
            style={{ fontSize: 20, fontWeight: 700, color: "var(--color-ink)" }}
          >
            Hero Studio
          </h2>
          <p style={{ fontSize: 13, color: "var(--color-ink3)" }}>
            Compose le hero de la boutique : couches, dimensions, boutons,
            aperçu desktop et mobile.
          </p>
          <HeroSyncBadge />
          <button
            type="button"
            onClick={() => setShowStats(true)}
            style={{ ...btn, marginTop: 8 }}
          >
            <BarChart3 size={14} /> Statistiques
          </button>
          <div
            style={{ display: "flex", gap: 4, marginTop: 8 }}
            title="Thème du studio (outil seul, jamais le hero)"
          >
            {(
              [
                { id: "light", label: "Studio clair", bg: "#FFFFFF" },
                { id: "grey", label: "Studio neutre (calibrage)", bg: "#F4F4F5" },
                { id: "dark", label: "Studio sombre", bg: "#0A0A0B" },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                type="button"
                title={t.label}
                aria-pressed={studioTheme === t.id}
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
                {t.id === "light" ? (
                  <Sun size={13} />
                ) : t.id === "dark" ? (
                  <Moon size={13} />
                ) : null}
              </button>
            ))}
          </div>
        </div>
        {draft && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            <button type="button" onClick={undo} disabled={undoStack.current.length === 0} style={btn} title="Annuler (Ctrl+Z)" aria-label="Annuler">
              <Undo2 size={14} />
            </button>
            <button type="button" onClick={redo} disabled={redoStack.current.length === 0} style={btn} title="Rétablir (Ctrl+Y)" aria-label="Rétablir">
              <Redo2 size={14} />
            </button>
            {restoreBackup && (
              <button
                type="button"
                style={btn}
                onClick={() => {
                  const bk = restoreBackup;
                  draftRef.current = bk;
                  setDraft(bk);
                  setRestoreBackup(null);
                  setMsg({ ok: true, text: "Restauration annulée." });
                }}
              >
                Annuler la restauration
              </button>
            )}
            <button type="button" onClick={duplicate} style={btn} title="Créer une copie en brouillon">
              Dupliquer
            </button>
            <button type="button" onClick={saveAsTemplate} style={btn} title="Réutiliser cette structure pour de futurs slides">
              Enregistrer comme modèle
            </button>
            {dirty && (
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: "var(--color-accent)",
                }}
              >
                ● Non enregistré
              </span>
            )}
            <button
              type="button"
              onClick={() => patchDraft({ isActive: !draft.isActive })}
              style={btn}
              title="Visibilité en boutique"
            >
              {draft.isActive ? <Eye size={14} /> : <EyeOff size={14} />}{" "}
              {draft.isActive ? "Visible en boutique" : "Brouillon"}
            </button>
            <button
              type="button"
              onClick={save}
              disabled={saving}
              style={{ ...btnAccent, opacity: saving ? 0.6 : 1 }}
            >
              <Save size={14} /> {saving ? "Enregistrement…" : "Enregistrer"}
            </button>
          </div>
        )}
      </div>

      {msg && (
        <div
          style={{
            padding: "10px 14px",
            borderRadius: 12,
            fontSize: 13,
            fontWeight: 600,
            background: msg.ok ? "var(--color-success-bg)" : "#fee2e2",
            color: msg.ok ? "var(--color-success)" : "#991b1b",
            border: `1px solid ${msg.ok ? "var(--color-border)" : "#fecaca"}`,
          }}
        >
          {msg.text}
        </div>
      )}

      {
        showStats && (
          <HeroStatsPanel slides={slides} onClose={() => setShowStats(false)} />
        )
      }
      <div className="hs-grid">
        {/* ── Gauche : slides ─────────────────────────────────────────── */}
        <div
          className="hs-panel"
          style={{
            ...panel,
            padding: 12,
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          <button
            type="button"
            style={btnAccent}
            onClick={() => setShowTemplates((v) => !v)}
          >
            <Plus size={14} /> Nouveau slide
          </button>
          {showTemplates && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {[...HERO_TEMPLATES, ...HERO_TILES_TEMPLATES].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => startNew(t.build)}
                  style={{
                    ...btn,
                    flexDirection: "column",
                    alignItems: "flex-start",
                    gap: 2,
                  }}
                >
                  <strong style={{ color: "var(--color-ink)" }}>
                    {t.label}
                  </strong>
                  <span style={{ fontWeight: 400, fontSize: 11 }}>
                    {t.desc}
                  </span>
                </button>
              ))}
              {userTpls.length > 0 && (
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: "var(--color-ink4)",
                    marginTop: 4,
                  }}
                >
                  MES MODÈLES
                </div>
              )}
              {userTpls.map((t) => (
                <div key={t.id} style={{ display: "flex", gap: 4 }}>
                  <button
                    type="button"
                    onClick={() =>
                      startNew(() =>
                        sanitizeHeroConfig({ ...t.config, origin: "studio" }),
                      )
                    }
                    style={{ ...btn, flex: 1, justifyContent: "flex-start" }}
                  >
                    <strong style={{ color: "var(--color-ink)" }}>{t.name}</strong>
                  </button>
                  <button
                    type="button"
                    aria-label={`Supprimer le modèle ${t.name}`}
                    style={{ ...btn, padding: 6, color: "#ef4444" }}
                    onClick={async () => {
                      if (!window.confirm(`Supprimer le modèle « ${t.name} » ?`))
                        return;
                      try {
                        await heroTemplatesApi.remove(t.id);
                        await reloadTemplates();
                      } catch (e: any) {
                        setMsg({
                          ok: false,
                          text: e?.message || "Suppression impossible.",
                        });
                      }
                    }}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}
          {draft && draft.id === null && (
            <div
              style={{
                padding: 10,
                borderRadius: 10,
                border: "1.5px dashed var(--color-accent)",
                fontSize: 12,
                color: "var(--color-ink2)",
              }}
            >
              Nouveau slide (non enregistré)
            </div>
          )}
          {slides.map((s, i) => {
            const sel = draft?.id === s.id;
            const first =
              (s.headline || "").split("\n")[0] || "Slide sans titre";
            return (
              <div
                key={s.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: 8,
                  borderRadius: 12,
                  border: sel
                    ? "2px solid var(--color-accent)"
                    : "1px solid var(--color-border)",
                  background: sel
                    ? "var(--color-accent-bg)"
                    : "var(--color-surface2)",
                  opacity: s.isActive === false ? 0.6 : 1,
                }}
              >
                <button
                  type="button"
                  onClick={() => openSlide(s)}
                  style={{
                    flex: 1,
                    minWidth: 0,
                    textAlign: "left",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: 0,
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      color: "var(--color-ink4)",
                      fontWeight: 700,
                    }}
                  >
                    #{i + 1} ·{" "}
                    {s.isActive === false
                      ? "Brouillon"
                      : s.startsAt || s.endsAt
                        ? "Planifié"
                        : "En ligne"}
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: "var(--color-ink)",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {first}
                  </div>
                </button>
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 2 }}
                >
                  <button
                    type="button"
                    aria-label="Monter"
                    disabled={i === 0}
                    onClick={() => moveSlide(i, -1)}
                    style={{ ...btn, padding: 3 }}
                  >
                    <ArrowUp size={12} />
                  </button>
                  <button
                    type="button"
                    aria-label="Descendre"
                    disabled={i === slides.length - 1}
                    onClick={() => moveSlide(i, 1)}
                    style={{ ...btn, padding: 3 }}
                  >
                    <ArrowDown size={12} />
                  </button>
                </div>
              </div>
            );
          })}
          {slides.length === 0 && !draft && (
            <p style={{ fontSize: 12, color: "var(--color-ink4)" }}>
              Aucun slide. Crée le premier avec un modèle.
            </p>
          )}
          <HeroTrashPanel
            refreshKey={histTick}
            onRecovered={async (id) => {
              await load(id);
              setHistTick((n) => n + 1);
              setMsg({
                ok: true,
                text: "Slide récupéré en brouillon (le HTML, s'il y en avait, se restaure via l'historique HTML).",
              });
            }}
          />
        </div>

        {/* ── Centre : aperçu ─────────────────────────────────────────── */}
        <div
          style={{
            ...panel,
            padding: 12,
            display: "flex",
            flexDirection: "column",
            gap: 10,
            minWidth: 0,
          }}
        >
          <div
            style={{
              display: "flex",
              gap: 8,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            {(Object.keys(DEVICES) as DeviceKey[]).map((k) => {
              const { Icon, label } = DEVICES[k];
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => setDevice(k)}
                  style={{
                    ...btn,
                    background:
                      device === k
                        ? "var(--color-accent)"
                        : "var(--color-surface2)",
                    color: device === k ? "#fff" : "var(--color-ink2)",
                  }}
                >
                  <Icon size={14} /> {label}
                </button>
              );
            })}
            <span style={{ flex: 1 }} />
            <button
              type="button"
              style={btn}
              onClick={() =>
                setTheme((t) => (t === "light" ? "dark" : "light"))
              }
              title="Thème de l'aperçu"
            >
              {theme === "light" ? <Sun size={14} /> : <Moon size={14} />}{" "}
              {theme === "light" ? "Clair" : "Sombre"}
            </button>
            <label style={{ ...btn, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={guides}
                onChange={(e) => setGuides(e.target.checked)}
              />{" "}
              Zones réservées
            </label>
          </div>

          <div
            ref={canvasRef}
            style={{
              width: "100%",
              overflow: "hidden",
              background:
                "repeating-conic-gradient(var(--color-surface2) 0% 25%, var(--color-surface) 0% 50%) 0 0 / 20px 20px",
              borderRadius: 12,
              padding: 2,
            }}
          >
            {draft ? (
              <div
                style={{
                  position: "relative",
                  width: dev.w * scale,
                  height: dev.h * scale,
                  margin: "0 auto",
                }}
              >
                <iframe
                  ref={frameRef}
                  src={HERO_PREVIEW_PATH}
                  title="Aperçu du hero"
                  style={{
                    width: dev.w,
                    height: dev.h,
                    transform: `scale(${scale})`,
                    transformOrigin: "0 0",
                    border: 0,
                    background: "var(--color-bg)",
                    pointerEvents: "none",
                  }}
                />
                {rect && (
                  <div
                    ref={overlayRef}
                    style={{
                      position: "absolute",
                      left: rect.x * scale,
                      top: rect.y * scale,
                      width: rect.w * scale,
                      height: rect.h * scale,
                    }}
                  >
                    {guides && (
                      <div
                        style={{
                          position: "absolute",
                          left: 0,
                          right: 0,
                          bottom: 0,
                          height: reserved * scale,
                          background:
                            "repeating-linear-gradient(45deg, rgba(255,92,53,.18) 0 6px, transparent 6px 12px)",
                          borderTop: "1px dashed var(--color-accent)",
                          pointerEvents: "none",
                          fontSize: 10,
                          color: "var(--color-accent)",
                          fontWeight: 700,
                          padding: 2,
                        }}
                      >
                        Contrôles du carrousel
                      </div>
                    )}
                    {drag && drag.x === 50 && (
                      <div
                        style={{
                          position: "absolute",
                          left: "50%",
                          top: 0,
                          bottom: 0,
                          width: 1,
                          background: "var(--color-accent)",
                          pointerEvents: "none",
                        }}
                      />
                    )}
                    {config?.ctas.map((cta) => {
                      if (!cta.pos) return null;
                      const p =
                        device === "mobile"
                          ? (cta.pos.mobile ?? cta.pos.desktop)
                          : cta.pos.desktop;
                      return (
                        <button
                          key={cta.id}
                          type="button"
                          aria-label={`Déplacer le bouton ${cta.label}`}
                          onPointerDown={(e) => onHandleDown(e, cta.id)}
                          onPointerMove={onHandleMove}
                          onPointerUp={onHandleUp}
                          onKeyDown={(e) => onHandleKey(e, cta)}
                          style={{
                            position: "absolute",
                            left: `${p.x}%`,
                            top: `${p.y}%`,
                            transform: "translate(-50%, -50%)",
                            width: 22,
                            height: 22,
                            borderRadius: "50%",
                            border: "2px solid #fff",
                            background:
                              selCta === cta.id
                                ? "var(--color-accent)"
                                : "rgba(255,92,53,.75)",
                            boxShadow: "0 0 0 2px var(--color-accent)",
                            cursor: "grab",
                            touchAction: "none",
                            zIndex: 5,
                          }}
                        />
                      );
                    })}
                    {drag && (
                      <div
                        style={{
                          position: "absolute",
                          left: 6,
                          top: 6,
                          background: "rgba(0,0,0,.75)",
                          color: "#fff",
                          fontSize: 11,
                          padding: "2px 8px",
                          borderRadius: 6,
                          pointerEvents: "none",
                        }}
                      >
                        x {drag.x}% · y {drag.y}%
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div
                style={{
                  padding: 60,
                  textAlign: "center",
                  color: "var(--color-ink3)",
                  fontSize: 13,
                }}
              >
                Choisis un slide ou crée-en un avec un modèle.
              </div>
            )}
          </div>

          {warnings.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {warnings.map((w, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    gap: 6,
                    alignItems: "flex-start",
                    fontSize: 12,
                    color: w.level === "warn" ? "#92400e" : "var(--color-ink3)",
                  }}
                >
                  {w.level === "warn" ? (
                    <AlertTriangle
                      size={13}
                      style={{ flexShrink: 0, marginTop: 1 }}
                    />
                  ) : (
                    <Info size={13} style={{ flexShrink: 0, marginTop: 1 }} />
                  )}
                  {w.text}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Droite : inspecteur ─────────────────────────────────────── */}
        <div className="hs-panel" style={{ ...panel, padding: 0 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              padding: "8px 12px 0",
            }}
          >
            <button
              type="button"
              title={
                secMode === "none"
                  ? "Tout déplier"
                  : "Tout replier"
              }
              onClick={() =>
                setSecMode((m) => (m === "none" ? "all" : "none"))
              }
              style={btn}
            >
              <ChevronsUpDown size={13} />{" "}
              {secMode === "none" ? "Tout déplier" : "Tout replier"}
            </button>
          </div>
          {!draft || !config ? (
            <p
              style={{ padding: 16, fontSize: 13, color: "var(--color-ink3)" }}
            >
              Sélectionne un slide pour l'éditer.
            </p>
          ) : (
            <>
              {config.origin === "legacy" && (
                <div
                  style={{
                    padding: "10px 16px",
                    fontSize: 12,
                    background: "var(--color-accent-bg)",
                    color: "var(--color-ink2)",
                    borderBottom: "1px solid var(--color-border)",
                  }}
                >
                  Slide hérité : il sera converti au nouveau format à
                  l'enregistrement.
                </div>
              )}

              <Section
                title="Slide"
                key={`sec-${secMode ?? "init"}-slide`}
                open={secMode === null ? true : secMode === "all"}
              >
                <Field label="Produit principal">
                  <select
                    style={inputStyle}
                    value={draft.productId}
                    onChange={(e) => patchDraft({ productId: e.target.value })}
                  >
                    <option value="">— Aucun (slide libre) —</option>
                    {products
                      .filter((p) => p.isActive)
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.title}
                        </option>
                      ))}
                  </select>
                </Field>
                <Field label="Début (optionnel)">
                  <input
                    type="datetime-local"
                    style={inputStyle}
                    value={isoToLocalInput(draft.startsAt)}
                    onChange={(e) =>
                      patchDraft({ startsAt: localInputToIso(e.target.value) })
                    }
                  />
                </Field>
                <Field label="Fin (optionnel)">
                  <input
                    type="datetime-local"
                    style={inputStyle}
                    value={isoToLocalInput(draft.endsAt)}
                    onChange={(e) =>
                      patchDraft({ endsAt: localInputToIso(e.target.value) })
                    }
                  />
                </Field>
                <Field label="Audience (test A/B)">
                  <select
                    style={inputStyle}
                    value={config.ab ?? ""}
                    onChange={(e) =>
                      patchConfig((c) => {
                        const { ab: _old, ...rest } = c;
                        return (
                          e.target.value ? { ...rest, ab: e.target.value as "A" | "B" } : rest
                        ) as HeroConfig;
                      })
                    }
                  >
                    <option value="">Tous les visiteurs</option>
                    <option value="A">Variante A seulement (≈ 50 %)</option>
                    <option value="B">Variante B seulement (≈ 50 %)</option>
                  </select>
                </Field>
                <Field
                  label="Police globale (blocs non verrouillés)"
                >
                  <select
                    style={inputStyle}
                    value={config.fontFamily ?? ""}
                    onChange={(e) =>
                      patchConfig((c) => {
                        if (!e.target.value) {
                          const { fontFamily: _d, ...rest } = c;
                          return rest as HeroConfig;
                        }
                        return { ...c, fontFamily: e.target.value };
                      })
                    }
                  >
                    <option value="">Défaut navigateur</option>
                    {HERO_FONT_FAMILIES.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field
                  label="Import custom (URL Google Fonts css2)"
                >
                  <input
                    style={{
                      ...inputStyle,
                      ...(fontUrlError ? { borderColor: "#ef4444" } : null),
                    }}
                    type="url"
                    value={fontUrlDraft}
                    placeholder="https://fonts.googleapis.com/css2?family=…&display=swap"
                    onChange={(e) => {
                      setFontUrlDraft(e.target.value);
                      if (e.target.value.trim() === "")
                        setFontUrlError(null);
                    }}
                    onBlur={() => {
                      const v = fontUrlDraft.trim();
                      if (v === "") {
                        patchConfig((c) => {
                          const { fontUrl: _d, ...rest } = c;
                          return rest as HeroConfig;
                        });
                        setFontUrlError(null);
                        return;
                      }
                      const clean = cleanHeroFontUrl(v);
                      if (!clean) {
                        setFontUrlError(
                          "URL refusée : collez une URL https://fonts.googleapis.com/css2?family=…",
                        );
                        return;
                      }
                      setFontUrlError(null);
                      patchConfig((c) => ({ ...c, fontUrl: clean }));
                    }}
                  />
                  <span style={{ fontSize: 11, color: fontUrlError ? "#ef4444" : "var(--color-ink4)" }}>
                    {fontUrlError ??
                      (config.fontUrl
                        ? `Familles : ${parseHeroFontUrlFamilies(config.fontUrl).join(", ")}`
                        : "Vide = aucune. Domaine fonts.googleapis.com uniquement.")}
                  </span>
                </Field>
              </Section>

              <Section
                title="Dimensions"
                key={`sec-${secMode ?? "init"}-dimensions`}
                open={secMode === null ? true : secMode === "all"}
              >
                <Seg
                  value={config.sizing.mode}
                  options={[
                    ["fixed", "Fixe"],
                    ["auto", "Auto"],
                  ]}
                  onChange={(m) =>
                    patchConfig((c) => ({
                      ...c,
                      sizing:
                        m === "auto"
                          ? {
                              mode: "auto",
                              width: c.sizing.width,
                              ratio: { desktop: 2.4, mobile: 0.9 },
                            }
                          : {
                              mode: "fixed",
                              width: c.sizing.width,
                              height: { unit: "vh", value: 78 },
                            },
                    }))
                  }
                />
                <Field label="Largeur">
                  <Seg
                    value={config.sizing.width}
                    options={[
                      ["full", "Pleine"],
                      ["contained", "Contenue"],
                    ]}
                    onChange={(w) =>
                      patchConfig((c) => ({
                        ...c,
                        sizing: {
                          ...c.sizing,
                          width: w as "full" | "contained",
                        } as HeroSizing,
                      }))
                    }
                  />
                </Field>
                {config.sizing.mode === "fixed" ? (
                  <>
                    <Field label="Hauteur desktop">
                      <div style={{ display: "flex", gap: 6 }}>
                        <Num
                          value={config.sizing.height.value}
                          min={config.sizing.height.unit === "vh" ? 30 : 200}
                          max={config.sizing.height.unit === "vh" ? 100 : 1200}
                          onChange={(n) =>
                            patchConfig((c) =>
                              c.sizing.mode === "fixed"
                                ? {
                                    ...c,
                                    sizing: {
                                      ...c.sizing,
                                      height: { ...c.sizing.height, value: n },
                                    },
                                  }
                                : c,
                            )
                          }
                        />
                        <select
                          style={{ ...inputStyle, width: 80 }}
                          value={config.sizing.height.unit}
                          onChange={(e) =>
                            patchConfig((c) =>
                              c.sizing.mode === "fixed"
                                ? {
                                    ...c,
                                    sizing: {
                                      ...c.sizing,
                                      height: {
                                        unit: e.target.value as "vh" | "px",
                                        value:
                                          e.target.value === "vh" ? 78 : 520,
                                      },
                                    },
                                  }
                                : c,
                            )
                          }
                        >
                          <option value="vh">vh</option>
                          <option value="px">px</option>
                        </select>
                      </div>
                    </Field>
                    <label
                      style={{
                        ...labelStyle,
                        display: "flex",
                        gap: 6,
                        alignItems: "center",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={!!config.sizing.heightMobile}
                        onChange={(e) =>
                          patchConfig((c) => {
                            if (c.sizing.mode !== "fixed") return c;
                            const { heightMobile, ...rest } = c.sizing;
                            return {
                              ...c,
                              sizing: e.target.checked
                                ? {
                                    ...rest,
                                    heightMobile: { ...c.sizing.height },
                                  }
                                : rest,
                            };
                          })
                        }
                      />{" "}
                      Hauteur mobile différente
                    </label>
                    {config.sizing.heightMobile && (
                      <Field label="Hauteur mobile">
                        <Num
                          value={config.sizing.heightMobile.value}
                          onChange={(n) =>
                            patchConfig((c) =>
                              c.sizing.mode === "fixed" && c.sizing.heightMobile
                                ? {
                                    ...c,
                                    sizing: {
                                      ...c.sizing,
                                      heightMobile: {
                                        ...c.sizing.heightMobile,
                                        value: n,
                                      },
                                    },
                                  }
                                : c,
                            )
                          }
                        />
                      </Field>
                    )}
                  </>
                ) : (
                  <>
                    <Field label="Ratio desktop (largeur / hauteur)">
                      <Num
                        value={config.sizing.ratio.desktop}
                        min={0.3}
                        max={6}
                        step={0.05}
                        onChange={(n) =>
                          patchConfig((c) =>
                            c.sizing.mode === "auto"
                              ? {
                                  ...c,
                                  sizing: {
                                    ...c.sizing,
                                    ratio: { ...c.sizing.ratio, desktop: n },
                                  },
                                }
                              : c,
                          )
                        }
                      />
                    </Field>
                    <Field label="Ratio mobile">
                      <Num
                        value={config.sizing.ratio.mobile}
                        min={0.3}
                        max={6}
                        step={0.05}
                        onChange={(n) =>
                          patchConfig((c) =>
                            c.sizing.mode === "auto"
                              ? {
                                  ...c,
                                  sizing: {
                                    ...c.sizing,
                                    ratio: { ...c.sizing.ratio, mobile: n },
                                  },
                                }
                              : c,
                          )
                        }
                      />
                    </Field>
                    <button
                      type="button"
                      style={btn}
                      onClick={async () => {
                        const img = config.layers.find(
                          (l) => l.type === "image",
                        ) as Extract<HeroLayer, { type: "image" }> | undefined;
                        const src = img?.src || product?.image || "";
                        const sm = img?.srcMobile || "";
                        if (!src)
                          return setMsg({
                            ok: false,
                            text: "Aucune image à mesurer.",
                          });
                        const [rd, rm] = await Promise.all([
                          measureRatio(src),
                          sm ? measureRatio(sm) : Promise.resolve(null),
                        ]);
                        if (rd == null)
                          return setMsg({
                            ok: false,
                            text: "Mesure impossible (image inaccessible).",
                          });
                        patchConfig((c) =>
                          c.sizing.mode === "auto"
                            ? {
                                ...c,
                                sizing: {
                                  ...c.sizing,
                                  ratio: {
                                    desktop: rd,
                                    mobile: rm ?? c.sizing.ratio.mobile,
                                  },
                                },
                              }
                            : c,
                        );
                      }}
                    >
                      <Ruler size={13} /> Mesurer depuis l'image
                    </button>
                  </>
                )}
              </Section>

              <Section
                title="Tous les slides"
                open={secMode === null ? false : secMode === "all"}
                key={`sec-${secMode ?? "init"}-all`}
              >
                <p style={{ fontSize: 12, color: "var(--color-ink3)", margin: 0 }}>
                  Le cadre du carrousel suit le slide n°1. Pour des dimensions homogènes :
                </p>
                <button type="button" style={btn} onClick={applySizingToAll}>
                  <Ruler size={13} /> Appliquer ces dimensions à tous les slides
                </button>
              </Section>
              <Section
                title="Fond"
                key={`sec-${secMode ?? "init"}-fond`}
                open={secMode === null ? true : secMode === "all"}
              >
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {HERO_BG_PRESETS.map((p) => (
                    <button
                      key={p.label}
                      type="button"
                      title={p.label}
                      onClick={() =>
                        patchConfig((c) => ({
                          ...c,
                          background: { gradient: p.value },
                        }))
                      }
                      style={{
                        width: 40,
                        height: 28,
                        borderRadius: 8,
                        background: p.value,
                        border:
                          config.background.gradient === p.value
                            ? "2px solid var(--color-accent)"
                            : "1px solid var(--color-border)",
                        cursor: "pointer",
                        padding: 0,
                      }}
                    />
                  ))}
                </div>
                <input
                  style={inputStyle}
                  value={config.background.gradient}
                  onChange={(e) =>
                    patchConfig((c) => ({
                      ...c,
                      background: { gradient: e.target.value },
                    }))
                  }
                  placeholder="Dégradé CSS (avancé)"
                />
              </Section>

              <Section
                title={`Couches (${config.layers.length}/${HERO_MAX_LAYERS})`}
              >
                {config.layers.map((l, i) => {
                  const patchLayer = (p: {
                    off?: boolean;
                    lock?: boolean;
                    hide?: "desktop" | "mobile";
                  }) =>
                    patchConfig((c) => ({
                      ...c,
                      layers: c.layers.map((x, li) =>
                        li === i ? ({ ...x, ...p } as HeroLayer) : x,
                      ),
                    }));
                  return (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        padding: "6px 8px",
                        borderRadius: 10,
                        border:
                          layerSel === i
                            ? "2px solid var(--color-accent)"
                            : "1px solid var(--color-border)",
                        background: "var(--color-surface2)",
                        opacity: l.off ? 0.5 : 1,
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => setLayerSel(i)}
                        style={{
                          flex: 1,
                          textAlign: "left",
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          fontSize: 12,
                          fontWeight: 700,
                          color: "var(--color-ink)",
                        }}
                      >
                        {i + 1}. {LAYER_LABEL[l.type] ?? l.type}
                        {l.hide
                          ? l.hide === "mobile"
                            ? " · masquée mobile"
                            : " · masquée desktop"
                          : ""}
                      </button>
                      <HeroFlagButtons
                        off={l.off}
                        lock={l.lock}
                        hide={l.hide}
                        onChange={patchLayer}
                      />
                      <button
                        type="button"
                        aria-label="Monter"
                        disabled={!!l.lock}
                        style={{ ...btn, padding: 3 }}
                        onClick={() => {
                          patchConfig((c) => ({ ...c, layers: moveItem(c.layers, i, -1) }));
                          setLayerSel(Math.max(0, i - 1));
                        }}
                      >
                        <ArrowUp size={12} />
                      </button>
                      <button
                        type="button"
                        aria-label="Descendre"
                        disabled={!!l.lock}
                        style={{ ...btn, padding: 3 }}
                        onClick={() => {
                          patchConfig((c) => ({ ...c, layers: moveItem(c.layers, i, 1) }));
                          setLayerSel(Math.min(config.layers.length - 1, i + 1));
                        }}
                      >
                        <ArrowDown size={12} />
                      </button>
                      <button
                        type="button"
                        aria-label="Supprimer"
                        disabled={!!l.lock || (l.type === "html" && !isSuper)}
                        style={{ ...btn, padding: 3, color: "#ef4444" }}
                        onClick={() => {
                          patchConfig((c) => ({
                            ...c,
                            layers: c.layers.filter((_, li) => li !== i),
                          }));
                          setLayerSel(0);
                        }}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  );
                })}
                {config.layers.length < HERO_MAX_LAYERS && (
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {(["image", "card", "tiles", "text", "marquee", "countdown"] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        style={btn}
                        onClick={() => {
                          patchConfig((c) => ({
                            ...c,
                            layers: [...c.layers, newLayer(t)],
                          }));
                          setLayerSel(config.layers.length);
                        }}
                      >
                        <Plus size={12} /> {LAYER_LABEL[t]}
                      </button>
                    ))}
                  </div>
                )}
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
                    )}
                <p
                  style={{
                    fontSize: 11,
                    color: "var(--color-ink4)",
                    margin: 0,
                  }}
                >
                  Ordre : la 1re couche est tout au fond. Le texte et les
                  boutons passent toujours au-dessus.
                </p>
                {layer && (
                  <div
                    style={{
                      paddingTop: 8,
                      borderTop: "1px solid var(--color-border)",
                      display: "flex",
                      flexDirection: "column",
                      gap: 10,
                    }}
                  >
                    <strong
                      style={{ fontSize: 12, color: "var(--color-ink2)" }}
                    >
                      {LAYER_LABEL[layer.type]}
                    </strong>
                    <fieldset
                      disabled={!!layer.lock}
                      style={{
                        border: 0,
                        padding: 0,
                        margin: 0,
                        minWidth: 0,
                        display: "flex",
                        flexDirection: "column",
                        gap: 10,
                      }}
                    >
                      <LayerEditor
                        layer={layer}
                        onChange={(nl) =>
                          patchConfig((c) => ({
                            ...c,
                            layers: c.layers.map((x, i) =>
                              i === layerSel ? nl : x,
                            ),
                          }))
                        }
                      />
                    </fieldset>
                  </div>
                )}
              </Section>

              <Section
                title={`Boutons (${config.ctas.length}/${HERO_MAX_CTAS})`}
              >
                {config.ctas.map((cta) => {
                  const setCta = (p: Partial<HeroCta>) =>
                    patchConfig((c) => ({
                      ...c,
                      ctas: c.ctas.map((x) =>
                        x.id === cta.id ? { ...x, ...p } : x,
                      ),
                    }));
                  return (
                    <div
                      key={cta.id}
                      onClick={() => setSelCta(cta.id)}
                      style={{
                        padding: 10,
                        borderRadius: 12,
                        border:
                          selCta === cta.id
                            ? "2px solid var(--color-accent)"
                            : "1px solid var(--color-border)",
                        display: "flex",
                        flexDirection: "column",
                        gap: 8,
                      }}
                    >
                      <HeroFlagButtons
                        off={cta.off}
                        lock={cta.lock}
                        hide={cta.hide}
                        onChange={(p) => setCta(p as Partial<HeroCta>)}
                      />
                      <input
                        style={inputStyle}
                        value={cta.label}
                        onChange={(e) => setCta({ label: e.target.value })}
                        placeholder="Texte du bouton"
                      />
                      <input
                        style={inputStyle}
                        value={cta.link ?? ""}
                        onChange={(e) =>
                          setCta({ link: e.target.value || null })
                        }
                        onBlur={(e) =>
                          setCta({
                            link: normalizeHeroLink(e.target.value) || null,
                          })
                        }
                        placeholder="/promotions (vide = fiche produit)"
                      />
                        <Seg
                          value={cta.style}
                          options={[
                            ["accent", "Accent"],
                            ["light", "Clair"],
                            ["dark", "Sombre"],
                            ["ghost", "Contour"],
                            ["hotspot", "Pastille"],
                          ]}
                        onChange={(v) =>
                          setCta({ style: v as HeroCta["style"] })
                        }
                      />
                      <Seg
                        value={cta.pos ? "free" : "inline"}
                        options={[
                          ["inline", "Sous le texte"],
                          ["free", "Position libre"],
                        ]}
                        onChange={(v) =>
                          setCta({
                            pos:
                              v === "free"
                                ? { desktop: { x: 50, y: 70 } }
                                : null,
                          })
                        }
                      />
                      {cta.pos && (
                        <>
                          <p
                            style={{
                              fontSize: 11,
                              color: "var(--color-ink4)",
                              margin: 0,
                            }}
                          >
                            Glisse la pastille orange sur l'aperçu (flèches
                            clavier : 1 %, Maj : 5 %). En mode Mobile, tu règles
                            la position mobile.
                          </p>
                          <label
                            style={{
                              ...labelStyle,
                              display: "flex",
                              gap: 6,
                              alignItems: "center",
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={!!cta.pos.mobile}
                              onChange={(e) =>
                                setCta({
                                  pos: e.target.checked
                                    ? {
                                        desktop: cta.pos!.desktop,
                                        mobile: { ...cta.pos!.desktop },
                                      }
                                    : { desktop: cta.pos!.desktop },
                                })
                              }
                            />{" "}
                            Position mobile différente
                          </label>
                        </>
                      )}
                      <button
                        type="button"
                        disabled={!!cta.lock}
                        style={{
                          ...btn,
                          color: "#ef4444",
                          alignSelf: "flex-start",
                        }}
                        onClick={() =>
                          patchConfig((c) => ({
                            ...c,
                            ctas: c.ctas.filter((x) => x.id !== cta.id),
                          }))
                        }
                      >
                        <Trash2 size={13} /> Retirer
                      </button>
                    </div>
                  );
                })}
                {config.ctas.length < HERO_MAX_CTAS && (
                  <button
                    type="button"
                    style={btn}
                    onClick={() =>
                      patchConfig((c) => ({
                        ...c,
                        ctas: [...c.ctas, newCta()],
                      }))
                    }
                  >
                    <Plus size={13} /> Ajouter un bouton
                  </button>
                )}
              </Section>

              <Section
                title="HTML collé"
                key={`sec-${secMode ?? "init"}-html`}
                open={secMode === null ? true : secMode === "all"}
              >
                <HeroHtmlPanel
                  key={`${draft.id ?? "new"}-${draftSeq}`}
                  seed={draft.id ? null : seedHtml}
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

              <Section
                title="Historique"
                open={secMode === null ? false : secMode === "all"}
                key={`sec-${secMode ?? "init"}-historique`}
              >
                <HeroHistoryPanel
                  slideId={draft.id}
                  current={config}
                  currentProductId={draft.productId}
                  refreshKey={histTick}
                  onLoad={loadVersion}
                />
              </Section>

              <Section
                title="Contrôle qualité"
                open={secMode === null ? false : secMode === "all"}
                key={`sec-${secMode ?? "init"}-qualite`}
              >
                <HeroWeightCheck
                  config={config}
                  productImage={product?.image ?? null}
                  isFirst={
                    slides.findIndex((s) => s.id === draft.id) === 0 ||
                    (draft.id === null && slides.length === 0)
                  }
                />
                <div style={{ fontSize: 12, color: "var(--color-ink2)" }}>
                  Configuration : <strong>{bytes}</strong> /{" "}
                  {HERO_CONFIG_CAP_BYTES} octets
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
                        width: `${Math.min(100, (bytes / HERO_CONFIG_CAP_BYTES) * 100)}%`,
                        height: "100%",
                        background:
                          bytes > HERO_CONFIG_CAP_BYTES
                            ? "#ef4444"
                            : bytes > HERO_CONFIG_CAP_BYTES * 0.75
                              ? "#d97706"
                              : "var(--color-success)",
                      }}
                    />
                  </div>
                </div>
              </Section>

              {draft.id && (
                <div style={{ padding: 16 }}>
                  <button
                    type="button"
                    style={{ ...btn, color: "#ef4444" }}
                    onClick={remove}
                  >
                    <Trash2 size={13} /> Supprimer ce slide
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
