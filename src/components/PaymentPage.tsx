// src/components/PaymentPage.tsx
import React, { useState } from "react";
import {
  X,
  CreditCard,
  Banknote,
  Wallet,
  CheckCircle,
  ChevronRight,
} from "lucide-react";
import type { CartItem } from "../types";
import { useCurrencySymbol } from "../hooks/useCurrencySymbol";
import { PLACEHOLDER_IMG, LOGO_URL } from "../constants/assets";

interface PaymentPageProps {
  cart: CartItem[];
  cartTotal: number;
  shippingCost: number;
  total: number;
  name: string;
  phone: string;
  email: string;
  date: string;
  reception: "retrait" | "livraison";
  address: string;
  city: string;
  zip: string;
  country: string;
  stateCode: string;
  taxNumber: string;
  onClose: () => void;
  onSuccess: () => void;
}

type PaymentMethod = "card" | "paypal" | "cash";

export default function PaymentPage({
  cart,
  cartTotal,
  shippingCost,
  total,
  name,
  phone,
  email,
  date,
  reception,
  address,
  city,
  zip,
  country,
  stateCode,
  taxNumber,
  onClose,
  onSuccess,
}: PaymentPageProps) {
  const currencySymbol = useCurrencySymbol();

  // Stepper : 1=Panier, 2=Contact, 3=Paiement, 4=Confirmation
  const [step] = useState(3);

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("card");
  const [cardNumber, setCardNumber] = useState("");
  const [cardHolder, setCardHolder] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [saveCard, setSaveCard] = useState(true);

  const formatCardNumber = (value: string) => {
    const cleaned = value.replace(/\D/g, "").slice(0, 16);
    return cleaned.replace(/(\d{4})(?=\d)/g, "$1 ");
  };

  const formatExpiry = (value: string) => {
    const cleaned = value.replace(/\D/g, "").slice(0, 4);
    if (cleaned.length >= 3)
      return cleaned.slice(0, 2) + "/" + cleaned.slice(2);
    return cleaned;
  };

  const handleConfirm = () => {
    // Placeholder : log en console, à connecter plus tard
    console.log("Payment confirmed", {
      method: paymentMethod,
      cardNumber,
      cardHolder,
      total,
    });
    onSuccess();
  };

  const steps = [
    { label: "Panier", done: true },
    { label: "Contact", done: true },
    { label: "Paiement", done: false },
    { label: "Confirmation", done: false },
  ];

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 300,
        background: "var(--color-bg)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 24px",
          background: "var(--color-surface)",
          borderBottom: "1px solid var(--color-border)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <img
            src={LOGO_URL}
            alt="InstaWear"
            style={{ height: 32, objectFit: "contain" }}
          />
          <span
            style={{
              fontWeight: 700,
              fontSize: 18,
              color: "var(--color-ink)",
            }}
          >
            Paiement sécurisé
          </span>
        </div>
        <button
          onClick={onClose}
          style={{
            background: "var(--color-surface2)",
            border: "1px solid var(--color-border)",
            borderRadius: 8,
            padding: "6px 10px",
            cursor: "pointer",
            color: "var(--color-ink2)",
          }}
        >
          <X size={18} />
        </button>
      </header>

      {/* Stepper */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: 0,
          padding: "24px 16px 0",
          background: "var(--color-surface)",
        }}
      >
        {steps.map((s, i) => (
          <div
            key={s.label}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              flex: 1,
              maxWidth: 220,
            }}
          >
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 700,
                fontSize: 13,
                border: `2px solid ${
                  i + 1 <= step ? "var(--color-accent)" : "var(--color-border)"
                }`,
                background:
                  i + 1 < step
                    ? "var(--color-accent)"
                    : i + 1 === step
                      ? "transparent"
                      : "var(--color-surface2)",
                color:
                  i + 1 < step
                    ? "white"
                    : i + 1 === step
                      ? "var(--color-accent)"
                      : "var(--color-ink4)",
              }}
            >
              {i + 1 < step ? <CheckCircle size={14} strokeWidth={3} /> : i + 1}
            </div>
            <span
              style={{
                fontSize: 12,
                fontWeight: i + 1 === step ? 700 : 500,
                color:
                  i + 1 === step ? "var(--color-ink)" : "var(--color-ink4)",
              }}
            >
              {s.label}
            </span>
            {i < steps.length - 1 && (
              <div
                style={{
                  flex: 1,
                  height: 2,
                  background:
                    i + 1 < step
                      ? "var(--color-accent)"
                      : "var(--color-border)",
                  margin: "0 8px",
                }}
              />
            )}
          </div>
        ))}
      </div>

      {/* Main content */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "24px",
          background: "var(--color-bg)",
          display: "grid",
          gridTemplateColumns: "1.4fr 1fr",
          gap: 24,
          alignItems: "start",
        }}
        className="payment-grid"
      >
        {/* Colonne gauche – Méthodes de paiement + formulaire */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <h2
            style={{
              fontSize: 16,
              fontWeight: 700,
              color: "var(--color-ink)",
            }}
          >
            Choisissez votre mode de paiement
          </h2>

          {/* Sélecteur de méthode */}
          <div style={{ display: "flex", gap: 12 }}>
            {(
              [
                { key: "card", label: "Carte", icon: CreditCard },
                { key: "paypal", label: "PayPal", icon: Wallet },
                { key: "cash", label: "Espèces", icon: Banknote },
              ] as const
            ).map((m) => (
              <button
                key={m.key}
                onClick={() => setPaymentMethod(m.key)}
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 8,
                  padding: "16px 12px",
                  borderRadius: 12,
                  border:
                    paymentMethod === m.key
                      ? "2px solid var(--color-accent)"
                      : "2px solid var(--color-border)",
                  background:
                    paymentMethod === m.key
                      ? "var(--color-surface)"
                      : "var(--color-surface2)",
                  color:
                    paymentMethod === m.key
                      ? "var(--color-accent)"
                      : "var(--color-ink3)",
                  cursor: "pointer",
                  fontWeight: 600,
                  fontSize: 13,
                  transition: "all 0.2s",
                }}
              >
                <m.icon size={22} strokeWidth={2} />
                {m.label}
              </button>
            ))}
          </div>

          {/* Formulaire carte bancaire */}
          {paymentMethod === "card" && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 16,
                background: "var(--color-surface)",
                border: "1px solid var(--color-border)",
                borderRadius: 14,
                padding: 20,
              }}
            >
              <div>
                <label style={labelStyle}>Numéro de carte</label>
                <div style={{ position: "relative" }}>
                  <input
                    type="text"
                    value={cardNumber}
                    onChange={(e) =>
                      setCardNumber(formatCardNumber(e.target.value))
                    }
                    style={inputStyle}
                    placeholder="1234 5678 9012 3456"
                  />
                  <span
                    style={{
                      position: "absolute",
                      right: 12,
                      top: "50%",
                      transform: "translateY(-50%)",
                      fontSize: 20,
                      fontWeight: 700,
                      color: "var(--color-ink4)",
                      fontStyle: "italic",
                    }}
                  >
                    VISA
                  </span>
                </div>
              </div>
              <div>
                <label style={labelStyle}>Titulaire de la carte</label>
                <input
                  type="text"
                  value={cardHolder}
                  onChange={(e) => setCardHolder(e.target.value)}
                  style={inputStyle}
                  placeholder="BRUCE WAYNE"
                />
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 16,
                }}
              >
                <div>
                  <label style={labelStyle}>Date d'expiration</label>
                  <input
                    type="text"
                    value={cardExpiry}
                    onChange={(e) =>
                      setCardExpiry(formatExpiry(e.target.value))
                    }
                    style={inputStyle}
                    placeholder="MM/AA"
                  />
                </div>
                <div>
                  <label style={labelStyle}>
                    CVV{" "}
                    <span
                      title="Les 3 chiffres au dos de votre carte"
                      style={{
                        cursor: "help",
                        color: "var(--color-ink4)",
                        fontSize: 11,
                      }}
                    >
                      (?)
                    </span>
                  </label>
                  <input
                    type="text"
                    value={cardCvv}
                    onChange={(e) =>
                      setCardCvv(e.target.value.replace(/\D/g, "").slice(0, 4))
                    }
                    style={inputStyle}
                    placeholder="123"
                  />
                </div>
              </div>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 13,
                  fontWeight: 600,
                  color: "var(--color-ink2)",
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={saveCard}
                  onChange={(e) => setSaveCard(e.target.checked)}
                  style={{ accentColor: "var(--color-accent)" }}
                />
                Sauvegarder mes informations de paiement
              </label>
            </div>
          )}

          {paymentMethod !== "card" && (
            <div
              style={{
                background: "var(--color-surface)",
                border: "1px solid var(--color-border)",
                borderRadius: 14,
                padding: 24,
                textAlign: "center",
                color: "var(--color-ink3)",
                fontSize: 14,
              }}
            >
              La méthode de paiement{" "}
              <strong>
                {paymentMethod === "paypal" ? "PayPal" : "Espèces"}
              </strong>{" "}
              sera connectée prochainement.
            </div>
          )}

          <button
            onClick={handleConfirm}
            style={{
              padding: "16px 24px",
              borderRadius: 14,
              border: "none",
              background: "var(--color-accent)",
              color: "white",
              fontFamily: "var(--font-body)",
              fontWeight: 700,
              fontSize: 15,
              cursor: "pointer",
              boxShadow: "var(--shadow-accent)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            CONFIRMER LA COMMANDE
            <ChevronRight size={18} />
          </button>
        </div>

        {/* Colonne droite – Résumé + Adresse */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Order Summary */}
          <div
            style={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              borderRadius: 14,
              padding: 20,
            }}
          >
            <h3
              style={{
                fontWeight: 700,
                fontSize: 14,
                color: "var(--color-ink)",
                marginBottom: 16,
              }}
            >
              Résumé de la commande
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {cart.map((item) => (
                <div
                  key={item.product.id + item.selectedColor + item.selectedSize}
                  style={{
                    display: "flex",
                    gap: 12,
                    alignItems: "center",
                    fontSize: 13,
                  }}
                >
                  <img
                    src={item.product.image || PLACEHOLDER_IMG}
                    alt={item.product.title}
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 8,
                      objectFit: "cover",
                    }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontWeight: 600,
                        color: "var(--color-ink)",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {item.product.title}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: "var(--color-ink3)",
                      }}
                    >
                      Qté: {item.quantity} | {item.selectedSize} /{" "}
                      {item.selectedColor}
                    </div>
                  </div>
                  <div
                    style={{
                      fontWeight: 700,
                      color: "var(--color-ink)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {(item.product.price * item.quantity).toFixed(2)}{" "}
                    {currencySymbol}
                  </div>
                </div>
              ))}
            </div>
            <hr
              style={{
                margin: "16px 0",
                border: "none",
                borderTop: "1px solid var(--color-border)",
              }}
            />
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <Row
                label="Sous-total"
                value={cartTotal}
                symbol={currencySymbol}
              />
              <Row
                label="Livraison"
                value={shippingCost}
                symbol={currencySymbol}
              />
              <hr
                style={{
                  margin: "4px 0",
                  border: "none",
                  borderTop: "1px solid var(--color-border)",
                }}
              />
              <Row label="Total" value={total} symbol={currencySymbol} bold />
            </div>
          </div>

          {/* Adresse de livraison */}
          <div
            style={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              borderRadius: 14,
              padding: 20,
            }}
          >
            <h3
              style={{
                fontWeight: 700,
                fontSize: 14,
                color: "var(--color-ink)",
                marginBottom: 12,
              }}
            >
              Adresse de livraison
            </h3>
            <div
              style={{
                fontSize: 13,
                color: "var(--color-ink2)",
                lineHeight: 1.6,
              }}
            >
              <p style={{ fontWeight: 600 }}>{name}</p>
              {reception === "livraison" ? (
                <>
                  <p>{address}</p>
                  <p>
                    {city}, {zip}, {country}
                    {stateCode && ` (${stateCode})`}
                  </p>
                </>
              ) : (
                <p>Retrait sur place</p>
              )}
              <p style={{ marginTop: 4 }}>{phone}</p>
              {email && <p>{email}</p>}
            </div>
          </div>
        </div>
      </div>

      {/* Responsive */}
      <style>{`
        @media (max-width: 768px) {
          .payment-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}

// ── Petits composants internes ─────────────────────────────────────────
function Row({
  label,
  value,
  symbol,
  bold,
}: {
  label: string;
  value: number;
  symbol: string;
  bold?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        fontSize: 13,
        fontWeight: bold ? 700 : 500,
        color: bold ? "var(--color-ink)" : "var(--color-ink2)",
      }}
    >
      <span>{label}</span>
      <span>
        {value.toFixed(2)} {symbol}
      </span>
    </div>
  );
}

// ── Styles partagés ─────────────────────────────────────────────────────
const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px 16px",
  borderRadius: 10,
  border: "1px solid var(--color-border)",
  background: "var(--color-surface2)",
  fontSize: 13.5,
  color: "var(--color-ink)",
  fontFamily: "var(--font-body)",
  outline: "none",
  transition: "border-color 0.2s",
};

const labelStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  color: "var(--color-ink2)",
  display: "block",
  marginBottom: 6,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
};
