// src/admin/emailMarketing/VariablesModal.tsx
// Modal affichant les variables disponibles pour les templates d'email

import React from "react";
import { X } from "lucide-react";

interface VariablesModalProps {
  open: boolean;
  onClose: () => void;
}

export default function VariablesModal({ open, onClose }: VariablesModalProps) {
  if (!open) return null;

  const variables = [
    {
      var: "{{name}}",
      desc: "Nom du client (remplacé par “Valued Customer” si inconnu)",
    },
    { var: "{{email}}", desc: "Email du destinataire" },
    { var: "{{brand}}", desc: "Nom de la marque (InstaWear)" },
    { var: "{{discount}}", desc: "Pourcentage de réduction (ex. 20)" },
    { var: "{{cta_link}}", desc: "Lien vers la page d’accueil du site" },
    {
      var: "{{unsubscribe_link}}",
      desc: "Lien de désabonnement généré automatiquement",
    },
    {
      var: "{{footer}}",
      desc: "Pied de page avec adresse et lien de désabonnement",
    },
    {
      var: "{{product_name}}",
      desc: "Nom du produit (valeur générique par défaut)",
    },
    {
      var: "{{product_description}}",
      desc: "Description du produit",
    },
    {
      var: "{{title}}",
      desc: "Sujet de l’email (utilise le sujet saisi)",
    },
    {
      var: "{{body}}",
      desc: "Extrait du corps HTML (200 premiers caractères)",
    },
    {
      var: "{{order_id}}",
      desc: "ID de commande (non applicable en campagne)",
    },
    { var: "{{cart_link}}", desc: "Lien vers le panier" },
  ];

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(26,20,10,0.5)",
        backdropFilter: "blur(4px)",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "var(--color-surface)",
          border: "1px solid var(--color-border)",
          borderRadius: 16,
          padding: 24,
          maxWidth: 500,
          width: "90%",
          boxShadow: "var(--shadow-xl)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16,
          }}
        >
          <h4
            style={{
              margin: 0,
              fontSize: 16,
              fontWeight: 700,
              color: "var(--color-ink)",
            }}
          >
            Variables disponibles
          </h4>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--color-ink4)",
            }}
          >
            <X size={16} />
          </button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {variables.map((item) => (
            <div
              key={item.var}
              style={{ display: "flex", gap: 12, alignItems: "baseline" }}
            >
              <code
                style={{
                  background: "var(--color-surface2)",
                  padding: "2px 8px",
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 700,
                  color: "var(--color-accent)",
                }}
              >
                {item.var}
              </code>
              <span
                style={{
                  fontSize: 12.5,
                  color: "var(--color-ink3)",
                  lineHeight: 1.4,
                }}
              >
                {item.desc}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
