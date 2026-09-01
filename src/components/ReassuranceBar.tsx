// src/components/ReassuranceBar.tsx — V2 layout + V1 messaging (EN)
import { Truck, RotateCcw, ShieldCheck, Sparkles } from "lucide-react";

const ITEMS = [
  { icon: Truck, title: "Fast delivery", desc: "Printed within 24h" },
  { icon: RotateCcw, title: "Easy returns", desc: "30 days to change your mind" },
  { icon: ShieldCheck, title: "Secure payment", desc: "End-to-end encryption" },
  { icon: Sparkles, title: "Premium print", desc: "Zero wasted inventory" },
];

export default function ReassuranceBar() {
  return (
    <section style={{ borderTop: "1px solid var(--color-border)", borderBottom: "1px solid var(--color-border)" }}>
      <div className="max-w-350 mx-auto px-4 sm:px-6 py-8 grid grid-cols-2 lg:grid-cols-4 gap-6">
        {ITEMS.map(({ icon: Icon, title, desc }) => (
          <div key={title} className="flex items-center gap-3">
            <span className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0" style={{ background: "var(--color-accent-bg)", color: "var(--color-accent)" }}>
              <Icon size={19} />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-bold truncate" style={{ color: "var(--color-ink)" }}>{title}</p>
              <p className="text-xs truncate" style={{ color: "var(--color-ink3)" }}>{desc}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
