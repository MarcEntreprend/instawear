// src/admin/ui/AdminImageInput.tsx
// Champ image STANDARD admin (standardisation promo) : coller un lien,
// bouton importer, drag & drop, Ctrl+V (image presse-papiers) —
// partout pareil, un seul comportement à maintenir.
// Upload via storageApi (dossier configurable), validation type + 5 Mo,
// aperçu + effacer. Aucune écriture DB ici : parent reçoit l'URL.
import React, { useState } from "react";
import { Upload, X } from "lucide-react";
import { storageApi } from "../../api/storageApi";
import { formInputStyle, formLabelStyle } from "../adminStyles";

export interface AdminImageInputProps {
  label?: string;
  value?: string | null;
  onChange: (url: string) => void;
  /** Dossier storage (défaut "hero"). */
  folder?: string;
  placeholder?: string;
}

const ACCEPT = "image/jpeg,image/png,image/webp,image/gif";
const MAX_BYTES = 5 * 1024 * 1024;

function pickImageFile(list: FileList | File[] | null | undefined): File | null {
  if (!list) return null;
  for (const f of Array.from(list)) {
    if (f.type.startsWith("image/")) return f;
  }
  return null;
}

export default function AdminImageInput({
  label,
  value,
  onChange,
  folder = "hero",
  placeholder = "https://… ou dépose / colle une image",
}: AdminImageInputProps) {
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);

  const uploadFile = async (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      alert("Fichier non image refusé (jpeg/png/webp/gif).");
      return;
    }
    if (file.size > MAX_BYTES) {
      alert("Image trop lourde (max 5 Mo).");
      return;
    }
    setUploading(true);
    try {
      const url = await storageApi.uploadImage(file, folder);
      onChange(url);
    } catch (err) {
      console.error("Upload failed", err);
      alert("Erreur lors de l'upload de l'image.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      {label && <label style={formLabelStyle}>{label}</label>}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          void uploadFile(pickImageFile(e.dataTransfer?.files));
        }}
        onPaste={(e) => {
          const f = pickImageFile(e.clipboardData?.files);
          if (f) {
            e.preventDefault();
            void uploadFile(f);
          }
        }}
        style={{
          display: "flex",
          gap: 8,
          alignItems: "center",
          borderRadius: 10,
          border: dragging
            ? "1.5px dashed var(--color-accent)"
            : "1px dashed transparent",
          padding: dragging ? 4 : 0,
          transition: "border-color 0.15s, padding 0.15s",
        }}
      >
        <input
          type="url"
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          style={{ ...formInputStyle, flex: 1 }}
          placeholder={placeholder}
        />
        <label
          title="Importer une image (ou glisser-déposer / Ctrl+V)"
          style={{
            ...formInputStyle,
            width: 40,
            padding: "8px 0",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: uploading ? "wait" : "pointer",
            border: "1px solid var(--color-border)",
            borderRadius: 10,
            background: "var(--color-surface2)",
            color: "var(--color-ink3)",
            flexShrink: 0,
            opacity: uploading ? 0.6 : 1,
          }}
        >
          <Upload size={16} />
          <input
            type="file"
            accept={ACCEPT}
            style={{ display: "none" }}
            disabled={uploading}
            onChange={(e) => {
              void uploadFile(e.target.files?.[0] ?? null);
              e.target.value = "";
            }}
          />
        </label>
        {value ? (
          <button
            type="button"
            title="Effacer"
            onClick={() => onChange("")}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--color-ink4)",
              fontSize: 16,
              padding: 4,
              flexShrink: 0,
            }}
          >
            <X size={14} />
          </button>
        ) : null}
      </div>
      {uploading && (
        <p style={{ fontSize: 11, color: "var(--color-ink3)", marginTop: 4 }}>
          Envoi en cours…
        </p>
      )}
      {value ? (
        <img
          src={value}
          alt=""
          style={{
            width: 120,
            height: 120,
            objectFit: "cover",
            borderRadius: 12,
            flexShrink: 0,
            marginTop: 8,
            border: "1px solid var(--color-border)",
            background: "var(--color-surface2)",
          }}
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = "none";
          }}
        />
      ) : null}
    </div>
  );
}
