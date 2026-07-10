// src/components/AccountPage.tsx

/**
 * Espace client unifié – commandes, favoris, support, profil.
 * Accessible depuis le header pour les utilisateurs connectés.
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  X,
  Package,
  Heart,
  MessageSquare,
  User,
  ArrowLeft,
  ShoppingBag,
  Eye,
  Plus,
  Loader2,
  Send,
} from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { customerApi, interactionApi } from "../api/supabaseApi";
import { useCurrencySymbol } from "../hooks/useCurrencySymbol";
import { PLACEHOLDER_IMG } from "../constants/assets";
import type { Order, AdminProduct, Favourite } from "../admin/adminTypes";

// ─── Props ────────────────────────────────────────────────────────────
interface AccountPageProps {
  allCustomers: { id: string; email: string }[];
  onClose: () => void;
}

// ─── Types locaux ─────────────────────────────────────────────────────
interface Interaction {
  id: string;
  subject: string;
  status: string;
  updatedAt: string;
  lastMessage?: string;
}

// ─── Style réutilisé ──────────────────────────────────────────────────
const tabBtn = (active: boolean): React.CSSProperties => ({
  background: "none",
  border: "none",
  padding: "12px 18px",
  cursor: "pointer",
  fontSize: 13,
  fontFamily: "var(--font-body)",
  display: "flex",
  alignItems: "center",
  gap: 6,
  color: active ? "var(--color-accent)" : "var(--color-ink3)",
  borderBottom: active
    ? "2px solid var(--color-accent)"
    : "2px solid transparent",
  fontWeight: active ? 700 : 500,
  whiteSpace: "nowrap",
});

export default function AccountPage({
  allCustomers,
  onClose,
}: AccountPageProps) {
  const currencySymbol = useCurrencySymbol();

  // ── Auth & customer id ────────────────────────────────────────────
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerName, setCustomerName] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user?.email) return;
      const cust = allCustomers.find((c) => c.email === user.email);
      if (cust) {
        setCustomerId(cust.id);
        setCustomerEmail(user.email);
      }
    });
  }, [allCustomers]);

  // ── Onglets ────────────────────────────────────────────────────────
  const [tab, setTab] = useState<
    "orders" | "favorites" | "support" | "profile"
  >("orders");

  // ── Données chargées à la demande ──────────────────────────────────
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [favorites, setFavorites] = useState<Favourite[]>([]);
  const [loadingFav, setLoadingFav] = useState(false);
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [loadingInter, setLoadingInter] = useState(false);

  const fetchOrders = useCallback(async () => {
    if (!customerId) return;
    setLoadingOrders(true);
    try {
      const data = await customerApi.getOrders(customerId);
      setOrders(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingOrders(false);
    }
  }, [customerId]);

  const fetchFavorites = useCallback(async () => {
    if (!customerId) return;
    setLoadingFav(true);
    try {
      const data = await customerApi.getFavourites(customerId);
      setFavorites(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingFav(false);
    }
  }, [customerId]);

  const fetchInteractions = useCallback(async () => {
    if (!customerEmail) return;
    setLoadingInter(true);
    try {
      const data = await interactionApi.list({ search: customerEmail });
      setInteractions(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingInter(false);
    }
  }, [customerEmail]);

  useEffect(() => {
    if (tab === "orders" && orders.length === 0) fetchOrders();
    if (tab === "favorites" && favorites.length === 0) fetchFavorites();
    if (tab === "support" && interactions.length === 0) fetchInteractions();
  }, [tab, fetchOrders, fetchFavorites, fetchInteractions]);

  // ── Rendu principal ───────────────────────────────────────────────
  return (
    <div
      className="fixed inset-0 z-50 flex flex-col"
      style={{ background: "var(--color-bg)" }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between p-5 border-b"
        style={{ borderColor: "var(--color-border)" }}
      >
        <button
          onClick={onClose}
          className="flex items-center gap-2 text-(--color-ink3) hover:text-(--color-ink) transition-colors"
        >
          <ArrowLeft size={18} strokeWidth={2} />
          <span className="font-semibold text-sm">Retour à la boutique</span>
        </button>
        <h2
          className="font-black text-lg"
          style={{ color: "var(--color-ink)" }}
        >
          Mon compte
        </h2>
        <div className="w-16" /> {/* spacer */}
      </div>

      {/* Tabs */}
      <div
        className="flex gap-1 px-5 border-b"
        style={{ borderColor: "var(--color-border)" }}
      >
        {[
          {
            key: "orders" as const,
            label: "Commandes",
            icon: <Package size={14} />,
          },
          {
            key: "favorites" as const,
            label: "Favoris",
            icon: <Heart size={14} />,
          },
          {
            key: "support" as const,
            label: "Support",
            icon: <MessageSquare size={14} />,
          },
          {
            key: "profile" as const,
            label: "Profil",
            icon: <User size={14} />,
          },
        ].map(({ key, label, icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            style={tabBtn(tab === key)}
          >
            {icon}
            {label}
          </button>
        ))}
      </div>

      {/* Contenu */}
      <div className="flex-1 overflow-y-auto p-5">
        {tab === "orders" && (
          <OrdersTab
            orders={orders}
            loading={loadingOrders}
            currencySymbol={currencySymbol}
          />
        )}
        {tab === "favorites" && (
          <FavoritesTab
            favorites={favorites}
            loading={loadingFav}
            currencySymbol={currencySymbol}
          />
        )}
        {tab === "support" && (
          <SupportTab
            interactions={interactions}
            loading={loadingInter}
            customerEmail={customerEmail}
            customerName={customerName}
          />
        )}
        {tab === "profile" && (
          <ProfileTab
            customerEmail={customerEmail}
            customerName={customerName}
          />
        )}
      </div>
    </div>
  );
}

