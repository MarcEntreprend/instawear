// Bloc de suivi des colis expédiés – partagé entre AccountPage, le modal admin
// et la page admin « Expédiées / Livrées ».
// Affiche pour chaque colis : fenêtre d'arrivée estimée, transporteur,
// date d'expédition et numéro de suivi cliquable.

import React from "react";
import { Truck, RefreshCw } from "lucide-react";
import type { TrackingInfo } from "../admin/adminTypes";

interface ShipmentTrackingBlockProps {
  shipments: TrackingInfo[];
}

// Formate "YYYY-MM-DD" en "13 août 2026" (locale fr).
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
      {/* En-tête */}
      <div className="flex items-center gap-2">
        <Truck size={16} className="text-(--color-accent)" strokeWidth={2} />
        <span
          className="text-sm font-bold"
          style={{ color: "var(--color-ink)" }}
        >
          {shipments.length > 1
            ? `Suivi (${shipments.length} colis)`
            : "Suivi du colis"}
        </span>
      </div>

      {/* Liste des colis */}
      <div className="flex flex-col gap-3">
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
              className="rounded-2xl p-4 border"
              style={{
                background: "var(--color-surface2)",
                borderColor: "var(--color-border)",
              }}
            >
              {/* En-tête du colis */}
              <div className="flex items-center justify-between mb-2">
                <span
                  className="text-xs font-bold uppercase tracking-wider"
                  style={{ color: "var(--color-ink3)" }}
                >
                  {shipments.length > 1
                    ? `Colis ${i + 1} sur ${shipments.length}`
                    : "Colis"}
                </span>
                {shipment?.reshipment && (
                  <span
                    className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold"
                    style={{
                      background: "#fef3c7",
                      color: "#92400e",
                    }}
                  >
                    <RefreshCw size={11} strokeWidth={2.5} />
                    Réexpédié gratuitement
                  </span>
                )}
              </div>

              {/* Détails du colis */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-sm">
                {estimateLabel && (
                  <div className="col-span-full">
                    <span className="text-(--color-ink4)">
                      Arrivée estimée :
                    </span>{" "}
                    <strong style={{ color: "var(--color-ink)" }}>
                      {estimateLabel}
                    </strong>
                  </div>
                )}
                {carrier && (
                  <div>
                    <span className="text-(--color-ink4)">Transporteur :</span>{" "}
                    <span style={{ color: "var(--color-ink2)" }}>
                      {carrier}
                    </span>
                  </div>
                )}
                {shipDate && (
                  <div>
                    <span className="text-(--color-ink4)">Expédié le :</span>{" "}
                    <span style={{ color: "var(--color-ink2)" }}>
                      {shipDate}
                    </span>
                  </div>
                )}
                {trackingNumber && (
                  <div className="col-span-full">
                    <span className="text-(--color-ink4)">Suivi n° :</span>{" "}
                    {trackingUrl ? (
                      <a
                        href={trackingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-semibold underline break-all"
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
    </div>
  );
}
