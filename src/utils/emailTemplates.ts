// src/utils/emailTemplates.ts

// Email templates for transactional emails via Resend
// These are called from adminHooks.ts and CheckoutFlow.tsx

const RESEND_FROM = import.meta.env.VITE_SUPABASE_URL
  ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-email`
  : "";

const BASE_URL = "https://instawear.vercel.app";

function buildFooter(email: string) {
  return `
    <div style="margin-top:32px;padding-top:16px;border-top:1px solid #eee;font-size:11px;color:#999;line-height:1.6;">
      <p style="margin:0 0 8px;">This email was sent to <strong>${email}</strong> for your recent purchase at <a href="${BASE_URL}" style="color:#FF5C35;text-decoration:none;">instawear.vercel.app</a></p>
      <p style="margin:0;">InstaWear · 123 Main Street, Doral, FL 10001<br>© 2026 InstaWear Inc. All rights reserved.</p>
    </div>
  `;
}

function itemsToHtml(items: any[], currencySymbol: string) {
  return items
    .map(
      (item) => `
    <tr>
      <td style="padding:12px 0;border-bottom:1px solid #eee;">
        <table><tr>
          <td style="width:60px;vertical-align:top;">
            <img src="${item.productImage || "https://instawear.vercel.app/Instawear-missing-item.svg"}" style="width:52px;height:52px;border-radius:8px;object-fit:cover;">
          </td>
          <td style="vertical-align:top;padding-left:12px;">
            <p style="margin:0;font-weight:600;font-size:14px;">${item.productTitle}</p>
            <p style="margin:4px 0;font-size:12px;color:#888;">
              Color: ${item.selectedColor} · Size: ${item.selectedSize} · Qty: ${item.quantity}
            </p>
          </td>
          <td style="vertical-align:top;text-align:right;font-weight:700;font-size:14px;white-space:nowrap;">
            ${(item.unitPrice * item.quantity).toFixed(2)} ${currencySymbol}
          </td>
        </tr></table>
      </td>
    </tr>
  `,
    )
    .join("");
}

export function sendPendingEmail(order: any) {
  const { id, clientEmail, clientName, items, totalAmount, shippingCost } =
    order;
  const currency = "$";
  const subtotal = items.reduce(
    (sum: number, item: any) => sum + item.unitPrice * item.quantity,
    0,
  );
  const itemsHtml = itemsToHtml(items, currency);
  const html = `<!DOCTYPE html><html><body style="max-width:600px;margin:0 auto;font-family:Arial,sans-serif;color:#1a1a1a;">
<div style="background:#f0f0f0;padding:24px;border-radius:12px 12px 0 0;text-align:center;">
<h1 style="color:#333;margin:0;font-size:22px;">InstaWear</h1>
<p style="color:#666;margin:4px 0 0;font-size:14px;">Your payment is being processed</p>
</div>
<div style="background:#fff;padding:24px;border:1px solid #e5e5e5;border-top:none;border-radius:0 0 12px 12px;">
<h2 style="margin:0 0 8px;font-size:18px;">Payment pending ⏳</h2>
<p style="margin:0 0 20px;color:#555;font-size:14px;">Hi <strong>${clientName}</strong>,<br><br>Your order <strong>${id}</strong> is waiting for payment confirmation. We'll process it as soon as the payment is received.</p>
<table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
  ${itemsHtml}
  <tr>
    <td colspan="2" style="padding-top:16px;text-align:right;font-size:13px;color:#888;">
      Subtotal: ${subtotal.toFixed(2)} ${currency}
    </td>
  </tr>
  <tr>
    <td colspan="2" style="text-align:right;font-size:13px;color:#888;">
      Shipping: ${(shippingCost ?? 0) === 0 ? "Free" : `${(shippingCost ?? 0).toFixed(2)} ${currency}`}
    </td>
  </tr>
  <tr>
    <td colspan="2" style="padding-top:8px;text-align:right;font-size:16px;font-weight:700;color:#1a1a1a;">
      Order total: ${totalAmount.toFixed(2)} ${currency}
    </td>
  </tr>
</table>
<a href="${BASE_URL}" style="display:inline-block;padding:12px 24px;background:#999;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px;">View your order →</a>
${buildFooter(clientEmail)}
</div></body></html>`;

  fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-email`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({
      to: clientEmail,
      subject: `Order ${id} — Payment pending`,
      html,
    }),
  }).catch(console.error);
}

