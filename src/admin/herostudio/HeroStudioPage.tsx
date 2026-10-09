// src/admin/herostudio/HeroStudioPage.tsx — page séparée /admin/herostudio.
// Réplique visuelle du mockup Hero-Studio-Versatile-Engine-02 (= 03).
// AUTONOME : mocks en tête de fichier, état local seul, zéro appel réseau,
// zéro dépendance à HeroStudioEditor / hero_promotions. Le câblage réel est hors scope.
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Eye,
  EyeOff,
  Lock,
  LockOpen,
  Monitor,
  Smartphone,
  Tablet,
  Undo2,
  Redo2,
  Download,
  X,
  Plus,
  Type,
  Image as ImageIcon,
  MousePointerClick,
  BadgePercent,
  Timer,
  Megaphone,
  Layers,
  ChevronRight,
  Check,
} from "lucide-react";
import "./herostudio.css";

// ─── MOCK DATA (transitoire, dans le fichier) ──────────────────────────────

type Device = "desktop" | "tablet" | "mobile";
type StudioTheme = "dark" | "grey" | "light";
type Selection =
  | { kind: "slide" }
  | { kind: "layer"; index: number }
  | { kind: "cta"; index: number };

interface MockLayer {
  id: string;
  label: string;
  kind: "text" | "media" | "badge" | "cta" | "marquee" | "countdown" | "price";
  icon: "text" | "media" | "cta" | "badge" | "timer" | "marquee" | "price";
  visible: boolean;
  locked: boolean;
  hideMobile: boolean;
  hideDesktop: boolean;
  topPinned?: boolean;
  // Typo fine (lot 9 du chantier)
  fontFamily: string;
  fontLocked: boolean;
  lineHeight: number;
  letterSpacing: number;
  align: "left" | "center" | "right" | "justify";
  transform: "none" | "uppercase" | "lowercase" | "capitalize";
  maxWidth: string;
  balance: boolean;
}

interface MockCta {
  id: string;
  label: string;
  style: "primary" | "ghost" | "hotspot";
  magnetic: boolean;
  topPinned: boolean;
}

const MOCK_FONTS = [
  "Inter",
  "Sora",
  "Instrument Serif",
  "General Sans",
  "Space Grotesk",
  "JetBrains Mono",
] as const;

const MOCK_TEMPLATES = [
  "Promo produit",
  "Annonce image",
  "Grille 3 tuiles",
  "Autonome texte",
] as const;

const MOCK_LAYERS: MockLayer[] = [
  { id: "l-badge", label: "Badge / Kicker", kind: "badge", icon: "badge", visible: true, locked: false, hideMobile: false, hideDesktop: false, fontFamily: "Space Grotesk", fontLocked: false, lineHeight: 1.2, letterSpacing: 0.08, align: "left", transform: "uppercase", maxWidth: "100%", balance: false },
  { id: "l-title", label: "Titre héro", kind: "text", icon: "text", visible: true, locked: false, hideMobile: false, hideDesktop: false, fontFamily: "Sora", fontLocked: false, lineHeight: 0.95, letterSpacing: -0.02, align: "left", transform: "none", maxWidth: "16ch", balance: true },
  { id: "l-desc", label: "Description", kind: "text", icon: "text", visible: true, locked: false, hideMobile: false, hideDesktop: false, fontFamily: "Inter", fontLocked: false, lineHeight: 1.5, letterSpacing: 0, align: "left", transform: "none", maxWidth: "42ch", balance: false },
  { id: "l-media", label: "Primary Media", kind: "media", icon: "media", visible: true, locked: false, hideMobile: false, hideDesktop: false, fontFamily: "Inter", fontLocked: false, lineHeight: 1.4, letterSpacing: 0, align: "left", transform: "none", maxWidth: "100%", balance: false },
  { id: "l-cta", label: "CTA Group", kind: "cta", icon: "cta", visible: true, locked: false, hideMobile: false, hideDesktop: false, topPinned: true, fontFamily: "Inter", fontLocked: true, lineHeight: 1.4, letterSpacing: 0, align: "left", transform: "none", maxWidth: "100%", balance: false },
  { id: "l-price", label: "Price / Stock", kind: "price", icon: "price", visible: true, locked: false, hideMobile: true, hideDesktop: false, fontFamily: "Space Grotesk", fontLocked: false, lineHeight: 1.3, letterSpacing: 0, align: "left", transform: "none", maxWidth: "100%", balance: false },
  { id: "l-marquee", label: "Marquee Bar", kind: "marquee", icon: "marquee", visible: true, locked: false, hideMobile: false, hideDesktop: true, fontFamily: "Space Grotesk", fontLocked: false, lineHeight: 1.4, letterSpacing: 0.04, align: "center", transform: "uppercase", maxWidth: "100%", balance: false },
  { id: "l-count", label: "Countdown", kind: "countdown", icon: "timer", visible: true, locked: false, hideMobile: false, hideDesktop: false, fontFamily: "JetBrains Mono", fontLocked: false, lineHeight: 1.4, letterSpacing: 0, align: "left", transform: "none", maxWidth: "100%", balance: false },
];

