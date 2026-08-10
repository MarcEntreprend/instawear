// src/components/ReassuranceBar.tsx

import { Truck, ShieldCheck, RefreshCw } from "lucide-react";

const ITEMS = [
  {
    icon: Truck,
    color: "#7c3aed",
    bg: "rgba(124,58,237,.1)",
    ring: "rgba(124,58,237,.18)",
    title: "Free delivery over $35",
    text: "Free tracked shipping on all InstaWear apparel.",
  },
  {
    icon: ShieldCheck,
    color: "var(--color-accent)",
    bg: "var(--color-accent-bg)",
    ring: "rgba(255,92,53,.18)",
    title: "Satisfaction guaranteed",
    text: "Easy returns and hassle-free refunds within 14 days.",
  },
  {
    icon: RefreshCw,
    color: "#059669",
    bg: "rgba(5,150,105,.1)",
    ring: "rgba(5,150,105,.18)",
    title: "Sustainable print-on-demand",
    text: "Zero overproduction. Every piece is printed only after you order.",
  },
];

export default function ReassuranceBar() {
  return (
    <section className="bg-white border-y border-gray-200 py-8 px-4">
      <div className="section-container grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-6 text-sm">
        {ITEMS.map((item, i) => {
          const Icon = item.icon;
          return (
            <div
              key={item.title}
              className={`flex items-center gap-4 ${i > 0 ? "md:pl-6 md:border-l md:border-gray-200" : ""}`}
            >
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
                style={{
                  background: item.bg,
                  border: `1px solid ${item.ring}`,
                }}
              >
                <Icon
                  className="w-5 h-5"
                  strokeWidth={1.75}
                  style={{ color: item.color }}
                />
              </div>
              <div>
                <p className="font-black text-gray-900 text-xs uppercase tracking-wide">
                  {item.title}
                </p>
                <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                  {item.text}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
