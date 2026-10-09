// src/admin/herostudio/HeroStudioPage.tsx — page séparée /admin/herostudio.
// Réplique du mockup Hero-Studio-Versatile-Engine-02 (référence gelée).
// AUTONOME : mocks en tête de fichier, état local seul, zéro appel réseau,
// zéro dépendance à HeroStudioEditor / hero_promotions. Le câblage réel est hors scope.
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowDownToLine,
  ArrowUpToLine,
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
  ChevronUp,
  ChevronDown,
  Check,
  GripVertical,
  Expand,
  Columns2,
  LayoutGrid,
  LayoutDashboard,
  PanelRight,
  Rows3,
  MapPin,
  Users,
  Film,
  Gauge,
  BookOpen,
} from "lucide-react";
import "./herostudio.css";

// ─── MOCK DATA (transitoire, dans le fichier) ──────────────────────────────

type Device = "desktop" | "tablet" | "mobile";
type StudioTheme = "dark" | "grey" | "light";
type LayoutId = "immersive" | "split" | "grid" | "bento" | "asym" | "masonry" | "filmstrip" | "lookbook";
type InspectorTab = "style" | "type" | "effects" | "motion" | "commerce";
type Selection =
  | { kind: "slide" }
  | { kind: "layer"; index: number }
  | { kind: "cta"; index: number };

type LayerKind =
  | "text" | "media" | "badge" | "cta" | "marquee"
  | "countdown" | "price" | "hotspot" | "social";
type LayerIconKind =
  | "text" | "media" | "cta" | "badge" | "timer"
  | "marquee" | "price" | "hotspot" | "social";