const MOCK_CTAS: MockCta[] = [
  { id: "c1", label: "Shop the drop", style: "primary", magnetic: true, topPinned: true },
  { id: "c2", label: "Lookbook", style: "ghost", magnetic: false, topPinned: false },
];

const MOCK_SLIDE = {
  kicker: "New drop — Archive 015",
  title: "Wear the\nmoment.",
  description: "A new design language for the modern storefront. Precision-cut essentials, shot in studio light.",
  price: "€89",
  stock: "128 in stock",
  marquee: "Free shipping over €75 — New drop Archive 015 — Free shipping over €75 — New drop Archive 015 — ",
};

const MOCK_LIQUID = `<section class="hero-{{ section.id }}">
  <h1>{{ section.settings.title }}</h1>
  {{ section.settings.description }}
</section>
{% schema %}{"name":"Hero Studio","settings":[{"type":"text","id":"title","label":"Title"}]}{% endschema %}`;

const MOCK_CSS = `.hero-studio {
  --gap: 24px;
  --radius: 12px;
  --accent: #FF6B21;
  display: grid;
  gap: var(--gap);
  border-radius: var(--radius);
  container-type: inline-size;
}
.hero-studio img { object-fit: cover; width: 100%; height: 100%; }
@container (max-width: 768px) {
  .hero-studio { grid-template-columns: 1fr; }
}
.hero-title { font-size: clamp(2rem, 5vw, 4.5rem); line-height: 0.9; }`;

// ─── Petits utilitaires locaux ─────────────────────────────────────────────

