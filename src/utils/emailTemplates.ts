// src/utils/emailTemplates.ts

// Email templates for transactional emails via Resend
// These are called from adminHooks.ts only (send-email est backend-only).

import { supabase } from "../lib/supabaseClient";

const SEND_EMAIL_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-email`;

const BASE_URL = "https://instawear.vercel.app";

async function adminAuthHeaders(): Promise<Record<string, string>> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token || "";
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function buildFooter(email: string) {
  return `
    <div style="margin-top:32px;padding-top:16px;border-top:1px solid #eee;font-size:11px;color:#999;line-height:1.6;">
      <p style="margin:0 0 8px;">This email was sent to <strong>${email}</strong> for your recent purchase at <a href="${BASE_URL}" style="color:#FF5C35;text-decoration:none;">instawear.vercel.app</a></p>
      <p style="margin:0;">InstaWear · 123 Main Street, Doral, FL 10001<br>© 2026 InstaWear Inc. All rights reserved.</p>
    </div>
  `;
}

export async function sendShippedEmail(order: any) {
  const { id, clientEmail, clientName } = order;
  const html = `<!DOCTYPE html><html><body style="max-width:600px;margin:0 auto;font-family:Arial,sans-serif;color:#1a1a1a;">
<div style="background:#dbeafe;padding:24px;border-radius:12px 12px 0 0;text-align:center;">
<h1 style="color:#1e40af;margin:0;font-size:22px;">InstaWear</h1>
<p style="color:#1e40af;margin:4px 0 0;font-size:14px;">Your order is on its way!</p>
</div>
<div style="background:#fff;padding:24px;border:1px solid #e5e5e5;border-top:none;border-radius:0 0 12px 12px;">
<h2 style="margin:0 0 8px;font-size:18px;">Shipped 🚚</h2>
<p style="margin:0 0 20px;color:#555;font-size:14px;">Hi <strong>${clientName}</strong>,<br><br>Your order <strong>${id}</strong> has been shipped and is on its way to you.</p>
<a href="${BASE_URL}?track=${encodeURIComponent(id)}" style="display:inline-block;padding:12px 24px;background:#FF5C35;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px;">View order details →</a>
${buildFooter(clientEmail)}
</div></body></html>`;

  const headers = await adminAuthHeaders();
  fetch(SEND_EMAIL_URL, {
    method: "POST",
    headers,
    body: JSON.stringify({
      to: clientEmail,
      subject: `Your order ${id} is on its way!`,
      html,
    }),
  }).catch(console.error);
}

export async function sendDeliveredEmail(order: any) {
  const { id, clientEmail, clientName } = order;
  const html = `<!DOCTYPE html><html><body style="max-width:600px;margin:0 auto;font-family:Arial,sans-serif;color:#1a1a1a;">
<div style="background:#e6ffe6;padding:24px;border-radius:12px 12px 0 0;text-align:center;">
<h1 style="color:#006600;margin:0;font-size:22px;">InstaWear</h1>
<p style="color:#006600;margin:4px 0 0;font-size:14px;">Your order has been delivered!</p>
</div>
<div style="background:#fff;padding:24px;border:1px solid #e5e5e5;border-top:none;border-radius:0 0 12px 12px;">
<h2 style="margin:0 0 8px;font-size:18px;">Delivered ✅</h2>
<p style="margin:0 0 20px;color:#555;font-size:14px;">Hi <strong>${clientName}</strong>,<br><br>Your order <strong>${id}</strong> has been delivered. We hope you love it!</p>
<a href="${BASE_URL}?track=${encodeURIComponent(id)}" style="display:inline-block;padding:12px 24px;background:#FF5C35;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px;">View order details →</a>
${buildFooter(clientEmail)}
</div></body></html>`;

  const headers = await adminAuthHeaders();
  fetch(SEND_EMAIL_URL, {
    method: "POST",
    headers,
    body: JSON.stringify({
      to: clientEmail,
      subject: `Your order ${id} has been delivered!`,
      html,
    }),
  }).catch(console.error);
}

export async function sendInProductionEmail(order: any) {
  const { id, clientEmail, clientName } = order;
  const html = `<!DOCTYPE html><html><body style="max-width:600px;margin:0 auto;font-family:Arial,sans-serif;color:#1a1a1a;">
<div style="background:#ede9fe;padding:24px;border-radius:12px 12px 0 0;text-align:center;">
<h1 style="color:#7c3aed;margin:0;font-size:22px;">InstaWear</h1>
<p style="color:#7c3aed;margin:4px 0 0;font-size:14px;">We're printing your order!</p>
</div>
<div style="background:#fff;padding:24px;border:1px solid #e5e5e5;border-top:none;border-radius:0 0 12px 12px;">
<h2 style="margin:0 0 8px;font-size:18px;">In Production 🖨️</h2>
<p style="margin:0 0 20px;color:#555;font-size:14px;">Hi <strong>${clientName}</strong>,<br><br>Your order <strong>${id}</strong> is now being printed. We'll notify you as soon as it ships.</p>
<a href="${BASE_URL}?track=${encodeURIComponent(id)}" style="display:inline-block;padding:12px 24px;background:#7c3aed;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px;">View order details →</a>
${buildFooter(clientEmail)}
</div></body></html>`;

  const headers = await adminAuthHeaders();
  fetch(SEND_EMAIL_URL, {
    method: "POST",
    headers,
    body: JSON.stringify({
      to: clientEmail,
      subject: `Your order ${id} is now in production!`,
      html,
    }),
  }).catch(console.error);
}

export async function sendCancelledEmail(order: any) {
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

  const headers = await adminAuthHeaders();
  fetch(SEND_EMAIL_URL, {
    method: "POST",
    headers,
    body: JSON.stringify({
      to: clientEmail,
      subject: `Your order ${id} has been cancelled`,
      html,
    }),
  }).catch(console.error);
}
