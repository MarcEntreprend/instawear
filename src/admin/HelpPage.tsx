// src/admin/HelpPage.tsx
import React from "react";
import {
  HelpCircle,
  Book,
  MessageCircle,
  ExternalLink,
  ArrowRight,
} from "lucide-react";

export default function HelpPage() {
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
          Aide & Support
        </h2>
        <p style={{ fontSize: 13, color: "var(--color-ink3)" }}>
          Trouvez des réponses à vos questions ou contactez notre équipe.
        </p>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
          gap: 14,
        }}
      >
        {[
          {
            icon: <Book size={24} />,
            title: "Documentation",
            desc: "Guides complets pour configurer votre boutique.",
            btn: "Consulter",
          },
          {
            icon: <MessageCircle size={24} />,
            title: "Support WhatsApp",
            desc: "Discutez directement avec un agent.",
            btn: "Ouvrir",
          },
          {
            icon: <ExternalLink size={24} />,
            title: "Centre d'aide",
            desc: "FAQ, tutoriels vidéo et articles.",
            btn: "Explorer",
          },
        ].map((item) => (
          <div key={item.title} style={cardStyle}>
            <div style={{ color: "var(--color-accent)", marginBottom: 12 }}>
              {item.icon}
            </div>
            <h3
              style={{
                fontWeight: 700,
                fontSize: 15,
                color: "var(--color-ink)",
                marginBottom: 6,
              }}
            >
              {item.title}
            </h3>
            <p
              style={{
                fontSize: 12.5,
                color: "var(--color-ink3)",
                lineHeight: 1.5,
                marginBottom: 16,
              }}
            >
              {item.desc}
            </p>
            <button style={btnStyle}>
              {item.btn} <ArrowRight size={13} />
            </button>
          </div>
        ))}
      </div>
      <div style={{ ...cardStyle, textAlign: "center", padding: 24 }}>
        <HelpCircle
          size={28}
          style={{ color: "var(--color-ink4)", marginBottom: 8 }}
        />
        <p style={{ fontSize: 14, fontWeight: 600, color: "var(--color-ink)" }}>
          Version InstaWear Admin v1.0
        </p>
        <p style={{ fontSize: 12, color: "var(--color-ink4)", marginTop: 4 }}>
          © 2026 InstaWear Inc. Tous droits réservés.
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

const btnStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  padding: "8px 14px",
  borderRadius: 10,
  border: "1.5px solid var(--color-border2)",
  background: "var(--color-surface)",
  color: "var(--color-ink2)",
  fontWeight: 600,
  fontSize: 12.5,
  cursor: "pointer",
  fontFamily: "var(--font-body)",
};
