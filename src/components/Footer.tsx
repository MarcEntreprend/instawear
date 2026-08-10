// src/components/Footer.tsx

import { useState } from "react";
import { Send, Loader2, Instagram, Twitter, Facebook } from "lucide-react";
import { newsletterApi } from "../api/supabaseApi";
import { LOGO_URL } from "../constants/assets";

interface FooterProps {
  isAdmin: boolean;
  onSelectEventType: (type: string) => void;
  onNavigate: (tab: "store" | "admin") => void;
  onOpenAdmin?: () => void;
}

export default function Footer({
  isAdmin,
  onSelectEventType,
  onNavigate,
  onOpenAdmin,
}: FooterProps) {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);
  const [valid, setValid] = useState(false);

  const [subscribing, setSubscribing] = useState(false);
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !valid) return;
    setSubscribing(true);
    try {
      const result = await newsletterApi.subscribe(email);
      if (result.success) {
        setSubscribed(true);
        setMessage(result.message);
        setTimeout(() => {
          setSubscribed(false);
          setEmail("");
          setValid(false);
          setMessage("");
        }, 5000);
      } else {
        setMessage(result.message);
        setTimeout(() => setMessage(""), 3000);
      }
    } catch {
      setMessage("Something went wrong. Please try again.");
    } finally {
      setSubscribing(false);
    }
  };

  return (
    <footer className="panel-ink mt-auto pt-16 pb-8 px-4 relative overflow-hidden">
      <div className="absolute -left-20 top-10 w-72 h-72 rounded-full bg-(--color-accent)/10 blur-3xl pointer-events-none" />

      <div className="section-container relative z-10">
        <div
          className={`grid grid-cols-1 ${isAdmin ? "md:grid-cols-4" : "md:grid-cols-3"} gap-10 pb-12 border-b border-white/10`}
        >
          <div className="space-y-4">
            <div className="flex items-center gap-1.5">
              <img
                src={LOGO_URL}
                alt="InstaWear Logo"
                className="w-8 h-8 rounded-xl object-cover"
              />
              <span className="font-black text-lg text-white">InstaWear</span>
            </div>
            <p className="text-xs text-white/50 leading-relaxed">
              The first autonomous print-on-demand marketplace built for global
              events.
            </p>
            <div className="flex items-center gap-3">
              <a
                href="#"
                className="w-9 h-9 rounded-full bg-white/8 border border-white/10 flex items-center justify-center text-white/60 hover:text-(--color-accent) hover:border-(--color-accent) transition-colors"
              >
                <Twitter className="w-4 h-4" />
              </a>
              <a
                href="#"
                className="w-9 h-9 rounded-full bg-white/8 border border-white/10 flex items-center justify-center text-white/60 hover:text-(--color-accent) hover:border-(--color-accent) transition-colors"
              >
                <Instagram className="w-4 h-4" />
              </a>
              <a
                href="#"
                className="w-9 h-9 rounded-full bg-white/8 border border-white/10 flex items-center justify-center text-white/60 hover:text-(--color-accent) hover:border-(--color-accent) transition-colors"
              >
                <Facebook className="w-4 h-4" />
              </a>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-black text-white uppercase tracking-widest mb-4">
              Events
            </h4>
            <ul className="space-y-2.5 text-xs text-white/50">
              {[
                { label: "Champions League Finals", type: "sport" },
                { label: "Rio Carnival Neon", type: "culture" },
                { label: "Bavarian Oktoberfest", type: "culture" },
                { label: "Halloween Glow", type: "saisonnier" },
              ].map((ev) => (
                <li key={ev.type + ev.label}>
                  <button
                    onClick={() => {
                      onSelectEventType(ev.type);
                      onNavigate("store");
                    }}
                    className="hover:text-(--color-accent) transition-colors"
                  >
                    {ev.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {isAdmin && (
            <div>
              <h4 className="text-xs font-black text-white uppercase tracking-widest mb-4">
                Creator hub
              </h4>
              <ul className="space-y-2.5 text-xs text-white/50">
                {[
                  "POD Design Form",
                  "Printful API Setup",
                  "Zero Budget Guide",
                  "Gemini AI Generator",
                ].map((item) => (
                  <li key={item}>
                    <button
                      onClick={() => {
                        onNavigate("admin");
                      }}
                      className="hover:text-(--color-accent) transition-colors"
                    >
                      {item}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="space-y-4">
            <h4 className="font-serif text-2xl text-white">Newsletter</h4>
            <p className="text-xs text-white/50 leading-relaxed">
              Subscribe to get early alerts on limited drops for every upcoming
              event.
            </p>
            {message && (
              <div
                className={`p-2.5 border rounded-xl text-xs ${subscribed ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" : "bg-amber-500/10 border-amber-500/30 text-amber-400"}`}
              >
                {message}
              </div>
            )}
            {!message && (
              <form onSubmit={handleSubmit} className="flex items-center gap-2">
                <input
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setValid(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.target.value));
                  }}
                  className="bg-white/8 border border-white/10 rounded-full px-4 py-2.5 text-xs text-white flex-1 focus:border-(--color-accent) focus:outline-none placeholder:text-white/30"
                  required
                />
                <button
                  type="submit"
                  disabled={subscribing || !valid}
                  className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all duration-200"
                  style={{
                    background: valid ? "var(--color-accent)" : "transparent",
                    color: valid ? "white" : "var(--color-accent)",
                    border: "1.5px solid var(--color-accent)",
                    opacity: subscribing ? 0.6 : 1,
                  }}
                >
                  {subscribing ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                </button>
              </form>
            )}
          </div>
        </div>

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-white/40">
          <p>
            2026 InstaWear Inc. All rights reserved. Powered by Cloud Run,
            Next.js commerce and the Printful API.
          </p>
          <div className="flex gap-4">
            <a href="#" className="hover:text-white transition-colors">
              Legal notice
            </a>
            <a href="#" className="hover:text-white transition-colors">
              Print policy
            </a>
            <a href="#" className="hover:text-white transition-colors">
              Creator terms
            </a>
            {isAdmin && (
              <button
                onClick={onOpenAdmin}
                className="hover:text-(--color-accent) transition-colors bg-transparent border-none cursor-pointer text-[11px] text-white/40"
              >
                Admin menu (beta)
              </button>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
}
