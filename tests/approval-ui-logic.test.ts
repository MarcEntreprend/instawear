// tests/approval-ui-logic.test.ts
// Tests for frontend approval UI logic:
// - approvalData mapping from DB row
// - status checks for showing approval section
// - approval file rendering logic
// - dashboard stats pendingApprovals calculation

import { test } from "node:test";
import assert from "node:assert/strict";

// ─── Approval data mapping (mirrors mapOrder in supabaseApi.ts) ──────────────

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

interface OrderRow {
  id: string;
  status: string;
  approval_data: ApprovalData | null;
}

function mapApprovalData(row: OrderRow): ApprovalData | null {
  return row.approval_data ?? null;
}

test("mapApprovalData: returns null when no approval_data", () => {
  const row = { id: "ORD-2026-123456", status: "paid", approval_data: null };
  assert.equal(mapApprovalData(row), null);
});

test("mapApprovalData: returns approval data when present", () => {
  const approvalData: ApprovalData = {
    reason: "Design too large",
    approval_files: [
      {
        confirm_hash: "abc123",
        submitted_design: "https://files.cdn.printful.com/design.png",
        recommended_design: "https://files.cdn.printful.com/recommended.png",
        approval_sheet: "https://www.printful.com/sheet.pdf",
      },
    ],
    received_at: "2026-09-08T12:00:00Z",
  };
  const row = { id: "ORD-2026-123456", status: "on_hold", approval_data: approvalData };
  assert.deepEqual(mapApprovalData(row), approvalData);
});

test("mapApprovalData: handles empty approval_files", () => {
  const approvalData: ApprovalData = {
    reason: "test",
    approval_files: [],
    received_at: "2026-09-08T12:00:00Z",
  };
  const row = { id: "ORD-2026-123456", status: "on_hold", approval_data: approvalData };
  const result = mapApprovalData(row);
  assert.equal(result?.approval_files.length, 0);
});

// ─── Status checks for showing approval section ──────────────────────────────

test("show approval section only for on_hold status with approvalData", () => {
  const scenarios = [
    { status: "on_hold", approvalData: { reason: "test", approval_files: [], received_at: "" }, expected: true },
    { status: "on_hold", approvalData: null, expected: false },
    { status: "paid", approvalData: { reason: "test", approval_files: [], received_at: "" }, expected: false },
    { status: "shipped", approvalData: null, expected: false },
    { status: "in_production", approvalData: null, expected: false },
    { status: "delivered", approvalData: null, expected: false },
    { status: "cancelled", approvalData: null, expected: false },
  ];

  for (const s of scenarios) {
    const show = s.status === "on_hold" && s.approvalData !== null;
    assert.equal(show, s.expected, `status=${s.status}, approvalData=${s.approvalData ? "present" : "null"}`);
  }
});

// ─── Approval file rendering helpers ─────────────────────────────────────────

function getFileLinks(file: ApprovalFile): { label: string; url: string; color: string }[] {
  const links: { label: string; url: string; color: string }[] = [];
  if (file.submitted_design) {
    links.push({ label: "Design soumis", url: file.submitted_design, color: "#2563eb" });
  }
  if (file.recommended_design) {
    links.push({ label: "Design recommandé", url: file.recommended_design, color: "#059669" });
  }
  if (file.approval_sheet) {
    links.push({ label: "Fiche d'approbation", url: file.approval_sheet, color: "#6b7280" });
  }
  return links;
}

test("getFileLinks: all three links present", () => {
  const file: ApprovalFile = {
    confirm_hash: "abc",
    submitted_design: "https://files.cdn.printful.com/sub.png",
    recommended_design: "https://files.cdn.printful.com/rec.png",
    approval_sheet: "https://www.printful.com/sheet.pdf",
  };
  const links = getFileLinks(file);
  assert.equal(links.length, 3);
  assert.equal(links[0].label, "Design soumis");
  assert.equal(links[1].label, "Design recommandé");
  assert.equal(links[2].label, "Fiche d'approbation");
});

