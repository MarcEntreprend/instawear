// supabase/functions/_shared/stripeRefunds.ts
//
// CANONIQUE — Remboursements Stripe réels (argent, pas label).
// Source de vérité : ce fichier. Copies déployées à l'identique dans :
//   - supabase/functions/stripe-refund/_shared/stripeRefunds.ts
//   - supabase/functions/printful-webhook/_shared/stripeRefunds.ts
// (Supabase déploie UN dossier de fonction. Toute modification ici DOIT
// être recopiée + tests verts.)
// Pur : clients injectés (stripe, supabaseAdmin), aucune I/O directe,
// aucun Deno. Testable en node.
//
// Règles :
// - Résolution PI : colonne dédiée → external_order_id pi_ → session
//   Checkout expand. Jamais d'hypothèse, null si introuvable (l'appelant
//   répond 404, pas de mouvement d'argent aveugle).
// - Montants en CENTIMES entiers partout ; amount null = solde restant.
// - Idempotency-Key EXIGÉE par l'appelant (retries sûrs, pas de doubles).

export interface RefundPI {
  id: string;
  amountReceived: number;
  currency: string;
  alreadyRefunded: number;
}

/** Résout le PaymentIntent d'une commande (carte + hosted). */
export async function resolvePaymentIntent(
  stripe: any,
  supabaseAdmin: any,
  order: any,
): Promise<{ piId: string } | { error: string }> {
  const direct =
    (typeof order?.stripe_payment_intent_id === "string" &&
      order.stripe_payment_intent_id.startsWith("pi_") &&
      order.stripe_payment_intent_id) ||
    (typeof order?.external_order_id === "string" &&
      order.external_order_id.startsWith("pi_") &&
      order.external_order_id) ||
    null;
  if (direct) return { piId: direct };

  // Hosted : external_order_id = session Checkout → expand vers le PI.
  const sessionId =
    typeof order?.external_order_id === "string" &&
    order.external_order_id.startsWith("cs_")
      ? order.external_order_id
      : null;
  if (sessionId) {
    try {
      const session = await stripe.checkout.sessions.retrieve(sessionId, {
        expand: ["payment_intent"],
      });
      const pi = (session as any)?.payment_intent;
      const piId =
        typeof pi === "string" ? pi : typeof pi?.id === "string" ? pi.id : null;
      if (piId) return { piId };
    } catch {
      // Continue vers l'erreur explicite ci-dessous.
    }
  }
  return { error: "Aucun paiement Stripe trouvé pour cette commande" };
}

/** Solde remboursable (centimes) depuis Stripe (source de vérité). */
export async function remainingOnPI(
  stripe: any,
  piId: string,
): Promise<{ received: number; refunded: number; currency: string }> {
  const pi = await stripe.paymentIntents.retrieve(piId);
  const received = Number((pi as any)?.amount_received || 0);
  const currency = String((pi as any)?.currency || "usd").toUpperCase();
  const list = await stripe.refunds.list({ payment_intent: piId, limit: 100 });
  let refunded = 0;
  for (const r of (list as any)?.data || []) {
    if (r?.status === "succeeded" || r?.status === "pending") {
      refunded += Number(r?.amount || 0);
    }
  }
  return { received, refunded, currency };
}

/** Exécute le remboursement (lève en cas d'échec Stripe). */
export async function executeRefund(
  stripe: any,
  piId: string,
  amountCents: number | null,
  opts: { reason?: string; idempotencyKey: string; orderId: string },
): Promise<any> {
  return stripe.refunds.create(
    {
      payment_intent: piId,
      ...(amountCents != null ? { amount: amountCents } : {}),
      reason: opts.reason || "requested_by_customer",
      metadata: { orderId: opts.orderId },
    },
    { idempotencyKey: opts.idempotencyKey },
  );
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Clé d'idempotence fournie par l'appelant (UUID généré par clic). */
export function isValidIdempotencyKey(v: unknown): boolean {
  return typeof v === "string" && UUID_RE.test(v.trim());
}
