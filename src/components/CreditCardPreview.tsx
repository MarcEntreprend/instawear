// src/components/CreditCardPreview.tsx — V2 card flip preview, wired to CheckoutFlow
import { CreditCard, Lock } from "lucide-react";

interface Props {
  cardNumber: string; // raw digits
  cardHolder: string;
  cardExpiry: string; // MM/YY
  cardCvv: string;
  isFlipped: boolean; // true when CVC focused
  brand?: string; // visa/mastercard/amex
}

function detectBrand(digits: string): string {
  const d = digits.replace(/\D/g, "");
  if (/^4/.test(d)) return "VISA";
  if (/^5[1-5]/.test(d) || /^2[2-7]/.test(d)) return "MASTERCARD";
  if (/^3[47]/.test(d)) return "AMEX";
  return "";
}

function formatDisplay(digits: string): string {
  const d = digits.replace(/\D/g, "").slice(0, 16);
  const groups: string[] = [];
  for (let i = 0; i < 4; i++) groups.push(d.slice(i * 4, i * 4 + 4).padEnd(4, "•"));
  return groups.join("  ");
}

export default function CreditCardPreview({ cardNumber, cardHolder, cardExpiry, cardCvv, isFlipped }: Props) {
  const brand = detectBrand(cardNumber);
  const displayNumber = formatDisplay(cardNumber);

  return (
    <div className="w-full max-w-sm mx-auto" style={{ perspective: "1000px" }}>
      <div
        className="relative w-full h-48 rounded-2xl transition-transform duration-500"
        style={{ transformStyle: "preserve-3d", transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)" }}
      >
        {/* Front */}
        <div
          className="absolute inset-0 rounded-2xl p-5 flex flex-col justify-between overflow-hidden"
          style={{
            background: "linear-gradient(135deg, #1a1916 0%, #2d2a24 50%, #1a1916 100%)",
            backfaceVisibility: "hidden",
            boxShadow: "var(--shadow-lg)",
            border: "1px solid rgba(255,255,255,.08)",
          }}
        >
          <div className="flex items-center justify-between">
            <CreditCard size={28} style={{ color: "rgba(255,255,255,.6)" }} />
            <span className="text-xs font-black tracking-widest" style={{ color: "rgba(255,255,255,.7)" }}>{brand || "CARD"}</span>
          </div>
          <div className="font-mono-num text-lg tracking-widest font-bold" style={{ color: "#fff", textShadow: "0 1px 2px rgba(0,0,0,.3)" }}>{displayNumber}</div>
          <div className="flex items-end justify-between">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: "rgba(255,255,255,.5)" }}>Card Holder</p>
              <p className="text-xs font-bold uppercase tracking-wide truncate max-w-[140px]" style={{ color: "#fff" }}>{cardHolder || "YOUR NAME"}</p>
            </div>
            <div className="text-right">
              <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: "rgba(255,255,255,.5)" }}>Expires</p>
              <p className="text-xs font-bold font-mono-num" style={{ color: "#fff" }}>{cardExpiry || "MM/YY"}</p>
            </div>
          </div>
          <div className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-10" style={{ background: "radial-gradient(circle, var(--color-accent) 0%, transparent 70%)" }} />
        </div>

        {/* Back */}
        <div
          className="absolute inset-0 rounded-2xl overflow-hidden flex flex-col"
          style={{
            background: "linear-gradient(135deg, #1a1916 0%, #2d2a24 100%)",
            backfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
            boxShadow: "var(--shadow-lg)",
            border: "1px solid rgba(255,255,255,.08)",
          }}
        >
          <div className="h-10 mt-4" style={{ background: "rgba(255,255,255,.12)" }} />
          <div className="flex-1 p-4 flex flex-col justify-center">
            <div className="flex items-center justify-end gap-2">
              <span className="text-[10px] font-bold uppercase" style={{ color: "rgba(255,255,255,.5)" }}>CVC</span>
              <div className="bg-white rounded px-3 py-1.5 font-mono-num text-xs font-bold text-gray-900 min-w-[60px] text-center">{cardCvv.padEnd(3, "•") || "•••"}</div>
            </div>
            <p className="text-[9px] mt-3 flex items-center gap-1" style={{ color: "rgba(255,255,255,.4)" }}><Lock size={10} /> Secured by Stripe</p>
          </div>
        </div>
      </div>
    </div>
  );
}
