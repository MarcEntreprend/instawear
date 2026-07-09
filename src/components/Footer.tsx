// src/components/Footer.tsx

import { useState } from "react";
import { Send, Instagram, Twitter, Facebook } from "lucide-react";
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      setSubscribed(true);
      setTimeout(() => {
        setSubscribed(false);
        setEmail("");
        setValid(false);
      }, 5000);
    }
  };

  return (
    <footer className="bg-gray-50 border-t border-gray-200 py-12 px-4 mt-auto">
      <div
        className={`section-container grid grid-cols-1 ${isAdmin ? "md:grid-cols-4" : "md:grid-cols-3"} gap-8`}
      >
        <div className="space-y-4">
          <div className="flex items-center gap-1.5">
            <img
              src={LOGO_URL}
              alt="InstaWear Logo"
              className="w-8 h-8 rounded-lg object-cover"
            />
            <span className="font-black text-lg text-gray-900">InstaWear</span>
          </div>
          <p className="text-xs text-gray-500 leading-relaxed font-sans">
            Le premier marketplace autonome d'impression à la demande calibré
            pour les événements mondiaux.
          </p>
          <div className="flex items-center gap-3">
            <a
              href="#"
              className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-500 hover:text-(--color-accent) transition-colors"
            >
              <Twitter className="w-4 h-4" />
            </a>
            <a
              href="#"
              className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-500 hover:text-(--color-accent) transition-colors"
            >
              <Instagram className="w-4 h-4" />
            </a>
            <a
              href="#"
              className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-500 hover:text-(--color-accent) transition-colors"
            >
              <Facebook className="w-4 h-4" />
            </a>
          </div>
        </div>

        <div>
          <h4 className="text-xs font-black text-gray-900 uppercase tracking-widest mb-4">
            Événements
          </h4>
          <ul className="space-y-2.5 text-xs text-gray-500">
            {[
              { label: "Ligue de Champions finals", type: "sport" },
              { label: "Carnaval de Rio Neon", type: "culture" },
              { label: "Oktoberfest bavarois", type: "culture" },
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
            <h4 className="text-xs font-black text-gray-900 uppercase tracking-widest mb-4">
              Créateur Hub
            </h4>
            <ul className="space-y-2.5 text-xs text-gray-500">
              {[
                "Formulaire de design POD",
                "Configuration API Printful",
                "Zéro Budget guide",
                "Générateur Gemini AI",
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

        <div className="space-y-3">
          <h4 className="text-xs font-black text-gray-900 uppercase tracking-widest">
            Abonnement Newsletter
          </h4>
          <p className="text-xs text-gray-500 leading-relaxed font-sans">
            Abonnez-vous pour être alerté en amont des collections limitées de
            chaque futur événement !
          </p>
          {subscribed ? (
            <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 rounded text-xs">
              ✓ Merci ! Vous êtes officiellement sur la liste d'alerte.
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex items-center gap-1">
              <input
                type="email"
                placeholder="votre-email@adresse.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setValid(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.target.value));
                }}
                className="bg-white border border-gray-200 rounded p-2 text-xs text-gray-900 flex-1 focus:border-cyan-400 focus:outline-none"
                required
              />
              <button
                type="submit"
                className="p-2 rounded transition-all duration-200"
                style={{
                  background: valid ? "var(--color-accent)" : "transparent",
                  color: valid ? "white" : "var(--color-accent)",
                  border: `1.5px solid var(--color-accent)`,
                }}
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          )}
        </div>
      </div>

      <div className="section-container mt-12 pt-6 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-gray-500 font-sans">
        <p>
          © 2026 InstaWear Inc. Tous droits réservés. Propulsé par Cloud Run,
          Next.js commerce & l'API Printful.
        </p>
        <div className="flex gap-4">
          <a href="#" className="hover:underline">
            Mentions légales
          </a>
          <span>•</span>
          <a href="#" className="hover:underline">
            Politique d'impression Choice
          </a>
          <span>•</span>
          <a href="#" className="hover:underline">
            CGU Créateurs
          </a>
          <span>•</span>
          {isAdmin && (
            <button
              onClick={onOpenAdmin}
              className="hover:text-(--color-accent) transition-colors bg-transparent border-none cursor-pointer text-[11px] text-gray-500"
            >
              Menu Admin (Bêta)
            </button>
          )}
        </div>
      </div>
    </footer>
  );
}
