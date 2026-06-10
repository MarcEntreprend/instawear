import React, { useState } from "react";
import {
  X,
  MessageCircle,
  Send,
  Mail,
  Check,
  ShoppingBag,
  Calendar,
  MapPin,
  User,
  Phone,
} from "lucide-react";
import { CartItem, OrderForm } from "../types";

interface OrderModalProps {
  cart: CartItem[];
  onClose: () => void;
  onConfirm: () => void;
}

const WHATSAPP_NUMBER = "+33600000000"; // Replace with real number
const TELEGRAM_USERNAME = "instawear_shop"; // Replace with real username
const EMAIL_ADDRESS = "commande@instawear.shop"; // Replace with real email

export default function OrderModal({
  cart,
  onClose,
  onConfirm,
}: OrderModalProps) {
  const [form, setForm] = useState<OrderForm>({
    name: "",
    phone: "",
    email: "",
    date: "",
    reception: "livraison",
    address: "",
    message: "",
  });
  const [success, setSuccess] = useState(false);
  const [errors, setErrors] = useState<
    Partial<Record<keyof OrderForm, string>>
  >({});

  const cartTotal = cart.reduce(
    (a, item) => a + item.product.price * item.quantity,
    0,
  );

  const validate = () => {
    const e: typeof errors = {};
    if (!form.name.trim()) e.name = "Nom requis";
    if (!form.phone.trim()) e.phone = "Téléphone requis";
    if (!form.date) e.date = "Date souhaitée requise";
    if (form.reception === "livraison" && !form.address.trim())
      e.address = "Adresse requise pour la livraison";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const buildMessage = () => {
    const lines = [
      "🛍️ NOUVELLE COMMANDE — InstaWear",
      "",
      "📦 Articles :",
      ...cart.map(
        (item) =>
          `  • ${item.product.title} × ${item.quantity} — taille ${item.selectedSize} — ${(item.product.price * item.quantity).toFixed(2)} €`,
      ),
      `  TOTAL : ${cartTotal.toFixed(2)} €`,
      "",
      "👤 Coordonnées :",
      `  Nom : ${form.name}`,
      `  Téléphone : ${form.phone}`,
      form.email ? `  Email : ${form.email}` : "",
      "",
      "📅 Date souhaitée : " + form.date,
      `📬 Réception : ${form.reception === "retrait" ? "Retrait sur place" : "Livraison à domicile"}`,
      form.reception === "livraison" ? `  Adresse : ${form.address}` : "",
      form.message ? `\n💬 Message : ${form.message}` : "",
    ]
      .filter(Boolean)
      .join("\n");
    return lines;
  };

  const sendOrder = (channel: "whatsapp" | "telegram" | "email") => {
    if (!validate()) return;
    const msg = buildMessage();
    const encoded = encodeURIComponent(msg);

    if (channel === "whatsapp") {
      window.open(
        `https://wa.me/${WHATSAPP_NUMBER.replace(/\D/g, "")}?text=${encoded}`,
        "_blank",
      );
    } else if (channel === "telegram") {
      window.open(
        `https://t.me/${TELEGRAM_USERNAME}?text=${encoded}`,
        "_blank",
      );
    } else {
      const subject = encodeURIComponent("Nouvelle commande InstaWear");
      window.open(
        `mailto:${EMAIL_ADDRESS}?subject=${subject}&body=${encoded}`,
        "_blank",
      );
    }

    setSuccess(true);
    setTimeout(() => {
      onConfirm();
    }, 2500);
  };

  const update = (key: keyof OrderForm, val: string) => {
    setForm((prev) => ({ ...prev, [key]: val }));
    if (errors[key])
      setErrors((prev) => {
        const e = { ...prev };
        delete e[key];
        return e;
      });
  };

  const inputStyle = (hasError: boolean) => ({
    width: "100%",
    padding: "10px 12px",
    borderRadius: "10px",
    border: `1.5px solid ${hasError ? "#EF4444" : "var(--color-border)"}`,
    background: "var(--color-surface)",
    color: "var(--color-ink)",
    fontSize: "14px",
    fontFamily: "var(--font-sans)",
    outline: "none",
    transition: "border-color .15s",
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in"
      style={{ background: "rgba(26,25,22,.6)", backdropFilter: "blur(6px)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full sm:max-w-lg max-h-[95vh] overflow-y-auto rounded-t-3xl sm:rounded-2xl animate-fade-up"
        style={{
          background: "var(--color-bg)",
          border: "1px solid var(--color-border)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between p-5 pb-4 border-b"
          style={{ borderColor: "var(--color-border)" }}
        >
          <div className="flex items-center gap-2">
            <ShoppingBag size={18} style={{ color: "var(--color-accent)" }} />
            <h2
              className="font-black text-lg"
              style={{
                color: "var(--color-ink)",
                fontFamily: "var(--font-sans)",
              }}
            >
              Finaliser la commande
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: "var(--color-ink3)" }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = "var(--color-surface2)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = "transparent")
            }
          >
            <X size={18} strokeWidth={2} />
          </button>
        </div>

        {success ? (
          /* Success state */
          <div className="p-8 text-center flex flex-col items-center gap-4">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center"
              style={{ background: "#D1FAE5" }}
            >
              <Check size={30} style={{ color: "#059669" }} strokeWidth={2.5} />
            </div>
            <div>
              <h3
                className="font-black text-xl mb-2"
                style={{
                  color: "var(--color-ink)",
                  fontFamily: "var(--font-sans)",
                }}
              >
                Demande transmise !
              </h3>
              <p className="text-sm" style={{ color: "var(--color-ink3)" }}>
                Nous vous contacterons dans les 2h pour confirmer votre
                commande.
              </p>
            </div>
          </div>
        ) : (
          <div className="p-5 flex flex-col gap-5">
            {/* Order summary */}
            <div
              className="rounded-xl p-4 flex flex-col gap-3"
              style={{ background: "var(--color-surface2)" }}
            >
              <p
                className="text-xs font-bold uppercase tracking-widest"
                style={{ color: "var(--color-ink3)" }}
              >
                Récapitulatif ({cart.length} article{cart.length > 1 ? "s" : ""}
                )
              </p>
              {cart.map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <img
                    src={item.product.image}
                    alt={item.product.title}
                    className="w-12 h-12 rounded-lg object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-sm font-semibold truncate"
                      style={{
                        color: "var(--color-ink)",
                        fontFamily: "var(--font-sans)",
                      }}
                    >
                      {item.product.title}
                    </p>
                    <p
                      className="text-xs"
                      style={{ color: "var(--color-ink3)" }}
                    >
                      Taille {item.selectedSize} · Qté {item.quantity}
                    </p>
                  </div>
                  <span
                    className="text-sm font-bold shrink-0"
                    style={{
                      color: "var(--color-ink)",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {(item.product.price * item.quantity).toFixed(2)} €
                  </span>
                </div>
              ))}
              <div
                className="flex justify-between pt-2 border-t"
                style={{ borderColor: "var(--color-border)" }}
              >
                <span
                  className="font-bold text-sm"
                  style={{ color: "var(--color-ink)" }}
                >
                  Total
                </span>
                <span
                  className="font-black text-base"
                  style={{
                    color: "var(--color-accent)",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {cartTotal.toFixed(2)} €
                </span>
              </div>
            </div>

            {/* Form */}
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    className="text-xs font-semibold mb-1 block"
                    style={{ color: "var(--color-ink3)" }}
                  >
                    Nom complet *
                  </label>
                  <input
                    type="text"
                    placeholder="Jean Dupont"
                    value={form.name}
                    onChange={(e) => update("name", e.target.value)}
                    style={inputStyle(!!errors.name)}
                    onFocus={(e) =>
                      (e.currentTarget.style.borderColor =
                        "var(--color-accent)")
                    }
                    onBlur={(e) =>
                      (e.currentTarget.style.borderColor = errors.name
                        ? "#EF4444"
                        : "var(--color-border)")
                    }
                  />
                  {errors.name && (
                    <p className="text-xs mt-1" style={{ color: "#EF4444" }}>
                      {errors.name}
                    </p>
                  )}
                </div>
                <div>
                  <label
                    className="text-xs font-semibold mb-1 block"
                    style={{ color: "var(--color-ink3)" }}
                  >
                    Téléphone *
                  </label>
                  <input
                    type="tel"
                    placeholder="06 12 34 56 78"
                    value={form.phone}
                    onChange={(e) => update("phone", e.target.value)}
                    style={inputStyle(!!errors.phone)}
                    onFocus={(e) =>
                      (e.currentTarget.style.borderColor =
                        "var(--color-accent)")
                    }
                    onBlur={(e) =>
                      (e.currentTarget.style.borderColor = errors.phone
                        ? "#EF4444"
                        : "var(--color-border)")
                    }
                  />
                  {errors.phone && (
                    <p className="text-xs mt-1" style={{ color: "#EF4444" }}>
                      {errors.phone}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label
                  className="text-xs font-semibold mb-1 block"
                  style={{ color: "var(--color-ink3)" }}
                >
                  Email (optionnel)
                </label>
                <input
                  type="email"
                  placeholder="jean@email.com"
                  value={form.email}
                  onChange={(e) => update("email", e.target.value)}
                  style={inputStyle(false)}
                  onFocus={(e) =>
                    (e.currentTarget.style.borderColor = "var(--color-accent)")
                  }
                  onBlur={(e) =>
                    (e.currentTarget.style.borderColor = "var(--color-border)")
                  }
                />
              </div>

              <div>
                <label
                  className="text-xs font-semibold mb-1 block"
                  style={{ color: "var(--color-ink3)" }}
                >
                  Date souhaitée *
                </label>
                <input
                  type="date"
                  value={form.date}
                  min={
                    new Date(Date.now() + 3 * 86400000)
                      .toISOString()
                      .split("T")[0]
                  }
                  onChange={(e) => update("date", e.target.value)}
                  style={inputStyle(!!errors.date)}
                  onFocus={(e) =>
                    (e.currentTarget.style.borderColor = "var(--color-accent)")
                  }
                  onBlur={(e) =>
                    (e.currentTarget.style.borderColor = errors.date
                      ? "#EF4444"
                      : "var(--color-border)")
                  }
                />
                {errors.date && (
                  <p className="text-xs mt-1" style={{ color: "#EF4444" }}>
                    {errors.date}
                  </p>
                )}
              </div>

              <div>
                <label
                  className="text-xs font-semibold mb-2 block"
                  style={{ color: "var(--color-ink3)" }}
                >
                  Mode de réception
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(["retrait", "livraison"] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => update("reception", mode)}
                      className="py-2.5 px-3 rounded-xl text-sm font-semibold transition-all duration-150"
                      style={{
                        background:
                          form.reception === mode
                            ? "var(--color-accent)"
                            : "var(--color-surface2)",
                        color:
                          form.reception === mode
                            ? "white"
                            : "var(--color-ink2)",
                        border: `1.5px solid ${form.reception === mode ? "var(--color-accent)" : "var(--color-border)"}`,
                        fontFamily: "var(--font-sans)",
                      }}
                    >
                      {mode === "retrait" ? "🏪 Retrait" : "🚚 Livraison"}
                    </button>
                  ))}
                </div>
              </div>

              {form.reception === "livraison" && (
                <div className="animate-fade-up">
                  <label
                    className="text-xs font-semibold mb-1 block"
                    style={{ color: "var(--color-ink3)" }}
                  >
                    Adresse de livraison *
                  </label>
                  <input
                    type="text"
                    placeholder="12 rue des Lilas, 75011 Paris"
                    value={form.address}
                    onChange={(e) => update("address", e.target.value)}
                    style={inputStyle(!!errors.address)}
                    onFocus={(e) =>
                      (e.currentTarget.style.borderColor =
                        "var(--color-accent)")
                    }
                    onBlur={(e) =>
                      (e.currentTarget.style.borderColor = errors.address
                        ? "#EF4444"
                        : "var(--color-border)")
                    }
                  />
                  {errors.address && (
                    <p className="text-xs mt-1" style={{ color: "#EF4444" }}>
                      {errors.address}
                    </p>
                  )}
                </div>
              )}

              <div>
                <label
                  className="text-xs font-semibold mb-1 block"
                  style={{ color: "var(--color-ink3)" }}
                >
                  Message (personnalisation, remarque…)
                </label>
                <textarea
                  rows={2}
                  placeholder="Ex : Ajouter mon prénom 'Jean' sous le logo"
                  value={form.message}
                  onChange={(e) => update("message", e.target.value)}
                  style={{ ...inputStyle(false), resize: "none" }}
                  onFocus={(e) =>
                    (e.currentTarget.style.borderColor = "var(--color-accent)")
                  }
                  onBlur={(e) =>
                    (e.currentTarget.style.borderColor = "var(--color-border)")
                  }
                />
              </div>
            </div>

            {/* Send buttons */}
            <div>
              <p
                className="text-xs font-bold uppercase tracking-widest mb-3 text-center"
                style={{ color: "var(--color-ink3)" }}
              >
                Envoyer votre demande via
              </p>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => sendOrder("whatsapp")}
                  className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl font-semibold text-xs text-gray-900 transition-all duration-200 active:scale-95"
                  style={{
                    background: "#25D366",
                    fontFamily: "var(--font-sans)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.boxShadow =
                      "0 8px 24px rgba(37,211,102,.3)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                  </svg>
                  WhatsApp
                </button>

                <button
                  onClick={() => sendOrder("telegram")}
                  className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl font-semibold text-xs text-gray-900 transition-all duration-200 active:scale-95"
                  style={{
                    background: "#229ED9",
                    fontFamily: "var(--font-sans)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.boxShadow =
                      "0 8px 24px rgba(34,158,217,.3)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
                  </svg>
                  Telegram
                </button>

                <button
                  onClick={() => sendOrder("email")}
                  className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl font-semibold text-xs transition-all duration-200 active:scale-95"
                  style={{
                    background: "var(--color-surface2)",
                    color: "var(--color-ink)",
                    border: "1.5px solid var(--color-border)",
                    fontFamily: "var(--font-sans)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.boxShadow = "var(--shadow-md)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >
                  <Mail
                    size={20}
                    strokeWidth={1.8}
                    style={{ color: "var(--color-ink2)" }}
                  />
                  Email
                </button>
              </div>
            </div>

            <p
              className="text-xs text-center"
              style={{ color: "var(--color-ink4)" }}
            >
              Votre demande sera traitée dans les 2h. Aucun paiement à l'avance
              requis.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
