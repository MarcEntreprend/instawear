// src/admin/GalleryPicker.tsx — sélecteur visuel de galerie (partagé).
// Remplace les chips 28px + URLs : grandes miniatures, badges (placement,
// source, couleur), clic = cocher/décocher, ordre stable = ordre galerie.
// Les liens seuls ne disent pas ce que montre l'image ; ici on VOIT.
// Piloté par le parent (controlled) : `items` (avec `checked`) + `onChange`.
import { useState } from "react";
import { Upload } from "lucide-react";
import { storageApi } from "../api/storageApi";

export type GallerySource = "generated" | "blank" | "custom";

export interface GalleryPickItem {
  url: string;
  color?: string | null;
  placement?: string | null;
  source?: GallerySource;
  checked: boolean;
}

const PLACEMENT_LABELS: Record<string, string> = {
  front: "Avant",
  back: "Dos",
  sleeve: "Manche",
};

const SOURCE_LABELS: Record<GallerySource, string> = {
  generated: "Généré",
  blank: "Vierge",
  custom: "Perso",
};

function placementLabel(p?: string | null): string {
  if (!p) return "";
  return PLACEMENT_LABELS[p.toLowerCase()] ?? p;
}

function isHexColor(s?: string | null): boolean {
  return !!s && /^#[0-9a-f]{6}$/i.test(s);
}

export default function GalleryPicker({
  items,
  max,
  onChange,
  allowAdd = true,
}: {
  items: GalleryPickItem[];
  max: number;
  onChange: (next: GalleryPickItem[]) => void;
  /** Affiche l'ajout URL + upload (désactivé quand le parent gère l'ajout). */
  allowAdd?: boolean;
}) {
  const [urlInput, setUrlInput] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const checkedCount = items.filter((i) => i.checked).length;

  const toggle = (url: string) => {
    const target = items.find((i) => i.url === url);
    if (!target) return;
    if (!target.checked && checkedCount >= max) return;
    onChange(
      items.map((i) => (i.url === url ? { ...i, checked: !i.checked } : i)),
    );
  };

  const remove = (url: string) => {
    onChange(items.filter((i) => i.url !== url));
  };

  const addCustom = (url: string) => {
    const trimmed = url.trim();
    if (!trimmed || items.some((i) => i.url === trimmed)) return;
    if (items.length >= max * 2) return;
    onChange([
      ...items,
      { url: trimmed, color: null, placement: null, source: "custom", checked: true },
    ]);
  };

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    setUploadError("");
    try {
      const added: GalleryPickItem[] = [];
      for (let i = 0; i < files.length; i++) {
        const url = await storageApi.uploadImage(files[i], "gallery");
        if (url && !items.some((x) => x.url === url) && !added.some((x) => x.url === url)) {
          added.push({ url, color: null, placement: null, source: "custom", checked: true });
        }
      }
      if (added.length > 0) onChange([...items, ...added]);
    } catch {
      setUploadError("Erreur lors de l'upload d'une image.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <p style={{ fontSize: 12, color: "var(--color-ink3)", marginBottom: 8 }}>
        Galerie : {checkedCount}/{max} — cliquez une image pour la garder ou la
        retirer de la galerie.
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 8 }}>
        {items.map((item) => (
          <div key={item.url} style={{ position: "relative", width: 104 }}>
            <button
              type="button"
              onClick={() => toggle(item.url)}
              aria-pressed={item.checked}
              aria-label={`${item.checked ? "Retirer" : "Garder"} : ${placementLabel(item.placement) || "visuel"}${item.color ? ` ${item.color}` : ""}`}
              title={item.url}
              style={{
                width: 104,
                height: 104,
                borderRadius: 12,
                overflow: "hidden",
                cursor: "pointer",
                padding: 0,
                background: "var(--color-surface2)",
                border: item.checked
                  ? "2px solid var(--color-accent)"
                  : "2px solid var(--color-border)",
                opacity: item.checked ? 1 : 0.55,
              }}
            >
              <img
                src={item.url}
                alt=""
                loading="lazy"
                decoding="async"
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
              />
            </button>
            <button
              type="button"
              onClick={() => remove(item.url)}
              aria-label="Supprimer définitivement"
              title="Supprimer définitivement"
              style={{
                position: "absolute",
                top: -6,
                right: -6,
                width: 20,
                height: 20,
                borderRadius: "50%",
                background: "var(--color-surface)",
                border: "1px solid var(--color-border)",
                color: "var(--color-ink3)",
                fontSize: 12,
                fontWeight: 700,
                lineHeight: 1,
                cursor: "pointer",
              }}
            >
              ×
            </button>
            <div
              style={{
                display: "flex",
                gap: 4,
                marginTop: 4,
                flexWrap: "wrap",
                alignItems: "center",
              }}
            >
              {isHexColor(item.color) && (
                <span
                  aria-hidden="true"
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: "50%",
                    background: item.color as string,
                    border: "1px solid var(--color-border2)",
                    flexShrink: 0,
                  }}
                />
              )}
              {placementLabel(item.placement) && (
                <span style={{ fontSize: 10, fontWeight: 700, color: "var(--color-ink2)" }}>
                  {placementLabel(item.placement)}
                </span>
              )}
              <span style={{ fontSize: 10, color: "var(--color-ink4)" }}>
                {SOURCE_LABELS[item.source ?? "custom"]}
              </span>
            </div>
          </div>
        ))}
        {items.length === 0 && (
          <p style={{ fontSize: 12, color: "var(--color-ink4)" }}>
            Aucun visuel pour l'instant.
          </p>
        )}
      </div>
      {uploadError && (
        <p style={{ fontSize: 12, color: "var(--color-negative)", marginBottom: 8 }}>
          {uploadError}
        </p>
      )}
      {allowAdd && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <input
            placeholder="https://..."
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addCustom(urlInput);
                setUrlInput("");
              }
            }}
            style={{
              flex: "1 1 220px",
              padding: "8px 12px",
              borderRadius: 10,
              border: "1px solid var(--color-border)",
              background: "var(--color-surface)",
              color: "var(--color-ink)",
              fontSize: 13,
            }}
          />
          <button
            type="button"
            onClick={() => {
              addCustom(urlInput);
              setUrlInput("");
            }}
            style={{
              padding: "8px 12px",
              borderRadius: 10,
              border: "1px solid var(--color-accent)",
              background: "transparent",
              color: "var(--color-accent)",
              fontWeight: 700,
              fontSize: 13,
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            + Ajouter
          </button>
          <label
            title="Uploader une image"
            style={{
              padding: "8px 12px",
              borderRadius: 10,
              border: "1px solid var(--color-border)",
              background: "var(--color-surface2)",
              color: "var(--color-ink3)",
              cursor: uploading ? "wait" : "pointer",
              display: "flex",
              alignItems: "center",
              gap: 4,
              fontSize: 13,
            }}
          >
            <Upload size={16} />
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/svg+xml"
              multiple
              disabled={uploading}
              style={{ display: "none" }}
              onChange={(e) => {
                handleUpload(e.target.files);
                e.target.value = "";
              }}
            />
          </label>
        </div>
      )}
    </div>
  );
}
