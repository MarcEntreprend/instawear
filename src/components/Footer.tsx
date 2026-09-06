// src/components/Footer.tsx — V1 props + V2 visuals (help banner + 6-col grid) + mybooker credit centered
import { useState } from "react";
import {
  HelpCircle,
  Mail,
  Instagram,
  Twitter,
  Facebook,
  ArrowRight,
  Check,
  Loader2,
  Lock,
} from "lucide-react";
import { newsletterApi } from "../api/supabaseApi";
import { LOGO_URL } from "../constants/assets";

interface FooterProps {
  isAdmin: boolean;
  onSelectEventType: (type: string) => void;
  onNavigate: (tab: "store" | "admin") => void;
  onOpenAdmin?: () => void;
  onOpenLegal?: (slug: string) => void;
  onOpenFaq?: () => void;
  onOpenContact?: () => void;
  onOpenPromotions?: () => void;
  onManageCookies?: () => void;
}

export default function Footer({
  isAdmin,
  onSelectEventType,
  onNavigate,
  onOpenAdmin,
  onOpenLegal,
  onOpenFaq,
  onOpenContact,
  onOpenPromotions,
  onManageCookies,
}: FooterProps) {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);
  const [valid, setValid] = useState(false);
  const [subscribing, setSubscribing] = useState(false);
  const [message, setMessage] = useState("");

  const handleSubscribe = async (e: React.FormEvent) => {
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
    <footer
      style={{
        background: "var(--color-bg)",
        borderTop: "1px solid var(--color-border)",
      }}
    >
      {/* Bandeau aide V2 */}
      <div style={{ background: "var(--color-accent-bg)" }}>
        <div className="max-w-350 mx-auto px-6 py-8 grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div>
            <h3
              className="text-base font-bold mb-1"
              style={{ color: "var(--color-ink)" }}
            >
              On est toujours là pour vous aider
            </h3>
            <p className="text-sm" style={{ color: "var(--color-ink2)" }}>
              Choisissez le canal le plus rapide pour vous.
            </p>
          </div>
          <a href="#section-faq" className="flex items-center gap-3">
            <span
              className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
              style={{
                background: "var(--color-surface)",
                color: "var(--color-accent)",
              }}
            >
              <HelpCircle size={19} />
            </span>
            <span>
              <span
                className="block text-xs"
                style={{ color: "var(--color-ink3)" }}
              >
                Centre d'aide
              </span>
              <span
                className="block text-sm font-semibold"
                style={{ color: "var(--color-ink)" }}
              >
                aide.instawear.com
              </span>
            </span>
          </a>
          <a
            href="mailto:bonjour@instawear.com"
            className="flex items-center gap-3"
          >
            <span
              className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
              style={{
                background: "var(--color-surface)",
                color: "var(--color-accent)",
              }}
            >
              <Mail size={19} />
            </span>
            <span>
              <span
                className="block text-xs"
                style={{ color: "var(--color-ink3)" }}
              >
                Email
              </span>
              <span
                className="block text-sm font-semibold"
                style={{ color: "var(--color-ink)" }}
              >
                bonjour@instawear.com
              </span>
            </span>
          </a>
        </div>
      </div>

      {/* Grille principale V2 + Creator Hub V1 */}
      <div
        className={`max-w-350 mx-auto px-6 py-14 grid gap-x-6 gap-y-10 ${isAdmin ? "grid-cols-2 md:grid-cols-5" : "grid-cols-2 md:grid-cols-4"}`}
      >
        <div className="col-span-2 md:col-span-1">
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="flex items-center gap-2 mb-4 bg-transparent border-none cursor-pointer"
          >
            <img
              src={LOGO_URL}
              alt="InstaWear"
              className="w-9 h-9 rounded-2xl object-cover"
            />
            <span
              className="text-lg font-extrabold"
              style={{ color: "var(--color-ink)" }}
            >
              Insta<span style={{ color: "var(--color-accent)" }}>Wear</span>
            </span>
          </button>
          <p
            className="text-sm mb-5 max-w-[26ch]"
            style={{ color: "var(--color-ink2)" }}
          >
            Le vestiaire des événements. Design à la demande, imprimé pour votre
            moment.
          </p>
          <div className="flex items-center gap-2">
            {[Instagram, Facebook, Twitter].map((Icon, i) => (
              <span
                key={i}
                title="Bientôt disponible"
                aria-label="Réseau social (bientôt disponible)"
                className="btn-icon opacity-60 cursor-default"
              >
                <Icon size={16} />
              </span>
            ))}
          </div>
        </div>

        <div>
          <h4
            className="text-xs font-bold uppercase tracking-wider mb-4"
            style={{ color: "var(--color-ink3)" }}
          >
            Boutique
          </h4>
          <ul
            className="flex flex-col gap-2.5 text-sm"
            style={{ color: "var(--color-ink2)" }}
          >
            <li>
              <button
                onClick={() => {
                  onNavigate("store");
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className="hover:text-(--color-accent) text-left"
              >
                Toute la boutique
              </button>
            </li>
            <li>
              <button
                onClick={() => onSelectEventType("culture")}
                className="hover:text-(--color-accent) text-left"
              >
                Festivals
              </button>
            </li>
            <li>
              <button
                onClick={() => onSelectEventType("sport")}
                className="hover:text-(--color-accent) text-left"
              >
                Sport
              </button>
            </li>
            <li>
              <button
                onClick={() => onSelectEventType("saisonnier")}
                className="hover:text-(--color-accent) text-left"
              >
                Saisonnier
              </button>
            </li>
          </ul>
        </div>

        <div>
          <h4
            className="text-xs font-bold uppercase tracking-wider mb-4"
            style={{ color: "var(--color-ink3)" }}
          >
            Aide
          </h4>
          <ul
            className="flex flex-col gap-2.5 text-sm"
            style={{ color: "var(--color-ink2)" }}
          >
            <li>
              <button
                onClick={() =>
                  document
                    .getElementById("faq")
                    ?.scrollIntoView({ behavior: "smooth" })
                }
                className="hover:text-(--color-accent) text-left"
              >
                FAQ
              </button>
            </li>
            <li>
              <button
                onClick={() =>
                  document
                    .getElementById("faq")
                    ?.scrollIntoView({ behavior: "smooth" })
                }
                className="hover:text-(--color-accent) text-left"
              >
                Livraison & retours
              </button>
            </li>
            <li>
              <a
                href="mailto:bonjour@instawear.com"
                className="hover:text-(--color-accent)"
              >
                Contact
              </a>
            </li>
          </ul>
        </div>

        {isAdmin && (
          <div>
            <h4
              className="text-xs font-bold uppercase tracking-wider mb-4"
              style={{ color: "var(--color-ink3)" }}
            >
              Creator Hub
            </h4>
            <ul
              className="flex flex-col gap-2.5 text-sm"
              style={{ color: "var(--color-ink2)" }}
            >
              {[
                "POD Design Form",
                "Printful API Setup",
                "Zero Budget Guide",
                "Gemini AI Generator",
              ].map((item) => (
                <li key={item}>
                  <button
                    onClick={() => onNavigate("admin")}
                    className="hover:text-(--color-accent) text-left"
                  >
                    {item}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="col-span-2 md:col-span-1">
          <h4
            className="text-xs font-bold uppercase tracking-wider mb-4"
            style={{ color: "var(--color-ink3)" }}
          >
            Restez informé
          </h4>
          {subscribed ? (
            <p
              className="flex items-center gap-2 text-sm font-semibold"
              style={{ color: "var(--color-success)" }}
            >
              <Check size={16} /> Inscription confirmée
            </p>
          ) : (
            <>
              {message && (
                <div
                  className={`p-2.5 border rounded text-xs mb-2 ${message.includes("success") || subscribed ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600" : "bg-amber-500/10 border-amber-500/30 text-amber-600"}`}
                >
                  {message}
                </div>
              )}
              <form onSubmit={handleSubscribe} className="flex flex-col gap-2">
                <div
                  className="flex items-center rounded-full pl-4 pr-1.5 h-11"
                  style={{
                    background: "var(--color-surface2)",
                    border: "1px solid var(--color-border)",
                  }}
                >
                  <input
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setValid(
                        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.target.value),
                      );
                    }}
                    type="email"
                    required
                    placeholder="Votre email"
                    className="flex-1 bg-transparent outline-none text-sm min-w-0"
                    style={{ color: "var(--color-ink)" }}
                  />
                  <button
                    type="submit"
                    disabled={subscribing || !valid}
                    aria-label="S'inscrire"
                    className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                    style={{
                      background: valid
                        ? "var(--color-ink)"
                        : "var(--color-border2)",
                      color: valid ? "var(--color-bg)" : "var(--color-ink3)",
                    }}
                  >
                    {subscribing ? (
                      <Loader2 size={15} className="animate-spin" />
                    ) : (
                      <ArrowRight size={15} />
                    )}
                  </button>
                </div>
                <p className="text-xs" style={{ color: "var(--color-ink4)" }}>
                  Nouveautés et offres exclusives, sans spam.
                </p>
              </form>
            </>
          )}
        </div>
      </div>

      {/* Bande de copyright avec mention mybooker centrée */}
      <div style={{ borderTop: "1px solid var(--color-border)" }}>
        <div
          className="max-w-350 mx-auto px-6 h-16 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs"
          style={{ color: "var(--color-ink3)" }}
        >
          {/* Gauche : Copyright */}
          <span>
            © {new Date().getFullYear()} InstaWear. Tous droits réservés.
          </span>

          {/* Centre : mybooker credit */}
          <span className="text-[11px]" style={{ color: "var(--color-ink4)" }}>
            Réalisé par{" "}
            <a
              href="https://mybooker.vercel.app"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium transition-colors hover:text-(--color-accent)"
              style={{ color: "var(--color-ink2)" }}
            >
              mybooker
            </a>
          </span>

          {/* Droite : Liens légaux */}
          <div className="flex items-center gap-5">
            <button
              onClick={() => onOpenLegal?.("cgv")}
              className="hover:underline bg-transparent border-none cursor-pointer text-xs"
              style={{ color: "var(--color-ink3)" }}
            >
              CGV
            </button>
            <button
              onClick={() => onOpenLegal?.("privacy")}
              className="hover:underline bg-transparent border-none cursor-pointer text-xs"
              style={{ color: "var(--color-ink3)" }}
            >
              Confidentialité
            </button>
            <button
              onClick={() => onOpenLegal?.("cookies")}
              className="hover:underline bg-transparent border-none cursor-pointer text-xs"
              style={{ color: "var(--color-ink3)" }}
            >
              Cookies
            </button>
            <button
              onClick={() => onManageCookies?.()}
              className="hover:underline bg-transparent border-none cursor-pointer text-xs"
              style={{ color: "var(--color-ink3)" }}
            >
              Gérer les cookies
            </button>
            {isAdmin && (
              <button
                onClick={onOpenAdmin}
                className="flex items-center gap-1.5 hover:underline bg-transparent border-none cursor-pointer text-xs"
                style={{ color: "var(--color-ink3)" }}
              >
                <Lock size={11} /> Accès admin
              </button>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
}
