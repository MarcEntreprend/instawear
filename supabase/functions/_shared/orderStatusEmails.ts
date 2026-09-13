// supabase/functions/_shared/orderStatusEmails.ts
//
// CANONIQUE — Moule unique des emails client par statut de commande.
// Source de vérité : ce fichier. Copies déployées à l'identique dans :
//   - supabase/functions/printful-webhook/_shared/orderStatusEmails.ts
//   - supabase/functions/create-printful-order/_shared/orderStatusEmails.ts
// (Supabase déploie UN dossier de fonction : aucun import inter-fonctions ne
// survit au deploy — même contrainte que les copies _shared/rateLimit.ts.
// Toute modification ici DOIT être recopiée à l'identique + tests verts.)
//
// Règles :
// - Pur : aucune I/O, aucun Deno, aucun import. Même contenu testable en node.
// - Tout texte issu de la base (titres, noms, adresses, raisons) est échappé
//   (XSS via API responses — doc 10-Security #7). Les montants sont formatés
//   en nombres, jamais interpolés bruts.
// - Destinataire = adresse du checkout dans tous les cas (guest = loggé).
// - CTA unique : ?order= (smart compte/invité, App.tsx) ; site constant.
// - Moule : bandeau couleur statut + h2 + intro + stepper (progression) +
//   table items (image 52px, variante, qty, prix ligne) + totaux + blocs
//   contextuels (colis / raison / approval) + CTA + footer identité.

export interface StatusEmailItem {
  product_title?: string | null;
  product_image?: string | null;
  selected_color?: string | null;
  selected_size?: string | null;
  quantity?: number | null;
  unit_price?: number | null;
}

export interface StatusEmailShipment {
  carrier?: string | null;
  service?: string | null;
  tracking_number?: string | null;
  tracking_url?: string | null;
  ship_date?: string | null;
  reshipment?: boolean | null;
  estimated_min_date?: string | null;
  estimated_max_date?: string | null;
  item_count?: number | null;
}

export interface StatusEmailOrder {
  id: string;
  client_name?: string | null;
  client_email?: string | null;
  shipping_address_phone?: string | null;
  shipping_address_address?: string | null;
  shipping_address_city?: string | null;
  shipping_address_zip?: string | null;
  shipping_address_country?: string | null;
  shipping_address_state_code?: string | null;
  shipping_cost?: number | null;
  shipping_method_name?: string | null;
  shipping_delivery_estimate?: string | null;
  total_amount?: number | null;
}

export interface StatusEmailBuilt {
  subject: string;
  html: string;
}

const SITE_URL = "https://instawear.vercel.app";
const MISSING_IMG = "https://instawear.vercel.app/Instawear-missing-item.svg";
const SHOP_LINE =
  "InstaWear · 123 Main Street, Doral, FL 10001<br>© 2026 InstaWear Inc. All rights reserved.";

