// src/lib/heroStats.ts — PUR : CTR et comparaison A/B (test z de deux proportions, bilatéral).
export interface Arm {
  /** Visiteurs (sessions) ayant vu le slide. */
  impSessions: number;
  /** Visiteurs ayant cliqué au moins une fois. */
  clickSessions: number;
}

export function ctr(a: Arm): number | null {
  return a.impSessions > 0 ? a.clickSessions / a.impSessions : null;
}

// erf : Abramowitz–Stegun 7.1.26 (erreur < 1,5e-7).
function erf(x: number): number {
  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * ax);
  let poly = 1.061405429;
  poly = poly * t - 1.453152027;
  poly = poly * t + 1.421413741;
  poly = poly * t - 0.284496736;
  poly = poly * t + 0.254829592;
  return sign * (1 - poly * t * Math.exp(-ax * ax));
}

export function normalCdf(z: number): number {
  return 0.5 * (1 + erf(z / Math.SQRT2));
}

export interface CtrComparison {
  /** insufficient = trop peu de visiteurs ; none = pas de différence significative. */
  verdict: "insufficient" | "none" | "a" | "b";
  rateA: number | null;
  rateB: number | null;
  z: number | null;
  /** p-value bilatérale. */
  p: number | null;
  nA: number;
  nB: number;
  min: number;
}

/** Seuil 5 % ; au moins `min` visiteurs par bras (sinon aucun verdict). */
export function compareCtr(a: Arm, b: Arm, min = 100): CtrComparison {
  const nA = a.impSessions;
  const nB = b.impSessions;
  const rateA = ctr(a);
  const rateB = ctr(b);
  const base = { rateA, rateB, nA, nB, min };
  if (nA < min || nB < min || rateA === null || rateB === null) {
    return { verdict: "insufficient", z: null, p: null, ...base };
  }
  const pooled = (a.clickSessions + b.clickSessions) / (nA + nB);
  const se = Math.sqrt(pooled * (1 - pooled) * (1 / nA + 1 / nB));
  if (!(se > 0)) return { verdict: "none", z: null, p: null, ...base };
  const z = (rateA - rateB) / se;
  const p = 2 * (1 - normalCdf(Math.abs(z)));
  if (p >= 0.05) return { verdict: "none", z, p, ...base };
  return { verdict: rateA > rateB ? "a" : "b", z, p, ...base };
}
