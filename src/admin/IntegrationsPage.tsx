// src/admin/IntegrationsPage.tsx

import React from "react";
import { Link2, Package, ExternalLink } from "lucide-react";

export default function IntegrationsPage() {
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
          Intégrations
        </h2>
        <p style={{ fontSize: 13, color: "var(--color-ink3)" }}>
          Connectez vos services externes : Print-on-Demand, affiliation,
          marketing.
        </p>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: 16,
        }}
      >
        {[
          { name: "Printful", desc: "Print-on-Demand", connected: false },
          { name: "Printify", desc: "Print-on-Demand", connected: false },
          { name: "Awin", desc: "Affiliation", connected: false },
          { name: "Google Analytics", desc: "Statistiques", connected: false },
        ].map((integration) => (
          <div key={integration.name} style={cardStyle}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                marginBottom: 12,
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: "var(--color-surface2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {integration.desc.includes("Print") ? (
                  <Package size={18} />
                ) : (
                  <Link2 size={18} />
                )}
              </div>
              <div>
                <p
                  style={{
                    fontWeight: 700,
                    fontSize: 14,
                    color: "var(--color-ink)",
                  }}
                >
                  {integration.name}
                </p>
                <p style={{ fontSize: 11, color: "var(--color-ink3)" }}>
                  {integration.desc}
                </p>
              </div>
            </div>
            <button
              style={{
                width: "100%",
                padding: "8px 12px",
                borderRadius: 10,
                border: "1.5px solid var(--color-border2)",
                background: "var(--color-surface)",
                color: "var(--color-ink2)",
                fontWeight: 600,
                fontSize: 12.5,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
              }}
            >
              <ExternalLink size={13} /> Configurer
            </button>
          </div>
        ))}
      </div>
      <p
        style={{
          fontSize: 12,
          color: "var(--color-ink4)",
          textAlign: "center",
        }}
      >
        Les intégrations seront fonctionnelles après la mise en place de
        Supabase et des API externes.
      </p>
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  background: "var(--color-surface)",
  border: "1px solid var(--color-border)",
  borderRadius: 16,
  padding: 20,
};
