// src/components/MobileTabBar.tsx
import { Home, LayoutGrid, Package, User, type LucideIcon } from "lucide-react";

export type MobileTab = "home" | "catalog" | "order" | "account";

export interface MobileTabBarProps {
  active?: MobileTab;
  cartCount?: number;
  onTabChange?: (tab: MobileTab) => void;
  onOrderClick?: () => void;
}

const TABS: { key: MobileTab; label: string; icon: LucideIcon }[] = [
  { key: "home", label: "Home", icon: Home },
  { key: "catalog", label: "Catalog", icon: LayoutGrid },
  { key: "order", label: "Track Order", icon: Package },
  { key: "account", label: "Account", icon: User },
];

export default function MobileTabBar({
  active = "home",
  cartCount = 0,
  onTabChange,
  onOrderClick,
}: MobileTabBarProps) {
  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 safe-bottom"
      style={{
        background: "var(--color-surface)",
        borderTop: "1px solid var(--color-border)",
        boxShadow: "var(--shadow-lg)",
      }}
    >
      <div className="grid grid-cols-4 h-17">
        {TABS.map(({ key, label, icon: Icon }) => {
          const isActive = active === key;
          const count = key === "order" ? cartCount : 0;
          return (
            <button
              key={key}
              onClick={() => {
                if (key === "order" && onOrderClick) {
                  onOrderClick();
                } else {
                  onTabChange?.(key);
                }
              }}
              className="relative flex flex-col items-center justify-center gap-1"
              aria-label={label}
              aria-current={isActive ? "page" : undefined}
            >
              <span className="relative">
                <Icon
                  size={20}
                  strokeWidth={isActive ? 2.4 : 2}
                  style={{
                    color: isActive
                      ? "var(--color-accent)"
                      : "var(--color-ink3)",
                  }}
                />
              </span>
              <span
                className="text-[10px] font-semibold"
                style={{
                  color: isActive ? "var(--color-accent)" : "var(--color-ink3)",
                }}
              >
                {label}
              </span>
              {isActive && (
                <span
                  className="absolute -top-px left-1/2 -translate-x-1/2 w-8 h-[2.5px] rounded-full"
                  style={{ background: "var(--color-accent)" }}
                />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
