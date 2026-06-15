// src/admin/PromotionsPage.tsx

import React from "react";
import { Tag, Plus, Clock, Percent } from "lucide-react";

export default function PromotionsPage() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      <div>
        <h2
          style={{
            fontSize: 20,
            fontWeight: 700,
            color: "var(--color-ink)",
            marginBottom: 4,
          }}
        >
          Promotions & Deals
        </h2>
        <p style={{ fontSize: 13, color: "var(--color-ink3)" }}>
          Gérez les offres limitées, les comptes à rebours et les deals
          produits.
        </p>
      </div>
      <div style={cardStyle}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 16,
          }}
        >
          <h3
            style={{ fontWeight: 700, fontSize: 15, color: "var(--color-ink)" }}
          >
            Compte à rebours global
          </h3>
          <button style={primaryBtn}>
            <Plus size={14} /> Nouveau deal global
          </button>
        </div>
        <p
          style={{ fontSize: 13, color: "var(--color-ink3)", marginBottom: 16 }}
        >
          Configurez un minuteur applicable à tous les produits marqués "Offre
          limitée" sans deal individuel.
        </p>
        <div
          style={{
            display: "flex",
            gap: 24,
            fontSize: 13,
            color: "var(--color-ink2)",
          }}
        >
          <span>
            <Clock
              size={14}
              style={{ marginRight: 6, verticalAlign: "middle" }}
            />
            Expire le 31/12/2026
          </span>
          <span>
            <Tag
              size={14}
              style={{ marginRight: 6, verticalAlign: "middle" }}
            />
            Appliqué à 3 produits
          </span>
        </div>
      </div>
      <div style={cardStyle}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 16,
          }}
        >
          <h3
            style={{ fontWeight: 700, fontSize: 15, color: "var(--color-ink)" }}
          >
            Deals produits individuels
          </h3>
          <button style={primaryBtn}>
            <Plus size={14} /> Nouveau deal produit
          </button>
        </div>
        <p
          style={{
            fontSize: 13,
            color: "var(--color-ink4)",
            textAlign: "center",
            padding: 20,
          }}
        >
          Aucun deal produit pour l'instant. Créez-en un pour promouvoir un
          article spécifique.
        </p>
      </div>
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  background: "var(--color-surface)",
  border: "1px solid var(--color-border)",
  borderRadius: 16,
  padding: 20,
};

const primaryBtn: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  padding: "8px 14px",
  borderRadius: 10,
  border: "none",
  background: "var(--color-accent)",
  color: "white",
  fontWeight: 700,
  fontSize: 12.5,
  cursor: "pointer",
  fontFamily: "var(--font-body)",
};
