// supabase/functions/_shared/notifyAdmin.ts
//
// CANONIQUE — Trio admin : UN appel = cloche in-app + telegram court +
// email Resend. Remplace les circuits éclatés (in-app ici, telegram là,
// email admin cassé ailleurs) SANS les dupliquer.
// Source de vérité : ce fichier. Copies déployées à l'identique dans
// chaque fonction consommatrice (voir liste en bas — même contrainte
// que orderStatusEmails.ts / telegramNotify.ts : Supabase déploie UN
// dossier de fonction).
// Toute modification ici DOIT être recopiée à l'identique + tests verts.
//
// Contrat :
//   - Destinataire email EXIGÉ (ADMIN_NOTIFY_EMAIL pinné) : pas de fallback
//     silencieux vers un autre admin. Absent → email skippé + warn explicite
//     (in-app + telegram partent quand même).
//   - Best-effort isolé par canal : un échec n'échoue ni les autres ni
//     l'appelant. Retourne { inApp, telegram, email } pour feedback/tests.
//   - skipInApp=true : quand le trigger SQL possède déjà la cloche
//     (entrée en `paid` → trg_notify_new_paid_order). Toute autre valeur
//     fausse le décompte : ne mettre true QUE dans ce cas.
//   - Catégories alignées sur le CHECK distant (9 valeurs, 'approval'
//     inclus depuis la migration Phase A). Inconnue → in-app skippée +
//     warn (le CHECK la rejetterait), telegram + email conservés.
//   - Pas de PII dans les logs (titres tronqués, jamais d'email/address).

import { sendTelegramNotice } from "./telegramNotify.ts";

// Runtime Deno (edges) : déclaration minimale pour tsc (fichier partagé
// tel quel, comme opsUtils.ts).
declare const Deno: any;

export const ADMIN_CATEGORIES = [
  "orders",
  "products",
  "customers",
  "interactions",
  "bonus",
  "api",
  "security",
  "finance",
  "approval",
] as const;

export type AdminCategory = (typeof ADMIN_CATEGORIES)[number];
export type AdminPriority = "low" | "medium" | "high" | "urgent";

export interface NotifyAdminInput {
  title: string;
  description?: string | null;
  category: string;
  priority?: AdminPriority | string | null;
  linkTo?: string | null;
  actionLabel?: string | null;
  metadata?: Record<string, unknown> | null;
  /** Email riche (achat neuf : même récap que le telegram). Sinon concis. */
  emailSubject?: string | null;
  emailHtml?: string | null;
  /** True UNIQUEMENT si le trigger SQL possède déjà la cloche (paid). */
  skipInApp?: boolean;
  /** True quand un telegram riche est déjà parti (new-order, statuts). */
  skipTelegram?: boolean;
  /** True quand un autre envoi couvre déjà l'email (rare, documenter). */
  skipEmail?: boolean;
  /** Reply-To de l'email (tickets support : répondre au client). */
  replyTo?: string | null;
  /** Déduplication : skip tout si même titre+catégorie récent (minutes). */
  dedupeMinutes?: number | null;
}

export interface NotifyAdminDeps {
  supabaseAdmin: any;
  supabaseUrl: string;
  serviceRoleKey: string;
  resendApiKey: string;
  resendFrom: string;
  /** Exigé : ADMIN_NOTIFY_EMAIL pinné. Vide → email skippé + warn. */
  adminEmail: string;
}

export interface NotifyAdminResult {
  inApp: boolean;
  telegram: boolean;
  email: boolean;
  deduped?: boolean;
}

const SITE_URL = "https://instawear.vercel.app";
const PRIORITIES = ["low", "medium", "high", "urgent"] as const;

export function isKnownCategory(category: unknown): boolean {
  return (
    typeof category === "string" &&
    (ADMIN_CATEGORIES as readonly string[]).includes(category)
  );
}

export function normalizePriority(priority: unknown): AdminPriority {
  return (PRIORITIES as readonly string[]).includes(String(priority))
    ? (priority as AdminPriority)
    : "medium";
}

function safeStr(v: unknown, max: number): string {
  return String(v ?? "").trim().slice(0, max);
}