// ─── Sous-composants onglets ────────────────────────────────────────────

function OrdersTab({
  orders,
  loading,
  currencySymbol,
}: {
  orders: Order[];
  loading: boolean;
  currencySymbol: string;
}) {
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  if (loading) return <Loader />;
  if (orders.length === 0)
    return <Empty text="Aucune commande pour le moment." />;
  if (selectedOrder)
    return (
      <OrderDetail
        order={selectedOrder}
        currencySymbol={currencySymbol}
        onBack={() => setSelectedOrder(null)}
      />
    );

  return (
    <div className="flex flex-col gap-2">
      {orders.map((order) => (
        <button
          key={order.id}
          onClick={() => setSelectedOrder(order)}
          className="w-full flex items-center justify-between p-4 rounded-xl text-left transition-colors hover:bg-(--color-surface2)"
          style={{
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
          }}
        >
          <div>
            <p
              className="font-bold text-sm"
              style={{ color: "var(--color-ink)" }}
            >
              {order.id}
            </p>
            <p className="text-xs" style={{ color: "var(--color-ink3)" }}>
              {new Date(order.createdAt).toLocaleDateString("fr-FR")}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <span
              className="font-bold text-sm"
              style={{ color: "var(--color-ink)" }}
            >
              {order.totalAmount.toFixed(2)} {currencySymbol}
            </span>
            <StatusBadge status={order.status} />
            <Eye size={14} style={{ color: "var(--color-ink4)" }} />
          </div>
        </button>
      ))}
    </div>
  );
}

