// src/components/DealsSection.tsx — V2 4 blocks + V1 live data
import { ArrowRight, Truck, Percent, Gift } from "lucide-react";
import type { Product } from "../types";
import StoreProductCard from "./StoreProductCard";
import { EVENT_TYPES, PRODUCT_CATEGORIES } from "../data/categories";

interface DealsSectionProps {
  dealExpired: boolean;
  dealFadingOut: boolean;
  countdownString: string;
  currencySymbol: string;
  products: Product[];
  favorites?: string[];
  onSelectEventType: (type: string | null) => void;
  onSelectCategory?: (cat: string | null) => void;
  onSelectProduct: (product: Product) => void;
  onToggleFavorite?: (id: string) => void;
  onAddToCart?: (product: Product, color: string, size: string) => void;
}

export default function DealsSection({
  dealExpired,
  dealFadingOut,
  countdownString,
  currencySymbol,
  products,
  favorites = [],
  onSelectEventType,
  onSelectCategory,
  onSelectProduct,
  onToggleFavorite,
  onAddToCart,
}: DealsSectionProps) {
  const newArrivals = [...products]
    .filter((p) => p.isActive)
    .sort((a, b) => (b.isLimitedTime ? 1 : 0) - (a.isLimitedTime ? 1 : 0))
    .slice(0, 8);
  const handleSelectCategory = (
    eventType: string | null,
    category: string | null,
  ) => {
    if (eventType) onSelectEventType(eventType);
    if (category && onSelectCategory) onSelectCategory(category);
    if (!eventType && !category) onSelectEventType(null);
    document
      .getElementById("section-catalog")
      ?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <>
      {/* Magasinez par événement */}
      <section
        id="section-occasion"
        className="max-w-350 mx-auto px-4 sm:px-6 py-14 sm:py-20"
      >
        <div className="flex items-end justify-between mb-8">
          <div>
            <span className="eyebrow mb-2 block">By occasion</span>
            <h2
              className="text-2xl sm:text-3xl font-extrabold"
              style={{ color: "var(--color-ink)" }}
            >
              Shop by event
            </h2>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          {EVENT_TYPES.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() => onSelectCategory?.(value)}
              className="card-premium flex flex-col items-center gap-3 py-7 px-4"
            >
              <span
                className="w-12 h-12 rounded-2xl flex items-center justify-center"
                style={{
                  background: "var(--color-accent-bg)",
                  color: "var(--color-accent)",
                }}
              >
                <Icon size={22} />
              </span>
              <span
                className="text-sm font-bold"
                style={{ color: "var(--color-ink)" }}
              >
                {label}
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className="max-w-350 mx-auto px-4 sm:px-6 py-6 sm:py-10">
        <div className="flex items-end justify-between mb-8">
          <div>
            <span className="eyebrow mb-2 block">Freshly printed</span>
            <h2
              className="text-2xl sm:text-3xl font-extrabold"
              style={{ color: "var(--color-ink)" }}
            >
              New arrivals
            </h2>
          </div>
          <button
            onClick={() => handleSelectCategory(null, null)}
            className="hidden sm:flex btn btn-ghost"
          >
            View all <ArrowRight size={15} />
          </button>
        </div>
        <div className="flex sm:grid sm:grid-cols-4 gap-4 sm:gap-6 overflow-x-auto no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
          {newArrivals.map((product) => (
            <div
              key={product.id}
              className="w-[72vw] sm:w-auto shrink-0 sm:shrink"
            >
              <StoreProductCard
                product={product}
                isFavorite={favorites.includes(product.id)}
                dealExpired={dealExpired}
                dealFadingOut={dealFadingOut}
                countdownStr={countdownString}
                currencySymbol={currencySymbol}
                onToggleFavorite={(id) => onToggleFavorite?.(id)}
                onAddToCart={(p, c, s) => onAddToCart?.(p, c, s)}
                onSelectProduct={onSelectProduct}
              />
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-350 mx-auto px-4 sm:px-6 py-6 sm:py-10">
        <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-5">
          <div
            className="relative overflow-hidden rounded-4xl p-8 sm:p-10 min-h-70 flex flex-col justify-between"
            style={{
              background:
                "linear-gradient(135deg, var(--color-ink) 0%, #241a12 100%)",
            }}
          >
            <span className="eyebrow" style={{ color: "var(--color-accent2)" }}>
              Delivery everywhere
            </span>
            <div>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-white mb-2 max-w-[16ch]">
                Your style, delivered. Online exclusive.
              </h3>
              <p
                className="text-sm mb-5"
                style={{ color: "rgba(255,255,255,.7)" }}
              >
                Ships within 48h across France, Belgium, Switzerland and Canada.
              </p>
              <button
                onClick={() => handleSelectCategory(null, null)}
                className="btn btn-accent"
              >
                Order now
              </button>
            </div>
          </div>
          <div className="grid grid-rows-2 gap-5">
            <PromoTile
              eyebrow="Timeless elegance"
              title="Discover the Accessories collection"
              icon={Gift}
              onClick={() => handleSelectCategory(null, "accessory")}
            />
            <PromoTile
              eyebrow="Find your pair"
              title="Explore the Sports collection"
              icon={Truck}
              onClick={() => handleSelectCategory("sport", null)}
            />
          </div>
        </div>
      </section>

      <section className="max-w-350 mx-auto px-4 sm:px-6 py-6 sm:py-10">
        <div className="flex items-end justify-between mb-8">
          <h2
            className="text-2xl sm:text-3xl font-extrabold"
            style={{ color: "var(--color-ink)" }}
          >
            Featured offers
          </h2>
          <button
            onClick={() => handleSelectCategory(null, null)}
            className="hidden sm:flex btn btn-ghost"
          >
            All deals <ArrowRight size={15} />
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div
            className="rounded-4xl p-8 sm:p-10 min-h-55 flex flex-col justify-between"
            style={{
              background:
                "linear-gradient(135deg, var(--color-accent) 0%, var(--color-accent2) 100%)",
            }}
          >
            <span
              className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider"
              style={{ color: "rgba(255,255,255,.85)" }}
            >
              <Percent size={14} /> Exclusive offers
            </span>
            <div>
              <h3 className="text-xl sm:text-2xl font-extrabold text-white mb-4 max-w-[20ch]">
                Enjoy our latest event fashion finds
              </h3>
              <button
                onClick={() => handleSelectCategory(null, null)}
                className="btn"
                style={{ background: "#fff", color: "var(--color-accent)" }}
              >
                Shop now
              </button>
            </div>
          </div>
          <div
            className="rounded-4xl p-8 sm:p-10 min-h-55 flex flex-col justify-between"
            style={{
              background: "var(--color-surface2)",
              border: "1px solid var(--color-border)",
            }}
          >
            <span className="eyebrow">Welcome</span>
            <div>
              <h3
                className="text-xl sm:text-2xl font-extrabold mb-2"
                style={{ color: "var(--color-ink)" }}
              >
                An offer just for you
              </h3>
              <p
                className="text-sm mb-4"
                style={{ color: "var(--color-ink3)" }}
              >
                Enjoy a special discount on your first order.
              </p>
              <button
                onClick={() => handleSelectCategory(null, null)}
                className="btn btn-primary"
              >
                Get discount
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-350 mx-auto px-4 sm:px-6 py-6 sm:py-10">
        <div className="flex items-end justify-between mb-8">
          <span className="eyebrow">By product type</span>
        </div>
        <div className="flex gap-3 overflow-x-auto no-scrollbar">
          {PRODUCT_CATEGORIES.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() => handleSelectCategory(null, value)}
              className="chip shrink-0"
            >
              <Icon size={15} /> {label}
            </button>
          ))}
        </div>
      </section>
    </>
  );
}
function PromoTile({
  eyebrow,
  title,
  icon: Icon,
  onClick,
}: {
  eyebrow: string;
  title: string;
  icon: typeof Gift;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="text-left rounded-4xl p-6 flex items-center justify-between gap-4"
      style={{
        background: "var(--color-surface2)",
        border: "1px solid var(--color-border)",
      }}
    >
      <div>
        <span className="text-xs" style={{ color: "var(--color-ink3)" }}>
          {eyebrow}
        </span>
        <p
          className="text-base font-bold mt-1 max-w-[16ch]"
          style={{ color: "var(--color-ink)" }}
        >
          {title}
        </p>
        <span
          className="inline-flex items-center gap-1 text-xs font-bold mt-3"
          style={{ color: "var(--color-accent)" }}
        >
          See more <ArrowRight size={12} />
        </span>
      </div>
      <span
        className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
        style={{
          background: "var(--color-accent-bg)",
          color: "var(--color-accent)",
        }}
      >
        <Icon size={20} />
      </span>
    </button>
  );
}
