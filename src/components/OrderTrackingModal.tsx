// src/components/OrderTrackingModal.tsx

import React, { useState } from "react";
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
}

export default function OrderTrackingModal({
  onClose,
  onSelectProduct,
}: OrderTrackingModalProps) {
  const [input, setInput] = useState("");
  const [order, setOrder] = useState<TrackedOrder | null>(null);
  const [error, setError] = useState("");
  const currencySymbol = useCurrencySymbol();

  const handleSearch = async () => {
    setError("");
    setOrder(null);
    const code = input.trim();
    if (!code) return;

    try {
      const found = await orderApi.get(code);
      if (found) {
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
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2
            className="font-display font-black text-xl"
            style={{ color: "var(--color-ink)" }}
          >
            Track Your Order
          </h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors"
            style={{
              background: "var(--color-surface2)",
              border: "1px solid var(--color-border)",
              color: "var(--color-ink2)",
            }}
          >
            <X size={16} strokeWidth={2} />
          </button>
        </div>

        {/* Search field */}
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter your order reference (e.g. ORD-2026-3104)"
            className="flex-1 rounded-xl border px-3.5 py-2.5 text-sm font-mono outline-none"
            style={{
              borderColor: "var(--color-border2)",
              background: "var(--color-surface)",
              color: "var(--color-ink)",
            }}
          />
          <button
            onClick={handleSearch}
            className="pill flex items-center gap-1.5 rounded-full px-4 py-2.5 text-sm font-bold text-white transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.97]"
            style={{
              background: "var(--color-accent)",
              boxShadow: "var(--shadow-accent)",
            }}
          >
            <Search size={15} strokeWidth={2} />
            Track
          </button>
        </div>

        {error && (
          <p
            className="mb-3 text-center text-sm font-semibold"
            style={{ color: "var(--color-negative)" }}
          >
            {error}
          </p>
        )}

        {order && (
          <div
            className="rounded-xl p-4"
            style={{
              background: "var(--color-surface2)",
              border: "1px solid var(--color-border)",
            }}
          >
            {/* Order header */}
            <div className="flex items-center justify-between mb-3">
              <div>
                <p
                  className="text-[11px] font-semibold uppercase tracking-[0.08em]"
                  style={{ color: "var(--color-ink4)" }}
                >
                  Order
                </p>
                <p
                  className="flex items-center gap-1 font-mono text-base font-black"
                  style={{ color: "var(--color-accent)" }}
                >
                  {order.id}
                  <CopyID id={order.id} />
                </p>
              </div>
            </div>

            {/* Customer info */}
            <div
              className="mb-3 grid grid-cols-2 gap-2 text-sm"
              style={{ color: "var(--color-ink2)" }}
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
                <div className="col-span-full">
                  <span style={{ color: "var(--color-ink4)" }}>Address:</span>{" "}
                  {order.address}
                </div>
              )}
            </div>

            {/* Status stepper */}
            <div className="mb-3">
              <OrderStatusStepper status={order.status} />
            </div>

            {/* Shipments */}
            {order.status === "shipped" && order.shipments.length > 0 && (
              <div
                className="mb-3 flex flex-col gap-3 pt-3"
                style={{ borderTop: "1px solid var(--color-border)" }}
              >
                <p
                  className="flex items-center gap-1.5 text-sm font-bold"
                  style={{ color: "var(--color-ink)" }}
                >
                  <Truck
                    size={14}
                    strokeWidth={2}
                    style={{ color: "var(--color-accent)" }}
                  />
                  {order.shipments.length > 1
                    ? `Tracking (${order.shipments.length} packages)`
                    : "Tracking"}
                </p>

                {order.shipments.map((shipment, i) => (
                  <div
                    key={i}
                    className="rounded-lg p-3"
                    style={{
                      background: "var(--color-surface)",
                      border: "1px solid var(--color-border)",
                    }}
                  >
                    <div className="mb-1.5 flex items-center justify-between">
                      <span
                        className="text-[11px] font-bold"
                        style={{ color: "var(--color-ink3)" }}
                      >
                        {order.shipments.length > 1
                          ? `Package ${i + 1} of ${order.shipments.length}`
                          : "Package"}
                      </span>
                      {shipment.reshipment && (
                        <span
                          className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold"
                          style={{
                            background: "#fef3c7",
                            color: "#92400e",
                          }}
                        >
                          <RefreshCw size={10} strokeWidth={2.5} />
                          Reshipped free of charge
                        </span>
                      )}
                    </div>
                    <div
                      className="grid grid-cols-2 gap-1 text-xs"
                      style={{ color: "var(--color-ink2)" }}
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
                        <div className="col-span-full">
                          <span style={{ color: "var(--color-ink4)" }}>
                            Tracking #:
                          </span>{" "}
                          {shipment.trackingUrl ? (
                            <a
                              href={shipment.trackingUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-semibold underline"
                              style={{ color: "var(--color-accent)" }}
                            >
                              {shipment.trackingNumber}
                            </a>
                          ) : (
                            <span className="font-mono">
                              {shipment.trackingNumber}
                            </span>
                          )}
                        </div>
                      )}
                      {shipment.estimatedMinDate && (
                        <div className="col-span-full">
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

            {/* Items */}
            <div
              className="mb-3 pt-3"
              style={{ borderTop: "1px solid var(--color-border)" }}
            >
              <p
                className="mb-2 text-sm font-bold"
                style={{ color: "var(--color-ink)" }}
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
                  className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-sm transition-colors hover:bg-(--color-surface)"
                  style={{ color: "var(--color-ink2)" }}
                >
                  <div className="flex items-center gap-2.5">
                    <img
                      src={item.productImage || PLACEHOLDER_IMG}
                      alt={item.title}
                      className="h-9 w-9 rounded-lg border object-cover"
                      style={{ borderColor: "var(--color-border)" }}
                    />
                    <span>
                      {item.title} ({item.selectedSize}) × {item.quantity}
                    </span>
                  </div>
                  <span
                    className="font-semibold"
                    style={{ color: "var(--color-ink)" }}
                  >
                    {(item.unitPrice * item.quantity).toFixed(2)}{" "}
                    {currencySymbol}
                  </span>
                </button>
              ))}
            </div>

            {/* Total */}
            <div
              className="flex items-center justify-between pt-3 text-sm font-bold"
              style={{
                borderTop: "1px solid var(--color-border)",
                color: "var(--color-ink)",
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
  background: "rgba(11,11,10,0.55)",
  backdropFilter: "blur(6px)",
};

const panel: React.CSSProperties = {
  background: "var(--color-surface)",
  borderRadius: 24,
  maxWidth: 500,
  width: "90%",
  maxHeight: "85vh",
  overflowY: "auto",
  padding: 28,
  boxShadow: "var(--shadow-xl)",
  border: "1px solid var(--color-border)",
};