export function sendShippedEmail(order: any) {
  const { id, clientEmail, clientName } = order;
  const html = `<!DOCTYPE html><html><body style="max-width:600px;margin:0 auto;font-family:Arial,sans-serif;color:#1a1a1a;">
<div style="background:#dbeafe;padding:24px;border-radius:12px 12px 0 0;text-align:center;">
<h1 style="color:#1e40af;margin:0;font-size:22px;">InstaWear</h1>
<p style="color:#1e40af;margin:4px 0 0;font-size:14px;">Your order is on its way!</p>
</div>
<div style="background:#fff;padding:24px;border:1px solid #e5e5e5;border-top:none;border-radius:0 0 12px 12px;">
<h2 style="margin:0 0 8px;font-size:18px;">Shipped 🚚</h2>
<p style="margin:0 0 20px;color:#555;font-size:14px;">Hi <strong>${clientName}</strong>,<br><br>Your order <strong>${id}</strong> has been shipped and is on its way to you.</p>
<a href="${BASE_URL}" style="display:inline-block;padding:12px 24px;background:#FF5C35;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px;">View order details →</a>
${buildFooter(clientEmail)}
</div></body></html>`;

  fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-email`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({
      to: clientEmail,
      subject: `Your order ${id} is on its way!`,
      html,
    }),
  }).catch(console.error);
}

export function sendDeliveredEmail(order: any) {
  const { id, clientEmail, clientName } = order;
  const html = `<!DOCTYPE html><html><body style="max-width:600px;margin:0 auto;font-family:Arial,sans-serif;color:#1a1a1a;">
<div style="background:#e6ffe6;padding:24px;border-radius:12px 12px 0 0;text-align:center;">
<h1 style="color:#006600;margin:0;font-size:22px;">InstaWear</h1>
<p style="color:#006600;margin:4px 0 0;font-size:14px;">Your order has been delivered!</p>
</div>
<div style="background:#fff;padding:24px;border:1px solid #e5e5e5;border-top:none;border-radius:0 0 12px 12px;">
<h2 style="margin:0 0 8px;font-size:18px;">Delivered ✅</h2>
<p style="margin:0 0 20px;color:#555;font-size:14px;">Hi <strong>${clientName}</strong>,<br><br>Your order <strong>${id}</strong> has been delivered. We hope you love it!</p>
<a href="${BASE_URL}" style="display:inline-block;padding:12px 24px;background:#FF5C35;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px;">View order details →</a>
${buildFooter(clientEmail)}
</div></body></html>`;

  fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-email`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({
      to: clientEmail,
      subject: `Your order ${id} has been delivered!`,
      html,
    }),
  }).catch(console.error);
}

export function sendInProductionEmail(order: any) {
  const { id, clientEmail, clientName } = order;
  const html = `<!DOCTYPE html><html><body style="max-width:600px;margin:0 auto;font-family:Arial,sans-serif;color:#1a1a1a;">
<div style="background:#ede9fe;padding:24px;border-radius:12px 12px 0 0;text-align:center;">
<h1 style="color:#7c3aed;margin:0;font-size:22px;">InstaWear</h1>
<p style="color:#7c3aed;margin:4px 0 0;font-size:14px;">We're printing your order!</p>
</div>
<div style="background:#fff;padding:24px;border:1px solid #e5e5e5;border-top:none;border-radius:0 0 12px 12px;">
<h2 style="margin:0 0 8px;font-size:18px;">In Production 🖨️</h2>
<p style="margin:0 0 20px;color:#555;font-size:14px;">Hi <strong>${clientName}</strong>,<br><br>Your order <strong>${id}</strong> is now being printed. We'll notify you as soon as it ships.</p>
<a href="${BASE_URL}" style="display:inline-block;padding:12px 24px;background:#7c3aed;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px;">View order details →</a>
${buildFooter(clientEmail)}
</div></body></html>`;

  fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-email`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({
      to: clientEmail,
      subject: `Your order ${id} is now in production!`,
      html,
    }),
  }).catch(console.error);
}

export function sendCancelledEmail(order: any) {
  const { id, clientEmail, clientName } = order;
  const html = `<!DOCTYPE html><html><body style="max-width:600px;margin:0 auto;font-family:Arial,sans-serif;color:#1a1a1a;">
<div style="background:#ffe6e6;padding:24px;border-radius:12px 12px 0 0;text-align:center;">
<h1 style="color:#cc0000;margin:0;font-size:22px;">InstaWear</h1>
<p style="color:#cc0000;margin:4px 0 0;font-size:14px;">Order cancelled</p>
</div>
<div style="background:#fff;padding:24px;border:1px solid #e5e5e5;border-top:none;border-radius:0 0 12px 12px;">
<h2 style="margin:0 0 8px;font-size:18px;">Your order has been cancelled</h2>
<p style="margin:0 0 20px;color:#555;font-size:14px;">Hi <strong>${clientName}</strong>,<br><br>Your order <strong>${id}</strong> has been cancelled. If you have any questions, please contact our support team.</p>
<a href="${BASE_URL}" style="display:inline-block;padding:12px 24px;background:#999;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px;">Visit InstaWear →</a>
${buildFooter(clientEmail)}
</div></body></html>`;

  fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-email`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({
      to: clientEmail,
      subject: `Your order ${id} has been cancelled`,
      html,
    }),
  }).catch(console.error);
}
