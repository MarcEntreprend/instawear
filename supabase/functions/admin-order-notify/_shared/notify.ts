// supabase/functions/admin-order-notify/_shared/notify.ts
// Logique pure (aucune dépendance Deno/Supabase) : testée par
// tests/admin-order-notify.test.ts. Validation stricte du payload +
// construction du HTML admin (échappement systématique).

export interface NotifyItem {
  title: unknown;
  size: unknown;
  color: unknown;
  quantity: unknown;
  price: unknown;
}

export interface NotifyBody {
  orderId: unknown;
  name: unknown;
  phone: unknown;
  email: unknown;
  reception: unknown;
  address: unknown;
  city: unknown;
  zip: unknown;
  country: unknown;
  items: unknown;
  total: unknown;
  currency: unknown;
}

export interface ValidOrder {
  orderId: string;
  name: string;
  phone: string;
  email: string;
  reception: string;
  address: string;
  city: string;
  zip: string;
  country: string;
  items: { title: string; size: string; color: string; quantity: number; price: number }[];
  total: number;
  currency: string;
}

const MAX_STR = 200;
const MAX_ITEMS = 100;

function str(v: unknown): string {
  return typeof v === "string" ? v.trim().slice(0, MAX_STR) : "";
}

function num(v: unknown): number | null {
  const n = typeof v === "number" ? v : Number(v);
  return typeof n === "number" && Number.isFinite(n) ? n : null;
}

/** Valide le body. Retourne la commande normalisée ou une erreur. */
export function validateNotifyBody(body: any): { order: ValidOrder } | { error: string } {
  if (!body || typeof body !== "object") return { error: "Invalid request body" };
  const orderId = str(body.orderId);
  if (!orderId || orderId.length > 64) return { error: "Invalid orderId" };
  if (!Array.isArray(body.items) || body.items.length === 0 || body.items.length > MAX_ITEMS) {
    return { error: "Invalid items (1-100 required)" };
  }
  const items: ValidOrder["items"] = [];
  for (const it of body.items) {
    if (!it || typeof it !== "object") return { error: "Invalid item" };
    const quantity = num(it.quantity);
    const price = num(it.price);
    if (!Number.isInteger(quantity as number) || (quantity as number) < 1 || (quantity as number) > 100) {
      return { error: "Invalid item quantity" };
    }
    if (price == null || price < 0 || price > 100000) {
      return { error: "Invalid item price" };
    }
    items.push({
      title: str(it.title) || "Item",
      size: str(it.size),
      color: str(it.color),
      quantity: quantity as number,
      price,
    });
  }
  const total = num(body.total);
  if (total == null || total < 0 || total > 1000000) return { error: "Invalid total" };
  const email = str(body.email);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "Invalid customer email" };
  }
  const reception = str(body.reception) === "retrait" ? "retrait" : "livraison";
  return {
    order: {
      orderId,
      name: str(body.name),
      phone: str(body.phone),
      email,
      reception,
      address: str(body.address),
      city: str(body.city),
      zip: str(body.zip),
      country: str(body.country),
      items,
      total,
      currency: str(body.currency) || "USD",
    },
  };
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** HTML admin : même contenu que le message Telegram, version email. */
export function buildAdminOrderHtml(o: ValidOrder): string {
  const addr =
    o.reception === "livraison" && (o.address || o.city)
      ? `<p style="margin:0 0 8px;color:#555;font-size:14px;">${escapeHtml(o.address)}${o.city ? `, ${escapeHtml(o.city)}` : ""}${o.zip ? ` ${escapeHtml(o.zip)}` : ""}${o.country ? `, ${escapeHtml(o.country)}` : ""}</p>`
      : `<p style="margin:0 0 8px;color:#555;font-size:14px;">Pickup</p>`;
  const rows = o.items
    .map(
      (it) =>
        `<li>${escapeHtml(it.title)} (${escapeHtml(it.size)}, ${escapeHtml(it.color)}) ×${it.quantity} = ${(it.price * it.quantity).toFixed(2)} ${escapeHtml(o.currency)}</li>`,
    )
    .join("");
  return `<!DOCTYPE html><html><body style="max-width:600px;margin:0 auto;font-family:Arial,sans-serif;color:#1a1a1a;">
<div style="background:#1a1a1a;padding:24px;border-radius:12px 12px 0 0;text-align:center;">
<h1 style="color:#fff;margin:0;font-size:22px;">🛍️ INSTAWEAR ORDER</h1>
<p style="color:#FF5C35;margin:4px 0 0;font-size:14px;">Order #${escapeHtml(o.orderId)}</p>
</div>
<div style="background:#fff;padding:24px;border:1px solid #e5e5e5;border-top:none;border-radius:0 0 12px 12px;">
<p style="margin:0 0 8px;color:#555;font-size:14px;"><strong>Customer:</strong> ${escapeHtml(o.name)}<br><strong>Phone:</strong> ${escapeHtml(o.phone)}<br><strong>Email:</strong> ${escapeHtml(o.email)}</p>
${addr}
<p style="margin:16px 0 8px;font-weight:700;">Items:</p>
<ul style="margin:0 0 8px;padding-left:20px;color:#555;font-size:14px;">${rows}</ul>
<p style="margin:16px 0 0;font-size:16px;font-weight:800;">Total: ${o.total.toFixed(2)} ${escapeHtml(o.currency)}</p>
</div></body></html>`;
}
