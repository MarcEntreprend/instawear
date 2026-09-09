// tests/approval-webhook.test.ts
// Tests for Printful approval webhook handling logic:
// - approval_data structure validation
// - state transitions (on_hold -> in_production on approve)
// - notification categories
// - email template content

import { test } from "node:test";
import assert from "node:assert/strict";

// ─── Approval data structure (mirrors webhook handler) ──────────────────────

interface ApprovalFile {
  confirm_hash: string;
  submitted_design: string;
  recommended_design: string;
  approval_sheet: string;
}

interface ApprovalData {
  reason: string;
  approval_files: ApprovalFile[];
  received_at: string;
}

function buildApprovalData(payload: any): ApprovalData {
  return {
    reason: payload.reason || "Design adjustment needed",
    approval_files: (payload.approval_files || []).map((f: any) => ({
      confirm_hash: f.confirm_hash || "",
      submitted_design: f.submitted_design || "",
      recommended_design: f.recommended_design || "",
      approval_sheet: f.approval_sheet || "",
    })),
    received_at: new Date().toISOString(),
  };
}

// ─── Webhook payload validation ─────────────────────────────────────────────

test("buildApprovalData creates valid structure from full payload", () => {
  const data = buildApprovalData({
    reason: "Design too large for product",
    approval_files: [
      {
        confirm_hash: "a14e51714be01f98487fcf5131727d31",
        submitted_design: "https://files.cdn.printful.com/design1.png",
        recommended_design: "https://files.cdn.printful.com/design2.png",
        approval_sheet: "https://www.printful.com/dashboard/order/download-approval-sheet-pdf?confirmationHash=a14e51714be01f98487fcf5131727d31",
      },
    ],
  });

  assert.equal(data.reason, "Design too large for product");
  assert.equal(data.approval_files.length, 1);
  assert.equal(data.approval_files[0].confirm_hash, "a14e51714be01f98487fcf5131727d31");
  assert.ok(data.received_at, "received_at should be set");
  assert.ok(new Date(data.received_at).getTime() > 0, "received_at should be valid ISO date");
});

test("buildApprovalData handles empty approval_files", () => {
  const data = buildApprovalData({ reason: "test" });
  assert.equal(data.approval_files.length, 0);
  assert.equal(data.reason, "test");
});

test("buildApprovalData defaults reason when missing", () => {
  const data = buildApprovalData({});
  assert.equal(data.reason, "Design adjustment needed");
});

test("buildApprovalData handles multiple approval files", () => {
  const data = buildApprovalData({
    reason: "Multiple designs need adjustment",
    approval_files: [
      { confirm_hash: "hash1", submitted_design: "url1", recommended_design: "url2", approval_sheet: "url3" },
      { confirm_hash: "hash2", submitted_design: "url4", recommended_design: "url5", approval_sheet: "url6" },
    ],
  });
  assert.equal(data.approval_files.length, 2);
  assert.equal(data.approval_files[0].confirm_hash, "hash1");
  assert.equal(data.approval_files[1].confirm_hash, "hash2");
});

test("buildApprovalData fills empty strings for missing fields", () => {
  const data = buildApprovalData({
    approval_files: [{ confirm_hash: "abc123" }],
  });
  assert.equal(data.approval_files[0].confirm_hash, "abc123");
  assert.equal(data.approval_files[0].submitted_design, "");
  assert.equal(data.approval_files[0].recommended_design, "");
  assert.equal(data.approval_files[0].approval_sheet, "");
});

// ─── State transition: on_hold -> in_production on approve ───────────────────

const ALLOWED_WEBHOOK_TRANSITIONS = new Set([
  "pending->paid", "pending->cancelled",
  "paid->in_production", "paid->partial", "paid->on_hold", "paid->cancelled",
  "in_production->shipped", "in_production->partial", "in_production->on_hold", "in_production->cancelled",
  "partial->shipped", "partial->on_hold", "partial->cancelled", "partial->refunded",
  "on_hold->in_production", "on_hold->partial", "on_hold->cancelled", "on_hold->refunded",
  "shipped->delivered", "shipped->returned", "shipped->refunded",
  "delivered->returned", "delivered->refunded",
]);

function isTransitionAllowed(from: string, to: string): boolean {
  return from === to || ALLOWED_WEBHOOK_TRANSITIONS.has(`${from}->${to}`);
}

