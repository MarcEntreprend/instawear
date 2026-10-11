// src/lib/heroGrid.ts — PUR : dispositions de la couche "Tuiles" (CSS grid, écrans ≥ 640 px).
// Chaque disposition PAVE la grille : aucune case vide, aucun chevauchement (testé).
import type { HeroTilesLayer } from "./heroSchema.ts";

export type HeroTilesVariant = NonNullable<HeroTilesLayer["variant"]>;

export const TILES_VARIANTS: {
  value: HeroTilesVariant;
  label: string;
  desc: string;
}[] = [
  {
    value: "split",
    label: "Principal + colonne",
    desc: "Visuel principal à gauche, tuiles empilées à droite (historique).",
  },
  {
    value: "bento",
    label: "Bento",
    desc: "Visuel principal en grand, tuiles de tailles différentes.",
  },
  {
    value: "asym",
    label: "Asymétrique",
    desc: "Colonne de tuiles avec une tuile centrale plus haute.",
  },
  {
    value: "strip",
    label: "Bandeau",
    desc: "Visuel principal en haut, tuiles en rangée dessous.",
  },
  {
    value: "mosaic",
    label: "Mosaïque",
    desc: "Grille de 6 colonnes, tuiles de largeurs inégales.",
  },
];

export interface TileCell {
  /** Valeur CSS de grid-column (ex. "1 / span 2"). */
  col: string;
  /** Valeur CSS de grid-row. */
  row: string;
}
export interface TilesLayout {
  cols: string; // grid-template-columns
  rows: string; // grid-template-rows
  main: TileCell;
  items: TileCell[];
}

const cell = (col: string, row: string): TileCell => ({ col, row });

/** n = nombre de tuiles (0..3) ; hasMain = visuel principal présent. */
export function tilesLayout(
  variant: HeroTilesVariant,
  n: number,
  hasMain: boolean,
): TilesLayout {
  const count = Math.max(0, Math.min(3, Math.floor(n)));

  // Pas de visuel principal : les tuiles se partagent la largeur.
  if (!hasMain) {
    const k = Math.max(1, count);
    return {
      cols: `repeat(${k}, 1fr)`,
      rows: "1fr",
      main: cell("auto", "auto"),
      items: Array.from({ length: count }, (_, i) => cell(String(i + 1), "1")),
    };
  }
  if (count === 0)
    return { cols: "1fr", rows: "1fr", main: cell("1", "1"), items: [] };

  switch (variant) {
    case "bento": {
      const items =
        count === 1
          ? [cell("3 / span 2", "1 / span 2")]
          : count === 2
            ? [cell("3 / span 2", "1"), cell("3 / span 2", "2")]
            : [cell("3 / span 2", "1"), cell("3", "2"), cell("4", "2")];
      return {
        cols: "repeat(4, 1fr)",
        rows: "repeat(2, 1fr)",
        main: cell("1 / span 2", "1 / span 2"),
        items,
      };
    }
    case "asym": {
      if (count === 1) {
        return {
          cols: "1.6fr 1fr",
          rows: "1fr",
          main: cell("1", "1"),
          items: [cell("2", "1")],
        };
      }
      if (count === 2) {
        return {
          cols: "1.6fr 1fr",
          rows: "1fr 1fr",
          main: cell("1", "1 / span 2"),
          items: [cell("2", "1"), cell("2", "2")],
        };
      }
      return {
        cols: "1.6fr 1fr",
        rows: "1fr 2fr 1fr",
        main: cell("1", "1 / span 3"),
        items: [cell("2", "1"), cell("2", "2"), cell("2", "3")],
      };
    }
    case "strip":
      return {
        cols: `repeat(${count}, 1fr)`,
        rows: "2fr 1fr",
        main: cell("1 / -1", "1"),
        items: Array.from({ length: count }, (_, i) =>
          cell(String(i + 1), "2"),
        ),
      };
    case "mosaic": {
      const items =
        count === 1
          ? [cell("4 / span 3", "1 / span 2")]
          : count === 2
            ? [cell("4 / span 3", "1"), cell("4 / span 3", "2")]
            : [
                cell("4 / span 3", "1"),
                cell("4 / span 2", "2"),
                cell("6", "2"),
              ];
      return {
        cols: "repeat(6, 1fr)",
        rows: "repeat(2, 1fr)",
        main: cell("1 / span 3", "1 / span 2"),
        items,
      };
    }
    default: // "split" : vignettes du sélecteur uniquement (le rendu garde le code historique)
      return {
        cols: "2fr 1fr",
        rows: `repeat(${count}, 1fr)`,
        main: cell("1", `1 / span ${count}`),
        items: Array.from({ length: count }, (_, i) =>
          cell("2", String(i + 1)),
        ),
      };
  }
}
