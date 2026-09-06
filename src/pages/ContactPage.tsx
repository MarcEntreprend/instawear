// src/pages/ContactPage.tsx — V2 visuals + real backend (interactions ticket)
import { useEffect, useState } from "react";
import { ChevronLeft, Mail, Send, Check, AlertCircle } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { usePageMeta } from "../hooks/usePageMeta";

const COOLDOWN_KEY = "instawear-contact-last";
const COOLDOWN_MS = 60_000;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ContactPage({ onBack }: { onBack: () => void }) {
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  usePageMeta({
    title: "Contact",
    description:
      "Contact InstaWear: reply within 24 business hours. Email bonjour@instawear.com.",
    url: "https://instawear.vercel.app/contact",
  });

  // Pré-remplir l'email si connecté
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user?.email) setEmail(data.user.email);
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const cleanEmail = email.trim();
    const cleanMsg = message.trim();
    if (!EMAIL_RE.test(cleanEmail)) {
      setError("Please enter a valid email address.");
      return;
    }
    if (cleanMsg.length < 10) {
      setError("Please write at least 10 characters so we can help you.");
      return;
    }
    // Anti-spam : 1 envoi / 60s
    try {
      const last = Number(window.localStorage.getItem(COOLDOWN_KEY) || 0);
      if (Date.now() - last < COOLDOWN_MS) {
        setError("Please wait a minute before sending another message.");
        return;
      }
    } catch {
      /* localStorage indisponible : on continue */
    }

    setSending(true);
    try {
      // Via l'Edge Function : stocke le ticket (service_role, contourne le RLS)
      // + notifie l'admin par email via Resend (avec statut inscrit/non inscrit).
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/contact-message`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({ email: cleanEmail, message: cleanMsg }),
        },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok)
        throw new Error(data.error || "Sending failed at the moment.");
      try {
        window.localStorage.setItem(COOLDOWN_KEY, String(Date.now()));
      } catch {
        /* ignore */
      }
      setSent(true);
    } catch (err: any) {
      setError(
        err?.message ||
          "Unable to send right now. Email us at bonjour@instawear.com.",
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-(--color-bg) animate-fade-in">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-5 pb-2 flex items-center gap-2">
        <button
          onClick={onBack}
          aria-label="Back"
          className="btn-icon w-8 h-8"
        >
          <ChevronLeft size={15} />
        </button>
        <span className="text-xs" style={{ color: "var(--color-ink3)" }}>
          InstaWear / Contact
        </span>
      </div>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        <span className="eyebrow">Contact</span>
        <h1
          className="text-2xl sm:text-3xl font-extrabold mt-2 mb-2"
          style={{ color: "var(--color-ink)" }}
        >
          Contact us
        </h1>
        <p className="text-sm mb-8" style={{ color: "var(--color-ink3)" }}>
          Reply within 24 business hours · bonjour@instawear.com
        </p>
        {sent ? (
          <div className="card-premium p-8 text-center">
            <span
              className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3"
              style={{
                background: "var(--color-success-bg)",
                color: "var(--color-success)",
              }}
            >
              <Check size={22} />
            </span>
            <p className="font-bold" style={{ color: "var(--color-ink)" }}>
              Message sent
            </p>
            <p className="text-sm mt-1" style={{ color: "var(--color-ink3)" }}>
              We'll get back to you very soon.
            </p>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="card-premium p-6 flex flex-col gap-4"
          >
            {error && (
              <div
                className="flex items-start gap-2 p-3 rounded-xl text-xs font-medium"
                style={{
                  background: "var(--notif-negative-bg)",
                  color: "var(--notif-negative)",
                  border: "1px solid var(--notif-negative)",
                }}
              >
                <AlertCircle size={14} className="shrink-0 mt-0.5" />
                {error}
              </div>
            )}
            <div className="flex flex-col gap-1.5">
              <label
                className="text-[11px] font-bold uppercase tracking-wider"
                style={{ color: "var(--color-ink3)" }}
              >
                Email
              </label>
              <div
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
                style={{
                  background: "var(--color-surface2)",
                  border: "1px solid var(--color-border)",
                }}
              >
                <Mail size={14} style={{ color: "var(--color-ink4)" }} />
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  type="email"
                  placeholder="you@email.com"
                  className="flex-1 bg-transparent outline-none text-sm"
                  style={{ color: "var(--color-ink)" }}
                />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label
                className="text-[11px] font-bold uppercase tracking-wider"
                style={{ color: "var(--color-ink3)" }}
              >
                Message
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
                rows={5}
                minLength={10}
                placeholder="Your message... (10 characters minimum)"
                className="w-full px-3.5 py-3 rounded-xl text-sm outline-none resize-none"
                style={{
                  background: "var(--color-surface2)",
                  border: "1px solid var(--color-border)",
                  color: "var(--color-ink)",
                }}
              />
            </div>
            <button
              type="submit"
              disabled={sending}
              className="btn btn-accent self-start disabled:opacity-60"
            >
              <Send size={14} /> {sending ? "Sending…" : "Send"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
