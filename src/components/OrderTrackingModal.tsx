//src/components/OrderTrackingModal.tsx

import React, { useEffect, useState } from "react";
import { X, Search, Truck, RefreshCw } from "lucide-react";
import { useCurrencySymbol } from "../hooks/useCurrencySymbol";
import CopyID from "./CopyID";
import { PLACEHOLDER_IMG } from "../constants/assets";
import { orderApi } from "../api/supabaseApi";
import OrderStatusStepper from "./OrderStatusStepper";
import type { TrackingInfo } from "../admin/adminTypes";

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
  // Un élément par colis (voir TrackingInfo dans adminTypes.ts). orderApi.get()
  // renvoie déjà ce tableau normalisé via mapOrder() dans supabaseApi.ts.
  shipments: TrackingInfo[];
  items: {
    productId: string;
    title: string;
    productImage?: string;
    selectedColor: string;
    selectedSize: string;
    quantity: number;
    unitPrice: number;
  }[];
}

interface OrderTrackingModalProps {
  onClose: () => void;
  onSelectProduct?: (
    productId: string,
    initialColor?: string,
    initialSize?: string,
  ) => void;
  initialCode?: string;
}

export default function OrderTrackingModal({
  onClose,
  onSelectProduct,
  initialCode,
}: OrderTrackingModalProps) {
  const [input, setInput] = useState(initialCode || "");
  const [order, setOrder] = useState<TrackedOrder | null>(null);
  const [error, setError] = useState("");
  const currencySymbol = useCurrencySymbol();

  // Si le modal est ouvert avec une référence passée en paramètre d'URL
  // (?track=ORD-...), on lance la recherche automatiquement au montage.
  useEffect(() => {
    if (initialCode) {
      setInput(initialCode);
      handleSearch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialCode]);

  const handleSearch = async () => {
    setError("");
    setOrder(null);
    const code = input.trim();
    if (!code) return;

    try {
      // orderApi est déjà importé en haut du fichier
      const found = await orderApi.get(code);
      if (found) {
        // Convertir l'objet Order (Supabase) en TrackedOrder (format du composant).
        // found.trackingInfo est déjà un tableau normalisé par mapOrder()
        // dans supabaseApi.ts — aucune normalisation supplémentaire ici.
        const tracked: TrackedOrder = {
          id: found.id,
          clientName: found.clientName || found.shippingAddress?.fullName || "",
          clientEmail: found.clientEmail || null,
          clientPhone: found.shippingAddress?.phone || "",
          createdAt: found.createdAt,
          status: found.status,
          totalAmount: found.totalAmount,
          shippingCost: found.shippingCost,
          address: found.shippingAddress?.address
            ? `${found.shippingAddress.address}, ${found.shippingAddress.zip} ${found.shippingAddress.city}, ${found.shippingAddress.country}`
            : null,
          message: found.notes || null,
          shipments: found.trackingInfo || [],
          items: found.items.map((item) => ({
            productId: item.productId,
            title: item.productTitle || item.productId,
            productImage: item.productImage,
            selectedColor: item.selectedColor,
            selectedSize: item.selectedSize,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
          })),
        };
        setOrder(tracked);
      } else {
        setError(
          "No order found with that reference. Please double‑check your order ID.",
        );
      }
    } catch (err) {
      setError("An error occurred while searching for your order.");
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
            Track Your Order
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

        {/* Search field */}
        <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter your order reference (e.g. ORD-2026-3104)"
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
            Track
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
                  Order
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
                  <CopyID id={order.id} />
                </p>
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
                <span style={{ color: "var(--color-ink4)" }}>Customer:</span>{" "}
                {order.clientName}
              </div>
              <div>
                <span style={{ color: "var(--color-ink4)" }}>Date:</span>{" "}
                {new Date(order.createdAt).toLocaleDateString("en-US", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
              {order.address && (
                <div style={{ gridColumn: "1 / -1" }}>
                  <span style={{ color: "var(--color-ink4)" }}>Address:</span>{" "}
                  {order.address}
                </div>
              )}
            </div>

            {/* Barre de progression partagée — identique à AccountPage.tsx et à l'email d'expédition */}
            <div style={{ marginBottom: 14 }}>
              <OrderStatusStepper status={order.status} />
            </div>

            {order.status === "shipped" && order.shipments.length > 0 && (
              <div
                style={{
                  borderTop: "1px solid var(--color-border)",
                  paddingTop: 10,
                  marginBottom: 10,
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                }}
              >
                <p
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: "var(--color-ink)",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <Truck size={14} color="var(--color-accent)" />
                  {order.shipments.length > 1
                    ? `Tracking (${order.shipments.length} packages)`
                    : "Tracking"}
                </p>

                {order.shipments.map((shipment, i) => (
                  <div
                    key={i}
                    style={{
                      background: "var(--color-surface2)",
                      borderRadius: 12,
                      padding: 12,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: 6,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 11.5,
                          fontWeight: 700,
                          color: "var(--color-ink3)",
                        }}
                      >
                        {order.shipments.length > 1
                          ? `Package ${i + 1} of ${order.shipments.length}`
                          : "Package"}
                      </span>
                      {/* Badge réexpédition — basé uniquement sur le champ
                          reshipment renvoyé par Printful (signal réel, pas
                          une heuristique maison). */}
                      {shipment.reshipment && (
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                            fontSize: 10.5,
                            fontWeight: 700,
                            color: "#92400e",
                            background: "#fef3c7",
                            borderRadius: 999,
                            padding: "2px 8px",
                          }}
                        >
                          <RefreshCw size={10} strokeWidth={2.5} />
                          Reshipped free of charge
                        </span>
                      )}
                    </div>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: 6,
                        fontSize: 12.5,
                        color: "var(--color-ink2)",
                      }}
                    >
                      {shipment.carrier && (
                        <div>
                          <span style={{ color: "var(--color-ink4)" }}>
                            Carrier:
                          </span>{" "}
                          {shipment.carrier}
                        </div>
                      )}
                      {shipment.shipDate && (
                        <div>
                          <span style={{ color: "var(--color-ink4)" }}>
                            Shipped on:
                          </span>{" "}
                          {new Date(shipment.shipDate).toLocaleDateString(
                            "en-US",
                            {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            },
                          )}
                        </div>
                      )}
                      {shipment.trackingNumber && (
                        <div style={{ gridColumn: "1 / -1" }}>
                          <span style={{ color: "var(--color-ink4)" }}>
                            Tracking #:
                          </span>{" "}
                          {shipment.trackingUrl ? (
                            <a
                              href={shipment.trackingUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                color: "var(--color-accent)",
                                fontWeight: 600,
                                textDecoration: "underline",
                              }}
                            >
                              {shipment.trackingNumber}
                            </a>
                          ) : (
                            <span style={{ fontFamily: "monospace" }}>
                              {shipment.trackingNumber}
                            </span>
                          )}
                        </div>
                      )}
                      {shipment.estimatedMinDate && (
                        <div style={{ gridColumn: "1 / -1" }}>
                          <span style={{ color: "var(--color-ink4)" }}>
                            Estimated delivery:
                          </span>{" "}
                          {shipment.estimatedMinDate ===
                          shipment.estimatedMaxDate ? (
                            <strong>
                              {new Date(
                                shipment.estimatedMinDate + "T00:00:00",
                              ).toLocaleDateString("en-US", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })}
                            </strong>
                          ) : (
                            <strong>
                              {new Date(
                                shipment.estimatedMinDate + "T00:00:00",
                              ).toLocaleDateString("en-US", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })}{" "}
                              –{" "}
                              {new Date(
                                shipment.estimatedMaxDate + "T00:00:00",
                              ).toLocaleDateString("en-US", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })}
                            </strong>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

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
                Items
              </p>
              {order.items.map((item, i) => (
                <button
                  key={i}
                  onClick={() =>
                    onSelectProduct?.(
                      item.productId,
                      item.selectedColor,
                      item.selectedSize,
                    )
                  }
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    width: "100%",
                    textAlign: "left",
                    background: "none",
                    border: "none",
                    padding: "4px 0",
                    cursor: "pointer",
                    fontSize: 12.5,
                    color: "var(--color-ink2)",
                    marginBottom: 4,
                    borderRadius: 8,
                    transition: "background 0.15s",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "var(--color-surface)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "none")
                  }
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      flex: 1,
                    }}
                  >
                    <img
                      src={item.productImage || PLACEHOLDER_IMG}
                      alt={item.title}
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 6,
                        objectFit: "cover",
                        border: "1px solid var(--color-border)",
                        flexShrink: 0,
                      }}
                    />
                    <span>
                      {item.title} ({item.selectedSize}) × {item.quantity}
                    </span>
                  </div>
                  <span style={{ fontWeight: 600, marginLeft: 8 }}>
                    {(item.unitPrice * item.quantity).toFixed(2)}{" "}
                    {currencySymbol}
                  </span>
                </button>
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
              <span>
                {order.totalAmount.toFixed(2)} {currencySymbol}
              </span>
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
