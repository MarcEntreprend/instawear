// src/components/DealsSection.tsx

import React from "react";
import { Clock } from "lucide-react";
import { Button } from "./ui/Button";
import type { Product } from "../types";
import { PLACEHOLDER_IMG } from "../constants/assets";

interface DealsSectionProps {
  products: Product[];
  countdownString: string;
  dealExpired: boolean;
  currencySymbol: string;
  onSelectEventType: (type: string) => void;
  onSelectProduct: (product: Product) => void;
}

export default function DealsSection({
  products,
  countdownString,
  dealExpired,
  currencySymbol,
  onSelectEventType,
  onSelectProduct,
}: DealsSectionProps) {
  const deals = products.filter((p) => p.dealActive && p.isActive).slice(0, 4);
  if (dealExpired || deals.length === 0) return null;

  return (
    <section className="section-container">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Countdown block */}
        <div
          className="lg:col-span-4 rounded-[28px] p-7 flex flex-col justify-between min-h-70"
          style={{
            background:
              "linear-gradient(160deg, var(--color-indigo-bg), var(--color-surface))",
            border: "1px solid var(--color-border)",
          }}
        >
          <div>
            <span
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase text-white"
              style={{ background: "var(--color-indigo)" }}
            >
              Flash Sale
            </span>
            <h3
              className="font-display font-black text-2xl mt-4 leading-tight"
              style={{ color: "var(--color-ink)" }}
            >
              Grab up to 60% off selected drops
            </h3>
          </div>

          <div
            className="my-5 p-4 rounded-2xl"
            style={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
            }}
          >
            <p
              className="text-[10px] font-bold uppercase tracking-widest mb-2 flex items-center gap-1.5"
              style={{ color: "var(--color-ink3)" }}
            >
              <Clock size={12} /> Offer ends in
            </p>
            <div className="flex items-center gap-1.5">
              {countdownString.split(":").map((unit, i) => (
                <React.Fragment key={i}>
                  <span
                    className="font-mono font-black text-xl px-2.5 py-1 rounded-lg"
                    style={{
                      background: "var(--color-surface2)",
                      color: "var(--color-accent)",
                    }}
                  >
                    {unit}
                  </span>
                  {i < 2 && (
                    <span
                      className="font-black"
                      style={{ color: "var(--color-ink4)" }}
                    >
                      :
                    </span>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          <Button
            variant="cta"
            onClick={() => onSelectEventType("sport")}
            fullWidthOnMobile
          >
            Shop the Drop
          </Button>
        </div>

        {/* Deal grid */}
        <div className="lg:col-span-8 grid grid-cols-2 sm:grid-cols-4 gap-4">
          {deals.map((p) => (
            <button
              key={p.id}
              onClick={() => onSelectProduct(p)}
              className="text-left rounded-2xl overflow-hidden card-lift"
              style={{
                background: "var(--color-surface)",
                border: "1px solid var(--color-border)",
              }}
            >
              <div
                className="aspect-square overflow-hidden"
                style={{ background: "var(--color-surface2)" }}
              >
                <img
                  src={p.image || PLACEHOLDER_IMG}
                  alt={p.title}
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                />
              </div>
              <div className="p-3">
                <p
                  className="text-xs font-bold line-clamp-1"
                  style={{ color: "var(--color-ink)" }}
                >
                  {p.title}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span
                    className="text-sm font-black"
                    style={{ color: "var(--color-accent)" }}
                  >
                    {(p.dealPrice ?? p.price).toFixed(2)} {currencySymbol}
                  </span>
                  <span
                    className="text-[11px] line-through"
                    style={{ color: "var(--color-ink4)" }}
                  >
                    {p.price.toFixed(2)} {currencySymbol}
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
