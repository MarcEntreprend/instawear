// src/components/CheckoutModal.tsx

import React, { useState, useMemo, useEffect } from "react";
import {
  X,
  Send,
  MessageCircle,
  Calendar,
  Truck,
  Package,
  ArrowRight,
  CheckCircle,
} from "lucide-react";
import type { CartItem } from "../types";
import { useCurrencySymbol } from "../hooks/useCurrencySymbol";
import { orderApi, storeSettingsApi } from "../api/supabaseApi";
import { PLACEHOLDER_IMG, LOGO_URL } from "../constants/assets";
import { supabase } from "../lib/supabaseClient";

interface CheckoutModalProps {
  cart: CartItem[];
  cartTotal: number;
  onClose: () => void;
  onSuccess: () => void; // Called after the order is "sent" (clears cart, shows confirmation)
}

const WHATSAPP_NUMBER = "+50900000000"; // Replace with your WhatsApp number
const TELEGRAM_USERNAME = "marcrubenmacean"; // Replace with your Telegram username or bot
const EMAIL_ADDRESS = "marcrubenmacean@gmail.com"; // Replace with your email

export default function CheckoutModal({
  cart,
  cartTotal,
  onClose,
  onSuccess,
}: CheckoutModalProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [date, setDate] = useState("");
  const [reception, setReception] = useState<"retrait" | "livraison">(
    "livraison",
  );
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [zip, setZip] = useState("");
  const [country, setCountry] = useState("FR");
  const [storeCountry, setStoreCountry] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [stateCode, setStateCode] = useState("");
  const [taxNumber, setTaxNumber] = useState("");
  const [sent, setSent] = useState(false);
  const [orderId, setOrderId] = useState("");

  const currencySymbol = useCurrencySymbol();

  // Livraison offerte si >= 35 € (currency)
  const shippingCost = cartTotal >= 35 ? 0 : 4.99;
  const total = cartTotal + shippingCost;

  // Date minimum = demain
  const minDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split("T")[0];
  }, []);

  // Charger le pays depuis store_settings au montage
  useEffect(() => {
    storeSettingsApi
      .get()
      .then((settings) => {
        const countryFromStore = settings.country || "FR";
        setStoreCountry(countryFromStore);
        setCountry(countryFromStore);
      })
      .catch(() => {});
  }, []);

  const buildOrderText = (orderId: string) => {
    let text = `🛒 *COMMANDE INSTAWEAR*\n\n`;
    text += `🔑 *Réf. commande :* ${orderId}\n`;
    text += `(Gardez cette référence pour suivre votre commande)\n\n`;
    text += `*Client :* ${name}\n`;
    text += `*Téléphone :* ${phone}\n`;
    if (email) text += `*Email :* ${email}\n`;
    if (date) {
      // Convertit YYYY-MM-DD en MM/DD/YYYY
      const [y, m, d] = date.split("-");
      text += `*Date souhaitée :* ${m}/${d}/${y}\n`;
    }
    text += `*Réception :* ${reception === "retrait" ? "Retrait sur place" : "Livraison"}\n`;
    if (reception === "livraison" && address)
      text += `*Adresse :* ${address}\n`;

    text += `\n📦 *Articles :*\n`;
    cart.forEach((item, i) => {
      text += `\n${i + 1}. ${item.product.title}\n`;
      text += `   Couleur: ${item.selectedColor} | Taille: ${item.selectedSize} | Qté: ${item.quantity}\n`;
      const lineTotal = item.product.price * item.quantity;
      text += `   Prix: ${lineTotal.toFixed(2)} ${currencySymbol}\n`;
    });

    text += `\n💰 *Total articles :* ${cartTotal.toFixed(2)} ${currencySymbol}\n`;
    text += `🚚 *Livraison :* ${shippingCost === 0 ? "Gratuite" : `${shippingCost.toFixed(2)} ${currencySymbol}`}\n`;
    text += `🧾 *Montant total :* ${total.toFixed(2)} ${currencySymbol}\n`;

    if (message) text += `\n📝 *Message :* ${message}\n`;
    return text;
  };

  const handleSend = async (channel: "whatsapp" | "telegram" | "email") => {
    if (!name.trim() || !phone.trim()) {
      alert("Veuillez remplir votre nom et votre téléphone.");
      return;
    }

    // 🔍 Détecter l'utilisateur connecté pour lier la commande à son compte
    let clientId: string | null = null;
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user?.email) {
        // Chercher le client par email dans la table customers
        const { data: existingCustomer } = await supabase
          .from("customers")
          .select("id")
          .eq("email", user.email)
          .single();
        if (existingCustomer) {
          clientId = existingCustomer.id;
        } else {
          // Au cas où l'utilisateur n'aurait pas de ligne customers (ne devrait pas arriver)
          const { data: newCustomer } = await supabase
            .from("customers")
            .insert({
              email: user.email,
              name: user.user_metadata?.full_name || name,
            })
            .select("id")
            .single();
          clientId = newCustomer?.id ?? null;
        }
      }
    } catch (e) {
      // En cas d'erreur, on reste en mode invité
      console.warn("Impossible de lier l'utilisateur à la commande", e);
    }

    // Génère un ID de commande unique (ex: ORD-2026-XXXX)
    const now = new Date();
    const year = now.getFullYear();
    const seq = Math.floor(Math.random() * 9000) + 1000;
    const newOrderId = `ORD-${year}-${seq}`;
    setOrderId(newOrderId);

    // Construction du message texte pour WhatsApp/Telegram/Email
    const text = buildOrderText(newOrderId);
    const encoded = encodeURIComponent(text);

    let url = "";
    if (channel === "whatsapp") {
      url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encoded}`;
    } else if (channel === "telegram") {
      url = `https://t.me/${TELEGRAM_USERNAME}?text=${encoded}`;
    } else if (channel === "email") {
      const subject = encodeURIComponent(`Commande ${newOrderId} - InstaWear`);
      url = `mailto:${EMAIL_ADDRESS}?subject=${subject}&body=${encoded}`;
    }

    // Sauvegarde la commande dans Supabase
    try {
      await orderApi.create({
        id: newOrderId,
        clientId: clientId, // null si invité, id du customer si connecté
        clientName: name,
        clientEmail: email || null,
        createdAt: now.toISOString(),
        status: "pending",
        totalAmount: total,
        shippingCost,
        shippingAddress: {
          fullName: name,
          address: reception === "livraison" ? address : "Non renseignée",
          city: reception === "livraison" ? city : "",
          zip: reception === "livraison" ? zip : "",
          country: reception === "livraison" ? country : "FR",
          state_code: reception === "livraison" ? stateCode : "",
          tax_number: reception === "livraison" ? taxNumber : "",
          phone,
        },
        notes: message,
        items: cart.map((item, idx) => ({
          id: `item-${newOrderId}-${idx}`,
          orderId: newOrderId,
          productId: item.product.id,
          productTitle: item.product.title,
          productImage: item.product.image || PLACEHOLDER_IMG,
          selectedColor: item.selectedColor || "#000000",
          selectedSize: item.selectedSize || "M",
          quantity: item.quantity,
          unitPrice: item.product.price,
        })),
      } as any);
    } catch (e: any) {
      console.error("Erreur sauvegarde commande", e);
      alert(
        "Erreur lors de l'enregistrement de la commande : " + (e.message || ""),
      );
      return; // Empêche d'ouvrir le lien et d'afficher la confirmation
    }

    window.open(url, "_blank");

    // Envoyer la commande vers Printful (mode draft, asynchrone)
    import("../api/supabaseApi").then(({ podApi }) => {
      podApi
        .createOrder(newOrderId)
        .then(() => console.log(`[Printful] Commande ${newOrderId} envoyée`))
        .catch((e) => console.warn("[Printful] Erreur envoi commande:", e));
    });

    setSent(true);
    onSuccess();
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "10px 14px",
    borderRadius: 12,
    border: "1.5px solid var(--color-border2)",
    background: "var(--color-surface)",
    fontSize: 13.5,
    color: "var(--color-ink)",
    fontFamily: "var(--font-body)",
    outline: "none",
    transition: "border-color 0.18s, box-shadow 0.18s",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 12,
    fontWeight: 700,
    color: "var(--color-ink2)",
    display: "block",
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: "0.04em",
  };

  const [copied, setCopied] = useState(false);

  if (sent) {
    const handleCopyCode = () => {
      navigator.clipboard.writeText(orderId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    };

    return (
      <div style={overlayStyle}>
        <div
          style={{ ...panelStyle, textAlign: "center", padding: "40px 28px" }}
        >
          <CheckCircle
            size={48}
            style={{ color: "var(--color-success)", marginBottom: 16 }}
          />
          <h3
            style={{
              fontWeight: 700,
              fontSize: 20,
              color: "var(--color-ink)",
              marginBottom: 6,
              letterSpacing: "-0.02em",
            }}
          >
            Commande confirmée !
          </h3>
          <p
            style={{
              fontSize: 13.5,
              color: "var(--color-ink3)",
              lineHeight: 1.6,
              marginBottom: 6,
              maxWidth: 360,
              marginInline: "auto",
            }}
          >
            Votre demande a été envoyée. Nous vous contacterons sous 24h pour
            finaliser le paiement et la livraison.
          </p>
          {email && (
            <p
              style={{
                fontSize: 12,
                color: "var(--color-ink4)",
                marginBottom: 20,
                maxWidth: 360,
                marginInline: "auto",
              }}
            >
              📧 Un récapitulatif a été envoyé à <strong>{email}</strong>.
            </p>
          )}
          {!email && (
            <p
              style={{
                fontSize: 12,
                color: "var(--color-ink4)",
                marginBottom: 20,
                maxWidth: 360,
                marginInline: "auto",
              }}
            >
              ⚠️ Aucun email fourni. Notez bien votre référence ci-dessous.
            </p>
          )}

          {/* Référence de commande avec copie */}
          <div
            style={{
              background: "var(--color-surface2)",
              borderRadius: 16,
              padding: 18,
              marginBottom: 12,
              display: "inline-block",
              minWidth: 260,
            }}
          >
            <p
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: "var(--color-ink3)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                marginBottom: 8,
              }}
            >
              Votre référence de commande
            </p>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
              }}
            >
              <span
                style={{
                  fontFamily: "monospace",
                  fontWeight: 800,
                  fontSize: 24,
                  color: "var(--color-accent)",
                  letterSpacing: "0.06em",
                }}
              >
                {orderId}
              </span>
              <button
                onClick={handleCopyCode}
                title="Copier le code"
                style={{
                  background: copied
                    ? "var(--color-success)"
                    : "var(--color-surface)",
                  border: "1.5px solid var(--color-border2)",
                  borderRadius: 10,
                  padding: "6px 8px",
                  cursor: "pointer",
                  color: copied ? "white" : "var(--color-ink2)",
                  display: "flex",
                  alignItems: "center",
                  transition: "all 0.2s",
                }}
              >
                {copied ? (
                  <CheckCircle size={16} strokeWidth={2.5} />
                ) : (
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                )}
              </button>
            </div>
            {copied && (
              <p
                style={{
                  fontSize: 11,
                  color: "var(--color-success)",
                  marginTop: 6,
                  fontWeight: 600,
                }}
              >
                ✓ Code copié !
              </p>
            )}
          </div>

          {/* Instructions de suivi */}
          <p
            style={{
              fontSize: 12,
              color: "var(--color-ink3)",
              lineHeight: 1.6,
              maxWidth: 380,
              marginInline: "auto",
              marginBottom: 24,
            }}
          >
            Pour suivre votre commande, utilisez ce code dans la section{" "}
            <strong>"Suivi de commande"</strong> sur notre site ou
            communiquez-le à notre service client par WhatsApp ou Telegram.
          </p>

          {/* Bouton de fermeture manuelle */}
          <button
            onClick={onClose}
            style={{
              padding: "12px 32px",
              borderRadius: 14,
              border: "none",
              background: "var(--color-accent)",
              color: "white",
              fontFamily: "var(--font-body)",
              fontWeight: 700,
              fontSize: 14,
              cursor: "pointer",
              boxShadow: "var(--shadow-accent)",
            }}
          >
            Fermer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={overlayStyle}>
      <div style={panelStyle}>
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 20,
          }}
        >
          <h2
            style={{
              fontWeight: 700,
              fontSize: 18,
              color: "var(--color-ink)",
              letterSpacing: "-0.02em",
            }}
          >
            Votre commande
          </h2>
          <button
            onClick={onClose}
            style={{
              background: "var(--color-surface2)",
              border: "1px solid var(--color-border)",
              borderRadius: 8,
              padding: "4px 8px",
              cursor: "pointer",
              color: "var(--color-ink2)",
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Recap */}
        <div
          style={{
            background: "var(--color-surface2)",
            borderRadius: 14,
            padding: 14,
            marginBottom: 20,
            maxHeight: 160,
            overflowY: "auto",
          }}
        >
          <p
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: "var(--color-ink3)",
              textTransform: "uppercase",
              marginBottom: 8,
            }}
          >
            Récapitulatif
          </p>
          {cart.map((item) => (
            <div
              key={item.product.id + item.selectedColor + item.selectedSize}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                justifyContent: "space-between",
                fontSize: 12.5,
                color: "var(--color-ink)",
                marginBottom: 6,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  minWidth: 0,
                }}
              >
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 6,
                    overflow: "hidden",
                    background: "var(--color-surface)",
                    flexShrink: 0,
                  }}
                >
                  <img
                    src={item.product.image || PLACEHOLDER_IMG}
                    alt=""
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                </div>
                <span
                  style={{
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {item.product.title}
                </span>
              </div>
              <span style={{ fontWeight: 700, flexShrink: 0 }}>
                {(item.product.price * item.quantity).toFixed(2)}{" "}
                {currencySymbol}
              </span>
            </div>
          ))}
          <div
            style={{
              borderTop: "1px solid var(--color-border)",
              marginTop: 8,
              paddingTop: 8,
              display: "flex",
              justifyContent: "space-between",
              fontWeight: 700,
              fontSize: 13,
            }}
          >
            <span>Total</span>
            <span>
              {total.toFixed(2)} {currencySymbol}
            </span>
          </div>
        </div>

        {/* Form */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}
          >
            <div>
              <label style={labelStyle}>Nom complet *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={inputStyle}
                placeholder="John Doe"
              />
            </div>
            <div>
              <label style={labelStyle}>Téléphone *</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                style={inputStyle}
                placeholder="+1 (212) 555-1234"
              />
            </div>
          </div>
          <div>
            <label style={labelStyle}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={inputStyle}
              placeholder="johnn@exemple.com"
            />
          </div>
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}
          >
            <div>
              <label style={labelStyle}>
                <Calendar
                  size={12}
                  style={{ marginRight: 4, verticalAlign: "middle" }}
                />
                Date souhaitée
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                style={inputStyle}
                min={minDate}
              />
            </div>
            <div>
              <label style={labelStyle}>Mode de réception</label>
              <select
                value={reception}
                onChange={(e) =>
                  setReception(e.target.value as "livraison" | "retrait")
                }
                style={inputStyle}
              >
                <option value="livraison">Livraison à domicile</option>
                <option value="retrait">Retrait sur place</option>
              </select>
            </div>
          </div>
          {reception === "livraison" && (
            <>
              <div>
                <label style={labelStyle}>Adresse</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  style={inputStyle}
                  placeholder="132 Main Street"
                />
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 14,
                }}
              >
                <div>
                  <label style={labelStyle}>Ville</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    style={inputStyle}
                    placeholder="New York"
                  />
                </div>
                <div>
                  <label style={labelStyle}>Code postal</label>
                  <input
                    type="text"
                    value={zip}
                    onChange={(e) => setZip(e.target.value)}
                    style={inputStyle}
                    placeholder="10001"
                  />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Pays</label>
                <select
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  style={inputStyle}
                >
                  <option value="US">États-Unis</option>
                  <option value="FR">France</option>
                  <option value="BR">Brésil</option>
                  <option value="CA">Canada</option>
                  <option value="GB">Royaume-Uni</option>
                  <option value="CH">Suisse</option>
                  <option value="JP">Japon</option>
                  <option value="BE">Belgique</option>
                </select>
                {/* State code – requis pour BR, US, CA, AU */}
                {(country === "BR" ||
                  country === "US" ||
                  country === "CA" ||
                  country === "AU") && (
                  <div style={{ marginTop: 14 }}>
                    <label style={labelStyle}>
                      {country === "BR"
                        ? "État (State code) *"
                        : "État / Province *"}
                    </label>
                    <input
                      type="text"
                      value={stateCode}
                      onChange={(e) =>
                        setStateCode(e.target.value.toUpperCase())
                      }
                      style={inputStyle}
                      placeholder={country === "BR" ? "SP" : "NY"}
                      maxLength={2}
                      required
                    />
                  </div>
                )}

                {/* CPF/CNPJ – requis pour le Brésil */}
                {country === "BR" && (
                  <div style={{ marginTop: 14 }}>
                    <label style={labelStyle}>CPF ou CNPJ *</label>
                    <input
                      type="text"
                      value={taxNumber}
                      onChange={(e) => setTaxNumber(e.target.value)}
                      style={inputStyle}
                      placeholder="000.000.000-00"
                      required
                    />
                  </div>
                )}
              </div>
            </>
          )}
          <div>
            <label style={labelStyle}>Message (optionnel)</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              style={{ ...inputStyle, minHeight: 60, resize: "vertical" }}
              placeholder="Instructions particulières, personnalisation..."
            />
          </div>
        </div>

        {/* Send buttons */}
        <div style={{ marginTop: 20 }}>
          <p
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: "var(--color-ink3)",
              textTransform: "uppercase",
              marginBottom: 10,
              textAlign: "center",
            }}
          >
            Envoyer votre demande via
          </p>
          <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
            <button
              onClick={() => handleSend("whatsapp")}
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                padding: "12px 16px",
                borderRadius: 12,
                border: "none",
                background: "#25D366",
                color: "white",
                fontWeight: 700,
                fontSize: 13.5,
                cursor: "pointer",
                fontFamily: "var(--font-body)",
              }}
            >
              <MessageCircle size={18} fill="white" />
              WhatsApp
            </button>
            <button
              onClick={() => handleSend("telegram")}
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                padding: "12px 16px",
                borderRadius: 12,
                border: "none",
                background: "#2AABEE",
                color: "white",
                fontWeight: 700,
                fontSize: 13.5,
                cursor: "pointer",
                fontFamily: "var(--font-body)",
              }}
            >
              <Send size={18} />
              Telegram
            </button>
            <button
              onClick={() => handleSend("email")}
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                padding: "12px 16px",
                borderRadius: 12,
                border: "1.5px solid var(--color-border2)",
                background: "var(--color-surface)",
                color: "var(--color-ink)",
                fontWeight: 700,
                fontSize: 13.5,
                cursor: "pointer",
                fontFamily: "var(--font-body)",
              }}
            >
              <Send size={18} />
              Email
            </button>
          </div>
          <p
            style={{
              fontSize: 10.5,
              color: "var(--color-ink4)",
              textAlign: "center",
              marginTop: 12,
              lineHeight: 1.5,
            }}
          >
            En cliquant, vous ouvrirez une conversation avec le récapitulatif de
            votre commande. Nous vous confirmerons le paiement et la livraison
            sous 24h.
          </p>
        </div>
      </div>
    </div>
  );
}

const overlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 200,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "rgba(26,20,10,0.5)",
  backdropFilter: "blur(4px)",
};

const panelStyle: React.CSSProperties = {
  background: "var(--color-surface)",
  borderRadius: 20,
  maxWidth: 560,
  width: "90%",
  maxHeight: "90vh",
  overflowY: "auto",
  padding: 28,
  boxShadow: "var(--shadow-xl)",
};
