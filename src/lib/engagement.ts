// src/lib/engagement.ts — Phase 2 Merchandising : capteurs silencieux.
// Aucun changement visuel. Batch + fetch keepalive + requestIdleCallback :
// jamais sur le chemin critique du rendu. Gate consentement : sans
// acceptation des non-essentiels, rien n'est envoyé (panier/session seuls).
import { supabase } from "./supabaseClient";

const SID_KEY = "instawear-engagement-sid";
const CONSENT_KEY = "instawear-cookie-consent";
const FLUSH_MS = 15000;
const BATCH_MAX = 20;

export type EngagementEventType =
  | "section_impression"
  | "product_click"
  | "search"
  | "filter_applied"
  | "add_to_cart"
  | "favourite";

interface QueuedEvent {
  event_type: EngagementEventType;
  entity_type: "product" | "category" | "event_type" | "section";
  entity_id: string;
  context: Record<string, unknown>;
}

let queue: QueuedEvent[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let observer: IntersectionObserver | null = null;
const seenSections = new Set<string>();

function getSessionId(): string {
  try {
    let sid = window.localStorage.getItem(SID_KEY);
    if (!sid) {
      sid =
        (window.crypto?.randomUUID?.() ||
          `${Date.now()}-${Math.random().toString(36).slice(2)}`) as string;
      window.localStorage.setItem(SID_KEY, sid);
    }
    return sid;
  } catch {
    return "memory-session";
  }
}

/** Gate RGPD : non-essentiels acceptés et consentement non expiré (365j, v2). */
function consentGranted(): boolean {
  try {
    const raw = window.localStorage.getItem(CONSENT_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    const nonEssential =
      typeof parsed?.nonEssential === "boolean"
        ? parsed.nonEssential
        : !!(parsed?.analytics || parsed?.performance);
    if (!nonEssential) return false;
    if (!parsed?.respondedAt) return true;
    return Date.now() - new Date(parsed.respondedAt).getTime() < 365 * 86400000;
  } catch {
    return false;
  }
}

function scheduleFlush() {
  if (flushTimer || queue.length === 0) return;
  const run = () => {
    flushTimer = null;
    void flush();
  };
  flushTimer = setTimeout(() => {
    const ric = (window as any).requestIdleCallback;
    if (typeof ric === "function") ric(run, { timeout: 2000 });
    else run();
  }, FLUSH_MS);
}

async function flush() {
  if (queue.length === 0) return;
  if (!consentGranted()) {
    queue = [];
    return;
  }
  const batch = queue.splice(0, queue.length);
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const session_id = getSessionId();
    const rows = batch.map((e) => ({
      session_id,
      customer_id: user?.id || null,
      event_type: e.event_type,
      entity_type: e.entity_type,
      entity_id: String(e.entity_id).slice(0, 200),
      context: e.context,
    }));
    const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/engagement_events?apikey=${import.meta.env.VITE_SUPABASE_ANON_KEY}`;
    // Pas de sendBeacon : il envoie credentials:include, ce que le
    // Access-Control-Allow-Origin: * de PostgREST refuse (CORS bloqué).
    // fetch keepalive survit à la fermeture de page, sans credentials.
    await fetch(url, {
      method: "POST",
      credentials: "omit",
      keepalive: true,
      headers: {
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify(rows),
    }).catch(() => {});
  } catch {
    // Silencieux : le tracking ne doit jamais casser le site.
  }
}

/**
 * Variante A/B stable par session (50/50) pour les sections en test.
 * La variante voyage dans `context.v` des events produit/panier.
 */
export function getVariant(): "A" | "B" {
  try {
    const sid = getSessionId();
    let h = 0;
    for (let i = 0; i < sid.length; i++) h = (h * 31 + sid.charCodeAt(i)) >>> 0;
    return h % 2 === 0 ? "A" : "B";
  } catch {
    return "A";
  }
}

export function track(
  event_type: QueuedEvent["event_type"],
  entity_type: QueuedEvent["entity_type"],
  entity_id: string,
  context: Record<string, unknown> = {},
) {
  try {
    queue.push({ event_type, entity_type, entity_id, context });
    if (queue.length >= BATCH_MAX) {
      if (flushTimer) {
        clearTimeout(flushTimer);
        flushTimer = null;
      }
      void flush();
    } else {
      scheduleFlush();
    }
  } catch {
    // ignore
  }
}

/**
 * Observe une fois chaque `[data-track-section]` : 1 impression par section
 * et par chargement. Appelé une seule fois depuis App.
 */
export function initSectionTracking() {
  try {
    if (observer || typeof IntersectionObserver === "undefined") return;
    observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const el = entry.target as HTMLElement;
          const section = el.getAttribute("data-track-section");
          if (!section || seenSections.has(section)) continue;
          seenSections.add(section);
          observer?.unobserve(el);
          track("section_impression", "section", section, {});
        }
      },
      { rootMargin: "0px", threshold: 0.25 },
    );
    const scan = () => {
      document
        .querySelectorAll("[data-track-section]")
        .forEach((el) => observer?.observe(el));
    };
    scan();
    // Re-scan léger pour le contenu monté après coup (produits chargés)
    setTimeout(scan, 3000);
    const onFlush = () => void flush();
    window.addEventListener("pagehide", onFlush);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") void flush();
    });
  } catch {
    // ignore
  }
}