// ── Échappement HTML (titres produits, noms, adresses, raisons) ────────────
export function esc(v: unknown): string {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function money(v: unknown, currency: string): string {
  return `${num(v).toFixed(2)} ${currency}`;
}

// ── Stepper (mêmes 5 étapes que OrderStatusStepper / EMAIL_STATUS_STEPS) ───
const STEPS = ["Paid", "Pending", "In Production", "Shipped", "Delivered"];
export const STEP_INDEX: Record<string, number> = {
  paid: 0,
  pending: 1,
  in_production: 2,
  partial: 2,
  shipped: 3,
  delivered: 4,
  on_hold: 2,
  refunded: -1,
  returned: -1,
  cancelled: -1,
};

function stepperHtml(currentStep: number): string {
  const ACCENT = "#059669";
  const GREY = "#9CA3AF";
  const BORDER = "#E5E7EB";
  const circles = STEPS.map((label, i) => {
    const reached = currentStep >= i;
    const current = currentStep === i;
    const circleColor = current ? ACCENT : reached ? GREY : "#F3F4F6";
    const textColor = current ? "#1a1a1a" : "#9CA3AF";
    const connectorColor =
      currentStep > i + 1 ? GREY : currentStep > i ? ACCENT : BORDER;
    const circle =
      `<td style="text-align:center;vertical-align:top;width:44px;">` +
      `<div style="width:22px;height:22px;border-radius:50%;background:${circleColor};margin:0 auto 4px;line-height:22px;color:#fff;font-size:11px;font-weight:700;">${reached ? "✓" : ""}</div>` +
      `<div style="font-size:9px;font-weight:600;color:${textColor};white-space:nowrap;">${label}</div></td>`;
    const connector =
      i < STEPS.length - 1
        ? `<td style="vertical-align:top;padding-top:11px;"><div style="height:2px;background:${connectorColor};"></div></td>`
        : "";
    return circle + connector;
  }).join("");
  return `<div style="margin-bottom:20px;"><table role="presentation" width="100%" style="border-collapse:collapse;"><tr>${circles}</tr></table></div>`;
}

// ── Table items (image variante, couleur/taille/qty, prix ligne) ───────────
function itemsTable(order_items: StatusEmailItem[], currency: string): {
  rows: string;
  subtotal: number;
} {
  const rows = order_items
    .map(
      (item) => `
    <tr>
      <td style="padding: 12px 0; border-bottom: 1px solid #eee;">
        <table><tr>
          <td style="width: 60px; vertical-align: top;">
            <img src="${esc(item.product_image || MISSING_IMG)}" style="width: 52px; height: 52px; border-radius: 8px; object-fit: cover;">
          </td>
          <td style="vertical-align: top; padding-left: 12px;">
            <p style="margin: 0; font-weight: 600; font-size: 14px;">${esc(item.product_title || "Item")}</p>
            <p style="margin: 4px 0; font-size: 12px; color: #888;">
              Color: ${esc(item.selected_color || "—")} · Size: ${esc(item.selected_size || "—")} · Qty: ${num(item.quantity)}
            </p>
          </td>
          <td style="vertical-align: top; text-align: right; font-weight: 700; font-size: 14px; white-space: nowrap;">
            ${money(num(item.unit_price) * num(item.quantity), currency)}
          </td>
        </tr></table>
      </td>
    </tr>`,
    )
    .join("");
  const subtotal = order_items.reduce(
    (s, it) => s + num(it.unit_price) * num(it.quantity),
    0,
  );
  return { rows, subtotal };
}

// ── Blocs partagés ─────────────────────────────────────────────────────────
function totalsHtml(
  subtotal: number,
  shippingCost: number,
  total: number,
  currency: string,
  methodName?: string | null,
  estimate?: string | null,
): string {
  return `
  <tr>
    <td colspan="2" style="padding-top:16px;text-align:right;font-size:13px;color:#888;">
      Subtotal: ${money(subtotal, currency)}
    </td>
  </tr>
  <tr>
    <td colspan="2" style="text-align:right;font-size:13px;color:#888;">
      Shipping${methodName ? ` (${esc(methodName)})` : ""}: ${shippingCost === 0 ? "Free" : money(shippingCost, currency)}
    </td>
  </tr>
  ${estimate ? `<tr>
    <td colspan="2" style="text-align:right;font-size:11px;color:#aaa;">
      Est. delivery: ${esc(estimate)}
    </td>
  </tr>` : ""}
  <tr>
    <td colspan="2" style="padding-top:8px;text-align:right;font-size:16px;font-weight:700;color:#1a1a1a;">
      Order total: ${money(total, currency)}
    </td>
  </tr>`;
}

function ctaHtml(orderId: string, bg = "#FF5C35"): string {
  return `<a href="${SITE_URL}/?order=${encodeURIComponent(orderId)}" style="display:inline-block;padding:12px 24px;background:${bg};color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px;">View order details →</a>`;
}

function footerHtml(email: string | null | undefined): string {
  return `
<div style="margin-top:32px;padding-top:16px;border-top:1px solid #eee;font-size:11px;color:#999;line-height:1.6;">
<p style="margin:0 0 8px;">This email was sent to <strong>${esc(email || "")}</strong> for your recent purchase at <a href="${SITE_URL}" style="color:#FF5C35;text-decoration:none;">instawear.vercel.app</a></p>
<p style="margin:0;">${SHOP_LINE}</p>
</div>`;
}

function shell(
  bannerBg: string,
  bannerFg: string,
  title: string,
  subtitle: string,
  heading: string,
  intro: string,
  body: string,
  orderId: string,
  email: string | null | undefined,
  ctaBg = "#FF5C35",
): string {
  return `<!DOCTYPE html><html><body style="max-width:600px;margin:0 auto;font-family:Arial,sans-serif;color:#1a1a1a;">
<div style="background:${bannerBg};padding:24px;border-radius:12px 12px 0 0;text-align:center;">
<h1 style="color:${bannerFg};margin:0;font-size:22px;">${title}</h1>
<p style="color:${bannerFg};margin:4px 0 0;font-size:14px;">${subtitle}</p>
</div>
<div style="background:#fff;padding:24px;border:1px solid #e5e5e5;border-top:none;border-radius:0 0 12px 12px;">
<h2 style="margin:0 0 8px;font-size:18px;">${heading}</h2>
<p style="margin:0 0 20px;color:#555;font-size:14px;">${intro}</p>
${body}
<div style="margin-top:20px;">${ctaHtml(orderId, ctaBg)}</div>
${footerHtml(email)}
</div></body></html>`;
}

function itemsSection(
  items: StatusEmailItem[],
  currency: string,
  order: StatusEmailOrder,
  total: number,
): string {
  const built = itemsTable(items, currency);
  return `<table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
  ${built.rows}
  ${totalsHtml(built.subtotal, num(order.shipping_cost), total, currency, order.shipping_method_name, order.shipping_delivery_estimate)}
</table>`;
}

function fmtDate(d: string | null | undefined): string | null {
  if (!d) return null;
  const dt = new Date(d + "T00:00:00Z");
  if (isNaN(dt.getTime())) return d;
  return dt.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

function shipmentsHtml(shipments: StatusEmailShipment[]): string {
  return shipments
    .map((s, i) => {
      const label =
        shipments.length > 1 ? `Package ${i + 1} of ${shipments.length}` : "Package";
      const badge = s?.reshipment
        ? `<span style="display:inline-block;font-size:10.5px;font-weight:700;color:#92400e;background:#fef3c7;border-radius:999px;padding:2px 8px;margin-bottom:6px;">Reshipped free of charge</span><br/>`
        : "";
      const min = fmtDate(s?.estimated_min_date);
      const max = fmtDate(s?.estimated_max_date);
      const est =
        min && max
          ? `<p style="margin:6px 0 0;font-size:13px;"><strong>Estimated delivery:</strong> ${esc(min === max ? min : `${min} – ${max}`)}</p>`
          : "";
      const tracking = s?.tracking_url
        ? `<a href="${esc(s.tracking_url)}" style="color:#FF5C35;">${esc(s.tracking_number)}</a>`
        : esc(s?.tracking_number || "—");
      return `
      <div style="background:#f9fafb;border-radius:8px;padding:14px;margin-bottom:10px;">
        <p style="margin:0 0 6px;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;">${esc(label)}</p>
        ${badge}
        ${est}
        <p style="margin:6px 0 4px;font-size:13px;"><strong>Carrier:</strong> ${esc(s?.carrier || s?.service || "—")}</p>
        <p style="margin:0;font-size:13px;"><strong>Tracking:</strong> ${tracking}</p>
      </div>`;
    })
    .join("");
}

// ── Builders par statut ────────────────────────────────────────────────────
// Tous prennent (order, items, currencySymbol, ctx). Noms explicites par
// cause : failed (technique, resubmit possible) ≠ cancelled (annulée).

export function buildInProductionEmail(
  order: StatusEmailOrder,
  items: StatusEmailItem[],
  currency: string,
  ctx: { blockedNote?: string | null } = {},
): StatusEmailBuilt {
  const name = esc(order.client_name || "Customer");
  const note = ctx.blockedNote
    ? `<p style="margin:12px 0;color:#92400e;background:#fef3c7;padding:10px 12px;border-radius:8px;font-size:13px;border:1px solid #fcd34d;">${esc(ctx.blockedNote)}</p>`
    : "";
  return {
    subject: `Your order ${order.id} is now in production!`,
    html: shell(
      "#ede9fe",
      "#7c3aed",
      "InstaWear",
      "We're printing your order!",
      "In Production 🖨️",
      `Hi <strong>${name}</strong>,<br><br>Your order <strong>${esc(order.id)}</strong> is now being printed. We'll notify you as soon as it ships.`,
      `${stepperHtml(STEP_INDEX.in_production)}${note}${itemsSection(items, currency, order, num(order.total_amount))}`,
      order.id,
      order.client_email,
      "#7c3aed",
    ),
  };
}

export function buildPartialEmail(
  order: StatusEmailOrder,
  items: StatusEmailItem[],
  currency: string,
  shipments: StatusEmailShipment[],
): StatusEmailBuilt {
  const name = esc(order.client_name || "there");
  return {
    subject: `Your order ${order.id} is partially shipped!`,
    html: shell(
      "#fef3c7",
      "#92400e",
      "InstaWear",
      "First package on its way!",
      "Partially shipped 📦",
      `Hi <strong>${name}</strong>,<br><br>Good news: the first part of your order <strong>${esc(order.id)}</strong> has shipped. The rest is still being prepared — we'll notify you when each package leaves.`,
      `${stepperHtml(STEP_INDEX.partial)}${shipmentsHtml(shipments)}${itemsSection(items, currency, order, num(order.total_amount))}`,
      order.id,
      order.client_email,
    ),
  };
}

export function buildShippedEmail(
  order: StatusEmailOrder,
  currency: string,
  shipments: StatusEmailShipment[],
): StatusEmailBuilt {
  const name = esc(order.client_name || "there");
  return {
    subject: `Your order ${order.id} has shipped!`,
    html: shell(
      "#dbeafe",
      "#1e40af",
      "InstaWear",
      "Your order is on its way!",
      "Shipped 🚚",
      `Hi <strong>${name}</strong>, your order <strong>${esc(order.id)}</strong> has been shipped and is on its way to you.`,
      `${stepperHtml(STEP_INDEX.shipped)}${shipmentsHtml(shipments)}`,
      order.id,
      order.client_email,
    ),
  };
}

export function buildDeliveredEmail(
  order: StatusEmailOrder,
  items: StatusEmailItem[],
  currency: string,
): StatusEmailBuilt {
  const name = esc(order.client_name || "there");
  return {
    subject: `Your order ${order.id} has been delivered!`,
    html: shell(
      "#e6ffe6",
      "#006600",
      "InstaWear",
      "Your order has been delivered!",
      "Delivered ✅",
      `Hi <strong>${name}</strong>,<br><br>Your order <strong>${esc(order.id)}</strong> has been delivered. We hope you love it!`,
      `${stepperHtml(STEP_INDEX.delivered)}${itemsSection(items, currency, order, num(order.total_amount))}`,
      order.id,
      order.client_email,
    ),
  };
}

export function buildFailedEmail(
  order: StatusEmailOrder,
  items: StatusEmailItem[],
  currency: string,
  reason?: string | null,
): StatusEmailBuilt {
  const name = esc(order.client_name || "there");
  const r = reason
    ? ` Reason: ${esc(reason)}.`
    : "";
  return {
    subject: `Your order ${order.id} could not be processed`,
    html: shell(
      "#ffe6e6",
      "#cc0000",
      "InstaWear",
      "We couldn't process your order",
      "Order failed ❌",
      `Hi <strong>${name}</strong>,<br><br>Unfortunately, your order <strong>${esc(order.id)}</strong> could not be processed.${r} Our team is already working on it — if you've already been charged, a refund will be issued automatically.`,
      `${itemsSection(items, currency, order, num(order.total_amount))}<p style="margin:0 0 12px;"><a href="${SITE_URL}/contact" style="display:inline-block;padding:12px 24px;background:#999;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px;">Contact support →</a></p>`,
      order.id,
      order.client_email,
      "#cc0000",
    ),
  };
}

export function buildCancelledEmail(
  order: StatusEmailOrder,
  items: StatusEmailItem[],
  currency: string,
  reason?: string | null,
): StatusEmailBuilt {
  const name = esc(order.client_name || "there");
  const r = reason ? ` Reason: ${esc(reason)}.` : "";
  return {
    subject: `Your order ${order.id} has been cancelled`,
    html: shell(
      "#ffe6e6",
      "#cc0000",
      "InstaWear",
      "Your order has been cancelled",
      "Order cancelled",
      `Hi <strong>${name}</strong>,<br><br>Your order <strong>${esc(order.id)}</strong> has been cancelled.${r} If you have any questions, please contact our support team.`,
      `${itemsSection(items, currency, order, num(order.total_amount))}<p style="margin:0 0 12px;"><a href="${SITE_URL}/contact" style="display:inline-block;padding:12px 24px;background:#999;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px;">Contact support →</a></p>`,
      order.id,
      order.client_email,
      "#cc0000",
    ),
  };
}

export function buildOnHoldEmail(
  order: StatusEmailOrder,
  currency: string,
  reason?: string | null,
): StatusEmailBuilt {
  void currency;
  const name = esc(order.client_name || "there");
  const r = reason
    ? `<p style="margin:0 0 12px;color:#555;font-size:14px;"><strong>What's happening:</strong> ${esc(reason)}</p>`
    : "";
  return {
    subject: `Your order ${order.id} is on hold`,
    html: shell(
      "#fef3c7",
      "#92400e",
      "InstaWear",
      "Your order needs attention",
      "On hold ⏸️",
      `Hi <strong>${name}</strong>,`,
      `${stepperHtml(STEP_INDEX.on_hold)}<p style="margin:0 0 12px;color:#555;font-size:14px;">Your order <strong>${esc(order.id)}</strong> is temporarily paused while we resolve a production detail.</p>${r}<p style="margin:0 0 12px;color:#555;font-size:14px;">No action is needed from you — we'll notify you as soon as production resumes.</p>`,
      order.id,
      order.client_email,
    ),
  };
}

export function buildApprovalEmail(
  order: StatusEmailOrder,
  currency: string,
  reason?: string | null,
): StatusEmailBuilt {
  void currency;
  const name = esc(order.client_name || "there");
  const r = reason
    ? `<p style="margin:0 0 12px;color:#555;font-size:14px;"><strong>What's happening:</strong> ${esc(reason)}</p>`
    : "";
  return {
    subject: `Your order ${order.id} is being reviewed`,
    html: shell(
      "#fef3c7",
      "#92400e",
      "InstaWear",
      "Your order is being reviewed",
      "Design review in progress ✨",
      `Hi <strong>${name}</strong>,`,
      `${stepperHtml(STEP_INDEX.on_hold)}<p style="margin:16px 0;color:#555;font-size:14px;">Your order <strong>${esc(order.id)}</strong> is being carefully reviewed by our production team to ensure your design looks perfect on the product.</p>${r}<p style="margin:0 0 12px;color:#555;font-size:14px;">This typically takes <strong>24-48 hours</strong>. You'll receive an email once production resumes.</p><p style="margin:0 0 20px;color:#555;font-size:14px;">No action is needed from you.</p>`,
      order.id,
      order.client_email,
    ),
  };
}

export function buildRefundedEmail(
  order: StatusEmailOrder,
  items: StatusEmailItem[],
  currency: string,
  amount?: string | number | null,
): StatusEmailBuilt {
  const name = esc(order.client_name || "there");
  const a =
    amount != null && String(amount).trim() !== ""
      ? `<p style="margin:0 0 12px;color:#555;font-size:14px;"><strong>Refunded amount:</strong> ${esc(String(amount))}</p>`
      : "";
  return {
    subject: `Your order ${order.id} has been refunded`,
    html: shell(
      "#ede9fe",
      "#4c1d95",
      "InstaWear",
      "Your refund is on its way",
      "Refunded 💜",
      `Hi <strong>${name}</strong>,<br><br>Your order <strong>${esc(order.id)}</strong> has been refunded. The amount should appear on your original payment method within a few business days.`,
      `${a}${itemsSection(items, currency, order, num(order.total_amount))}`,
      order.id,
      order.client_email,
      "#4c1d95",
    ),
  };
}

export function buildReturnedEmail(
  order: StatusEmailOrder,
  items: StatusEmailItem[],
  currency: string,
  reason?: string | null,
): StatusEmailBuilt {
  const name = esc(order.client_name || "there");
  const r = reason ? ` Reason: ${esc(reason)}.` : "";
  return {
    subject: `Your order ${order.id} was returned`,
    html: shell(
      "#ffe4e6",
      "#9f1239",
      "InstaWear",
      "Your package came back to us",
      "Returned ↩️",
      `Hi <strong>${name}</strong>,<br><br>Your package for order <strong>${esc(order.id)}</strong> was returned to our facility.${r} Our support team will contact you shortly to arrange a reshipment or a refund.`,
      `${itemsSection(items, currency, order, num(order.total_amount))}<p style="margin:0 0 12px;"><a href="${SITE_URL}/contact" style="display:inline-block;padding:12px 24px;background:#999;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px;">Contact support →</a></p>`,
      order.id,
      order.client_email,
      "#9f1239",
    ),
  };
}