function cx(...parts: Array<string | false | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

function LayerIcon({ icon, size = 14 }: { icon: MockLayer["icon"]; size?: number }) {
  switch (icon) {
    case "text": return <Type size={size} />;
    case "media": return <ImageIcon size={size} />;
    case "cta": return <MousePointerClick size={size} />;
    case "badge": return <BadgePercent size={size} />;
    case "timer": return <Timer size={size} />;
    case "marquee": return <Megaphone size={size} />;
    case "price": return <BadgePercent size={size} />;
  }
}

function useCountdown(): string {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const target = useMemo(() => Date.now() + (5 * 3600 + 12 * 60 + 30) * 1000, []);
  const s = Math.max(0, Math.floor((target - now) / 1000));
  const h = String(Math.floor(s / 3600)).padStart(2, "0");
  const m = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
  const sec = String(s % 60).padStart(2, "0");
  return `${h}:${m}:${sec}`;
}

// ─── Page ──────────────────────────────────────────────────────────────────

interface HeroStudioPageProps {
  onBackToAdmin: () => void;
  onReturnToStore: () => void;
}

const THEMES: Array<{ id: StudioTheme; label: string; canvas: string; canvasInk: string }> = [
  { id: "dark", label: "Deep Dark", canvas: "#0A0A0B", canvasInk: "#FAFAFA" },
  { id: "grey", label: "Grey", canvas: "#F4F4F5", canvasInk: "#18181B" },
  { id: "light", label: "Light", canvas: "#FFFFFF", canvasInk: "#18181B" },
];

const CANVAS_WIDTH: Record<Device, number> = { desktop: 880, tablet: 620, mobile: 360 };

export default function HeroStudioPage({ onBackToAdmin, onReturnToStore }: HeroStudioPageProps) {
  const [device, setDevice] = useState<Device>("desktop");
  const [theme, setTheme] = useState<StudioTheme>("dark");
  const [attached, setAttached] = useState(true);
  const [selection, setSelection] = useState<Selection>({ kind: "slide" });
  const [inspectorTab, setInspectorTab] = useState<"slide" | "layer" | "button">("slide");
  const [layers, setLayers] = useState<MockLayer[]>(MOCK_LAYERS);
  const [past, setPast] = useState<MockLayer[][]>([]);
  const [future, setFuture] = useState<MockLayer[][]>([]);
  const [globalFont, setGlobalFont] = useState<string>("Inter");
  const [fontOpen, setFontOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [exportTab, setExportTab] = useState<"liquid" | "css">("liquid");
  const [template, setTemplate] = useState<string>(MOCK_TEMPLATES[0]);
  const [toasts, setToasts] = useState<string[]>([]);
  const countdown = useCountdown();

  const themeDef = THEMES.find((t) => t.id === theme) ?? THEMES[0];

  function toast(msg: string) {
    setToasts((prev) => [...prev.slice(-2), msg]);
    setTimeout(() => setToasts((prev) => prev.slice(1)), 2600);
  }

  function commit(next: MockLayer[]) {
    setPast((p) => [...p.slice(-19), layers]);
    setFuture([]);
    setLayers(next);
  }
  function undo() {
    if (past.length === 0) return;
    setFuture((f) => [layers, ...f]);
    const prev = past[past.length - 1];
    setPast((p) => p.slice(0, -1));
    setLayers(prev);
  }
  function redo() {
    if (future.length === 0) return;
    setPast((p) => [...p.slice(-19), layers]);
    const [next, ...rest] = future;
    setFuture(rest);
    setLayers(next);
  }
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
        e.preventDefault();
        redo();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [past, future, layers]);

  function patchLayer(index: number, patch: Partial<MockLayer>) {
    commit(layers.map((l, i) => (i === index ? { ...l, ...patch } : l)));
  }

  const layerSel = selection.kind === "layer" ? selection : null;
  const selectedLayer = layerSel ? layers[layerSel.index] : null;
  const layerIndex = layerSel ? layerSel.index : 0;
  const hiddenForDevice = (l: MockLayer) =>
    (device === "mobile" && l.hideMobile) || (device === "desktop" && l.hideDesktop);

  const visibleLayers = layers.filter((l) => l.visible);

  return (
    <div
      className="hs-root hs-anim-fade"
      style={{
        position: "fixed", inset: 0, zIndex: 100, display: "flex", flexDirection: "column",
        background: "var(--hs-bg)", color: "var(--hs-text)",
        fontFamily: "Inter, system-ui, sans-serif", overflow: "hidden",
      }}
    >
      {/* ── Barre haute ─────────────────────────────────────────── */}
      <div style={{ height: 56, flexShrink: 0, background: "var(--hs-panel)", borderBottom: "1px solid var(--hs-border)", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
          <button onClick={onBackToAdmin} title="Retour admin" style={{ display: "flex", alignItems: "center", gap: 6, background: "transparent", border: "1px solid var(--hs-border)", color: "var(--hs-muted)", borderRadius: 999, padding: "6px 10px", cursor: "pointer", fontSize: 12 }}>
            <ArrowLeft size={14} /> Admin
          </button>
          <button onClick={onReturnToStore} title="Retour boutique" style={{ background: "transparent", border: "none", color: "var(--hs-faint)", cursor: "pointer", fontSize: 12, textDecoration: "underline" }}>
            boutique
          </button>
          <span style={{ width: 24, height: 24, borderRadius: "50%", background: "var(--hs-text)", color: "var(--hs-bg)", display: "grid", placeItems: "center", fontSize: 11, fontWeight: 800 }}>◉</span>
          <span style={{ fontWeight: 600, fontSize: 14, letterSpacing: "-0.01em" }}>Hero Studio</span>
          <span style={{ fontSize: 10, fontWeight: 500, padding: "2px 8px", borderRadius: 999, background: "var(--hs-accent-soft)", color: "#FF8A4D", border: "1px solid rgba(255,107,33,0.25)" }}>Versatile Engine</span>
          <button
            onClick={() => setAttached((a) => !a)}
            title="Reset Attached"
            style={{ fontSize: 10, padding: "2px 8px", borderRadius: 999, border: "1px solid var(--hs-border2)", background: attached ? "rgba(245,158,11,0.15)" : "var(--hs-panel2)", color: attached ? "#FCD34D" : "var(--hs-muted)", cursor: "pointer" }}
          >
            {attached ? "● Attached" : "○ Detached"}
          </button>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ display: "flex", background: "var(--hs-panel2)", border: "1px solid var(--hs-border)", borderRadius: 999, padding: 2 }}>
            {(["desktop", "tablet", "mobile"] as Device[]).map((d) => (
              <button key={d} onClick={() => setDevice(d)} style={{ padding: "5px 8px", borderRadius: 999, border: "none", background: device === d ? "#3f3f46" : "transparent", color: device === d ? "#fff" : "var(--hs-faint)", cursor: "pointer" }} title={d}>
                {d === "desktop" ? <Monitor size={13} /> : d === "tablet" ? <Tablet size={13} /> : <Smartphone size={13} />}
              </button>
            ))}
          </div>
          <button onClick={undo} disabled={past.length === 0} title="Annuler (Ctrl+Z)" style={{ padding: 7, borderRadius: 8, border: "1px solid var(--hs-border)", background: "transparent", color: past.length ? "var(--hs-text)" : "var(--hs-faint)", cursor: past.length ? "pointer" : "default" }}><Undo2 size={14} /></button>
          <button onClick={redo} disabled={future.length === 0} title="Rétablir (Ctrl+Y)" style={{ padding: 7, borderRadius: 8, border: "1px solid var(--hs-border)", background: "transparent", color: future.length ? "var(--hs-text)" : "var(--hs-faint)", cursor: future.length ? "pointer" : "default" }}><Redo2 size={14} /></button>
          <button onClick={() => setExportOpen(true)} style={{ height: 32, padding: "0 14px", borderRadius: 999, border: "none", background: "var(--hs-accent)", color: "#000", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Export Hero</button>
        </div>
      </div>

      {/* ── Corps 3 colonnes ────────────────────────────────────── */}
      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
        {/* Panneau couches */}
        <div style={{ width: 264, flexShrink: 0, background: "var(--hs-panel)", borderRight: "1px solid var(--hs-border)", display: "flex", flexDirection: "column", minHeight: 0 }}>
          <div style={{ padding: "12px 12px 8px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--hs-faint)", display: "flex", alignItems: "center", gap: 6 }}><Layers size={13} /> Layers</span>
            <button onClick={() => toast("Template appliqué : " + template)} title="Partir d'un template" style={{ background: "transparent", border: "1px solid var(--hs-border)", color: "var(--hs-muted)", borderRadius: 8, padding: "4px 8px", fontSize: 11, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}><Plus size={12} /> Templates</button>
          </div>
          <div style={{ padding: "0 12px 8px", display: "flex", gap: 6, flexWrap: "wrap" }}>
            {MOCK_TEMPLATES.map((t) => (
              <button
                key={t}
                onClick={() => { setTemplate(t); toast("Template appliqué : " + t); }}
                style={{ fontSize: 11, padding: "5px 10px", borderRadius: 999, border: template === t ? "1px solid var(--hs-accent)" : "1px solid var(--hs-border)", background: template === t ? "var(--hs-accent-soft)" : "transparent", color: template === t ? "#FFB37E" : "var(--hs-muted)", cursor: "pointer" }}
              >
                {t}
              </button>
            ))}
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: "4px 8px 12px", display: "flex", flexDirection: "column", gap: 4 }}>
            {layers.map((l, i) => {
              const active = selection.kind === "layer" && selection.index === i;
              return (
                <div
                  key={l.id}
                  onClick={() => { setSelection({ kind: "layer", index: i }); setInspectorTab("layer"); }}
                  style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: 10, border: active ? "1px solid var(--hs-accent)" : "1px solid transparent", background: active ? "var(--hs-accent-soft)" : "transparent", cursor: "pointer", opacity: l.visible ? 1 : 0.45 }}
                >
                  <span style={{ color: active ? "#FFB37E" : "var(--hs-faint)" }}><LayerIcon icon={l.icon} /></span>
                  <span style={{ flex: 1, fontSize: 12, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.label}</span>
                  {l.topPinned && <span style={{ fontSize: 9, fontWeight: 800, padding: "1px 6px", borderRadius: 999, background: "var(--hs-accent)", color: "#000" }}>TOP</span>}
                  {(l.hideMobile || l.hideDesktop) && (
                    <span style={{ display: "flex", gap: 2 }}>
                      {l.hideDesktop && <span title="Desktop only hide" style={{ fontSize: 9, fontWeight: 700, padding: "1px 5px", borderRadius: 4, background: "#27272A", color: "var(--hs-muted)" }}>D</span>}
                      {l.hideMobile && <span title="Mobile only hide" style={{ fontSize: 9, fontWeight: 700, padding: "1px 5px", borderRadius: 4, background: "#27272A", color: "var(--hs-muted)" }}>M</span>}
                    </span>
                  )}
                  {l.fontLocked && <Lock size={11} style={{ color: "#FCD34D" }} />}
                  <button
                    onClick={(e) => { e.stopPropagation(); patchLayer(i, { visible: !l.visible }); }}
                    title={l.visible ? "Eye — masquer partout" : "Afficher"}
                    style={{ background: "transparent", border: "none", color: "var(--hs-faint)", cursor: "pointer", padding: 2 }}
                  >
                    {l.visible ? <Eye size={13} /> : <EyeOff size={13} />}
                  </button>
                </div>
              );
            })}
            <p style={{ fontSize: 10, color: "var(--hs-faint)", padding: "8px 4px 0", lineHeight: 1.5 }}>
              Eye hides everywhere. Hide-on respects breakpoint — different from eye visibility.
            </p>
          </div>
        </div>

        {/* Canvas central */}
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", background: themeDef.canvas, color: themeDef.canvasInk, transition: "background 0.25s" }}>
          <div style={{ padding: "10px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: theme === "dark" ? "1px solid var(--hs-border)" : "1px solid #e4e4e7" }}>
            <span style={{ fontSize: 11, color: theme === "dark" ? "var(--hs-faint)" : "#71717a", display: "flex", alignItems: "center", gap: 6 }}>
              Live Preview — {device} · {themeDef.label}
              <span style={{ fontSize: 10, padding: "1px 8px", borderRadius: 999, border: "1px solid currentColor", opacity: 0.7 }}>auto-fit</span>
            </span>
            <span style={{ display: "flex", gap: 4 }}>
              {THEMES.map((t) => (
                <button key={t.id} onClick={() => setTheme(t.id)} title={t.label} style={{ width: 18, height: 18, borderRadius: "50%", border: theme === t.id ? "2px solid var(--hs-accent)" : "1px solid #a1a1aa", background: t.canvas, cursor: "pointer" }} />
              ))}
            </span>
          </div>

          <div className="hs-canvas-frame" style={{ flex: 1, overflowY: "auto", display: "flex", justifyContent: "center", padding: 24 }}>
            <div className="hs-anim-slide" style={{ width: Math.min(CANVAS_WIDTH[device], 960), maxWidth: "100%", flexShrink: 0 }}>
              {/* Marquee Bar */}
              {visibleLayers.some((l) => l.kind === "marquee") && (
                <div style={{ overflow: "hidden", whiteSpace: "nowrap", background: "var(--hs-accent)", color: "#000", fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", padding: "7px 0", borderRadius: "10px 10px 0 0" }}>
                  <div className="hs-marquee-track" style={{ display: "inline-block", paddingLeft: "100%" }}>
                    <span style={{ paddingRight: 48 }}>{MOCK_SLIDE.marquee}</span>
                    <span style={{ paddingRight: 48 }}>{MOCK_SLIDE.marquee}</span>
                  </div>
                </div>
              )}

              {/* Hero split */}
              <div
                className="hs-hero-split"
                onClick={() => { setSelection({ kind: "slide" }); setInspectorTab("slide"); }}
                style={{ display: "grid", gridTemplateColumns: "1fr 1fr", background: theme === "dark" ? "#131316" : "#fff", border: "1px solid rgba(128,128,128,0.25)", borderRadius: visibleLayers.some((l) => l.kind === "marquee") ? "0 0 12px 12px" : 12, overflow: "hidden", cursor: "pointer" }}
              >
                {/* Media */}
                <div className="hs-hero-media" style={{ position: "relative", minHeight: 380, background: "linear-gradient(135deg, #27272A 0%, #3f3f46 45%, #FF6B21 130%)", display: "grid", placeItems: "center", opacity: hiddenForDevice(layers[3]) ? 0.3 : 1 }}>
                  <span style={{ color: "rgba(255,255,255,0.75)", fontSize: 12, fontWeight: 600, letterSpacing: "0.08em" }}>PRIMARY MEDIA · 800w</span>
                  <span style={{ position: "absolute", bottom: 10, left: 10, fontSize: 10, background: "rgba(0,0,0,0.55)", color: "#fff", padding: "3px 8px", borderRadius: 999 }}>Snap to center · object-fit: cover</span>
                  {hiddenForDevice(layers[3]) && <span style={{ position: "absolute", top: 10, left: 10, fontSize: 10, background: "#27272A", color: "#a1a1aa", padding: "3px 8px", borderRadius: 999 }}>Ghosted 30 — masqué sur {device}</span>}
                </div>

                {/* Contenu */}
                <div style={{ padding: "36px 32px", display: "flex", flexDirection: "column", justifyContent: "center", gap: 14 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "#FF6B21", fontFamily: "Space Grotesk, sans-serif" }}>{MOCK_SLIDE.kicker}</span>
                  <h1 className="hs-hero-title" style={{ margin: 0, fontFamily: "Sora, sans-serif", fontWeight: 700, whiteSpace: "pre-line" }}>{MOCK_SLIDE.title}</h1>
                  <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5, opacity: 0.72, maxWidth: "42ch" }}>{MOCK_SLIDE.description}</p>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13 }}>
                    <strong style={{ fontSize: 20, fontFamily: "Space Grotesk, sans-serif" }}>{MOCK_SLIDE.price}</strong>
                    <span style={{ opacity: 0.6 }}>{MOCK_SLIDE.stock}</span>
                  </div>
                  <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                    {MOCK_CTAS.map((c, i) => (
                      <button
                        key={c.id}
                        onClick={(e) => { e.stopPropagation(); setSelection({ kind: "cta", index: i }); setInspectorTab("button"); }}
                        className={c.style === "hotspot" ? "hs-hotspot-pulse" : undefined}
                        style={{
                          padding: c.style === "hotspot" ? "10px" : "11px 20px",
                          borderRadius: 999,
                          border: c.style === "primary" ? "none" : "1px solid currentColor",
                          background: c.style === "primary" ? "var(--hs-accent)" : "transparent",
                          color: c.style === "primary" ? "#000" : "inherit",
                          fontSize: 13, fontWeight: 600, cursor: "pointer",
                          opacity: selection.kind === "cta" && selection.index === i ? 1 : 0.92,
                          outline: selection.kind === "cta" && selection.index === i ? "2px solid var(--hs-accent)" : "none",
                          outlineOffset: 2,
                        }}
                      >
                        {c.style === "hotspot" ? "◉" : c.label}
                      </button>
                    ))}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, fontFamily: "JetBrains Mono, monospace", opacity: 0.8 }} role="timer">
                    <Timer size={13} /> <span>{countdown}</span>
                    <span style={{ opacity: 0.55 }}>CTA pinned TOP but overridable</span>
                  </div>
                </div>
              </div>

              <p style={{ fontSize: 11, marginTop: 12, opacity: 0.55, textAlign: "center" }}>
                Check canvas — orange outline if overflow detected · wrap then shrink if still overflow.
              </p>
            </div>
          </div>
        </div>

        {/* Inspecteur droite */}
        <div style={{ width: 300, flexShrink: 0, background: "var(--hs-panel)", borderLeft: "1px solid var(--hs-border)", display: "flex", flexDirection: "column", minHeight: 0 }}>
          <div style={{ display: "flex", borderBottom: "1px solid var(--hs-border)" }}>
            {(["slide", "layer", "button"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setInspectorTab(t)}
                style={{ flex: 1, padding: "11px 0", background: "transparent", border: "none", borderBottom: inspectorTab === t ? "2px solid var(--hs-accent)" : "2px solid transparent", color: inspectorTab === t ? "var(--hs-text)" : "var(--hs-faint)", fontSize: 12, fontWeight: 600, textTransform: "capitalize", cursor: "pointer" }}
              >
                {t === "slide" ? "Slide" : t === "layer" ? "Couche" : "Bouton"}
              </button>
            ))}
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 18 }}>
            {inspectorTab === "slide" && (
              <>
                <Section title="Global Font Control" hint="Affects all text blocks unless locked.">
                  <div style={{ display: "flex", gap: 8 }}>
                    <select value={globalFont} onChange={(e) => { setGlobalFont(e.target.value); toast("Police globale : " + e.target.value); }} style={selectStyle}>
                      {MOCK_FONTS.map((f) => <option key={f}>{f}</option>)}
                    </select>
                    <button onClick={() => setFontOpen(true)} style={ghostBtn}>Library</button>
                  </div>
                </Section>
                <Section title="Studio theme" hint="Outil admin seul — jamais la boutique.">
                  <div style={{ display: "flex", gap: 6 }}>
                    {THEMES.map((t) => (
                      <button key={t.id} onClick={() => setTheme(t.id)} style={{ flex: 1, padding: "8px 0", borderRadius: 8, border: theme === t.id ? "1px solid var(--hs-accent)" : "1px solid var(--hs-border)", background: theme === t.id ? "var(--hs-accent-soft)" : "transparent", color: theme === t.id ? "#FFB37E" : "var(--hs-muted)", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>{t.label}</button>
                    ))}
                  </div>
                </Section>
                <Section title="Hide on" hint="Hide-on respects breakpoint.">
                  <div style={{ display: "flex", gap: 6 }}>
                    {(["All devices", "Desktop only hide", "Mobile only hide"] as const).map((o) => (
                      <button key={o} onClick={() => toast(o)} style={{ ...ghostBtn, flex: 1, fontSize: 10 }}>{o}</button>
                    ))}
                  </div>
                </Section>
                <Section title="Media">
                  <label style={checkRow}><input type="checkbox" defaultChecked /> Reduce primary image to 800w</label>
                  <label style={checkRow}><input type="checkbox" defaultChecked /> Preload font</label>
                  <label style={checkRow}><input type="checkbox" defaultChecked /> Snap to center</label>
                </Section>
              </>
            )}

            {inspectorTab === "layer" && (
              selectedLayer ? (
                <>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <strong style={{ fontSize: 13 }}>{selectedLayer.label}</strong>
                    <span style={{ display: "flex", gap: 4 }}>
                      <button onClick={() => patchLayer(layerIndex, { locked: !selectedLayer.locked })} title="Lock" style={iconBtn}>{selectedLayer.locked ? <Lock size={13} /> : <LockOpen size={13} />}</button>
                      <button onClick={() => patchLayer(layerIndex, { hideMobile: !selectedLayer.hideMobile })} title="Mobile only hide" style={{ ...iconBtn, borderColor: selectedLayer.hideMobile ? "var(--hs-accent)" : "var(--hs-border)", color: selectedLayer.hideMobile ? "#FFB37E" : "var(--hs-faint)" }}>M</button>
                      <button onClick={() => patchLayer(layerIndex, { hideDesktop: !selectedLayer.hideDesktop })} title="Desktop only hide" style={{ ...iconBtn, borderColor: selectedLayer.hideDesktop ? "var(--hs-accent)" : "var(--hs-border)", color: selectedLayer.hideDesktop ? "#FFB37E" : "var(--hs-faint)" }}>D</button>
                    </span>
                  </div>
                  <Section title="Font Family" hint={selectedLayer.fontLocked ? "🔒 DD12. Locked blocks show badge next to font name." : "Suit la police globale sauf si verrouillé."}>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <select value={selectedLayer.fontFamily} onChange={(e) => patchLayer(layerIndex, { fontFamily: e.target.value })} style={{ ...selectStyle, flex: 1 }}>
                        {MOCK_FONTS.map((f) => <option key={f}>{f}</option>)}
                      </select>
                      <button onClick={() => patchLayer(layerIndex, { fontLocked: !selectedLayer.fontLocked })} title="Lock / Hide" style={{ ...iconBtn, borderColor: selectedLayer.fontLocked ? "#FCD34D" : "var(--hs-border)" }}>{selectedLayer.fontLocked ? <Lock size={13} /> : <LockOpen size={13} />}</button>
                    </div>
                  </Section>
                  <Section title="Typography Details">
                    <label style={labelStyle}>Line Height — {selectedLayer.lineHeight.toFixed(2)}</label>
                    <input type="range" min={0.9} max={2} step={0.05} value={selectedLayer.lineHeight} onChange={(e) => patchLayer(layerIndex, { lineHeight: Number(e.target.value) })} style={{ width: "100%", accentColor: "var(--hs-accent)" }} />
                    <label style={labelStyle}>Letter Spacing — {selectedLayer.letterSpacing.toFixed(2)}em</label>
                    <input type="range" min={-0.05} max={0.1} step={0.01} value={selectedLayer.letterSpacing} onChange={(e) => patchLayer(layerIndex, { letterSpacing: Number(e.target.value) })} style={{ width: "100%", accentColor: "var(--hs-accent)" }} />
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 8 }}>
                      <label style={{ fontSize: 11, color: "var(--hs-muted)", display: "flex", flexDirection: "column", gap: 4 }}>Paragraph Align
                        <select value={selectedLayer.align} onChange={(e) => patchLayer(layerIndex, { align: e.target.value as MockLayer["align"] })} style={selectStyle}>
                          <option value="left">Left</option><option value="center">Center</option><option value="right">Right</option><option value="justify">Justify</option>
                        </select>
                      </label>
                      <label style={{ fontSize: 11, color: "var(--hs-muted)", display: "flex", flexDirection: "column", gap: 4 }}>Text Transform
                        <select value={selectedLayer.transform} onChange={(e) => patchLayer(layerIndex, { transform: e.target.value as MockLayer["transform"] })} style={selectStyle}>
                          <option value="none">None</option><option value="uppercase">Uppercase</option><option value="lowercase">Lowercase</option><option value="capitalize">Capitalize</option>
                        </select>
                      </label>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 8 }}>
                      <label style={{ fontSize: 11, color: "var(--hs-muted)", display: "flex", flexDirection: "column", gap: 4 }}>Max Width
                        <input value={selectedLayer.maxWidth} onChange={(e) => patchLayer(layerIndex, { maxWidth: e.target.value })} style={textInput} />
                      </label>
                      <label style={{ fontSize: 11, color: "var(--hs-muted)", display: "flex", flexDirection: "column", gap: 4 }}>Overflow mode
                        <select style={selectStyle} defaultValue="balance"><option>balance / pretty</option><option>single line</option><option>wrap then shrink</option></select>
                      </label>
                    </div>
                    <label style={{ ...checkRow, marginTop: 8 }}><input type="checkbox" checked={selectedLayer.balance} onChange={(e) => patchLayer(layerIndex, { balance: e.target.checked })} /> balance controls — helps avoid orphans</label>
                  </Section>
                </>
              ) : (
                <div style={{ fontSize: 12, color: "var(--hs-faint)", textAlign: "center", padding: "32px 0" }}>
                  No layer selected.<br />Select a text layer to see line height.
                </div>
              )
            )}

            {inspectorTab === "button" && (
              <>
                <Section title="CTA Group" hint="CTA generally top for clickability. CTA pinned TOP but overridable.">
                  {MOCK_CTAS.map((c) => (
                    <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: 8, border: "1px solid var(--hs-border)", marginBottom: 6 }}>
                      <MousePointerClick size={13} style={{ color: "var(--hs-faint)" }} />
                      <span style={{ flex: 1, fontSize: 12 }}>{c.label}</span>
                      {c.topPinned && <span style={{ fontSize: 9, fontWeight: 800, padding: "1px 6px", borderRadius: 999, background: "var(--hs-accent)", color: "#000" }}>TOP</span>}
                      <ChevronRight size={13} style={{ color: "var(--hs-faint)" }} />
                    </div>
                  ))}
                </Section>
                <Section title="Magnetic CTA">
                  <label style={checkRow}><input type="checkbox" defaultChecked /> Magnetic CTA (pastille pulsante)</label>
                  <label style={checkRow}><input type="checkbox" defaultChecked /> Apply to All</label>
                </Section>
                <Section title="Hotspots">
                  <p style={{ fontSize: 11, color: "var(--hs-faint)", margin: 0 }}>Hotspots = style de CTA positionné « pastille ». Shows label in canvas.</p>
                </Section>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Footer ──────────────────────────────────────────────── */}
      <div style={{ height: 46, flexShrink: 0, background: "var(--hs-panel)", borderTop: "1px solid var(--hs-border)", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 12px" }}>
        <span style={{ fontSize: 11, color: "var(--hs-faint)" }}>Scoped CSS • Container queries • object-fit • clamp()</span>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={onBackToAdmin} style={{ height: 32, padding: "0 16px", borderRadius: 999, background: "#27272A", border: "1px solid var(--hs-border2)", color: "var(--hs-text)", fontSize: 12, cursor: "pointer" }}>Close</button>
          <button onClick={() => setExportOpen(true)} style={{ height: 32, padding: "0 16px", borderRadius: 999, background: "var(--hs-accent)", border: "none", color: "#000", fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}><Download size={13} /> Download .zip</button>
        </div>
      </div>

      {/* ── Modale Font Library ─────────────────────────────────── */}
      {fontOpen && (
        <div style={modalOverlay} onClick={() => setFontOpen(false)}>
          <div className="hs-anim-pop" onClick={(e) => e.stopPropagation()} style={modalCard}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <strong style={{ fontSize: 14 }}>Font Library</strong>
              <button onClick={() => setFontOpen(false)} style={iconBtn}><X size={14} /></button>
            </div>
            {MOCK_FONTS.map((f) => (
              <button key={f} onClick={() => { setGlobalFont(f); setFontOpen(false); toast("Police globale : " + f); }} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", borderRadius: 8, border: globalFont === f ? "1px solid var(--hs-accent)" : "1px solid var(--hs-border)", background: "transparent", color: "var(--hs-text)", cursor: "pointer", marginBottom: 6 }}>
                <span style={{ fontFamily: `'${f}', sans-serif`, fontSize: 15 }}>{f}</span>
                {globalFont === f && <Check size={14} style={{ color: "var(--hs-accent)" }} />}
              </button>
            ))}
            <div style={{ marginTop: 12, borderTop: "1px solid var(--hs-border)", paddingTop: 12 }}>
              <label style={labelStyle}>Import Font — Google Fonts URL (For MVP : css2 uniquement)</label>
              <div style={{ display: "flex", gap: 8 }}>
                <input placeholder="Font name e.g. Outfit" style={{ ...textInput, flex: 1 }} />
                <button onClick={() => toast("Adds to list locally — no external fetch")} style={ghostBtn}>Import</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modale Export ───────────────────────────────────────── */}
      {exportOpen && (
        <div style={modalOverlay} onClick={() => setExportOpen(false)}>
          <div className="hs-anim-pop" onClick={(e) => e.stopPropagation()} style={{ ...modalCard, width: 560 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <strong style={{ fontSize: 14 }}>Export Hero</strong>
              <button onClick={() => setExportOpen(false)} style={iconBtn}><X size={14} /></button>
            </div>
            <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
              {(["liquid", "css"] as const).map((t) => (
                <button key={t} onClick={() => setExportTab(t)} style={{ padding: "7px 14px", borderRadius: 999, border: exportTab === t ? "1px solid var(--hs-accent)" : "1px solid var(--hs-border)", background: exportTab === t ? "var(--hs-accent-soft)" : "transparent", color: exportTab === t ? "#FFB37E" : "var(--hs-muted)", fontSize: 12, cursor: "pointer" }}>
                  {t === "liquid" ? "Shopify Liquid" : "Scoped CSS"}
                </button>
              ))}
            </div>
            <pre style={{ background: "#0A0A0B", border: "1px solid var(--hs-border)", borderRadius: 8, padding: 12, fontSize: 11, fontFamily: "'JetBrains Mono', monospace", color: "#d4d4d8", overflow: "auto", maxHeight: 260, whiteSpace: "pre-wrap" }}>
              {exportTab === "liquid" ? MOCK_LIQUID : MOCK_CSS}
            </pre>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 12 }}>
              <button onClick={() => setExportOpen(false)} style={{ ...ghostBtn, padding: "8px 16px" }}>Close</button>
              <button onClick={() => toast("Export .zip — maquette, aucun fichier généré")} style={{ height: 32, padding: "0 16px", borderRadius: 999, background: "var(--hs-accent)", border: "none", color: "#000", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Download .zip</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Toasts ──────────────────────────────────────────────── */}
      <div style={{ position: "absolute", bottom: 60, left: "50%", transform: "translateX(-50%)", display: "flex", flexDirection: "column", gap: 6, zIndex: 50 }}>
        {toasts.map((t, i) => (
          <div key={`${t}-${i}`} className="hs-anim-pop" style={{ background: "#fff", color: "#000", fontSize: 12, fontWeight: 500, padding: "8px 14px", borderRadius: 999, boxShadow: "0 8px 24px rgba(0,0,0,0.4)", whiteSpace: "nowrap" }}>{t}</div>
        ))}
      </div>

    </div>
  );
}

// ─── Styles partagés locaux ────────────────────────────────────────────────

const selectStyle: React.CSSProperties = { background: "var(--hs-panel2)", border: "1px solid var(--hs-border)", color: "var(--hs-text)", borderRadius: 8, padding: "7px 10px", fontSize: 12, outline: "none" };
const textInput: React.CSSProperties = { background: "var(--hs-panel2)", border: "1px solid var(--hs-border)", color: "var(--hs-text)", borderRadius: 8, padding: "7px 10px", fontSize: 12, outline: "none" };
const ghostBtn: React.CSSProperties = { background: "transparent", border: "1px solid var(--hs-border)", color: "var(--hs-muted)", borderRadius: 8, padding: "7px 12px", fontSize: 12, cursor: "pointer", whiteSpace: "nowrap" };
const iconBtn: React.CSSProperties = { background: "transparent", border: "1px solid var(--hs-border)", color: "var(--hs-muted)", borderRadius: 7, padding: 5, cursor: "pointer", display: "inline-flex", alignItems: "center", fontSize: 10, fontWeight: 700 };
const labelStyle: React.CSSProperties = { fontSize: 11, color: "var(--hs-muted)", display: "block", marginBottom: 4 };
const checkRow: React.CSSProperties = { display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--hs-text)", cursor: "pointer" };
const modalOverlay: React.CSSProperties = { position: "absolute", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, zIndex: 60 };
const modalCard: React.CSSProperties = { width: 440, maxWidth: "100%", maxHeight: "90%", overflowY: "auto", background: "var(--hs-panel)", border: "1px solid var(--hs-border)", borderRadius: 16, padding: 20 };

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--hs-faint)", margin: "0 0 4px" }}>{title}</p>
      {hint && <p style={{ fontSize: 11, color: "var(--hs-faint)", margin: "0 0 8px", lineHeight: 1.5 }}>{hint}</p>}
      {children}
    </div>
  );
}

export { cx };
