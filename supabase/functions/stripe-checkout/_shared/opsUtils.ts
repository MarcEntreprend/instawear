// supabase/functions/_shared/opsUtils.ts
// Opérations pré-launch (gaps 13+14) :
// - fetchWithRetry : retry Printful sur 429/5xx avec backoff + jitter,
//   respecte Retry-After. Jamais de retry sur les autres 4xx.
//   Les 5xx ne sont retentées que si idempotent:true (GETs, POST /orders
//   avec external_id, POST /shipping/rates en lecture). Sinon : 429 et
//   erreurs réseau uniquement (ex: approve, mockup create-task).
// - reportError : monitoring autonome (gap 13). Insère dans edge_errors
//   (table lue par la page admin Monitoring) + notif admin dédupliquée
//   pour les critical. Ne lance JAMAIS d'exception (le monitoring ne doit
//   pas casser les flux). Métadonnées assainies (pas de secrets).

export interface RetryOpts {
  attempts?: number;
  baseMs?: number;
  /** true = on retente aussi les 5xx (opération idempotente). Défaut: true. */
  idempotent?: boolean;
}

export interface RetryResult {
  res: Response | null;
  attempts: number;
  error?: string;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function retryAfterMs(res: Response): number | null {
  try {
    const v = res.headers.get("Retry-After");
    if (!v) return null;
    const s = Number(v);
    if (Number.isFinite(s)) return Math.min(Math.max(s, 0), 30) * 1000;
    const d = Date.parse(v);
    if (Number.isFinite(d)) return Math.min(Math.max(d - Date.now(), 0), 30000);
  } catch {}
  return null;
}

/** Un statut HTTP est-il retentable ? (429/5xx ; 5xx seulement si idempotent) */
export function isRetriableStatus(status: number, idempotent: boolean): boolean {
  if (status === 429) return true;
  if (idempotent && [502, 503, 504].includes(status)) return true;
  return false;
}

export async function fetchWithRetry(
  url: string,
  init: RequestInit = {},
  opts: RetryOpts = {},
): Promise<RetryResult> {
  const attempts = Math.max(1, Math.min(opts.attempts ?? 3, 5));
  const baseMs = opts.baseMs ?? 500;
  const idempotent = opts.idempotent ?? true;

  let lastError = "échec inconnu";
  for (let i = 1; i <= attempts; i++) {
    let res: Response | null = null;
    try {
      res = await fetch(url, init);
    } catch (e: any) {
      // Erreur réseau : retentable (connexion jamais établie).
      lastError = e?.message || "Erreur réseau";
      if (i < attempts) {
        await sleep(baseMs * 2 ** (i - 1) + Math.random() * 250);
        continue;
      }
      return { res: null, attempts: i, error: lastError };
    }
    if (res.ok) return { res, attempts: i };
    lastError = `HTTP ${res.status}`;
    if (!isRetriableStatus(res.status, idempotent) || i >= attempts) {
      return { res, attempts: i, error: lastError };
    }
    const wait =
      retryAfterMs(res) ?? baseMs * 2 ** (i - 1) + Math.random() * 250;
    await sleep(wait);
  }
  return { res: null, attempts, error: lastError };
}

// ─── Monitoring autonome ────────────────────────────────────────────────────

export type ErrorSeverity = "critical" | "high" | "medium";

export interface ReportInput {
  fn: string;
  action: string;
  error: unknown;
  meta?: Record<string, unknown>;
  severity?: ErrorSeverity;
  /** Catégorie notif admin (défaut "api"). */
  notifyCategory?: string;
  /** Fenêtre anti-spam notifs critical (défaut 30 min). */
  dedupeMinutes?: number;
}

function safeMeta(meta: Record<string, unknown> | undefined): Record<string, unknown> {
  try {
    const s = JSON.stringify(meta ?? {});
    return JSON.parse(s.slice(0, 2000));
  } catch {
    return {};
  }
}

function errorMessage(error: unknown): string {
  try {
    if (error instanceof Error) return error.message.slice(0, 1000);
    if (typeof error === "string") return error.slice(0, 1000);
    return JSON.stringify(error).slice(0, 1000);
  } catch {
    return "Erreur inconnue";
  }
}

/**
 * Enregistre une erreur edge (table edge_errors, lue par /admin/monitoring)
 * + notification admin dédupliquée si critical. Ne throw jamais.
 */
export async function reportError(
  supabaseAdmin: any,
  input: ReportInput,
): Promise<void> {
  try {
    const severity = input.severity || "medium";
    const message = errorMessage(input.error);
    await supabaseAdmin.from("edge_errors").insert({
      function_name: String(input.fn || "?").slice(0, 100),
      action: String(input.action || "?").slice(0, 100),
      severity,
      message,
      meta: safeMeta(input.meta),
    });

    if (severity !== "critical") return;

    // Anti-spam : pas de 2e notif pour le même (fn, action) dans la fenêtre.
    // Comparaison sur metadata (volume faible, requête simple).
    const windowMin = input.dedupeMinutes ?? 30;
    try {
      const since = new Date(Date.now() - windowMin * 60000).toISOString();
      const { data: recentFull } = await supabaseAdmin
        .from("notifications")
        .select("metadata")
        .eq("category", input.notifyCategory || "api")
        .gte("created_at", since)
        .limit(50);
      const dup = ((recentFull || []) as any[]).some(
        (n) =>
          n?.metadata?.source === "edge-monitor" &&
          n?.metadata?.fn === input.fn &&
          n?.metadata?.action === input.action,
      );
      if (dup) return;
    } catch {
      // En cas de doute on notifie (mieux qu'un silence).
    }

    await supabaseAdmin.from("notifications").insert({
      title: `[Critical] ${input.fn} — ${input.action}`,
      description: message.slice(0, 280),
      category: input.notifyCategory || "api",
      priority: "high",
      status: "unread",
      metadata: {
        fn: input.fn,
        action: input.action,
        linkTo: "/admin/monitoring",
        source: "edge-monitor",
      },
      action_label: "Voir le monitoring",
    });
  } catch {
    // Le monitoring ne doit jamais casser le flux appelant.
  }
}