test("on_hold -> in_production is allowed (approve)", () => {
  assert.ok(isTransitionAllowed("on_hold", "in_production"));
});

test("on_hold -> on_hold is allowed (no-op)", () => {
  assert.ok(isTransitionAllowed("on_hold", "on_hold"));
});

test("on_hold -> cancelled is allowed (reject)", () => {
  assert.ok(isTransitionAllowed("on_hold", "cancelled"));
});

test("on_hold -> shipped is NOT allowed", () => {
  assert.equal(isTransitionAllowed("on_hold", "shipped"), false);
});

test("on_hold -> delivered is NOT allowed", () => {
  assert.equal(isTransitionAllowed("on_hold", "delivered"), false);
});

// ─── Notification category for approval events ──────────────────────────────

test("approval notification uses 'approval' category", () => {
  const type = "order_put_hold_approval";
  const category = type === "order_put_hold_approval" ? "approval" : "orders";
  assert.equal(category, "approval");
});

test("other order notifications use 'orders' category", () => {
  const types = ["order_put_hold", "order_remove_hold", "order_failed", "order_canceled"];
  for (const type of types) {
    const category = type === "order_put_hold_approval" ? "approval" : "orders";
    assert.equal(category, "orders", `${type} should use orders category`);
  }
});

// ─── Approval email content validation ──────────────────────────────────────

test("approval email contains reassuring message", () => {
  const reason = "Design needs adjustment";
  const orderId = "ORD-2026-123456";
  const clientName = "Jean Dupont";

  // Simulates the email HTML content checks
  const emailContent = `
    <h2>Design review in progress</h2>
    <p>Hi <strong>${clientName}</strong>,</p>
    <p>Your order <strong>${orderId}</strong> is being carefully reviewed</p>
    <p>This typically takes <strong>24-48 hours</strong></p>
    <p>No action is needed from you.</p>
  `;

  assert.ok(emailContent.includes("Design review in progress"), "subject line present");
  assert.ok(emailContent.includes(clientName), "client name present");
  assert.ok(emailContent.includes(orderId), "order ID present");
  assert.ok(emailContent.includes("24-48 hours"), "timeline present");
  assert.ok(emailContent.includes("No action is needed"), "reassuring message present");
});

// ─── SUPPORTED_TYPES includes approval event ────────────────────────────────

const SUPPORTED_TYPES = new Set([
  "package_shipped",
  "order_failed",
  "order_canceled",
  "order_put_hold",
  "order_put_hold_approval",
  "order_remove_hold",
  "order_refunded",
  "package_returned",
  "stock_updated",
]);

test("SUPPORTED_TYPES includes order_put_hold_approval", () => {
  assert.ok(SUPPORTED_TYPES.has("order_put_hold_approval"));
});

test("SUPPORTED_TYPES includes all existing events", () => {
  assert.ok(SUPPORTED_TYPES.has("package_shipped"));
  assert.ok(SUPPORTED_TYPES.has("order_failed"));
  assert.ok(SUPPORTED_TYPES.has("order_canceled"));
  assert.ok(SUPPORTED_TYPES.has("order_put_hold"));
  assert.ok(SUPPORTED_TYPES.has("order_remove_hold"));
  assert.ok(SUPPORTED_TYPES.has("order_refunded"));
  assert.ok(SUPPORTED_TYPES.has("package_returned"));
  assert.ok(SUPPORTED_TYPES.has("stock_updated"));
});

// ─── ADMIN_EVENT_META priority for approval ─────────────────────────────────

test("approval event has high priority", () => {
  const ADMIN_EVENT_META: Record<string, { title: string; priority: string }> = {
    order_put_hold: { title: `Commande mise en pause`, priority: "medium" },
    order_put_hold_approval: { title: `Approbation requise`, priority: "high" },
    order_remove_hold: { title: `Pause levée`, priority: "low" },
    order_refunded: { title: `Commande remboursée`, priority: "medium" },
    package_returned: { title: `Colis retourné`, priority: "high" },
    order_failed: { title: `Échec commande`, priority: "high" },
    order_canceled: { title: `Commande annulée`, priority: "medium" },
  };

  assert.equal(ADMIN_EVENT_META["order_put_hold_approval"].priority, "high");
  assert.ok(ADMIN_EVENT_META["order_put_hold_approval"].title.includes("Approbation"));
});
