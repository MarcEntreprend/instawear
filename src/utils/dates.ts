// src/utils/dates.ts
// Formats de date FR partagés (Vague B item 7 : fini les `formatDate`
// recodés dans chaque page admin — Customers, Expéditions, Monitoring,
// Commandes, Finances partagent ces deux helpers).
// - "—" si vide ou invalide (jamais d'exception, jamais de "Invalid Date").
// - Granularité canonique : date courte JJ/MM/AAAA, datetime + HH:MM.

export function formatDateFR(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function formatDateTimeFR(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
