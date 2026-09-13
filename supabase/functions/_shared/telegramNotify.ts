// supabase/functions/_shared/telegramNotify.ts
//
// CANONIQUE — Telegram admin pour chaque CHANGEMENT de statut commande.
// Source de vérité : ce fichier. Copies déployées à l'identique dans :
//   - supabase/functions/printful-webhook/_shared/telegramNotify.ts
//   - supabase/functions/order-status-update/_shared/telegramNotify.ts
//   - supabase/functions/create-printful-order/_shared/telegramNotify.ts
// (approve-printful-design importe ../_shared/ comme ses autres _shared.
// Supabase déploie UN dossier de fonction : aucun import inter-fonctions
// hors ../_shared ne survit — même contrainte que orderStatusEmails.ts.
// Toute modification ici DOIT être recopiée + tests verts.)
//
// Règle d'ownership (zéro doublon) : seul le possesseur de l'écriture du
// statut envoie — jamais l'appelant ET l'appelé :
//   - new-order (paid) : stripe-webhook/handlePaidOrder UNIQUEMENT
//     (pas de telegram "status" en plus — ce serait un doublon).
//   - transmission Printful : create-printful-order (in_production /
//     partial / on_hold-à-la-création / cancelled-annulation).
//   - manuel admin : order-status-update, SAUF quand il délègue la
//     transmission (le callee a déjà envoyé).
//   - webhooks Printful : printful-webhook, sur transition réelle
//     (newStatus non-null, jamais sur retry/doublon).
//   - approbation design : approve-printful-design (retour en production).
// Best-effort partout : un échec Telegram ne fait jamais échouer l'appelant.
//
// Format (même famille que INSTAWEAR ORDER, Markdown Bot API) :
//   📢 *ORDER STATUS UPDATE*
//   📦 *ORD-…* · *Expédiée* 🟢
//   `SHIPPED` · #065f46
//   *Customer:* …
//   *Updated:* 13 Sep 2026, 14:32
//   *Previous:* Payée (12 Sep 2026, 10:01)
//   *Now:* Expédiée (13 Sep 2026, 14:32)

// Libellés FR + couleurs — miroir de src/admin/orderStatusLabels.ts
// (front/back ne partagent pas de bundle : toute modification là-bas se
// répercute ici, et inversement).
export const STATUS_LABEL_FR: Record<string, string> = {
  pending: "En attente",
  paid: "Payée",
  in_production: "En production",
  partial: "Partielle",
  shipped: "Expédiée",
  delivered: "Livrée",
  cancelled: "Annulée",
  on_hold: "En pause",
  refunded: "Remboursée",
  returned: "Retournée",
};

export const STATUS_COLOR: Record<string, string> = {
  pending: "#92400e",
  paid: "#065f46",
  in_production: "#1e40af",
  partial: "#b45309",
  shipped: "#065f46",
  delivered: "#166534",
  cancelled: "#991b1b",
  on_hold: "#92400e",
  refunded: "#4c1d95",
  returned: "#9f1239",
};

// Pastille la plus proche de chaque couleur (ronds Telegram dispo).
export const STATUS_DOT: Record<string, string> = {
  pending: "🟡",
  paid: "🟢",
  in_production: "🔵",
  partial: "🟡",
  shipped: "🟢",
  delivered: "✅",
  cancelled: "🔴",
  on_hold: "⏸️",
  refunded: "🟣",
  returned: "↩️",
};

export function formatTgDate(v: unknown): string | null {
  if (!v) return null;
  const d = v instanceof Date ? v : new Date(String(v));
  if (isNaN(d.getTime())) return null;
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "America/Sao_Paulo",
  });
}

export interface StatusUpdateInput {
  orderId: string;
  from: string;
  to: string;
  customer?: string | null;
  updatedAt?: unknown;
  prevAt?: unknown;
}

export function buildStatusUpdateText(input: StatusUpdateInput): string {
  const fr = STATUS_LABEL_FR[input.to] || input.to;
  const dot = STATUS_DOT[input.to] || "📦";
  const color = STATUS_COLOR[input.to] || "#555555";
  const fromFr = STATUS_LABEL_FR[input.from] || input.from;
  const updated = formatTgDate(input.updatedAt ?? new Date()) || "—";
  const prev = formatTgDate(input.prevAt);
  const lines = [
    `📢 *ORDER STATUS UPDATE*`,
    ``,
    `📦 *${input.orderId}* · *${fr}* ${dot}`,
    `\`${String(input.to).toUpperCase()}\` · ${color}`,
    ``,
    `*Customer:* ${input.customer || "—"}`,
    `*Updated:* ${updated}`,
    ``,
    `*Previous:* ${fromFr}${prev ? ` (${prev})` : ""}`,
    `*Now:* ${fr} (${updated})`,
  ];
  return lines.join("\n");
}

// Envoi best-effort : renvoie true si accepté par l'API Bot.
export async function sendTelegramStatus(
  token: string,
  chatId: string,
  input: StatusUpdateInput,
): Promise<boolean> {
  if (!token || !chatId) return false;
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: buildStatusUpdateText(input),
        parse_mode: "Markdown",
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
