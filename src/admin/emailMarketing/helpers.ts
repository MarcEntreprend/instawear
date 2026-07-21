// src/admin/emailMarketing/helpers.ts
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("fr-FR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function emailQualityScore(
  subject: string,
  html: string,
): { score: number; items: { label: string; ok: boolean }[] } {
  const items = [
    {
      label: "Objet entre 20 et 60 caractères",
      ok: subject.length >= 20 && subject.length <= 60,
    },
    { label: "Emoji dans l'objet", ok: /[🎉✨🛒📣💥🎁🔥💌]/.test(subject) },
    { label: "Variables personnalisées ({{name}})", ok: /{{.+?}}/.test(html) },
    { label: "Lien CTA présent", ok: /<a\s[^>]*href/i.test(html) },
    {
      label: "Contenu HTML non vide",
      ok: html.replace(/<[^>]+>/g, "").trim().length > 50,
    },
    {
      label: "Pas de mot spam dans l'objet",
      ok: !/(gratuit|urgent|gagnez|cliquez vite)/i.test(subject),
    },
  ];
  return {
    score: Math.round((items.filter((i) => i.ok).length / items.length) * 100),
    items,
  };
}
