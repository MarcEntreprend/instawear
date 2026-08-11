// src/components/Footer.tsx

import React, { useState } from "react";
import { Send, Instagram, Twitter, Facebook, Loader2 } from "lucide-react";

interface FooterProps {
  isAdmin?: boolean;
  onNavigateAdmin?: () => void;
}

export default function Footer({
  isAdmin = false,
  onNavigateAdmin,
}: FooterProps) {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setSending(true);
    setTimeout(() => {
      setSending(false);
      setDone(true);
      setTimeout(() => {
        setDone(false);
        setEmail("");
      }, 3000);
    }, 900);
  };

  return (
    <footer
      className="mt-16"
      style={{
        background: "var(--color-cta-bg)",
        color: "var(--color-cta-ink)",
      }}
    >
      <div className="section-container py-14 grid grid-cols-1 md:grid-cols-4 gap-10">
        <div className="md:col-span-2 flex flex-col gap-4">
          <span className="font-display font-black text-2xl">
            Insta<span style={{ color: "var(--color-accent)" }}>Wear</span>
          </span>
          <p className="text-sm opacity-70 max-w-xs leading-relaxed">
            The autonomous print-on-demand marketplace built for global culture
            and events.
          </p>
          <div className="flex items-center gap-3 mt-1">
            {[Twitter, Instagram, Facebook].map((Icon, i) => (
              <a
                key={i}
                href="#"
                className="w-9 h-9 rounded-full flex items-center justify-center transition-colors"
                style={{ background: "rgba(255,255,255,0.1)" }}
              >
                <Icon size={15} />
              </a>
            ))}
          </div>
        </div>

        <div>
          <h4 className="text-xs font-black uppercase tracking-widest opacity-60 mb-4">
            Shop
          </h4>
          <ul className="flex flex-col gap-2.5 text-sm opacity-80">
            <li>New Arrivals</li>
            <li>Best Sellers</li>
            <li>Deals</li>
            {isAdmin && (
              <li>
                <button
                  onClick={onNavigateAdmin}
                  className="hover:opacity-100 opacity-80"
                >
                  Admin Dashboard
                </button>
              </li>
            )}
          </ul>
        </div>

        <div>
          <h4 className="text-xs font-black uppercase tracking-widest opacity-60 mb-4">
            Newsletter
          </h4>
          <p className="text-sm opacity-70 mb-3">
            Get 10% off your first order.
          </p>
          {done ? (
            <p
              className="text-sm font-bold"
              style={{ color: "var(--color-accent2)" }}
            >
              You're subscribed! 🎉
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="flex items-center gap-1.5">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@email.com"
                className="flex-1 min-w-0 px-3 py-2.5 rounded-full text-xs outline-none"
                style={{
                  background: "rgba(255,255,255,0.1)",
                  color: "inherit",
                }}
              />
              <button
                type="submit"
                disabled={sending}
                className="w-9 h-9 shrink-0 rounded-full flex items-center justify-center"
                style={{ background: "var(--color-accent)" }}
              >
                {sending ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Send size={14} />
                )}
              </button>
            </form>
          )}
        </div>
      </div>

      <div
        className="section-container py-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs opacity-50"
        style={{ borderTop: "1px solid rgba(255,255,255,0.1)" }}
      >
        <p>© 2026 InstaWear Inc. All rights reserved.</p>
        <div className="flex gap-4">
          <a href="#">Legal</a>
          <a href="#">Privacy</a>
          <a href="#">Terms</a>
        </div>
      </div>
    </footer>
  );
}