function OrderDetail({
  order,
  currencySymbol,
  onBack,
}: {
  order: Order;
  currencySymbol: string;
  onBack: () => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <button
        onClick={onBack}
        className="flex items-center gap-1 text-sm font-semibold text-(--color-ink3) hover:text-(--color-ink)"
      >
        <ArrowLeft size={14} /> Retour
      </button>
      <div
        className="p-5 rounded-2xl"
        style={{
          background: "var(--color-surface)",
          border: "1px solid var(--color-border)",
        }}
      >
        <p
          className="font-black text-lg mb-2"
          style={{ color: "var(--color-ink)" }}
        >
          Commande {order.id}
        </p>
        <StatusBadge status={order.status} />
        <div className="mt-4 flex flex-col gap-2">
          {order.items.map((item) => (
            <div key={item.id} className="flex items-center gap-3">
              <img
                src={item.productImage || PLACEHOLDER_IMG}
                className="w-12 h-12 rounded-lg object-cover"
              />
              <div className="flex-1 min-w-0">
                <p
                  className="text-sm font-semibold truncate"
                  style={{ color: "var(--color-ink)" }}
                >
                  {item.productTitle}
                </p>
                <p className="text-xs" style={{ color: "var(--color-ink3)" }}>
                  Taille {item.selectedSize} · Qté {item.quantity}
                </p>
              </div>
              <span
                className="text-sm font-bold"
                style={{ color: "var(--color-ink)" }}
              >
                {(item.unitPrice * item.quantity).toFixed(2)} {currencySymbol}
              </span>
            </div>
          ))}
        </div>
        <hr className="my-3" style={{ borderColor: "var(--color-border)" }} />
        <div
          className="flex justify-between text-sm font-bold"
          style={{ color: "var(--color-ink)" }}
        >
          <span>Total</span>
          <span>
            {order.totalAmount.toFixed(2)} {currencySymbol}
          </span>
        </div>
        {order.shippingAddress && (
          <div className="mt-4 text-xs" style={{ color: "var(--color-ink3)" }}>
            <p className="font-semibold mb-1">Adresse de livraison :</p>
            <p>{order.shippingAddress.fullName}</p>
            <p>{order.shippingAddress.address}</p>
            <p>
              {order.shippingAddress.city}, {order.shippingAddress.zip} ·{" "}
              {order.shippingAddress.country}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    pending: { bg: "#fef3c7", color: "#92400e", label: "En attente" },
    paid: { bg: "#dbeafe", color: "#1e40af", label: "Payée" },
    in_production: { bg: "#d1fae5", color: "#065f46", label: "En production" },
    shipped: { bg: "#d1fae5", color: "#065f46", label: "Expédiée" },
    delivered: { bg: "#dcfce7", color: "#166534", label: "Livrée" },
    cancelled: { bg: "#fee2e2", color: "#991b1b", label: "Annulée" },
  };
  const s = map[status] || map.pending;
  return (
    <span
      style={{
        display: "inline-block",
        padding: "3px 10px",
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 700,
        color: s.color,
        background: s.bg,
      }}
    >
      {s.label}
    </span>
  );
}

function FavoritesTab({
  favorites,
  loading,
  currencySymbol,
}: {
  favorites: Favourite[];
  loading: boolean;
  currencySymbol: string;
}) {
  if (loading) return <Loader />;
  if (favorites.length === 0) return <Empty text="Aucun favori." />;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      {favorites.map((fav) => (
        <div
          key={fav.id}
          className="rounded-xl overflow-hidden border bg-(--color-surface) p-3 flex flex-col gap-2"
        >
          <img
            src={fav.product?.image || PLACEHOLDER_IMG}
            className="aspect-square object-cover rounded-lg"
          />
          <p
            className="text-sm font-semibold line-clamp-2"
            style={{ color: "var(--color-ink)" }}
          >
            {fav.product?.title || "Produit indisponible"}
          </p>
          {fav.product?.price != null && (
            <p
              className="text-xs font-bold"
              style={{ color: "var(--color-ink3)" }}
            >
              {fav.product.price.toFixed(2)} {currencySymbol}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

function SupportTab({
  interactions,
  loading,
  customerEmail,
  customerName,
}: {
  interactions: Interaction[];
  loading: boolean;
  customerEmail: string;
  customerName: string;
}) {
  const [showForm, setShowForm] = useState(false);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const handleCreate = async () => {
    if (!subject.trim() || !message.trim()) return;
    setSending(true);
    try {
      const { data: inter } = await supabase
        .from("interactions")
        .insert({
          customer_id: customerEmail, // utilise l'email comme identifiant client (correspond à la colonne customer_id)
          customer_name: customerName || "Client",
          customer_email: customerEmail,
          type: "question",
          status: "open",
          subject: subject.trim(),
          last_message: message.trim(),
        })
        .select()
        .single();
      if (inter) {
        await supabase.from("interaction_messages").insert({
          interaction_id: inter.id,
          from_field: "customer",
          text: message.trim(),
        });
      }
      setShowForm(false);
      setSubject("");
      setMessage("");
    } catch (e) {
      console.error(e);
    } finally {
      setSending(false);
    }
  };

  if (loading) return <Loader />;
  if (!showForm && interactions.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-sm mb-4" style={{ color: "var(--color-ink3)" }}>
          Aucune conversation.
        </p>
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 rounded-xl text-white font-semibold text-sm"
          style={{ background: "var(--color-accent)" }}
        >
          Contacter le support
        </button>
      </div>
    );
  }

  if (showForm) {
    return (
      <div className="max-w-md mx-auto flex flex-col gap-3">
        <button
          onClick={() => setShowForm(false)}
          className="text-sm text-(--color-ink3) hover:underline self-start"
        >
          ← Retour
        </button>
        <input
          type="text"
          placeholder="Sujet"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="w-full p-3 rounded-xl border border-(--color-border) bg-(--color-surface) text-sm"
        />
        <textarea
          placeholder="Votre message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={4}
          className="w-full p-3 rounded-xl border border-(--color-border) bg-(--color-surface) text-sm"
        />
        <button
          onClick={handleCreate}
          disabled={sending || !subject.trim() || !message.trim()}
          className="w-full py-3 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2"
          style={{
            background: "var(--color-accent)",
            opacity: sending ? 0.6 : 1,
          }}
        >
          {sending ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Send size={16} />
          )}
          Envoyer
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={() => setShowForm(true)}
        className="self-end flex items-center gap-1 text-xs font-semibold text-(--color-accent) mb-2"
      >
        <Plus size={14} /> Nouveau message
      </button>
      {interactions.map((t) => (
        <div
          key={t.id}
          className="p-4 rounded-xl border bg-(--color-surface)"
          style={{ borderColor: "var(--color-border)" }}
        >
          <div className="flex justify-between items-start">
            <p
              className="font-bold text-sm"
              style={{ color: "var(--color-ink)" }}
            >
              {t.subject}
            </p>
            <span
              className="text-xs px-2 py-0.5 rounded-full"
              style={{
                background: t.status === "open" ? "#fef3c7" : "#d1fae5",
                color: t.status === "open" ? "#92400e" : "#065f46",
              }}
            >
              {t.status === "open" ? "Ouvert" : "Résolu"}
            </span>
          </div>
          {t.lastMessage && (
            <p
              className="text-xs mt-2 line-clamp-2"
              style={{ color: "var(--color-ink3)" }}
            >
              {t.lastMessage}
            </p>
          )}
          <p
            className="text-[10px] mt-1"
            style={{ color: "var(--color-ink4)" }}
          >
            {new Date(t.updatedAt).toLocaleString("fr-FR")}
          </p>
        </div>
      ))}
    </div>
  );
}

function ProfileTab({
  customerEmail,
  customerName,
}: {
  customerEmail: string;
  customerName: string;
}) {
  return (
    <div className="max-w-sm mx-auto flex flex-col gap-4 p-5 rounded-2xl border bg-(--color-surface)">
      <div>
        <p
          className="text-xs font-bold uppercase mb-1"
          style={{ color: "var(--color-ink3)" }}
        >
          Nom
        </p>
        <p className="text-sm" style={{ color: "var(--color-ink)" }}>
          {customerName || "—"}
        </p>
      </div>
      <div>
        <p
          className="text-xs font-bold uppercase mb-1"
          style={{ color: "var(--color-ink3)" }}
        >
          Email
        </p>
        <p className="text-sm" style={{ color: "var(--color-ink)" }}>
          {customerEmail}
        </p>
      </div>
      <p className="text-xs" style={{ color: "var(--color-ink4)" }}>
        Pour modifier vos informations, contactez le support.
      </p>
    </div>
  );
}

// ─── Utilitaires ──────────────────────────────────────────────────────
function Loader() {
  return (
    <div className="flex justify-center py-12">
      <Loader2
        size={28}
        className="animate-spin"
        style={{ color: "var(--color-accent)" }}
      />
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="text-center py-12">
      <p className="text-sm" style={{ color: "var(--color-ink3)" }}>
        {text}
      </p>
    </div>
  );
}