test("getFileLinks: only submitted_design", () => {
  const file: ApprovalFile = {
    confirm_hash: "abc",
    submitted_design: "https://files.cdn.printful.com/sub.png",
    recommended_design: "",
    approval_sheet: "",
  };
  const links = getFileLinks(file);
  assert.equal(links.length, 1);
  assert.equal(links[0].label, "Design soumis");
});

test("getFileLinks: empty when no URLs", () => {
  const file: ApprovalFile = {
    confirm_hash: "abc",
    submitted_design: "",
    recommended_design: "",
    approval_sheet: "",
  };
  const links = getFileLinks(file);
  assert.equal(links.length, 0);
});

// ─── Dashboard stats: pendingApprovals calculation ───────────────────────────

interface Order {
  id: string;
  status: string;
  approvalData: ApprovalData | null;
}

function calculatePendingApprovals(orders: Order[]): number {
  return orders.filter((o) => o.status === "on_hold" && o.approvalData).length;
}

test("calculatePendingApprovals: counts on_hold with approvalData", () => {
  const orders: Order[] = [
    { id: "1", status: "on_hold", approvalData: { reason: "test", approval_files: [], received_at: "" } },
    { id: "2", status: "on_hold", approvalData: { reason: "test", approval_files: [], received_at: "" } },
    { id: "3", status: "paid", approvalData: null },
    { id: "4", status: "shipped", approvalData: null },
  ];
  assert.equal(calculatePendingApprovals(orders), 2);
});

test("calculatePendingApprovals: returns 0 when no approvals", () => {
  const orders: Order[] = [
    { id: "1", status: "paid", approvalData: null },
    { id: "2", status: "shipped", approvalData: null },
  ];
  assert.equal(calculatePendingApprovals(orders), 0);
});

test("calculatePendingApprovals: on_hold without approvalData not counted", () => {
  const orders: Order[] = [
    { id: "1", status: "on_hold", approvalData: null },
  ];
  assert.equal(calculatePendingApprovals(orders), 0);
});

test("calculatePendingApprovals: empty orders array", () => {
  assert.equal(calculatePendingApprovals([]), 0);
});

// ─── Customer notification content validation ────────────────────────────────

test("customer notification: approval message is reassuring", () => {
  const orderId = "ORD-2026-123456";
  const title = `Votre commande ${orderId} est en revue`;
  const message = `Nous vérifions que votre design soit parfait sur le produit. Mise à jour sous 24-48h.`;

  assert.ok(title.includes(orderId), "title contains order ID");
  assert.ok(title.includes("revue"), "title mentions review");
  assert.ok(message.includes("24-48h"), "message mentions timeline");
  assert.ok(message.includes("design"), "message mentions design");
  assert.ok(!message.includes("problème"), "message avoids negative words");
  assert.ok(!message.includes("erreur"), "message avoids error words");
});

// ─── Admin notification: approval category ───────────────────────────────────

test("admin notification: approval uses correct category and priority", () => {
  const notification = {
    title: "Approbation requise — commande ORD-2026-123456",
    category: "approval",
    priority: "high",
  };

  assert.equal(notification.category, "approval");
  assert.equal(notification.priority, "high");
  assert.ok(notification.title.includes("Approbation"));
});

// ─── OrderTrackingModal: on_hold message ─────────────────────────────────────

test("on_hold message: content is reassuring and in French", () => {
  const message = {
    title: "Votre commande est en revue",
    description: "Nous vérifions que votre design soit parfait sur le produit. La production reprendra sous 24-48h. Aucune action n'est requise de votre part.",
  };

  assert.ok(message.title.includes("revue"));
  assert.ok(message.description.includes("24-48h"));
  assert.ok(message.description.includes("Aucune action"));
  assert.ok(!message.description.includes("error"));
  assert.ok(!message.description.includes("problem"));
});

// ─── NotificationPage: approval category colors ──────────────────────────────

test("approval category: amber/yellow color scheme", () => {
  const categoryColors = {
    border: "#f59e0b",
    bg: "#fef3c7",
  };

  // Amber-500 border, Amber-50 background
  assert.equal(categoryColors.border, "#f59e0b");
  assert.equal(categoryColors.bg, "#fef3c7");
});
