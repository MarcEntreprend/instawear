// src/admin/HeroWeightCheck.tsx — « Peser les images » d'un slide (section Contrôle qualité du studio).
import { useState, type CSSProperties } from "react";
import { Scale } from "lucide-react";
import type { HeroConfig } from "../lib/heroSchema";
import { HERO_IMG_OPTS } from "../lib/heroImages";
import { supabaseImageUrl } from "../lib/supabaseImage";
import {
  fmtKo,
  heroImageSources,
  weighImage,
  weightLevel,
} from "../lib/heroWeight";

interface Row {
  src: string;
  raw: boolean;
  bytes: number | null;
}

const btn: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "7px 12px",
  borderRadius: 10,
  border: "1px solid var(--color-border)",
  background: "var(--color-surface2)",
  color: "var(--color-ink2)",
  fontWeight: 600,
  fontSize: 12,
  cursor: "pointer",
};

export default function HeroWeightCheck({
  config,
  productImage,
  isFirst,
}: {
  config: HeroConfig;
  productImage: string | null;
  isFirst: boolean;
}) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async () => {
    setBusy(true);
    try {
      const out = await Promise.all(
        heroImageSources(config, productImage).map(async (s) => {
          const url = s.raw
            ? s.src
            : supabaseImageUrl(s.src, HERO_IMG_OPTS.fill);
          return {
            src: s.src,
            raw: s.raw,
            bytes: await weighImage(url, (u, init) => fetch(u, init)),
          };
        }),
      );
      setRows(out);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <button type="button" style={btn} disabled={busy} onClick={run}>
        <Scale size={13} /> {busy ? "Pesée…" : "Peser les images"}
      </button>
      {rows !== null && rows.length === 0 && (
        <span style={{ fontSize: 12, color: "var(--color-ink3)" }}>
          Aucune image plein format dans ce slide.
        </span>
      )}
      {rows?.map((r) => {
        const warn =
          r.bytes !== null && weightLevel(r.bytes, isFirst) === "warn";
        return (
          <div
            key={`${r.raw ? "raw" : "fill"}|${r.src}`}
            style={{
              fontSize: 12,
              color: warn ? "#92400e" : "var(--color-ink2)",
              wordBreak: "break-all",
            }}
          >
            <strong>
              {r.bytes === null ? "mesure impossible" : fmtKo(r.bytes)}
            </strong>{" "}
            · …{r.src.slice(-42)}
            {warn &&
              (isFirst
                ? " — au-dessus de 250 Ko : le LCP du slide n°1 en souffre (compresse ou recadre l'image)."
                : " — au-dessus de 500 Ko : allège l'image.")}
          </div>
        );
      })}
      <span style={{ fontSize: 11, color: "var(--color-ink4)" }}>
        Poids de l'image servie (webp 1280 px pour les fonds dimensionnés), sans
        cache navigateur.
      </span>
    </div>
  );
}
