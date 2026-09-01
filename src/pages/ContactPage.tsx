// src/pages/ContactPage.tsx — V2 visuals
import { useState } from "react";
import { ChevronLeft, Mail, Send, Check } from "lucide-react";

export default function ContactPage({ onBack }: { onBack: () => void }) {
  const [sent, setSent] = useState(false);
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[var(--color-bg)] animate-fade-in">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-5 pb-2 flex items-center gap-2">
        <button onClick={onBack} aria-label="Retour" className="btn-icon w-8 h-8"><ChevronLeft size={15} /></button>
        <span className="text-xs" style={{ color: "var(--color-ink3)" }}>InstaWear / Contact</span>
      </div>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        <span className="eyebrow">Contact</span>
        <h1 className="text-2xl sm:text-3xl font-extrabold mt-2 mb-2" style={{ color: "var(--color-ink)" }}>Nous écrire</h1>
        <p className="text-sm mb-8" style={{ color: "var(--color-ink3)" }}>Réponse sous 24h ouvrées · bonjour@instawear.com</p>
        {sent ? (
          <div className="card-premium p-8 text-center">
            <span className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3" style={{ background: "var(--color-success-bg)", color: "var(--color-success)" }}><Check size={22} /></span>
            <p className="font-bold" style={{ color: "var(--color-ink)" }}>Message envoyé</p>
            <p className="text-sm mt-1" style={{ color: "var(--color-ink3)" }}>Nous vous répondons très vite.</p>
          </div>
        ) : (
          <form onSubmit={(e) => { e.preventDefault(); setSent(true); }} className="card-premium p-6 flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--color-ink3)" }}>Email</label>
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl" style={{ background: "var(--color-surface2)", border: "1px solid var(--color-border)" }}>
                <Mail size={14} style={{ color: "var(--color-ink4)" }} />
                <input value={email} onChange={(e) => setEmail(e.target.value)} required type="email" placeholder="you@email.com" className="flex-1 bg-transparent outline-none text-sm" style={{ color: "var(--color-ink)" }} />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--color-ink3)" }}>Message</label>
              <textarea value={message} onChange={(e) => setMessage(e.target.value)} required rows={5} placeholder="Votre message..." className="w-full px-3.5 py-3 rounded-xl text-sm outline-none resize-none" style={{ background: "var(--color-surface2)", border: "1px solid var(--color-border)", color: "var(--color-ink)" }} />
            </div>
            <button type="submit" className="btn btn-accent self-start"><Send size={14} /> Envoyer</button>
          </form>
        )}
      </div>
    </div>
  );
}