interface MockLayer {
  id: string;
  label: string;
  short: string;
  kind: LayerKind;
  icon: LayerIconKind;
  z: number;
  visible: boolean;
  locked: boolean;
  hideMobile: boolean;
  hideDesktop: boolean;
  topPinned?: boolean;
  fontFamily: string;
  fontLocked: boolean;
  lineHeight: number;
  letterSpacing: number;
  align: "left" | "center" | "right" | "justify";
  transform: "none" | "uppercase" | "lowercase" | "capitalize";
  maxWidth: string;
  balance: boolean;
  fx?: number;
  fy?: number;
  aspect?: "4/5" | "1/1" | "16/9";
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

const LAYOUTS: Array<{ id: LayoutId; label: string; icon: React.FC<{ size?: number | string }> }> = [
  { id: "immersive", label: "Immersive", icon: Expand },
  { id: "split", label: "Split", icon: Columns2 },
  { id: "grid", label: "Grid", icon: LayoutGrid },
  { id: "bento", label: "Bento", icon: LayoutDashboard },
  { id: "asym", label: "Asym", icon: PanelRight },
  { id: "masonry", label: "Masonry", icon: Rows3 },
  { id: "filmstrip", label: "Filmstrip", icon: Film },
  { id: "lookbook", label: "Lookbook", icon: BookOpen },
];

const MOCK_LAYERS: MockLayer[] = [
  { id: "l-cta", label: "CTA Group", short: "C.", kind: "cta", icon: "cta", z: 20, visible: true, locked: false, hideMobile: false, hideDesktop: false, topPinned: true, fontFamily: "Inter", fontLocked: true, lineHeight: 1.4, letterSpacing: 0, align: "left", transform: "none", maxWidth: "100%", balance: false },
  { id: "l-hot", label: "Hotspot", short: "Hotsp…", kind: "hotspot", icon: "hotspot", z: 17, visible: true, locked: false, hideMobile: false, hideDesktop: false, fontFamily: "Inter", fontLocked: false, lineHeight: 1.4, letterSpacing: 0, align: "center", transform: "none", maxWidth: "100%", balance: false },
  { id: "l-count", label: "Countdown", short: "Coun…", kind: "countdown", icon: "timer", z: 16, visible: true, locked: false, hideMobile: false, hideDesktop: false, fontFamily: "JetBrains Mono", fontLocked: false, lineHeight: 1.4, letterSpacing: 0, align: "left", transform: "none", maxWidth: "100%", balance: false },
  { id: "l-marquee", label: "Marquee Bar", short: "Marq…", kind: "marquee", icon: "marquee", z: 15, visible: true, locked: false, hideMobile: false, hideDesktop: true, fontFamily: "Space Grotesk", fontLocked: false, lineHeight: 1.4, letterSpacing: 0.04, align: "center", transform: "uppercase", maxWidth: "100%", balance: false },
  { id: "l-social", label: "Social Proof", short: "Socia…", kind: "social", icon: "social", z: 14, visible: true, locked: false, hideMobile: false, hideDesktop: false, fontFamily: "Inter", fontLocked: false, lineHeight: 1.4, letterSpacing: 0, align: "left", transform: "none", maxWidth: "100%", balance: false },
  { id: "l-price", label: "Price / Stock", short: "Price…", kind: "price", icon: "price", z: 13, visible: true, locked: false, hideMobile: true, hideDesktop: false, fontFamily: "Space Grotesk", fontLocked: false, lineHeight: 1.3, letterSpacing: 0, align: "left", transform: "none", maxWidth: "100%", balance: false },
  { id: "l-desc", label: "Description", short: "Descr…", kind: "text", icon: "text", z: 12, visible: true, locked: false, hideMobile: false, hideDesktop: false, fontFamily: "Inter", fontLocked: false, lineHeight: 1.5, letterSpacing: 0, align: "left", transform: "none", maxWidth: "42ch", balance: false },
  { id: "l-title", label: "Title", short: "Title", kind: "text", icon: "text", z: 11, visible: true, locked: false, hideMobile: false, hideDesktop: false, fontFamily: "Sora", fontLocked: false, lineHeight: 0.95, letterSpacing: -0.02, align: "left", transform: "none", maxWidth: "16ch", balance: true },
  { id: "l-badge", label: "Badge / Kicker", short: "Badg…", kind: "badge", icon: "badge", z: 10, visible: true, locked: false, hideMobile: false, hideDesktop: false, fontFamily: "Space Grotesk", fontLocked: false, lineHeight: 1.2, letterSpacing: 0.08, align: "left", transform: "uppercase", maxWidth: "100%", balance: false },
  { id: "l-q", label: "Quaternary Media", short: "Quater…", kind: "media", icon: "media", z: 4, visible: true, locked: false, hideMobile: false, hideDesktop: false, fontFamily: "Inter", fontLocked: false, lineHeight: 1.4, letterSpacing: 0, align: "left", transform: "none", maxWidth: "100%", balance: false, fx: 62, fy: 55, aspect: "1/1" },
  { id: "l-t", label: "Tertiary Media", short: "Tertia…", kind: "media", icon: "media", z: 3, visible: true, locked: false, hideMobile: false, hideDesktop: false, fontFamily: "Inter", fontLocked: false, lineHeight: 1.4, letterSpacing: 0, align: "left", transform: "none", maxWidth: "100%", balance: false, fx: 50, fy: 42, aspect: "4/5" },
  { id: "l-s", label: "Secondary Media", short: "Secon…", kind: "media", icon: "media", z: 2, visible: true, locked: false, hideMobile: false, hideDesktop: false, fontFamily: "Inter", fontLocked: false, lineHeight: 1.4, letterSpacing: 0, align: "left", transform: "none", maxWidth: "100%", balance: false, fx: 38, fy: 60, aspect: "16/9" },
  { id: "l-p", label: "Primary Media", short: "Prima…", kind: "media", icon: "media", z: 1, visible: true, locked: false, hideMobile: false, hideDesktop: false, fontFamily: "Inter", fontLocked: false, lineHeight: 1.4, letterSpacing: 0, align: "left", transform: "none", maxWidth: "100%", balance: false, fx: 50, fy: 50, aspect: "4/5" },
];

const MOCK_CTAS: MockCta[] = [
  { id: "c1", label: "Shop Now", style: "primary", magnetic: true, topPinned: true },
  { id: "c2", label: "Lookbook", style: "ghost", magnetic: false, topPinned: false },
];

const MOCK_SLIDE = {
  badge: "Nouveauté • FW25",
  kicker: "New drop — Archive 015",
  titleA: "FALL",
  titleB: "COLLECTION",
  description:
    "Pièces essentielles pensées pour durer. Fabriqué à partir de matériaux recyclés et de fibres naturelles.",
  price: "€149",
  stock: "Plus que 3",
  social: "2.4k adorent",
  marquee: "FREE SHIPPING WORLDWIDE — SUSTAINABLE MATERIALS — FREE SHIPPING WORLDWIDE — SUSTAINABLE MATERIALS — ",
};

const MOCK_PRODUCTS = ["FW25 Essential Parka", "Essential Hoodie", "Cargo Pant"] as const;

const ADD_BLOCKS: Array<{ kind: LayerKind; icon: LayerIconKind; label: string; hint: string }> = [
  { kind: "badge", icon: "badge", label: "Badge", hint: "New label" },
  { kind: "marquee", icon: "marquee", label: "Marquee +", hint: "Scrolling text" },
  { kind: "countdown", icon: "timer", label: "Countdown +", hint: "Timer" },
  { kind: "hotspot", icon: "hotspot", label: "Hotspot +", hint: "+ buttons" },
  { kind: "social", icon: "social", label: "Social Proof", hint: "2.4k loved" },
];

// ─── Petits utilitaires locaux ─────────────────────────────────────────────

function cx(...parts: Array<string | false | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

function LayerIcon({ icon, size = 14 }: { icon: LayerIconKind; size?: number }) {
  switch (icon) {
    case "text": return <Type size={size} />;
    case "media": return <ImageIcon size={size} />;
    case "cta": return <MousePointerClick size={size} />;
    case "badge": return <BadgePercent size={size} />;
    case "timer": return <Timer size={size} />;
    case "marquee": return <Megaphone size={size} />;
    case "price": return <BadgePercent size={size} />;
    case "hotspot": return <MapPin size={size} />;
    case "social": return <Users size={size} />;
  }
}

function useCountdown(durationSec: number): string {
  const [now, setNow] = useState(() => Date.now());
  const target = useMemo(() => Date.now() + durationSec * 1000, [durationSec]);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
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

const DEVICE_META: Record<Device, { width: number; dims: string }> = {
  desktop: { width: 880, dims: "1200×600" },
  tablet: { width: 620, dims: "768×1024" },
  mobile: { width: 360, dims: "390×844" },
};

export default function HeroStudioPage({ onBackToAdmin, onReturnToStore }: HeroStudioPageProps) {
  const [device, setDevice] = useState<Device>("desktop");
  const [theme, setTheme] = useState<StudioTheme>("dark");
  const [layout, setLayout] = useState<LayoutId>("immersive");
  const [attached, setAttached] = useState(true);
  const [themeAware, setThemeAware] = useState(true);
  const [selection, setSelection] = useState<Selection>({ kind: "layer", index: 7 });
  const [inspectorTab, setInspectorTab] = useState<InspectorTab>("style");
  const [layers, setLayers] = useState<MockLayer[]>(MOCK_LAYERS);
  const [past, setPast] = useState<MockLayer[][]>([]);
  const [future, setFuture] = useState<MockLayer[][]>([]);
  const [globalFont, setGlobalFont] = useState<string>("Inter");
  const [autoFit, setAutoFit] = useState(true);
  const [wordFonts, setWordFonts] = useState<Record<number, string>>({});
  const [overflow, setOverflow] = useState(false);
  // Style
  const [radius, setRadius] = useState(16);
  const [gap, setGap] = useState(16);
  const [shadow, setShadow] = useState(true);
  const [tokenPrimary, setTokenPrimary] = useState("#FF6B21");
  const [tokenBg, setTokenBg] = useState("#111113");
  const [tokenText, setTokenText] = useState("#FFFFFF");
  const [reduce800, setReduce800] = useState(true);
  const [preloadFont, setPreloadFont] = useState(true);
  const [lazySecondary, setLazySecondary] = useState(true);
  // Effects
  const [fxMesh, setFxMesh] = useState(true);
  const [fxNoise, setFxNoise] = useState(true);
  const [fxBlur, setFxBlur] = useState(true);
  const [fxGradient, setFxGradient] = useState(60);
  // Motion
  const [parallax, setParallax] = useState(true);
  const [marqueeSpeed, setMarqueeSpeed] = useState(18);
  const [marqueeDir, setMarqueeDir] = useState<"left" | "right">("left");
  const [marqueeText, setMarqueeText] = useState(MOCK_SLIDE.marquee);
  const [animIn, setAnimIn] = useState(true);
  // Commerce
  const [price, setPrice] = useState(MOCK_SLIDE.price);
  const [stockLabel, setStockLabel] = useState(MOCK_SLIDE.stock);
  const [priceMode, setPriceMode] = useState<"Price" | "Stock" | "Rating">("Price");
  const [socialCount, setSocialCount] = useState(MOCK_SLIDE.social);
  const [product, setProduct] = useState<string>(MOCK_PRODUCTS[0]);
  const [cdLabel, setCdLabel] = useState("Drop ends soon");
  const [cdMinutes, setCdMinutes] = useState(312);
  const [cdExpired, setCdExpired] = useState("Offer expired");
  // Améliorations reprises du 03 (V3 Fusion) — additif pur.
  const [highlightWord, setHighlightWord] = useState(0);
  const [pretty, setPretty] = useState(true);
  const [rating, setRating] = useState("★ 4.8 (412)");
  const [showRating, setShowRating] = useState(true);
  const [lowStock, setLowStock] = useState(true);
  const [parallaxAmt, setParallaxAmt] = useState<"1x" | "1.2x" | "1.5x">("1.2x");
  const [cdHero, setCdHero] = useState(true);
  const [fxGlass, setFxGlass] = useState(false);
  const [fxBlend, setFxBlend] = useState(false);
  // UI
  const [fontOpen, setFontOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [exportTab, setExportTab] = useState<"liquid" | "css">("liquid");
  const [toasts, setToasts] = useState<string[]>([]);
  const [dragFocal, setDragFocal] = useState<string | null>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const countdown = useCountdown(cdMinutes * 60);

  const themeDef = THEMES.find((t) => t.id === theme) ?? THEMES[0];
  const ordered = useMemo(() => [...layers].sort((a, b) => b.z - a.z), [layers]);
  const byId = useMemo(() => Object.fromEntries(layers.map((l) => [l.id, l])), [layers]);
  const layerOn = (id: string) => byId[id]?.visible && !hiddenForDevice(byId[id]);
  function hiddenForDevice(l: MockLayer | undefined): boolean {
    if (!l) return true;
    return (device === "mobile" && l.hideMobile) || (device === "desktop" && l.hideDesktop);
  }

  function toast(msg: string) {
    setToasts((prev) => [...prev.slice(-2), msg]);
    setTimeout(() => setToasts((prev) => prev.slice(1)), 2600);
  }

  function buildLiquid(): string {
    const blocks = layers
      .filter((l) => l.visible)
      .map((l) => {
        if (l.kind === "media")
          return `      { "type": "image", "settings": { "focal": "${l.fx ?? 50} ${l.fy ?? 50}", "position": "object-position: ${l.fx ?? 50}% ${l.fy ?? 50}%" } }`;
        if (l.kind === "text")
          return `      { "type": "text", "settings": { "font": "${l.fontFamily}", "max_width": "${l.maxWidth}" } }`;
        return `      { "type": "${l.kind}" }`;
      })
      .join(",\n");
    return `<section class="hero-{{ section.id }}">
  <p>{{ section.settings.kicker }}</p>
  <h1>{{ section.settings.title }}</h1>
  {{ section.settings.description }}
  {% for block in section.blocks %}{{ block }}{% endfor %}
</section>
{% schema %}{"name":"Hero Studio","settings":[{"type":"text","id":"title","label":"Title"},{"type":"text","id":"kicker","label":"Kicker"}],"blocks":[
${blocks}
]}{% endschema %}`;
  }

  function buildCss(): string {
    return `.hero-studio {
  --gap: ${gap}px;
  --radius: ${radius}px;
  --accent: ${accent};
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
  }

  async function copyText(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast(`${label} copié`);
    } catch {
      try {
        const ta = document.createElement("textarea");
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        ta.remove();
        toast(`${label} copié`);
      } catch {
        toast("Copie impossible (maquette)");
      }
    }
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
  function patchById(id: string, patch: Partial<MockLayer>) {
    const i = layers.findIndex((l) => l.id === id);
    if (i >= 0) patchLayer(i, patch);
  }
  function moveZ(index: number, dir: 1 | -1) {
    const me = layers[index];
    const others = ordered.filter((l) => l.id !== me.id);
    const pos = ordered.findIndex((l) => l.id === me.id);
    const swapWith = ordered[pos - dir];
    if (!swapWith) return;
    const si = layers.findIndex((l) => l.id === swapWith.id);
    commit(layers.map((l, i) => {
      if (i === index) return { ...l, z: swapWith.z };
      if (i === si) return { ...l, z: me.z };
      return l;
    }));
    void others;
  }
  function toFront(index: number) {
    const max = Math.max(...layers.map((l) => l.z));
    patchLayer(index, { z: max + 1 });
  }
  function toBack(index: number) {
    const min = Math.min(...layers.map((l) => l.z));
    patchLayer(index, { z: min - 1 });
  }
  function setHide(index: number, mode: "all" | "desktop" | "mobile" | "none") {
    patchLayer(index, {
      hideDesktop: mode === "desktop",
      hideMobile: mode === "mobile",
      visible: mode === "all" ? false : layers[index].visible,
    });
    if (mode === "all") toast("Ghosted 30 — masqué partout (œil)");
    if (mode === "none") {
      patchLayer(index, { hideDesktop: false, hideMobile: false, visible: true });
      toast("None — visible partout");
    }
  }
  function addBlock(kind: LayerKind, icon: LayerIconKind, label: string) {
    if (layers.length >= 16) { toast("Limite 16 couches (maquette)"); return; }
    const max = Math.max(...layers.map((l) => l.z));
    const base: MockLayer = {
      id: `l-${kind}-${Date.now() % 100000}`, label, short: label.slice(0, 6) + "…",
      kind, icon, z: max + 1, visible: true, locked: false,
      hideMobile: false, hideDesktop: false, fontFamily: globalFont,
      fontLocked: false, lineHeight: 1.4, letterSpacing: 0, align: "left",
      transform: "none", maxWidth: "100%", balance: false,
    };
    commit([...layers, base]);
    toast(`${label} ajouté — to reorder z-index`);
  }
  function applyTemplate(id: LayoutId) {
    setLayout(id);
    toast(`Template appliqué : ${LAYOUTS.find((l) => l.id === id)?.label}`);
  }
  function applyGlobalFont() {
    commit(layers.map((l) => (l.fontLocked ? l : { ...l, fontFamily: globalFont })));
    toast(`Apply to All : ${globalFont} (verrouillés ignorés)`);
  }
  function cycleWordFont(i: number) {
    const order: string[] = [...MOCK_FONTS];
    const cur = wordFonts[i] ?? layers.find((l) => l.id === "l-title")?.fontFamily ?? "Sora";
    const next = order[(order.indexOf(cur) + 1) % order.length];
    setWordFonts((w) => ({ ...w, [i]: next }));
    toast(`Ligne ${i + 1} : ${next}`);
  }

  // Détection overflow réelle sur le titre (outline orange du mockup)
  useEffect(() => {
    const el = titleRef.current;
    if (!el) return;
    const check = () => setOverflow(el.scrollWidth > el.clientWidth + 2);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, [layout, device, globalFont, wordFonts, autoFit]);

  const selLabel =
    selection.kind === "slide" ? "slide"
    : selection.kind === "cta" ? `cta ${selection.index + 1}`
    : (layers[selection.kind === "layer" ? selection.index : 0]?.label ?? "?").toLowerCase();
  const layerSel = selection.kind === "layer" ? selection : null;
  const selectedLayer = layerSel ? layers[layerSel.index] : null;
  const layerIndex = layerSel ? layerSel.index : 0;
  const selMedia =
    selectedLayer?.kind === "media" ? selectedLayer
    : layers.find((l) => l.id === "l-p") ?? null;

  const darkCard = !themeAware || theme === "dark";
  const accent = tokenPrimary;
  const cardBg = darkCard ? tokenBg : "#FFFFFF";
  const cardInk = darkCard ? tokenText : "#18181B";

  // ── Focale : drag sur le canvas ─────────────────────────────────────────
  function focalHandlers(id: string) {
    return {
      onPointerDown: (e: React.PointerEvent) => {
        if (layers.find((l) => l.id === id)?.locked) { toast("Lock — prevent drag/edit"); return; }
        (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
        setDragFocal(id);
        focalSet(id, e);
      },
      onPointerMove: (e: React.PointerEvent) => { if (dragFocal === id) focalSet(id, e); },
      onPointerUp: () => setDragFocal(null),
    };
  }
  function focalSet(id: string, e: React.PointerEvent) {
    const box = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const fx = Math.round(((e.clientX - box.left) / box.width) * 100);
    const fy = Math.round(((e.clientY - box.top) / box.height) * 100);
    patchById(id, { fx: Math.max(0, Math.min(100, fx)), fy: Math.max(0, Math.min(100, fy)) });
  }

  // ── Blocs canvas partagés ───────────────────────────────────────────────
  const showMarquee = layerOn("l-marquee");
  const showCta = layerOn("l-cta");
  const showPrice = layerOn("l-price");
  const showSocial = layerOn("l-social");
  const showCount = layerOn("l-count");
  const showBadge = layerOn("l-badge");
  const expired = countdown === "00:00:00";

  function MarqueeBar() {
    if (!showMarquee) return null;
    return (
      <div style={{ overflow: "hidden", whiteSpace: "nowrap", background: accent, color: "#000", fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", padding: "7px 0", borderRadius: `${radius}px ${radius}px 0 0` }}>
        <div className="hs-marquee-track" style={{ display: "inline-block", animationDuration: `${marqueeSpeed}s`, animationDirection: marqueeDir === "left" ? "normal" : "reverse" }}>
          <span style={{ paddingRight: 48 }}>{marqueeText}</span>
          <span style={{ paddingRight: 48 }}>{marqueeText}</span>
        </div>
      </div>
    );
  }
  function BadgePill() {
    if (!showBadge) return null;
    return (
      <span
        onClick={(e) => { e.stopPropagation(); const i = layers.findIndex((l) => l.id === "l-badge"); if (i >= 0) { setSelection({ kind: "layer", index: i }); setInspectorTab("type"); } }}
        style={{ display: "inline-flex", fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", padding: "6px 14px", borderRadius: 999, background: accent, color: "#000", cursor: "pointer", fontFamily: "'Space Grotesk', sans-serif" }}
      >
        {MOCK_SLIDE.badge}
      </span>
    );
  }
  function TitleBlock({ size, alignCenter = false }: { size: number; alignCenter?: boolean }) {
    const words = [MOCK_SLIDE.titleA, MOCK_SLIDE.titleB];
    return (
      <h1
        ref={titleRef}
        className="hs-hero-title"
        title="Double-click title word to set line-specific font"
        style={{
          margin: 0, fontWeight: 900, letterSpacing: "-0.02em",
          fontSize: autoFit ? `clamp(1.6rem, ${size}cqi, 4.5rem)` : size >= 4 ? "3rem" : "2rem",
          lineHeight: 0.95, textAlign: alignCenter ? "center" : "left",
          textWrap: pretty ? "pretty" : "balance",
          outline: overflow ? "2px solid #FF6B21" : "2px solid transparent",
          outlineOffset: 6, borderRadius: 8, cursor: "text",
          fontFamily: `'${layers.find((l) => l.id === "l-title")?.fontFamily ?? "Sora"}', sans-serif`,
        }}
      >
        {words.map((w, i) => (
          <span
            key={i}
            onDoubleClick={(e) => { e.stopPropagation(); cycleWordFont(i); }}
            style={{ color: i === highlightWord ? accent : "inherit", fontFamily: wordFonts[i] ? `'${wordFonts[i]}', sans-serif` : "inherit", cursor: "pointer" }}
          >
            {w}{i === 0 ? " " : ""}
          </span>
        ))}
      </h1>
    );
  }
  function CtaRow() {
    if (!showCta) return null;
    return (
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        {MOCK_CTAS.map((c, i) => (
          <button
            key={c.id}
            onClick={(e) => { e.stopPropagation(); setSelection({ kind: "cta", index: i }); setInspectorTab("commerce"); }}
            className={c.style === "hotspot" ? "hs-hotspot-pulse" : undefined}
            style={{
              padding: c.style === "hotspot" ? "10px" : "11px 20px", borderRadius: 999,
              border: c.style === "primary" ? "none" : `1px solid ${darkCard ? cardInk : "#18181B"}`,
              background: c.style === "primary" ? accent : "transparent",
              color: c.style === "primary" ? "#000" : "inherit",
              fontSize: 13, fontWeight: 600, cursor: "pointer",
              outline: selection.kind === "cta" && selection.index === i ? `2px solid ${accent}` : "none",
              outlineOffset: 2,
            }}
          >
            {c.style === "hotspot" ? "◉" : c.label}{c.style === "primary" ? " ↗" : ""}
          </button>
        ))}
        {layerOn("l-hot") && (
          <span title="Hotspot" className="hs-hotspot-pulse" style={{ width: 26, height: 26, borderRadius: "50%", background: accent, display: "inline-grid", placeItems: "center", color: "#000", fontSize: 12, cursor: "pointer" }}>◉</span>
        )}
      </div>
    );
  }
  function PriceRow() {
    if (!showPrice) return null;
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <span style={{ background: darkCard ? "rgba(255,255,255,0.12)" : "#F4F4F5", padding: "5px 12px", borderRadius: 999, fontSize: 13, fontWeight: 700 }}>{price}</span>
        <span style={{ background: "rgba(255,107,33,0.18)", color: accent, border: `1px solid ${accent}55`, padding: "5px 12px", borderRadius: 999, fontSize: 12, fontWeight: 600 }}>{stockLabel}</span>
        {lowStock && <span style={{ background: "rgba(245,158,11,0.2)", color: "#F59E0B", padding: "5px 8px", borderRadius: 6, fontSize: 9, fontWeight: 700 }}>Low stock</span>}
        {showRating && <span style={{ fontSize: 12, opacity: 0.75 }}>{rating}</span>}
      </div>
    );
  }
  function SocialRow() {
    if (!showSocial) return null;
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ display: "flex" }}>
          {["AR", "MK", "JD"].map((n, i) => (
            <span key={n} style={{ width: 24, height: 24, borderRadius: "50%", background: ["#52525B", "#71717A", "#3F3F46"][i], border: "2px solid white", marginLeft: i ? -8 : 0, display: "inline-grid", placeItems: "center", fontSize: 8, fontWeight: 700, color: "#fff" }}>{n}</span>
          ))}
        </span>
        <span style={{ fontSize: 12, opacity: 0.75 }}>{socialCount}</span>
      </div>
    );
  }
  function CountRow() {
    if (!showCount) return null;
    if (cdHero) {
      return (
        <div style={{ display: "flex", alignItems: "center", gap: 12 }} role="timer">
          <span style={{ fontSize: 28, fontWeight: 900, lineHeight: 1, fontFamily: "'JetBrains Mono', monospace" }}>{expired ? "00:00:00" : countdown}</span>
          <span style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.12em", opacity: 0.8 }}>{expired ? cdExpired : `${cdLabel} • FW25`}</span>
        </div>
      );
    }
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, fontFamily: "'JetBrains Mono', monospace", opacity: 0.9 }} role="timer">
        <Timer size={13} />
        <span>{expired ? cdExpired : countdown}</span>
        <span style={{ fontFamily: "Inter, sans-serif", opacity: 0.6 }}>{cdLabel} — CTA pinned TOP but overridable</span>
      </div>
    );
  }
  function MediaBox({ id, minH = 200, label = true }: { id: string; minH?: number; label?: boolean }) {
    const m = byId[id];
    if (!m) return null;
    const ghost = hiddenForDevice(m);
    return (
      <div
        {...focalHandlers(id)}
        onClick={(e) => { e.stopPropagation(); const i = layers.findIndex((l) => l.id === id); if (i >= 0) setSelection({ kind: "layer", index: i }); }}
        title={m.locked ? "Lock — prevent drag/edit" : "Drag orange dot on canvas for primary — Click to set focal"}
        className="hs-zoomable"
        style={{
          position: "relative", minHeight: minH, borderRadius: Math.max(0, radius - 4),
          background: "linear-gradient(135deg, #27272A 0%, #3F3F46 45%, #52525B 100%)",
          overflow: "hidden", cursor: m.locked ? "not-allowed" : "crosshair",
          opacity: ghost || !m.visible ? 0.3 : 1, touchAction: "none",
        }}
      >
        <div className="hs-zoom" style={{ position: "absolute", inset: 0 }}>
          {fxMesh && <div style={{ position: "absolute", inset: 0, background: `radial-gradient(circle at 70% 20%, ${accent}55 0%, transparent 55%), radial-gradient(circle at 20% 85%, #7C3AED44 0%, transparent 50%)` }} />}
        </div>
        {fxNoise && <div className="hs-grain" style={{ position: "absolute", inset: 0, opacity: 0.5, mixBlendMode: fxBlend ? "overlay" : "normal" }} />}
        <div style={{ position: "absolute", inset: 0, background: `linear-gradient(to top, rgba(0,0,0,${fxGradient / 100}) 0%, transparent 60%)` }} />
        {m.fx !== undefined && m.fy !== undefined && (
          <span style={{ position: "absolute", left: `${m.fx}%`, top: `${m.fy}%`, width: 16, height: 16, borderRadius: "50%", background: accent, border: "2px solid #fff", boxShadow: "0 2px 8px rgba(0,0,0,0.5)", transform: "translate(-50%,-50%)", zIndex: 5 }} />
        )}
        {label && (
          <span style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", color: "rgba(255,255,255,0.8)", fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", whiteSpace: "nowrap" }}>
            {m.label.toUpperCase()} · {m.fx ?? 50}/{m.fy ?? 50}{reduce800 ? " · 800w" : ""}
          </span>
        )}
        {ghost && <span style={{ position: "absolute", top: 8, left: 8, fontSize: 10, background: "#27272A", color: "#a1a1aa", padding: "2px 8px", borderRadius: 999 }}>Ghosted 30 — {device}</span>}
      </div>
    );
  }

  function HeroCard() {
    const card: React.CSSProperties = {
      background: fxGlass ? "rgba(255,255,255,0.08)" : cardBg,
      backdropFilter: fxGlass ? "blur(16px)" : undefined,
      color: cardInk, borderRadius: radius,
      border: fxGlass ? "1px solid rgba(255,255,255,0.15)" : "1px solid rgba(128,128,128,0.25)",
      overflow: "hidden",
      boxShadow: shadow ? "0 20px 60px rgba(0,0,0,0.35)" : "none",
      cursor: "pointer",
    };
    const pad: React.CSSProperties = { padding: "36px 32px", display: "flex", flexDirection: "column", justifyContent: "center", gap: 14 };
    const desc = layers.find((l) => l.id === "l-desc");
    switch (layout) {
      case "split":
        return (
          <div className="hs-hero-split" onClick={() => setSelection({ kind: "slide" })} style={{ ...card, display: "grid", gridTemplateColumns: "1fr 1fr", gap }}>
            <MediaBox id="l-p" minH={380} />
            <div style={pad}>
              <BadgePill />
              <TitleBlock size={3} />
              {desc?.visible && <p style={{ margin: 0, fontSize: 14, lineHeight: desc.lineHeight, opacity: 0.72, maxWidth: desc.maxWidth }}>{MOCK_SLIDE.description}</p>}
              <PriceRow />
              <CtaRow />
              <SocialRow />
              <CountRow />
            </div>
          </div>
        );
      case "grid":
        return (
          <div onClick={() => setSelection({ kind: "slide" })} style={{ ...card, padding: 24, display: "flex", flexDirection: "column", gap }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, alignItems: "center", textAlign: "center" }}>
              <BadgePill />
              <TitleBlock size={4} alignCenter />
              <CtaRow />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap }}>
              <MediaBox id="l-p" minH={220} />
              <MediaBox id="l-s" minH={220} />
              <MediaBox id="l-t" minH={160} />
              <MediaBox id="l-q" minH={160} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
              <PriceRow />
              <SocialRow />
            </div>
          </div>
        );
      case "bento":
        return (
          <div onClick={() => setSelection({ kind: "slide" })} style={{ ...card, padding: 20, display: "grid", gridTemplateColumns: "1.4fr 1fr", gridTemplateRows: "auto auto", gap }}>
            <div style={{ gridRow: "1 / 3" }}><MediaBox id="l-p" minH={420} /></div>
            <div style={{ ...pad, padding: 16 }}>
              <BadgePill />
              <TitleBlock size={3} />
              <CtaRow />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap }}>
              <MediaBox id="l-s" minH={140} label={false} />
              <MediaBox id="l-t" minH={140} label={false} />
            </div>
          </div>
        );
      case "asym":
        return (
          <div onClick={() => setSelection({ kind: "slide" })} style={{ ...card, display: "grid", gridTemplateColumns: "2fr 3fr", gap: 0 }}>
            <div style={{ ...pad }}>
              <BadgePill />
              <TitleBlock size={3} />
              {desc?.visible && <p style={{ margin: 0, fontSize: 13, opacity: 0.72 }}>{MOCK_SLIDE.description}</p>}
              <PriceRow />
              <CtaRow />
              <CountRow />
            </div>
            <div style={{ position: "relative" }}>
              <MediaBox id="l-p" minH={440} />
              <div style={{ position: "absolute", bottom: 16, left: -40, background: cardBg, borderRadius: 12, padding: 12, boxShadow: "0 12px 32px rgba(0,0,0,0.35)", border: "1px solid rgba(128,128,128,0.25)" }}>
                <SocialRow />
              </div>
            </div>
          </div>
        );
      case "masonry":
        return (
          <div onClick={() => setSelection({ kind: "slide" })} style={{ ...card, padding: 20 }}>
            <div style={{ textAlign: "center", marginBottom: 16 }}>
              <BadgePill />
              <TitleBlock size={4} alignCenter />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap, alignItems: "start" }}>
              <div style={{ display: "flex", flexDirection: "column", gap }}><MediaBox id="l-p" minH={300} /><MediaBox id="l-q" minH={150} label={false} /></div>
              <div style={{ display: "flex", flexDirection: "column", gap }}><MediaBox id="l-s" minH={180} /><CtaRow /><MediaBox id="l-t" minH={180} label={false} /></div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: 8 }}><PriceRow /><SocialRow /><CountRow /></div>
            </div>
          </div>
        );
      case "filmstrip":
        return (
          <div onClick={() => setSelection({ kind: "slide" })} style={{ ...card, padding: 20 }}>
            <div style={{ textAlign: "center", marginBottom: 12 }}>
              <BadgePill />
              <TitleBlock size={4} alignCenter />
            </div>
            <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 8, scrollSnapType: "x mandatory" }}>
              {(["l-p", "l-s", "l-t", "l-q"] as const).map((mid, k) => (
                <div key={mid} style={{ minWidth: 220, flexShrink: 0, scrollSnapAlign: "start" }}>
                  <MediaBox id={mid} minH={260} />
                  <p style={{ fontSize: 11, margin: "6px 0 0", opacity: 0.7 }}>Look 0{k + 1} — {byId[mid]?.label}</p>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12, flexWrap: "wrap", gap: 8 }}>
              <PriceRow />
              <CtaRow />
            </div>
          </div>
        );
      case "lookbook":
        return (
          <div onClick={() => setSelection({ kind: "slide" })} style={{ ...card, padding: 28 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 16, gap: 12 }}>
              <div>
                <BadgePill />
                <TitleBlock size={4} />
              </div>
              <span style={{ fontSize: 11, opacity: 0.6, whiteSpace: "nowrap" }}>FW25 / Editorial 03</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap }}>
              <div>
                <MediaBox id="l-p" minH={420} />
                <p style={{ fontSize: 11, margin: "6px 0 0", opacity: 0.7 }}>Look 01 — {product}</p>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap }}>
                <MediaBox id="l-s" minH={200} />
                <MediaBox id="l-t" minH={200} />
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16, flexWrap: "wrap", gap: 8 }}>
              <PriceRow />
              <SocialRow />
              <CtaRow />
            </div>
            <CountRow />
          </div>
        );
      case "immersive":
      default:
        return (
          <div onClick={() => setSelection({ kind: "slide" })} style={{ ...card, position: "relative", minHeight: 560, display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: 40, gap: 14, overflow: "hidden" }}>
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, #1b1b1f 0%, #2b2b31 55%, #3a2a20 100%)" }} />
            {fxMesh && <div style={{ position: "absolute", inset: 0, background: `radial-gradient(circle at 75% 15%, ${accent}44 0%, transparent 50%)` }} />}
            {fxNoise && <div className="hs-grain" style={{ position: "absolute", inset: 0, opacity: 0.5 }} />}
            <div style={{ position: "relative", display: "flex", flexDirection: "column", gap: 14, alignItems: "flex-start" }}>
              <BadgePill />
              <TitleBlock size={5} />
              {desc?.visible && <p style={{ margin: 0, fontSize: 15, lineHeight: desc.lineHeight, opacity: 0.75, maxWidth: 560, cursor: "pointer" }}>{MOCK_SLIDE.description}</p>}
              <CtaRow />
              <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
                <PriceRow />
                <SocialRow />
              </div>
              <CountRow />
            </div>
            <span style={{ position: "absolute", bottom: 16, right: 20, fontSize: 11, opacity: 0.5 }}>Scroll to explore ↓</span>
          </div>
        );
    }
  }

  // ── Rendu ───────────────────────────────────────────────────────────────
  const meta = DEVICE_META[device];
  return (
    <div
      className="hs-root hs-anim-fade"
      style={{
        position: "fixed", inset: 0, zIndex: 100, display: "flex", flexDirection: "column",
        background: "var(--hs-bg)", color: "var(--hs-text)",
        fontFamily: "Inter, system-ui, sans-serif", overflow: "hidden",
        ["--hs-live-accent" as string]: accent,
      }}
    >
      {/* ── Barre haute 02 ──────────────────────────────────────── */}
      <div style={{ height: 56, flexShrink: 0, background: "var(--hs-panel)", borderBottom: "1px solid var(--hs-border)", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 12px", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          <button onClick={onBackToAdmin} title="Retour admin" style={{ display: "flex", alignItems: "center", gap: 6, background: "transparent", border: "1px solid var(--hs-border)", color: "var(--hs-muted)", borderRadius: 999, padding: "6px 10px", cursor: "pointer", fontSize: 12 }}>
            <ArrowLeft size={14} /> Admin
          </button>
          <button onClick={onReturnToStore} title="Retour boutique" style={{ background: "transparent", border: "none", color: "var(--hs-faint)", cursor: "pointer", fontSize: 12, textDecoration: "underline" }}>boutique</button>
          <span style={{ width: 24, height: 24, borderRadius: "50%", background: "var(--hs-text)", color: "var(--hs-bg)", display: "grid", placeItems: "center", fontSize: 11, fontWeight: 800 }}>◉</span>
          <span style={{ fontWeight: 600, fontSize: 14, letterSpacing: "-0.01em", whiteSpace: "nowrap" }}>Hero Studio</span>
          <span style={{ fontSize: 10, fontWeight: 500, padding: "2px 8px", borderRadius: 999, background: "var(--hs-accent-soft)", color: "#FF8A4D", border: "1px solid rgba(255,107,33,0.25)", whiteSpace: "nowrap" }}>Versatile Engine</span>
          <button
            onClick={() => setAttached((a) => !a)}
            title="Reset Attached"
            style={{ fontSize: 10, padding: "2px 8px", borderRadius: 999, border: "1px solid var(--hs-border2)", background: attached ? "rgba(245,158,11,0.15)" : "var(--hs-panel2)", color: attached ? "#FCD34D" : "var(--hs-muted)", cursor: "pointer", whiteSpace: "nowrap" }}
          >
            {attached ? "● Attached" : "○ Detached"}
          </button>
        </div>

        <div className="hs-layoutbar" style={{ display: "flex", alignItems: "center", gap: 2, background: "var(--hs-panel2)", border: "1px solid var(--hs-border)", borderRadius: 999, padding: 3, overflowX: "auto", maxWidth: "46vw", flexShrink: 1 }}>
          {LAYOUTS.map((l) => (
            <button
              key={l.id}
              onClick={() => applyTemplate(l.id)}
              title={l.label}
              style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 11px", borderRadius: 999, border: layout === l.id ? "1px solid var(--hs-accent)" : "1px solid transparent", background: layout === l.id ? "var(--hs-accent-soft)" : "transparent", color: layout === l.id ? "#FFB37E" : "var(--hs-muted)", fontSize: 12, cursor: "pointer", whiteSpace: "nowrap" }}
            >
              <l.icon size={13} /> {l.label}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ display: "flex", gap: 4, alignItems: "center" }} title="Studio theme">
            {THEMES.map((t) => (
              <button key={t.id} onClick={() => setTheme(t.id)} title={t.label} style={{ width: 16, height: 16, borderRadius: "50%", border: theme === t.id ? "2px solid var(--hs-accent)" : "1px solid #a1a1aa", background: t.canvas, cursor: "pointer", padding: 0 }} />
            ))}
          </span>
          <div style={{ display: "flex", background: "var(--hs-panel2)", border: "1px solid var(--hs-border)", borderRadius: 999, padding: 2 }}>
            {(["desktop", "tablet", "mobile"] as Device[]).map((d) => (
              <button key={d} onClick={() => setDevice(d)} style={{ padding: "5px 8px", borderRadius: 999, border: "none", background: device === d ? "#3f3f46" : "transparent", color: device === d ? "#fff" : "var(--hs-faint)", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontSize: 11 }} title={d}>
                {d === "desktop" ? <Monitor size={13} /> : d === "tablet" ? <Tablet size={13} /> : <Smartphone size={13} />}
                {d === "desktop" ? "Desktop" : d === "tablet" ? "Tablet" : "Mobile"}
              </button>
            ))}
          </div>
          <button
            onClick={() => { setThemeAware((v) => !v); toast(themeAware ? "ThemeAware off" : "ThemeAware on"); }}
            title="ThemeAware"
            style={{ fontSize: 11, padding: "6px 10px", borderRadius: 999, border: themeAware ? "1px solid #10B981" : "1px solid var(--hs-border)", background: "transparent", color: themeAware ? "#6EE7B7" : "var(--hs-faint)", cursor: "pointer", whiteSpace: "nowrap" }}
          >
            ● ThemeAware
          </button>
          <button onClick={undo} disabled={past.length === 0} title="Annuler (Ctrl+Z)" style={{ padding: 7, borderRadius: 8, border: "1px solid var(--hs-border)", background: "transparent", color: past.length ? "var(--hs-text)" : "var(--hs-faint)", cursor: past.length ? "pointer" : "default" }}><Undo2 size={14} /></button>
          <button onClick={redo} disabled={future.length === 0} title="Rétablir (Ctrl+Y)" style={{ padding: 7, borderRadius: 8, border: "1px solid var(--hs-border)", background: "transparent", color: future.length ? "var(--hs-text)" : "var(--hs-faint)", cursor: future.length ? "pointer" : "default" }}><Redo2 size={14} /></button>
          <button onClick={() => setExportOpen(true)} style={{ height: 32, padding: "0 14px", borderRadius: 999, border: "1px solid var(--hs-border)", background: "transparent", color: "var(--hs-text)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Export</button>
          <button onClick={() => toast("Published (maquette) — polling + Deploy Hook en prod")} style={{ height: 32, padding: "0 16px", borderRadius: 999, border: "none", background: accent, color: "#000", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Publish</button>
        </div>
      </div>

      {/* ── Corps 3 colonnes ────────────────────────────────────── */}
      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
        {/* Panneau gauche : templates + couches + media + add block */}
        <div style={{ width: 264, flexShrink: 0, background: "var(--hs-panel)", borderRight: "1px solid var(--hs-border)", display: "flex", flexDirection: "column", minHeight: 0 }}>
          <div style={{ flex: 1, overflowY: "auto", padding: "12px 12px 16px", display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={groupLabel}>Templates</span>
                <button onClick={() => toast("View All — 6 templates")} style={miniBtn}>View All</button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
                {LAYOUTS.map((l) => (
                  <button key={l.id} onClick={() => applyTemplate(l.id)} title={l.label} style={{ border: layout === l.id ? "1px solid var(--hs-accent)" : "1px solid var(--hs-border)", background: "var(--hs-panel2)", borderRadius: 8, padding: "8px 4px 6px", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 4, color: layout === l.id ? "#FFB37E" : "var(--hs-muted)" }}>
                    <l.icon size={16} />
                    <span style={{ fontSize: 9 }}>{l.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={groupLabel}>Layers • Z-index</span>
                <span style={{ display: "flex", gap: 4 }}>
                  <button onClick={() => { if (layerSel) toFront(layerIndex); }} title="Front" style={miniBtn}>Front</button>
                  <button onClick={() => { if (layerSel) toBack(layerIndex); }} title="Back" style={miniBtn}>Back</button>
                </span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                {ordered.map((l) => {
                  const i = layers.findIndex((x) => x.id === l.id);
                  const active = selection.kind === "layer" && selection.index === i;
                  return (
                    <div
                      key={l.id}
                      onClick={() => { setSelection({ kind: "layer", index: i }); setInspectorTab(l.kind === "cta" ? "commerce" : "type"); }}
                      style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 6px", borderRadius: 8, border: active ? "1px solid var(--hs-accent)" : "1px solid var(--hs-border)", background: active ? "var(--hs-accent-soft)" : "var(--hs-panel2)", cursor: "pointer", opacity: l.visible ? 1 : 0.45 }}
                    >
                      <GripVertical size={11} style={{ color: "var(--hs-faint)", flexShrink: 0 }} />
                      <span style={{ color: active ? "#FFB37E" : "var(--hs-faint)", flexShrink: 0 }}><LayerIcon icon={l.icon} size={12} /></span>
                      <span style={{ fontSize: 11, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0, flexShrink: 1 }}>{l.short}</span>
                      <span title="z-index" style={{ fontSize: 8, fontFamily: "'JetBrains Mono', monospace", color: "var(--hs-faint)", flexShrink: 0 }}>z:{l.z}</span>
                      {l.topPinned && <span style={{ fontSize: 8, fontWeight: 800, padding: "1px 5px", borderRadius: 999, background: accent, color: "#000", flexShrink: 0 }}>TOP</span>}
                      <button onClick={(e) => { e.stopPropagation(); patchLayer(i, { visible: !l.visible }); }} title="Eye hides everywhere" style={rowBtn}>{l.visible ? <Eye size={12} /> : <EyeOff size={12} />}</button>
                      <button onClick={(e) => { e.stopPropagation(); patchLayer(i, { locked: !l.locked }); }} title="Lock (prevent drag/edit)" style={{ ...rowBtn, color: l.locked ? "#FCD34D" : "var(--hs-faint)" }}>{l.locked ? <Lock size={11} /> : <span style={{ fontSize: 9, width: 11, textAlign: "center" }}>○</span>}</button>
                      <button onClick={(e) => { e.stopPropagation(); patchLayer(i, { hideDesktop: !l.hideDesktop }); }} title="Desktop only hide" style={{ ...rowBtn, background: l.hideDesktop ? accent : "transparent", color: l.hideDesktop ? "#000" : "var(--hs-faint)", fontSize: 8, fontWeight: 800, width: 15, height: 15, borderRadius: 4 }}>D</button>
                      <button onClick={(e) => { e.stopPropagation(); patchLayer(i, { hideMobile: !l.hideMobile }); }} title="Mobile only hide" style={{ ...rowBtn, background: l.hideMobile ? accent : "transparent", color: l.hideMobile ? "#000" : "var(--hs-faint)", fontSize: 8, fontWeight: 800, width: 15, height: 15, borderRadius: 4 }}>M</button>
                      <span style={{ display: "flex", flexDirection: "column", flexShrink: 0 }}>
                        <button onClick={(e) => { e.stopPropagation(); moveZ(i, 1); }} title="Monter (z-index)" style={{ ...rowBtn, padding: 0 }}><ChevronUp size={10} /></button>
                        <button onClick={(e) => { e.stopPropagation(); moveZ(i, -1); }} title="Descendre (z-index)" style={{ ...rowBtn, padding: 0 }}><ChevronDown size={10} /></button>
                      </span>
                    </div>
                  );
                })}
              </div>
              <p style={{ fontSize: 10, color: "var(--hs-faint)", margin: "8px 0 0", lineHeight: 1.5 }}>
                Eye hides everywhere. Hide-on respects breakpoint — different from eye visibility.
              </p>
            </div>

            <div>
              <span style={groupLabel}>Media</span>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginTop: 8 }}>
                {["l-p", "l-s", "l-t", "l-q"].map((id) => {
                  const m = byId[id];
                  if (!m) return null;
                  const i = layers.findIndex((x) => x.id === id);
                  const active = selection.kind === "layer" && selection.index === i;
                  return (
                    <div key={id} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <button
                        onClick={() => { setSelection({ kind: "layer", index: i }); }}
                        title="Click thumbnail to set focal point"
                        style={{ position: "relative", border: active ? "1px solid var(--hs-accent)" : "1px solid var(--hs-border)", borderRadius: 8, background: "linear-gradient(135deg,#27272A,#3F3F46)", minHeight: 64, cursor: "crosshair", overflow: "hidden", padding: 0 }}
                      >
                        <span style={{ position: "absolute", top: 4, left: 6, fontSize: 8, fontWeight: 700, color: "#fff", background: "rgba(0,0,0,0.5)", padding: "1px 6px", borderRadius: 999 }}>{m.label.split(" ")[0]}</span>
                        <span style={{ position: "absolute", bottom: 4, left: 4, display: "flex", gap: 3 }}>
                          <span style={{ fontSize: 8, color: "#fff", background: "rgba(0,0,0,0.6)", padding: "1px 5px", borderRadius: 999 }}>Desktop 4/3</span>
                          <span style={{ fontSize: 8, color: "#fff", background: "rgba(0,0,0,0.6)", padding: "1px 5px", borderRadius: 999 }}>Mobile 9/16</span>
                        </span>
                        {m.fx !== undefined && (
                          <span style={{ position: "absolute", left: `${m.fx}%`, top: `${m.fy}%`, width: 12, height: 12, borderRadius: "50%", background: accent, border: "2px solid #fff", transform: "translate(-50%,-50%)" }} />
                        )}
                      </button>
                      <span style={{ display: "flex", gap: 3, justifyContent: "center" }}>
                        {(["4/5", "1/1", "16/9"] as const).map((a) => (
                          <button key={a} onClick={() => patchLayer(i, { aspect: a })} title={a} style={{ fontSize: 8, fontFamily: "'JetBrains Mono', monospace", padding: "1px 5px", borderRadius: 4, border: m.aspect === a ? "1px solid var(--hs-accent)" : "1px solid var(--hs-border)", background: m.aspect === a ? "var(--hs-accent-soft)" : "transparent", color: m.aspect === a ? "#FFB37E" : "var(--hs-faint)", cursor: "pointer" }}>{a}</button>
                        ))}
                      </span>
                    </div>
                  );
                })}
              </div>
              {selMedia && (
                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                  <label style={{ flex: 1, fontSize: 10, color: "var(--hs-muted)" }}>Focal X — {selMedia.fx ?? 50}
                    <input type="range" min={0} max={100} value={selMedia.fx ?? 50} onChange={(e) => patchById(selMedia.id, { fx: Number(e.target.value) })} style={{ width: "100%", accentColor: "var(--hs-accent)" }} />
                  </label>
                  <label style={{ flex: 1, fontSize: 10, color: "var(--hs-muted)" }}>Focal Y — {selMedia.fy ?? 50}
                    <input type="range" min={0} max={100} value={selMedia.fy ?? 50} onChange={(e) => patchById(selMedia.id, { fy: Number(e.target.value) })} style={{ width: "100%", accentColor: "var(--hs-accent)" }} />
                  </label>
                </div>
              )}
              <p style={{ fontSize: 10, color: "var(--hs-faint)", margin: "6px 0 0", lineHeight: 1.5 }}>
                Click thumbnail to set focal point • Drag orange dot on canvas for primary. Use different focal points per breakpoint for better cropping.
              </p>
            </div>

            <div>
              <span style={groupLabel}>Add Block</span>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginTop: 8 }}>
                {ADD_BLOCKS.map((b) => (
                  <button key={b.label} onClick={() => addBlock(b.kind, b.icon, b.label.replace(" +", ""))} style={{ textAlign: "left", border: "1px solid var(--hs-border)", background: "var(--hs-panel2)", borderRadius: 8, padding: "8px 10px", cursor: "pointer" }}>
                    <span style={{ display: "block", fontSize: 11, fontWeight: 600, color: accent }}>{b.label}</span>
                    <span style={{ display: "block", fontSize: 10, color: "var(--hs-faint)" }}>{b.hint}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Canvas central + filmstrip */}
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", background: themeDef.canvas, color: themeDef.canvasInk, transition: "background 0.25s" }}>
          <div style={{ padding: "10px 16px", display: "flex", alignItems: "center", gap: 8, borderBottom: theme === "dark" ? "1px solid var(--hs-border)" : "1px solid #e4e4e7", fontSize: 11, color: theme === "dark" ? "var(--hs-faint)" : "#71717a" }}>
            <span style={{ color: "#10B981" }}>●</span>
            <span>Live Preview • {meta.dims} • {layout} • sel: {selLabel}</span>
            <span style={{ fontSize: 10, padding: "1px 8px", borderRadius: 999, border: "1px solid currentColor", opacity: 0.7 }}>auto-fit{autoFit ? " on" : " off"}</span>
            {overflow && <span style={{ fontSize: 10, padding: "1px 8px", borderRadius: 999, background: "rgba(255,107,33,0.15)", color: "#FF6B21", border: "1px solid #FF6B21" }}>overflow detected</span>}
          </div>

          <div className="hs-canvas-frame" style={{ flex: 1, overflowY: "auto", display: "flex", justifyContent: "center", padding: 24, minHeight: 0 }}>
            <div className={cx(animIn && "hs-anim-slide")} style={{ width: Math.min(meta.width, 960), maxWidth: "100%", flexShrink: 0, alignSelf: "flex-start" }}>
              <MarqueeBar />
              <HeroCard />
              <p style={{ fontSize: 11, marginTop: 12, opacity: 0.55, textAlign: "center" }}>
                Check canvas — orange outline if overflow detected · wrap then shrink if still overflow.
              </p>
            </div>
          </div>

          <div style={{ flexShrink: 0, borderTop: theme === "dark" ? "1px solid var(--hs-border)" : "1px solid #e4e4e7", padding: "8px 16px", display: "flex", alignItems: "center", gap: 8, overflowX: "auto", scrollSnapType: "x mandatory" }}>
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", color: theme === "dark" ? "var(--hs-faint)" : "#71717a", display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}><Film size={12} /> FILMSTRIP</span>
            {LAYOUTS.map((l) => (
              <button key={l.id} onClick={() => applyTemplate(l.id)} style={{ flexShrink: 0, width: 120, scrollSnapAlign: "start", border: layout === l.id ? "1px solid var(--hs-accent)" : "1px solid rgba(128,128,128,0.3)", borderRadius: 8, background: theme === "dark" ? "#1c1c1f" : "#fff", padding: "10px 6px 8px", cursor: "pointer", color: "inherit" }}>
                <span style={{ display: "flex", justifyContent: "center", marginBottom: 4, opacity: 0.7 }}><l.icon size={15} /></span>
                <span style={{ display: "block", fontSize: 10, opacity: 0.7 }}>{l.label} live</span>
                <span style={{ display: "block", height: 3, borderRadius: 999, marginTop: 6, background: layout === l.id ? accent : "rgba(128,128,128,0.3)" }} />
              </button>
            ))}
          </div>
        </div>

        {/* Inspecteur droite : Style / Type / Effects / Motion / Commerce */}
        <div style={{ width: 300, flexShrink: 0, background: "var(--hs-panel)", borderLeft: "1px solid var(--hs-border)", display: "flex", flexDirection: "column", minHeight: 0 }}>
          <div style={{ display: "flex", borderBottom: "1px solid var(--hs-border)" }}>
            {(["style", "type", "effects", "motion", "commerce"] as InspectorTab[]).map((t) => (
              <button
                key={t}
                onClick={() => setInspectorTab(t)}
                style={{ flex: 1, padding: "11px 0", background: inspectorTab === t ? "var(--hs-panel2)" : "transparent", border: "none", borderRadius: inspectorTab === t ? 999 : 0, margin: 4, color: inspectorTab === t ? "var(--hs-text)" : "var(--hs-faint)", fontSize: 11, fontWeight: 600, textTransform: "capitalize", cursor: "pointer" }}
              >
                {t}
              </button>
            ))}
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 18 }}>
            {inspectorTab === "style" && (
              <>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}><span>Radius</span><span style={{ fontFamily: "'JetBrains Mono', monospace", opacity: 0.7 }}>{radius}px</span></div>
                  <input type="range" min={0} max={32} value={radius} onChange={(e) => setRadius(Number(e.target.value))} style={{ width: "100%", accentColor: accent }} />
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginTop: 8 }}><span>Gap</span><span style={{ fontFamily: "'JetBrains Mono', monospace", opacity: 0.7 }}>{gap}px</span></div>
                  <input type="range" min={0} max={48} value={gap} onChange={(e) => setGap(Number(e.target.value))} style={{ width: "100%", accentColor: accent }} />
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
                    <span style={{ fontSize: 12 }}>Shadow</span>
                    <button onClick={() => setShadow((v) => !v)} style={toggleBtn(shadow)}><span style={toggleDot(shadow)} /></button>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
                    <span style={{ fontSize: 12 }}>ThemeAware</span>
                    <button onClick={() => setThemeAware((v) => !v)} style={toggleBtn(themeAware)}><span style={toggleDot(themeAware)} /></button>
                  </div>
                </div>
                <Section title="Typography Quick" hint="clamp(2rem, 5vw, 4.5rem) — aperçu police globale.">
                  <div style={{ border: "1px solid var(--hs-border)", borderRadius: 8, padding: 12, background: "var(--hs-panel2)" }}>
                    <span style={{ fontSize: 26, fontWeight: 900, fontFamily: `'${globalFont}', sans-serif` }}>Aa FALL</span>
                  </div>
                </Section>
                <Section title="Tokens">
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
                    {[["Primary", tokenPrimary, setTokenPrimary], ["Bg", tokenBg, setTokenBg], ["Text", tokenText, setTokenText]].map(([label, val, set]) => (
                      <label key={label as string} style={{ border: "1px solid var(--hs-border)", borderRadius: 8, padding: 8, display: "flex", flexDirection: "column", gap: 6, alignItems: "center", fontSize: 10, color: "var(--hs-muted)", cursor: "pointer" }}>
                        <input type="color" value={val as string} onChange={(e) => (set as (v: string) => void)(e.target.value)} style={{ width: "100%", height: 28, border: "none", borderRadius: 6, background: "none", cursor: "pointer", padding: 0 }} />
                        {label as string}
                      </label>
                    ))}
                  </div>
                </Section>
                <Section title="Performance Budget">
                  <div style={{ border: "1px solid var(--hs-border)", borderRadius: 8, padding: 12, background: "var(--hs-panel2)", display: "flex", flexDirection: "column", gap: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, fontWeight: 600 }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 6 }}><Gauge size={13} /> Performance Budget</span>
                      <span style={{ fontSize: 10, background: "rgba(16,185,129,0.15)", color: "#6EE7B7", padding: "2px 8px", borderRadius: 999 }}>Score 84</span>
                    </div>
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--hs-muted)" }}><span>1.2MB / 3MB</span><span>LCP 1.1s</span></div>
                      <div style={{ height: 5, borderRadius: 999, background: "#27272A", marginTop: 4 }}>
                        <div style={{ width: "40%", height: "100%", borderRadius: 999, background: "linear-gradient(90deg,#10B981,#F59E0B)" }} />
                      </div>
                    </div>
                    <label style={checkRow}><input type="checkbox" checked={reduce800} onChange={(e) => setReduce800(e.target.checked)} /> Reduce primary image to 800w</label>
                    <label style={checkRow}><input type="checkbox" checked={lazySecondary} onChange={(e) => setLazySecondary(e.target.checked)} /> Lazy secondary</label>
                    <label style={checkRow}><input type="checkbox" checked={preloadFont} onChange={(e) => setPreloadFont(e.target.checked)} /> Preload font</label>
                  </div>
                </Section>
              </>
            )}

            {inspectorTab === "type" && (
              <>
                <Section title="Global Font Control" hint="Affects all text blocks unless locked.">
                  <div style={{ display: "flex", gap: 8 }}>
                    <select value={globalFont} onChange={(e) => setGlobalFont(e.target.value)} style={{ ...selectStyle, flex: 1 }}>
                      {MOCK_FONTS.map((f) => <option key={f}>{f}</option>)}
                    </select>
                    <button onClick={() => setFontOpen(true)} style={ghostBtn}>Library</button>
                  </div>
                  <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                    <button onClick={applyGlobalFont} style={{ ...ghostBtn, flex: 1 }}>Apply to All</button>
                    <button onClick={() => { setAutoFit((v) => !v); toast(autoFit ? "auto-fit off" : "auto-fit reduce font-size to fit container"); }} style={{ ...ghostBtn, flex: 1, borderColor: autoFit ? "var(--hs-accent)" : "var(--hs-border)" }}>Auto-fit {autoFit ? "on" : "off"}</button>
                  </div>
                </Section>
                {selectedLayer ? (
                  <>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <strong style={{ fontSize: 13 }}>{selectedLayer.label}</strong>
                      <span style={{ display: "flex", gap: 4 }}>
                        <button onClick={() => patchLayer(layerIndex, { locked: !selectedLayer.locked })} title="Lock / Hide (any element)" style={iconBtn}>{selectedLayer.locked ? <Lock size={13} /> : <LockOpen size={13} />}</button>
                        <button onClick={() => setHide(layerIndex, selectedLayer.hideMobile ? "none" : "mobile")} title="Mobile only hide" style={{ ...iconBtn, borderColor: selectedLayer.hideMobile ? "var(--hs-accent)" : "var(--hs-border)", color: selectedLayer.hideMobile ? "#FFB37E" : "var(--hs-faint)" }}>M</button>
                        <button onClick={() => setHide(layerIndex, selectedLayer.hideDesktop ? "none" : "desktop")} title="Desktop only hide" style={{ ...iconBtn, borderColor: selectedLayer.hideDesktop ? "var(--hs-accent)" : "var(--hs-border)", color: selectedLayer.hideDesktop ? "#FFB37E" : "var(--hs-faint)" }}>D</button>
                      </span>
                    </div>
                    <Section title="Font Family" hint={selectedLayer.fontLocked ? "🔒 DD12. Locked blocks show badge next to font name." : "Suit la police globale sauf si verrouillé."}>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <select value={selectedLayer.fontFamily} onChange={(e) => patchLayer(layerIndex, { fontFamily: e.target.value })} style={{ ...selectStyle, flex: 1 }}>
                          {MOCK_FONTS.map((f) => <option key={f}>{f}</option>)}
                        </select>
                        <button onClick={() => patchLayer(layerIndex, { fontLocked: !selectedLayer.fontLocked })} title="DD12 / DD13 lock" style={{ ...iconBtn, borderColor: selectedLayer.fontLocked ? "#FCD34D" : "var(--hs-border)" }}>{selectedLayer.fontLocked ? <Lock size={13} /> : <LockOpen size={13} />}</button>
                      </div>
                      <p style={{ fontSize: 10, color: "var(--hs-faint)", margin: "6px 0 0" }}>Hint: Select line to override — double-click title word on canvas.</p>
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
                          <select style={selectStyle} defaultValue="balance"><option>balance / pretty</option><option>single line</option><option>Shrink (fit)</option></select>
                        </label>
                      </div>
                      <label style={{ ...checkRow, marginTop: 8 }}><input type="checkbox" checked={selectedLayer.balance} onChange={(e) => patchLayer(layerIndex, { balance: e.target.checked })} /> balance controls — helps avoid orphans</label>
                      <label style={{ ...checkRow, marginTop: 8 }}><input type="checkbox" checked={pretty} onChange={(e) => setPretty(e.target.checked)} /> Pretty {pretty ? "✓" : ""} (text-wrap)</label>
                      <label style={labelStyle}>Highlight word — mot {highlightWord + 1} / 2</label>
                      <input type="range" min={0} max={1} step={1} value={highlightWord} onChange={(e) => setHighlightWord(Number(e.target.value))} style={{ width: "100%", accentColor: "var(--hs-accent)" }} />
                    </Section>
                    <Section title="Hide on" hint="Different from eye visibility: Hide-on respects breakpoint.">
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        <button onClick={() => setHide(layerIndex, "all")} style={ghostBtn}>All devices (ghosted)</button>
                        <button onClick={() => setHide(layerIndex, "desktop")} style={ghostBtn}>Desktop only hide</button>
                        <button onClick={() => setHide(layerIndex, "mobile")} style={ghostBtn}>Mobile only hide</button>
                        <button onClick={() => setHide(layerIndex, "none")} style={ghostBtn}>None (show everywhere)</button>
                      </div>
                    </Section>
                  </>
                ) : (
                  <div style={{ fontSize: 12, color: "var(--hs-faint)", textAlign: "center", padding: "32px 0" }}>
                    No layer selected.<br />Select a text layer (Title, Description…) in left Layers pane or click text on canvas to edit its font.
                  </div>
                )}
              </>
            )}

            {inspectorTab === "effects" && (
              <>
                <Section title="Backgrounds" hint="Presets figés, data-URI légers.">
                  <label style={checkRow}><input type="checkbox" checked={fxMesh} onChange={(e) => setFxMesh(e.target.checked)} /> Gradient Mesh</label>
                  <label style={checkRow}><input type="checkbox" checked={fxNoise} onChange={(e) => setFxNoise(e.target.checked)} /> Noise overlay (grain)</label>
                  <label style={checkRow}><input type="checkbox" checked={fxBlur} onChange={(e) => setFxBlur(e.target.checked)} /> Backdrop blur + transparency</label>
                  <label style={checkRow}><input type="checkbox" checked={fxGlass} onChange={(e) => setFxGlass(e.target.checked)} /> Glass (carte + CTA)</label>
                  <label style={checkRow}><input type="checkbox" checked={fxBlend} onChange={(e) => setFxBlend(e.target.checked)} /> Overlay mix-blend</label>
                  <label style={labelStyle}>Gradient strength — {fxGradient}%</label>
                  <input type="range" min={0} max={90} value={fxGradient} onChange={(e) => setFxGradient(Number(e.target.value))} style={{ width: "100%", accentColor: "var(--hs-accent)" }} />
                </Section>
                <Section title="Glass CTA" hint="backdrop-blur-xl border-white/10.">
                  <div style={{ border: "1px solid rgba(255,255,255,0.15)", borderRadius: 999, padding: "10px 18px", background: "rgba(255,255,255,0.08)", backdropFilter: "blur(12px)", fontSize: 13, textAlign: "center" }}>Lookbook — glass preview</div>
                </Section>
              </>
            )}

            {inspectorTab === "motion" && (
              <>
                <Section title="Scroll" hint="Transform-only, jamais slide 1.">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 12 }}>Depth on scroll (parallax)</span>
                    <button onClick={() => setParallax((v) => !v)} style={toggleBtn(parallax)}><span style={toggleDot(parallax)} /></button>
                  </div>
                  <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                    {(["1x", "1.2x", "1.5x"] as const).map((a) => (
                      <button key={a} onClick={() => setParallaxAmt(a)} style={{ flex: 1, padding: "6px 0", borderRadius: 999, border: parallaxAmt === a ? "1px solid var(--hs-accent)" : "1px solid var(--hs-border)", background: parallaxAmt === a ? "var(--hs-accent-soft)" : "transparent", color: parallaxAmt === a ? "#FFB37E" : "var(--hs-muted)", fontSize: 11, fontFamily: "'JetBrains Mono', monospace", cursor: "pointer" }}>{a}</button>
                    ))}
                  </div>
                  <div style={{ marginTop: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--hs-faint)" }}><span>Timeline • 0% → 100%</span><span>Parallax layers at {parallax ? parallaxAmt : "1x"}</span></div>
                    <div style={{ height: 6, borderRadius: 999, background: "#27272A", marginTop: 4 }}>
                      <div style={{ width: "62%", height: "100%", borderRadius: 999, background: accent }} />
                    </div>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
                    <span style={{ fontSize: 12 }}>Entrance (fade / slide / pop)</span>
                    <button onClick={() => setAnimIn((v) => !v)} style={toggleBtn(animIn)}><span style={toggleDot(animIn)} /></button>
                  </div>
                </Section>
                <Section title="Marquee" hint="CSS animation infinie, transform-only.">
                  <label style={labelStyle}>Scrolling text</label>
                  <input value={marqueeText} onChange={(e) => setMarqueeText(e.target.value)} style={textInput} />
                  <label style={labelStyle}>Speed — {marqueeSpeed}s / boucle</label>
                  <input type="range" min={5} max={30} value={marqueeSpeed} onChange={(e) => setMarqueeSpeed(Number(e.target.value))} style={{ width: "100%", accentColor: "var(--hs-accent)" }} />
                  <label style={{ fontSize: 11, color: "var(--hs-muted)", display: "flex", flexDirection: "column", gap: 4, marginTop: 8 }}>Direction
                    <select value={marqueeDir} onChange={(e) => setMarqueeDir(e.target.value as "left" | "right")} style={selectStyle}>
                      <option value="left">Left</option><option value="right">Right</option>
                    </select>
                  </label>
                </Section>
                <Section title="Countdown" hint="Hydratation cliente, role=timer.">
                  <label style={labelStyle}>Label</label>
                  <input value={cdLabel} onChange={(e) => setCdLabel(e.target.value)} style={textInput} />
                  <label style={labelStyle}>Durée (minutes) — {cdMinutes}</label>
                  <input type="range" min={5} max={1440} value={cdMinutes} onChange={(e) => setCdMinutes(Number(e.target.value))} style={{ width: "100%", accentColor: "var(--hs-accent)" }} />
                  <label style={labelStyle}>Texte expiré</label>
                  <input value={cdExpired} onChange={(e) => setCdExpired(e.target.value)} style={textInput} />
                  <label style={{ ...checkRow, marginTop: 8 }}><input type="checkbox" checked={cdHero} onChange={(e) => setCdHero(e.target.checked)} /> Affichage héro (gros chiffres)</label>
                </Section>
              </>
            )}

            {inspectorTab === "commerce" && (
              <>
                <Section title="Product" hint="Slide studio sans produit : aucune dépendance catalogue.">
                  <select value={product} onChange={(e) => { setProduct(e.target.value); toast(product); }} style={{ ...selectStyle, width: "100%" }}>
                    {MOCK_PRODUCTS.map((p) => <option key={p}>{p}</option>)}
                  </select>
                </Section>
                <Section title="Price / Stock">
                  <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                    {(["Price", "Stock", "Rating"] as const).map((m) => (
                      <button key={m} onClick={() => setPriceMode(m)} style={{ flex: 1, padding: "7px 0", borderRadius: 999, border: priceMode === m ? "1px solid var(--hs-accent)" : "1px solid var(--hs-border)", background: priceMode === m ? "var(--hs-accent-soft)" : "transparent", color: priceMode === m ? "#FFB37E" : "var(--hs-muted)", fontSize: 11, cursor: "pointer" }}>{m}</button>
                    ))}
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <input value={price} onChange={(e) => setPrice(e.target.value)} style={{ ...textInput, flex: 1 }} aria-label="Prix" />
                    <input value={stockLabel} onChange={(e) => setStockLabel(e.target.value)} style={{ ...textInput, flex: 1 }} aria-label="Stock" />
                  </div>
                  <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                    <input value={rating} onChange={(e) => setRating(e.target.value)} style={{ ...textInput, flex: 1 }} aria-label="Rating" />
                  </div>
                  <label style={{ ...checkRow, marginTop: 8 }}><input type="checkbox" checked={showRating} onChange={(e) => setShowRating(e.target.checked)} /> Afficher le rating</label>
                  <label style={checkRow}><input type="checkbox" checked={lowStock} onChange={(e) => setLowStock(e.target.checked)} /> Low stock (pastille amber)</label>
                </Section>
                <Section title="Commerce Copy • V1">
                  <div style={{ border: "1px solid var(--hs-border)", borderRadius: 8, padding: 10, display: "flex", flexDirection: "column", gap: 6, fontSize: 11 }}>
                    {[["Product", product], ["Price", price], ["Stock", stockLabel], ["Rating", rating], ["Social", socialCount], ["Countdown", cdLabel]].map(([k, v]) => (
                      <div key={k} style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                        <span style={{ opacity: 0.6 }}>{k}</span><span style={{ textAlign: "right" }}>{v}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop: 8 }}>
                    <button onClick={() => copyText(`Product: ${product}\nPrice: ${price}\nStock: ${stockLabel}\nRating: ${rating}\nSocial: ${socialCount}\nCountdown: ${cdLabel}`, "Commerce Copy")} style={{ ...ghostBtn, width: "100%" }}>Copier</button>
                  </div>
                </Section>
                <Section title="Social Proof">
                  <label style={labelStyle}>Compteur</label>
                  <input value={socialCount} onChange={(e) => setSocialCount(e.target.value)} style={textInput} />
                  <p style={{ fontSize: 10, color: "var(--hs-faint)" }}>2.4k loved — avatars + stars sur le canvas.</p>
                </Section>
                <Section title="CTA Group" hint="CTA generally top for clickability. CTA pinned TOP but overridable.">
                  {MOCK_CTAS.map((c) => (
                    <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: 8, border: "1px solid var(--hs-border)", marginBottom: 6 }}>
                      <MousePointerClick size={13} style={{ color: "var(--hs-faint)" }} />
                      <span style={{ flex: 1, fontSize: 12 }}>{c.label}</span>
                      {c.topPinned && <span style={{ fontSize: 9, fontWeight: 800, padding: "1px 6px", borderRadius: 999, background: accent, color: "#000" }}>TOP</span>}
                      <ChevronRight size={13} style={{ color: "var(--hs-faint)" }} />
                    </div>
                  ))}
                </Section>
                <Section title="Magnetic CTA">
                  <label style={checkRow}><input type="checkbox" defaultChecked /> Magnetic CTA (pastille pulsante)</label>
                  <div style={{ marginTop: 8 }}><button onClick={() => toast("Apply to All — magnetic sur tous les CTA")} style={{ ...ghostBtn, width: "100%" }}>Apply to All</button></div>
                  <p style={{ fontSize: 11, color: "var(--hs-faint)", margin: "8px 0 0" }}>Hotspots = style de CTA positionné « pastille ». Shows label in canvas.</p>
                </Section>
                <Section title="Quick Toggles">
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                    {[["Price", "l-price"], ["Social", "l-social"], ["Timer", "l-count"], ["Marquee", "l-marquee"], ["Badge", "l-badge"], ["Hotspot", "l-hot"]].map(([label, id]) => {
                      const on = byId[id]?.visible ?? false;
                      return (
                        <button key={id} onClick={() => patchById(id, { visible: !on })} style={{ padding: "7px 0", borderRadius: 8, border: on ? "1px solid var(--hs-accent)" : "1px solid var(--hs-border)", background: on ? "var(--hs-accent-soft)" : "transparent", color: on ? "#FFB37E" : "var(--hs-muted)", fontSize: 11, cursor: "pointer" }}>
                          {label} {on ? "✓" : ""}
                        </button>
                      );
                    })}
                  </div>
                  <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                    <button onClick={() => toast("Published (maquette)")} style={{ ...ghostBtn, flex: 1 }}>Publish</button>
                  </div>
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
          <button onClick={() => setExportOpen(true)} style={{ height: 32, padding: "0 16px", borderRadius: 999, background: accent, border: "none", color: "#000", fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}><Download size={13} /> Download .zip</button>
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
              <label style={labelStyle}>Import Font — Google Fonts URL or upload (For MVP : css2 uniquement)</label>
              <div style={{ display: "flex", gap: 8 }}>
                <input placeholder="Font name e.g. Outfit" style={{ ...textInput, flex: 1 }} />
                <button onClick={() => toast("Adds to list locally — no external fetch")} style={ghostBtn}>Import</button>
              </div>
              <div style={{ marginTop: 8 }}><button onClick={() => toast("Add to library (maquette)")} style={{ ...ghostBtn, width: "100%" }}><Plus size={12} /> Add to library</button></div>
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
              {exportTab === "liquid" ? buildLiquid() : buildCss()}
            </pre>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 12 }}>
              <button onClick={() => setExportOpen(false)} style={{ ...ghostBtn, padding: "8px 16px" }}>Close</button>
              <button onClick={() => copyText(exportTab === "liquid" ? buildLiquid() : buildCss(), exportTab === "liquid" ? "Liquid" : "CSS")} style={{ ...ghostBtn, padding: "8px 16px" }}>Copier</button>
              <button onClick={() => toast("Export .zip — maquette, aucun fichier généré")} style={{ height: 32, padding: "0 16px", borderRadius: 999, background: accent, border: "none", color: "#000", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Download .zip</button>
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

const groupLabel: React.CSSProperties = { fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--hs-faint)" };
const selectStyle: React.CSSProperties = { background: "var(--hs-panel2)", border: "1px solid var(--hs-border)", color: "var(--hs-text)", borderRadius: 8, padding: "7px 10px", fontSize: 12, outline: "none" };
const textInput: React.CSSProperties = { background: "var(--hs-panel2)", border: "1px solid var(--hs-border)", color: "var(--hs-text)", borderRadius: 8, padding: "7px 10px", fontSize: 12, outline: "none", width: "100%", boxSizing: "border-box" };
const ghostBtn: React.CSSProperties = { background: "transparent", border: "1px solid var(--hs-border)", color: "var(--hs-muted)", borderRadius: 8, padding: "7px 12px", fontSize: 12, cursor: "pointer", whiteSpace: "nowrap" };
const miniBtn: React.CSSProperties = { background: "transparent", border: "1px solid var(--hs-border)", color: "var(--hs-muted)", borderRadius: 6, padding: "3px 8px", fontSize: 10, cursor: "pointer", whiteSpace: "nowrap" };
const rowBtn: React.CSSProperties = { background: "transparent", border: "none", color: "var(--hs-faint)", cursor: "pointer", padding: 2, display: "inline-flex", alignItems: "center", justifyContent: "center" };
const iconBtn: React.CSSProperties = { background: "transparent", border: "1px solid var(--hs-border)", color: "var(--hs-muted)", borderRadius: 7, padding: 5, cursor: "pointer", display: "inline-flex", alignItems: "center", fontSize: 10, fontWeight: 700 };
const labelStyle: React.CSSProperties = { fontSize: 11, color: "var(--hs-muted)", display: "block", marginBottom: 4, marginTop: 8 };
const checkRow: React.CSSProperties = { display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--hs-text)", cursor: "pointer" };
const modalOverlay: React.CSSProperties = { position: "absolute", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, zIndex: 60 };
const modalCard: React.CSSProperties = { width: 440, maxWidth: "100%", maxHeight: "90%", overflowY: "auto", background: "var(--hs-panel)", border: "1px solid var(--hs-border)", borderRadius: 16, padding: 20 };
function toggleBtn(on: boolean): React.CSSProperties {
  return { width: 36, height: 20, borderRadius: 999, border: "none", background: on ? "#FF6B21" : "#3f3f46", cursor: "pointer", position: "relative", padding: 0 };
}
function toggleDot(on: boolean): React.CSSProperties {
  return { position: "absolute", top: 2, left: on ? 18 : 2, width: 16, height: 16, borderRadius: "50%", background: "#fff", transition: "left 0.18s" };
}

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
