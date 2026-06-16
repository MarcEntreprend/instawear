// src/components/OrderTrackingModal.tsx

import React, { useState } from "react";
import {
  X,
  Search,
  Package,
  Clock,
  CheckCircle,
  Truck,
  MapPin,
} from "lucide-react";
import { orderApi } from "../api/supabaseApi";

interface TrackedOrder {
  id: string;
  clientName: string;
  clientEmail: string | null;
  clientPhone: string;
  createdAt: string;
  status: string;
  totalAmount: number;
  shippingCost: number;
  address: string | null;
  message: string | null;
  items: {
    productId: string;
    title: string;
    selectedColor: string;
    selectedSize: string;
    quantity: number;
    unitPrice: number;
  }[];
}

interface OrderTrackingModalProps {
  onClose: () => void;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: "En attente", color: "#92400e" },
  in_production: { label: "En production", color: "#1e40af" },
  shipped: { label: "Expédiée", color: "#065f46" },
  delivered: { label: "Livrée", color: "#166534" },
  cancelled: { label: "Annulée", color: "#991b1b" },
};

export default function OrderTrackingModal({
  onClose,
}: OrderTrackingModalProps) {
  const [input, setInput] = useState("");
  const [order, setOrder] = useState<TrackedOrder | null>(null);
  const [error, setError] = useState("");

  const handleSearch = async () => {
    setError("");
    setOrder(null);
    const code = input.trim();
    if (!code) return;

    try {
      // orderApi est déjà importé en haut du fichier
      const found = await orderApi.get(code);
      if (found) {
        // Convertir l'objet Order (Supabase) en TrackedOrder (format du composant)
        const tracked: TrackedOrder = {
          id: found.id,
          clientName: found.clientName || found.shippingAddress?.fullName || "",
          clientEmail: found.clientEmail || null,
          clientPhone: found.shippingAddress?.phone || "",
          createdAt: found.createdAt,
          status: found.status,
          totalAmount: found.totalAmount,
          shippingCost: found.shippingCost,
          address: found.shippingAddress
            ? `${found.shippingAddress.address}, ${found.shippingAddress.zip} ${found.shippingAddress.city}, ${found.shippingAddress.country}`
            : null,
          message: found.notes || null,
          items: found.items.map((item) => ({
            productId: item.productId,
            title: item.productTitle || item.productId,
            selectedColor: item.selectedColor,
            selectedSize: item.selectedSize,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
          })),
        };
        setOrder(tracked);
      } else {
        setError(
          "Aucune commande trouvée avec ce code. Vérifiez votre référence.",
        );
      }
    } catch (err) {
      setError("Erreur lors de la recherche de la commande.");
      console.error(err);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSearch();
    }
  };

  return (
    <div style={overlay}>
      <div style={panel}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 20,
          }}
        >
          <h2
            style={{ fontWeight: 700, fontSize: 18, color: "var(--color-ink)" }}
          >
            Suivi de commande
          </h2>
          <button
            onClick={onClose}
            style={{
              background: "var(--color-surface2)",
              border: "1px solid var(--color-border)",
              borderRadius: 8,
              padding: "4px 8px",
              cursor: "pointer",
              color: "var(--color-ink2)",
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Champ de recherche */}
        <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Entrez votre référence (ex: ORD-2026-3104)"
            style={{
              flex: 1,
              padding: "10px 14px",
              borderRadius: 12,
              border: "1.5px solid var(--color-border2)",
              background: "var(--color-surface)",
              fontSize: 14,
              fontFamily: "monospace",
              color: "var(--color-ink)",
              outline: "none",
            }}
          />
          <button
            onClick={handleSearch}
            style={{
              padding: "10px 16px",
              borderRadius: 12,
              border: "none",
              background: "var(--color-accent)",
              color: "white",
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Search size={16} />
            Rechercher
          </button>
        </div>

        {error && (
          <p
            style={{
              color: "#ef4444",
              fontSize: 13,
              textAlign: "center",
              marginBottom: 12,
            }}
          >
            {error}
          </p>
        )}

        {order && (
          <div
            style={{
              background: "var(--color-surface2)",
              borderRadius: 14,
              padding: 18,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: 12,
              }}
            >
              <div>
                <p
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: "var(--color-ink3)",
                    textTransform: "uppercase",
                  }}
                >
                  Commande
                </p>
                <p
                  style={{
                    fontFamily: "monospace",
                    fontWeight: 800,
                    fontSize: 16,
                    color: "var(--color-accent)",
                  }}
                >
                  {order.id}
                </p>
              </div>
              <div style={{ textAlign: "right" }}>
                <p
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: "var(--color-ink3)",
                    textTransform: "uppercase",
                  }}
                >
                  Statut
                </p>
                <span
                  style={{
                    display: "inline-block",
                    padding: "2px 10px",
                    borderRadius: 999,
                    fontSize: 12,
                    fontWeight: 700,
                    background:
                      (
                        STATUS_LABELS[order.status] || {
                          color: "#555",
                          bg: "#f3f4f6",
                        }
                      ).color + "22",
                    color: (STATUS_LABELS[order.status] || { color: "#555" })
                      .color,
                  }}
                >
                  {
                    (STATUS_LABELS[order.status] || { label: order.status })
                      .label
                  }
                </span>
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 10,
                fontSize: 13,
                color: "var(--color-ink2)",
                marginBottom: 12,
              }}
            >
              <div>
                <span style={{ color: "var(--color-ink4)" }}>Client :</span>{" "}
                {order.clientName}
              </div>
              <div>
                <span style={{ color: "var(--color-ink4)" }}>Date :</span>{" "}
                {new Date(order.createdAt).toLocaleDateString("fr-FR", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
              {order.address && (
                <div style={{ gridColumn: "1 / -1" }}>
                  <span style={{ color: "var(--color-ink4)" }}>Adresse :</span>{" "}
                  {order.address}
                </div>
              )}
            </div>

            <div
              style={{
                borderTop: "1px solid var(--color-border)",
                paddingTop: 10,
                marginBottom: 10,
              }}
            >
              <p
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: "var(--color-ink)",
                  marginBottom: 8,
                }}
              >
                Articles
              </p>
              {order.items.map((item, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 12.5,
                    color: "var(--color-ink2)",
                    marginBottom: 4,
                  }}
                >
                  <span>
                    {item.title} ({item.selectedSize}) × {item.quantity}
                  </span>
                  <span style={{ fontWeight: 600 }}>
                    {(item.unitPrice * item.quantity).toFixed(2)} €
                  </span>
                </div>
              ))}
            </div>

            <div
              style={{
                borderTop: "1px solid var(--color-border)",
                paddingTop: 10,
                display: "flex",
                justifyContent: "space-between",
                fontWeight: 700,
                fontSize: 14,
              }}
            >
              <span>Total</span>
              <span>{order.totalAmount.toFixed(2)} €</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const overlay: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 200,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "rgba(26,20,10,0.5)",
  backdropFilter: "blur(4px)",
};

const panel: React.CSSProperties = {
  background: "var(--color-surface)",
  borderRadius: 20,
  maxWidth: 500,
  width: "90%",
  maxHeight: "85vh",
  overflowY: "auto",
  padding: 28,
  boxShadow: "var(--shadow-xl)",
};
