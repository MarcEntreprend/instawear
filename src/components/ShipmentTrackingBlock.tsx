// src/components/ShipmentTrackingBlock.tsx

import React from "react";
import { Truck, RefreshCw } from "lucide-react";
import type { TrackingInfo } from "../admin/adminTypes";

interface ShipmentTrackingBlockProps {
  shipments: TrackingInfo[];
}

function formatDateFr(dateStr: string | null): string | null {
  if (!dateStr) return null;
  const d = new Date(dateStr + "T00:00:00");
  if (isNaN(d.getTime())) return null;
  return d.toLocaleDateString("fr-FR", {
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
    <div className="flex flex-col gap-3">
      <p
        className="flex items-center gap-1.5 text-sm font-bold"
        style={{ color: "var(--color-ink)" }}
      >
        <Truck
          size={14}
          strokeWidth={2}
          style={{ color: "var(--color-accent)" }}
        />
        {shipments.length > 1
          ? `Suivi (${shipments.length} colis)`
          : "Suivi du colis"}
      </p>

      {shipments.map((shipment, i) => {
        const carrier = shipment?.carrier || shipment?.service;
        const trackingNumber = shipment?.trackingNumber;
        const trackingUrl = shipment?.trackingUrl;
        const minEst = formatDateFr(shipment?.estimatedMinDate ?? null);
        const maxEst = formatDateFr(shipment?.estimatedMaxDate ?? null);
        const shipDate = formatDateFr(shipment?.shipDate ?? null);

        const estimateLabel =
          minEst && maxEst && minEst === maxEst
            ? minEst
            : minEst && maxEst
              ? `${minEst} – ${maxEst}`
              : null;

        return (
          <div
            key={i}
            className="rounded-lg p-3"
            style={{
              background: "var(--color-surface2)",
              border: "1px solid var(--color-border)",
            }}
          >
            <div className="mb-1.5 flex items-center justify-between">
              <span
                className="text-[11px] font-bold"
                style={{ color: "var(--color-ink3)" }}
              >
                {shipments.length > 1
                  ? `Colis ${i + 1} sur ${shipments.length}`
                  : "Colis"}
              </span>
              {shipment?.reshipment && (
                <span
                  className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold"
                  style={{
                    background: "#fef3c7",
                    color: "#92400e",
                  }}
                >
                  <RefreshCw size={10} strokeWidth={2.5} />
                  Réexpédié gratuitement
                </span>
              )}
            </div>
            <div
              className="grid grid-cols-2 gap-1 text-xs"
              style={{ color: "var(--color-ink2)" }}
            >
              {estimateLabel && (
                <div className="col-span-full">
                  <span style={{ color: "var(--color-ink4)" }}>
                    Arrivée estimée :
                  </span>{" "}
                  <strong style={{ color: "var(--color-ink)" }}>
                    {estimateLabel}
                  </strong>
                </div>
              )}
              {carrier && (
                <div>
                  <span style={{ color: "var(--color-ink4)" }}>
                    Transporteur :
                  </span>{" "}
                  {carrier}
                </div>
              )}
              {shipDate && (
                <div>
                  <span style={{ color: "var(--color-ink4)" }}>
                    Expédié le :
                  </span>{" "}
                  {shipDate}
                </div>
              )}
              {trackingNumber && (
                <div className="col-span-full">
                  <span style={{ color: "var(--color-ink4)" }}>Suivi n° :</span>{" "}
                  {trackingUrl ? (
                    <a
                      href={trackingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold underline"
                      style={{ color: "var(--color-accent)" }}
                    >
                      {trackingNumber}
                    </a>
                  ) : (
                    <span
                      className="font-mono"
                      style={{ color: "var(--color-ink2)" }}
                    >
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