// Email concis par défaut (statuts, autres catégories) : titre, description,
// CTA vers l'admin. Le riche (achat) arrive via emailSubject/emailHtml.
export function buildAdminEmail(input: NotifyAdminInput): {
  subject: string;
  html: string;
} {
  if (input.emailSubject && input.emailHtml) {
    return { subject: input.emailSubject, html: input.emailHtml };
  }
  const title = safeStr(input.title, 120) || "Notification InstaWear";
  const desc = safeStr(input.description, 500);
  const link =
    typeof input.linkTo === "string" && input.linkTo.startsWith("/")
      ? `${SITE_URL}${input.linkTo}`
      : SITE_URL;
  const esc = (s: string) =>
    s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  return {
    subject: `InstaWear admin — ${title}`.slice(0, 120),
    html:
      `<!DOCTYPE html><html><body style="max-width:600px;margin:0 auto;font-family:Arial,sans-serif;color:#1a1a1a;">` +
      `<div style="background:#111827;padding:20px;border-radius:12px 12px 0 0;"><h1 style="color:#fff;margin:0;font-size:18px;">InstaWear — Admin</h1></div>` +
      `<div style="background:#fff;padding:24px;border:1px solid #e5e5e5;border-top:none;border-radius:0 0 12px 12px;">` +
      `<h2 style="margin:0 0 8px;font-size:16px;">${esc(title)}</h2>` +
      (desc
        ? `<p style="margin:0 0 16px;color:#555;font-size:14px;">${esc(desc)}</p>`
        : "") +
      `<a href="${esc(link)}" style="display:inline-block;padding:12px 24px;background:#111827;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px;">Ouvrir dans l'admin →</a>` +
      `</div></body></html>`,
  };
}

export async function notifyAdmin(
  deps: NotifyAdminDeps,
  input: NotifyAdminInput,
): Promise<NotifyAdminResult> {
  const out: NotifyAdminResult = { inApp: false, telegram: false, email: false };
  const priority = normalizePriority(input.priority);
  const title = safeStr(input.title, 200);
  if (!title) return out;
  const description = safeStr(input.description, 500) || null;

  // Déduplication optionnelle (erreurs critiques qui retentent : même
  // titre+catégorie récent → silence total, jamais de spam).
  if (input.dedupeMinutes && input.dedupeMinutes > 0) {
    try {
      const since = new Date(Date.now() - input.dedupeMinutes * 60000).toISOString();
      const { data: recent } = await deps.supabaseAdmin
        .from("notifications")
        .select("title")
        .eq("category", String(input.category))
        .gte("created_at", since)
        .limit(50);
      const dup = ((recent || []) as any[]).some((n) => n?.title === title);
      if (dup) return { ...out, deduped: true };
    } catch {
      // Doute → on notifie (mieux qu'un silence).
    }
  }

  // 1. Cloche in-app (sauf trigger SQL propriétaire : entrée paid).
  if (!input.skipInApp) {
    if (!isKnownCategory(input.category)) {
      try {
        console.warn(`[notifyAdmin] catégorie inconnue: ${String(input.category).slice(0, 40)}`);
      } catch {}
    } else {
      try {
        const { error } = await deps.supabaseAdmin.from("notifications").insert({
          title,
          description: description || "",
          category: input.category,
          priority,
          status: "unread",
          metadata: {
            ...(input.metadata || {}),
            linkTo: input.linkTo || "/admin/orders",
            source: (input.metadata as any)?.source || "edge",
          },
          action_label: input.actionLabel || "Voir",
        });
        if (!error) out.inApp = true;
      } catch {
        // Best-effort : on continue vers telegram + email.
      }
    }
  }

  // 2. Telegram court (formats canoniques existants, inchangés).
  // Skippé quand un telegram riche est déjà parti (new-order, statuts).
  if (!input.skipTelegram) {
    try {
      const token =
        typeof Deno !== "undefined"
          ? (Deno as any).env.get("TELEGRAM_BOT_TOKEN") || ""
          : "";
      const chatId =
        typeof Deno !== "undefined"
          ? (Deno as any).env.get("TELEGRAM_CHAT_ID") || ""
          : "";
      out.telegram = await sendTelegramNotice(token, chatId, {
        category: String(input.category),
        title,
        description,
        priority,
      });
    } catch {
      // Best-effort uniquement.
    }
  }

  // 3. Email Resend (destinataire exigé, jamais de fallback silencieux).
  // Skippé uniquement si un autre envoi le couvre (documenter le site).
  if (!input.skipEmail) {
    const dest = (deps.adminEmail || "").trim();
    if (!dest) {
      try {
        console.warn("[notifyAdmin] ADMIN_NOTIFY_EMAIL manquant : email skippé");
      } catch {}
      return out;
    }
    try {
      const built = buildAdminEmail(input);
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${deps.resendApiKey}`,
        },
        body: JSON.stringify({
          from: deps.resendFrom,
          to: [dest],
          ...(input.replyTo ? { reply_to: input.replyTo } : {}),
          subject: built.subject,
          html: built.html,
        }),
      });
      out.email = res.ok;
      if (!res.ok) {
        try {
          console.warn(`[notifyAdmin] resend HTTP ${res.status}`);
        } catch {}
      }
    } catch {
      // Best-effort uniquement.
    }
  }
  return out;
}
