// src/admin/ReportInfoModal.tsx
import React from "react";
import { X } from "lucide-react";

interface ReportInfoModalProps {
  onClose: () => void;
}

export default function ReportInfoModal({ onClose }: ReportInfoModalProps) {
  const sectionStyle: React.CSSProperties = {
    marginBottom: 24,
  };

  const titleStyle: React.CSSProperties = {
    fontWeight: 700,
    fontSize: 15,
    color: "var(--color-ink)",
    marginBottom: 10,
    paddingBottom: 6,
    borderBottom: "1px solid var(--color-border)",
  };

  const tableStyle: React.CSSProperties = {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: 12,
    color: "var(--color-ink2)",
  };

  const thStyle: React.CSSProperties = {
    textAlign: "left",
    padding: "8px 10px",
    background: "var(--color-surface2)",
    fontWeight: 700,
    color: "var(--color-ink3)",
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: "0.03em",
    borderBottom: "1px solid var(--color-border)",
  };

  const tdStyle: React.CSSProperties = {
    padding: "8px 10px",
    borderBottom: "1px solid var(--color-border)",
    verticalAlign: "top",
    lineHeight: 1.5,
  };

  const noteStyle: React.CSSProperties = {
    fontSize: 11,
    color: "var(--color-ink4)",
    marginTop: 12,
    lineHeight: 1.6,
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 300,
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
          borderRadius: 20,
          maxWidth: 900,
          width: "90%",
          maxHeight: "85vh",
          overflowY: "auto",
          padding: 28,
          boxShadow: "var(--shadow-xl)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
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
            📊 Métriques et calculs – Rapports
          </h2>
          <button
            onClick={onClose}
            style={{
              background: "var(--color-surface2)",
              border: "1px solid var(--color-border)",
              borderRadius: 8,
              padding: 4,
              cursor: "pointer",
              color: "var(--color-ink2)",
              display: "flex",
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* KPIs */}
        <div style={sectionStyle}>
          <h3 style={titleStyle}>📈 Indicateurs clés (KPI)</h3>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Métrique</th>
                <th style={thStyle}>Source</th>
                <th style={thStyle}>Calcul</th>
                <th style={thStyle}>Période</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={tdStyle}>CA Total</td>
                <td style={tdStyle}>
                  <code>allOrders.totalAmount</code>
                </td>
                <td style={tdStyle}>
                  Somme des montants des commandes filtrées
                </td>
                <td style={tdStyle}>Période sélectionnée</td>
              </tr>
              <tr>
                <td style={tdStyle}>Commandes</td>
                <td style={tdStyle}>
                  <code>allOrders</code> (comptage)
                </td>
                <td style={tdStyle}>Nombre de commandes dans la période</td>
                <td style={tdStyle}>Période sélectionnée</td>
              </tr>
              <tr>
                <td style={tdStyle}>Clients (total)</td>
                <td style={tdStyle}>
                  <code>allCustomers</code>
                </td>
                <td style={tdStyle}>Nombre total de clients en base</td>
                <td style={tdStyle}>Toutes périodes</td>
              </tr>
              <tr>
                <td style={tdStyle}>Panier moyen</td>
                <td style={tdStyle}>CA Total + Commandes</td>
                <td style={tdStyle}>CA Total ÷ Nombre de commandes</td>
                <td style={tdStyle}>Période sélectionnée</td>
              </tr>
              <tr>
                <td style={tdStyle}>Nouveaux clients</td>
                <td style={tdStyle}>
                  <code>allCustomers.registrationDate</code>
                </td>
                <td style={tdStyle}>
                  Clients créés entre les dates de début et fin
                </td>
                <td style={tdStyle}>Période sélectionnée</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Deltas */}
        <div style={sectionStyle}>
          <h3 style={titleStyle}>🔺 Deltas (flèches %)</h3>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Métrique</th>
                <th style={thStyle}>Comparaison</th>
                <th style={thStyle}>Calcul</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={tdStyle}>Flèche CA</td>
                <td style={tdStyle}>vs période précédente</td>
                <td style={tdStyle}>
                  ((CA courant − CA précédent) ÷ CA précédent) × 100
                </td>
              </tr>
              <tr>
                <td style={tdStyle}>Flèche Commandes</td>
                <td style={tdStyle}>vs période précédente</td>
                <td style={tdStyle}>
                  ((Cmd courant − Cmd précédent) ÷ Cmd précédent) × 100
                </td>
              </tr>
              <tr>
                <td style={tdStyle}>Flèche Clients</td>
                <td style={tdStyle}>vs période précédente</td>
                <td style={tdStyle}>
                  ((Nouv. clients − Nouv. clients préc.) ÷ Nouv. clients préc.)
                  × 100
                </td>
              </tr>
              <tr>
                <td style={tdStyle}>Flèche Panier</td>
                <td style={tdStyle}>vs période précédente</td>
                <td style={tdStyle}>
                  ((Panier courant − Panier préc.) ÷ Panier préc.) × 100
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Graphique */}
        <div style={sectionStyle}>
          <h3 style={titleStyle}>📊 Graphique – Revenu par jour</h3>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Élément</th>
                <th style={thStyle}>Source</th>
                <th style={thStyle}>Calcul</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={tdStyle}>Revenu quotidien</td>
                <td style={tdStyle}>
                  <code>currentOrders.totalAmount</code>
                </td>
                <td style={tdStyle}>
                  Somme par <code>createdAt.split("T")[0]</code>
                </td>
              </tr>
              <tr>
                <td style={tdStyle}>Hauteur des barres</td>
                <td style={tdStyle}>Revenu max du graphique</td>
                <td style={tdStyle}>
                  (revenu du jour ÷ maxChartRevenue) × 100
                </td>
              </tr>
              <tr>
                <td style={tdStyle}>Mode "Auj."</td>
                <td style={tdStyle}>Semaine en cours</td>
                <td style={tdStyle}>
                  7 jours (lun.-dim. ou dim.-sam.), jours futurs vides
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Ventes par catégorie */}
        <div style={sectionStyle}>
          <h3 style={titleStyle}>🏷️ Ventes par catégorie</h3>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Métrique</th>
                <th style={thStyle}>Source</th>
                <th style={thStyle}>Calcul</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={tdStyle}>Barres de progression</td>
                <td style={tdStyle}>
                  <code>currentOrders × allProducts</code>
                </td>
                <td style={tdStyle}>
                  Revenu par <code>product.category</code> (depuis{" "}
                  <code>order_items</code>)
                </td>
              </tr>
              <tr>
                <td style={tdStyle}>Pourcentage</td>
                <td style={tdStyle}>
                  <code>revenueByCat</code>
                </td>
                <td style={tdStyle}>
                  (revenu catégorie ÷ totalCatRevenue) × 100
                </td>
              </tr>
              <tr>
                <td style={tdStyle}>Toggle % / CA</td>
                <td style={tdStyle}>Clic sur la barre</td>
                <td style={tdStyle}>
                  Bascule entre pourcentage et montant formaté
                </td>
              </tr>
              <tr>
                <td style={tdStyle}>Couleurs</td>
                <td style={tdStyle}>
                  <code>reference_lists</code> (catégories)
                </td>
                <td style={tdStyle}>
                  Palette cyclique de 10 couleurs, "Autres" = gris
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Top Produits */}
        <div style={sectionStyle}>
          <h3 style={titleStyle}>🏆 Top Produits</h3>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Métrique</th>
                <th style={thStyle}>Source</th>
                <th style={thStyle}>Calcul</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={tdStyle}>Rang #1–#5</td>
                <td style={tdStyle}>
                  <code>currentOrders.order_items</code>
                </td>
                <td style={tdStyle}>Tri par revenu décroissant, top 5</td>
              </tr>
              <tr>
                <td style={tdStyle}>CA affiché</td>
                <td style={tdStyle}>
                  <code>currentOrders</code>
                </td>
                <td style={tdStyle}>
                  <code>item.unitPrice × item.quantity</code> par{" "}
                  <code>productId</code>
                </td>
              </tr>
              <tr>
                <td style={tdStyle}>Articles vendus</td>
                <td style={tdStyle}>
                  <code>currentOrders</code>
                </td>
                <td style={tdStyle}>
                  <code>item.quantity</code> par <code>productId</code>
                </td>
              </tr>
              <tr>
                <td style={tdStyle}>Pourcentage du CA</td>
                <td style={tdStyle}>CA total période</td>
                <td style={tdStyle}>(revenu produit ÷ CA total) × 100</td>
              </tr>
              <tr>
                <td style={tdStyle}>Miniature</td>
                <td style={tdStyle}>
                  <code>allProducts.image</code>
                </td>
                <td style={tdStyle}>Image du produit, fallback placeholder</td>
              </tr>
              <tr>
                <td style={tdStyle}>QuickView</td>
                <td style={tdStyle}>
                  <code>allProducts</code>
                </td>
                <td style={tdStyle}>Clic sur image/nom → fiche produit</td>
              </tr>
              <tr>
                <td style={tdStyle}>Toggle % / CA</td>
                <td style={tdStyle}>Clic sur le prix</td>
                <td style={tdStyle}>Bascule entre CA formaté et %</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Export CSV */}
        <div style={sectionStyle}>
          <h3 style={titleStyle}>📥 Export CSV</h3>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Feuille</th>
                <th style={thStyle}>Contenu</th>
                <th style={thStyle}>Source</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={tdStyle}>Rapport</td>
                <td style={tdStyle}>
                  Résumé + Revenu/jour + Catégories + Top Produits
                </td>
                <td style={tdStyle}>Données de la période sélectionnée</td>
              </tr>
              <tr>
                <td style={tdStyle}>Catalogue</td>
                <td style={tdStyle}>
                  Tous les produits (id, titre, marque, etc.)
                </td>
                <td style={tdStyle}>
                  <code>allProducts</code>
                </td>
              </tr>
              <tr>
                <td style={tdStyle}>Fournisseur</td>
                <td style={tdStyle}>Store ID, statut, produits liés</td>
                <td style={tdStyle}>
                  <code>podSettingsFull + allProducts</code>
                </td>
              </tr>
              <tr>
                <td style={tdStyle}>Commandes</td>
                <td style={tdStyle}>Toutes les commandes avec adresses</td>
                <td style={tdStyle}>
                  <code>allOrders</code>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Notes */}
        <div style={noteStyle}>
          <strong>📌 Notes :</strong>
          <ul style={{ marginTop: 4, paddingLeft: 18 }}>
            <li>
              <strong>Période sélectionnée</strong> : déterminée par les boutons
              Auj., 7j, 30j, 3m, 1a ou la plage personnalisée.
            </li>
            <li>
              <strong>Période précédente</strong> : même durée que la période
              sélectionnée, décalée dans le passé.
            </li>
            <li>
              <strong>Catégories</strong> : lues dynamiquement depuis{" "}
              <code>reference_lists</code> (type category).
            </li>
            <li>
              <strong>Couleurs</strong> : 10 couleurs cycliques. Au-delà, les
              couleurs se répètent.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
