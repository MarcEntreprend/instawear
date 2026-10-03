// src/utils/gallery.ts
// Garde-fous galerie côté CLIENT (pur, testable en node, zéro dépendance
// lourde : n'importe que la constante d'asset).
// - isPlaceholderImage : détecte le visuel "manquant" sous TOUTES ses
//   formes (constante exacte, URL absolue, variante de casse, query params).
//   Le client ne doit JAMAIS voir ces slides dans sa galerie (image du
//   site) ; l'admin, lui, voit les données brutes dans son interface.
import { PLACEHOLDER_IMG } from "../constants/assets";

const PLACEHOLDER_BASENAME = "instawear-missing-item.svg";

export function isPlaceholderImage(u: unknown): boolean {
  if (typeof u !== "string") return false;
  const t = u.trim();
  if (t.length === 0) return false;
  if (t === PLACEHOLDER_IMG) return true;
  const m = t.toLowerCase().match(/([a-z0-9._-]+\.svg)(?:[?#].*)?$/);
  return m !== null && m[1] === PLACEHOLDER_BASENAME;
}
