// src/components/ShareProduct.tsx
// Partage fiche produit : natif (Web Share API) + copy link + WhatsApp /
// Telegram / X / Facebook. Instagram n'a PAS d'URL de partage web : le bouton
// copie le lien (toast explicite), jamais de bouton mort.
import { useState } from "react";
import { Share2, Link2, Check, MessageCircle, Send, AtSign } from "lucide-react";

function canNativeShare(): boolean {
  return (
    typeof navigator !== "undefined" &&
    typeof (navigator as any).share === "function"
  );
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}

export default function ShareProduct({
  title,
  productId,
}: {
  title: string;
  productId: string;
}) {
  const [copied, setCopied] = useState(false);
  const [instaHint, setInstaHint] = useState(false);
  const url =
    typeof window !== "undefined"
      ? `${window.location.origin}/produit/${productId}`
      : `/produit/${productId}`;
  const text = title || "InstaWear";

  const flashCopied = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const doCopy = async () => {
    if (await copyText(url)) flashCopied();
  };

  const doInstagram = async () => {
    // Pas de partage web Instagram : on copie le lien à coller dans l'app.
    if (await copyText(url)) {
      flashCopied();
      setInstaHint(true);
      setTimeout(() => setInstaHint(false), 3000);
    }
  };

  const openShare = (shareUrl: string) => {
    window.open(shareUrl, "_blank", "noopener,noreferrer");
  };

  const doNative = async () => {
    try {
      await (navigator as any).share({ title: text, text, url });
    } catch {
      /* annulé par l'utilisateur : silencieux */
    }
  };

  const btn: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    padding: "8px 10px",
    borderRadius: 10,
    border: "1px solid var(--color-border)",
    background: "var(--color-surface2)",
    color: "var(--color-ink2)",
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
    flex: "1 1 auto",
    whiteSpace: "nowrap",
  };

  const eUrl = encodeURIComponent(url);
  const eText = encodeURIComponent(text);

  return (
    <div className="mt-3">
      <p
        className="text-xs font-bold uppercase tracking-wider mb-2"
        style={{ color: "var(--color-ink3)" }}
      >
        Share
      </p>
      <div className="flex items-center gap-2 flex-wrap">
        {canNativeShare() && (
          <button onClick={doNative} style={btn} aria-label="Share">
            <Share2 size={14} /> Share
          </button>
        )}
        <button
          onClick={doCopy}
          style={btn}
          aria-label="Copy link"
          title="Copy product link"
        >
          {copied ? <Check size={14} /> : <Link2 size={14} />}
          {copied ? "Copied" : "Copy link"}
        </button>
        <button
          onClick={() =>
            openShare(`https://wa.me/?text=${eText}%20${eUrl}`)
          }
          style={btn}
          aria-label="Share on WhatsApp"
          title="Share on WhatsApp"
        >
          <MessageCircle size={14} /> WhatsApp
        </button>
        <button
          onClick={() =>
            openShare(`https://t.me/share/url?url=${eUrl}&text=${eText}`)
          }
          style={btn}
          aria-label="Share on Telegram"
          title="Share on Telegram"
        >
          <Send size={14} /> Telegram
        </button>
        <button
          onClick={() =>
            openShare(`https://twitter.com/intent/tweet?text=${eText}&url=${eUrl}`)
          }
          style={btn}
          aria-label="Share on X"
          title="Share on X"
        >
          <AtSign size={14} /> X
        </button>
        <button
          onClick={() =>
            openShare(`https://www.facebook.com/sharer/sharer.php?u=${eUrl}`)
          }
          style={btn}
          aria-label="Share on Facebook"
          title="Share on Facebook"
        >
          <Share2 size={14} /> Facebook
        </button>
        <button
          onClick={doInstagram}
          style={btn}
          aria-label="Copy link for Instagram"
          title="Instagram has no web share: copies the link to paste in the app"
        >
          <Link2 size={14} /> Instagram
        </button>
      </div>
      {instaHint && (
        <p className="text-xs mt-2" style={{ color: "var(--color-ink3)" }}>
          Link copied — paste it in Instagram (no web share available).
        </p>
      )}
    </div>
  );
}
