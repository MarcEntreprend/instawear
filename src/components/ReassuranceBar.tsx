// src/components/ReassuranceBar.tsx

import React from "react";
import { Truck, ShieldCheck, Leaf } from "lucide-react";

const ITEMS = [
  {
    icon: Truck,
    title: "Free Delivery over $35",
    sub: "Tracked shipping on every order.",
    color: "var(--color-indigo)",
    bg: "var(--color-indigo-bg)",
  },
  {
    icon: ShieldCheck,
    title: "Satisfaction Guaranteed",
    sub: "Easy returns within 14 days.",
    color: "var(--color-accent)",
    bg: "var(--color-accent-bg)",
  },
  {
    icon: Leaf,
    title: "Sustainable by Design",
    sub: "Zero overproduction, ever.",
    color: "var(--color-success)",
    bg: "var(--color-success-bg)",
  },
];

export default function ReassuranceBar() {
  return (
    <section className="section-container">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {ITEMS.map(({ icon: Icon, title, sub, color, bg }) => (
          <div
            key={title}
            className="flex items-center gap-4 p-5 rounded-2xl"
            style={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
            }}
          >
            <span
              className="w-11 h-11 rounded-full flex items-center justify-center shrink-0"
              style={{ background: bg }}
            >
              <Icon size={19} style={{ color }} />
            </span>
            <div>
              <p
                className="text-sm font-black"
                style={{ color: "var(--color-ink)" }}
              >
                {title}
              </p>
              <p
                className="text-xs mt-0.5"
                style={{ color: "var(--color-ink3)" }}
              >
                {sub}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
