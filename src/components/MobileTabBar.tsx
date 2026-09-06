// src/components/MobileTabBar.tsx — V2 port, wired to V1 App
import { Home, LayoutGrid, Heart, ShoppingBag, User, type LucideIcon } from "lucide-react";

export type MobileTab = "home" | "catalog" | "favourites" | "cart" | "account";

export interface MobileTabBarProps {
  active?: MobileTab;
  favouritesCount?: number;
  cartCount?: number;
  onTabChange?: (tab: MobileTab) => void;
}

const TABS: { key: MobileTab; label: string; icon: LucideIcon }[] = [
  { key: "home", label: "Home", icon: Home },
  { key: "catalog", label: "Shop", icon: LayoutGrid },
  { key: "favourites", label: "Wishlist", icon: Heart },
  { key: "cart", label: "Cart", icon: ShoppingBag },
  { key: "account", label: "Account", icon: User },
];

export default function MobileTabBar({ active = "home", favouritesCount = 0, cartCount = 0, onTabChange }: MobileTabBarProps) {
  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 safe-bottom"
      style={{ background: "var(--color-surface)", borderTop: "1px solid var(--color-border)", boxShadow: "var(--shadow-lg)" }}
    >
      <div className="grid grid-cols-5 h-17">
        {TABS.map(({ key, label, icon: Icon }) => {
          const isActive = active === key;
          const count = key === "favourites" ? favouritesCount : key === "cart" ? cartCount : 0;
          return (
            <button key={key} onClick={() => onTabChange?.(key)} className="relative flex flex-col items-center justify-center gap-1" aria-label={label} aria-current={isActive ? "page" : undefined}>
              <span className="relative">
                <Icon size={20} strokeWidth={isActive ? 2.4 : 2} style={{ color: isActive ? "var(--color-accent)" : "var(--color-ink3)" }} />
                {count > 0 && (
                  <span className="absolute -top-1.5 -right-2 min-w-4 h-4 px-1 rounded-full text-[10px] font-bold flex items-center justify-center" style={{ background: "var(--color-accent)", color: "#fff" }}>
                    {count}
                  </span>
                )}
              </span>
              <span className="text-[10px] font-semibold" style={{ color: isActive ? "var(--color-accent)" : "var(--color-ink3)" }}>
                {label}
              </span>
              {isActive && <span className="absolute -top-px left-1/2 -translate-x-1/2 w-8 h-[2.5px] rounded-full" style={{ background: "var(--color-accent)" }} />}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
