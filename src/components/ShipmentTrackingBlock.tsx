// src/components/ShipmentTrackingBlock.tsx

// Bloc de suivi des colis expédiés — partagé entre AccountPage, le modal
// admin de OrdersPage et la page admin « Expédiées / Livrées ».
// Affiche pour chaque colis : fenêtre d'arrivée estimée, transporteur,
// date d'expédition et numéro de suivi cliquable.

import React from "react";
import { Truck, RefreshCw } from "lucide-react";
import type { TrackingInfo } from "../admin/adminTypes";

interface ShipmentTrackingBlockProps {
  shipments: TrackingInfo[];
}

// Format "YYYY-MM-DD" to "August 13, 2026" (locale en).
function formatDate(dateStr: string | null): string | null {
  if (!dateStr) return null;
  const d = new Date(dateStr + "T00:00:00");
  if (isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function ShipmentTrackingBlock({
  shipments,
}: ShipmentTrackingBlockProps) {
  if (!shipments || shipments.length === 0) return null;

  return (
    <div
      style={{
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
          margin: 0,
        }}
      >
        <Truck size={14} color="var(--color-accent)" />
        {shipments.length > 1
          ? `Tracking (${shipments.length} packages)`
          : "Package tracking"}
      </p>

      {shipments.map((shipment, i) => {
        const carrier = shipment?.carrier || shipment?.service;
        const trackingNumber = shipment?.trackingNumber;
        const trackingUrl = shipment?.trackingUrl;
        const minEst = formatDate(shipment?.estimatedMinDate ?? null);
        const maxEst = formatDate(shipment?.estimatedMaxDate ?? null);
        const shipDate = formatDate(shipment?.shipDate ?? null);

        const estimateLabel =
          minEst && maxEst && minEst === maxEst
            ? minEst
            : minEst && maxEst
              ? `${minEst} – ${maxEst}`
              : null;

        return (
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
                {shipments.length > 1
                  ? `Package ${i + 1} of ${shipments.length}`
                  : "Package"}
              </span>
              {shipment?.reshipment && (
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
              {estimateLabel && (
                <div style={{ gridColumn: "1 / -1" }}>
                  <span style={{ color: "var(--color-ink4)" }}>
                    Estimated arrival:
                  </span>{" "}
                  <strong>{estimateLabel}</strong>
                </div>
              )}
              {carrier && (
                <div>
                  <span style={{ color: "var(--color-ink4)" }}>
                    Carrier:
                  </span>{" "}
                  {carrier}
                </div>
              )}
              {shipDate && (
                <div>
                  <span style={{ color: "var(--color-ink4)" }}>
                    Shipped on:
                  </span>{" "}
                  {shipDate}
                </div>
              )}
              {trackingNumber && (
                <div style={{ gridColumn: "1 / -1" }}>
                  <span style={{ color: "var(--color-ink4)" }}>Tracking #:</span>{" "}
                  {trackingUrl ? (
                    <a
                      href={trackingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        color: "var(--color-accent)",
                        fontWeight: 600,
                        textDecoration: "underline",
                        wordBreak: "break-all",
                      }}
                    >
                      {trackingNumber}
                    </a>
                  ) : (
                    <span style={{ fontFamily: "monospace" }}>
                      {trackingNumber}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
