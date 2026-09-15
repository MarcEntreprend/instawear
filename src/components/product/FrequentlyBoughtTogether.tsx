// src/components/product/FrequentlyBoughtTogether.tsx — V2 port live (orders-based)
import { useEffect, useState } from "react";
import { Check, ShoppingBag } from "lucide-react";
import type { Product } from "../../types";
import { imageKitUrl } from "../../lib/imagekit";
import { PLACEHOLDER_IMG } from "../../constants/assets";
import { formatAmount } from "../../data/currency";

export interface BundleItem {
  product: Product;
  color?: string;
  size?: string;
}

export interface BundleResult {
  addedIds: string[];
  blockedCount: number;
}

// Persistance locale de l'état Added, par produit (la page produit se
// démonte à la fermeture → l'état React seul ne survit pas à
// home → retour produit). Cache opaque : ids + compteur + horodatage,
// TTL 7 jours, ids revalidés contre le catalogue courant (produits qui
// vont et viennent). Réarmé par toggle / changement de produit.
// Limite connue : si le panier est vidé ailleurs, l'affichage reste
// "Added" jusqu'au prochain toggle (le toggle réarme toujours).
const FBT_CACHE_PREFIX = "instawear:fbt:";
const FBT_CACHE_TTL_MS = 7 * 24 * 3600 * 1000;
function readFbtCache(
  mainId: string,
  addonIds: Set<string>,
): { checked: string[]; added: string[]; count: number } | null {
  try {
    const raw = localStorage.getItem(FBT_CACHE_PREFIX + mainId);
    if (!raw) return null;
    const c = JSON.parse(raw) as {
      checked?: string[];
      added?: string[];
      count?: number;
      ts?: number;
    };
    if (!c || typeof c.ts !== "number") return null;
    if (Date.now() - c.ts > FBT_CACHE_TTL_MS) return null;
    const added = (Array.isArray(c.added) ? c.added : []).filter(
      (id) => id === mainId || addonIds.has(id),
    );
    if (added.length === 0) return null;
    return {
      checked: (Array.isArray(c.checked) ? c.checked : []).filter((id) =>
        addonIds.has(id),
      ),
      added,
      count: typeof c.count === "number" ? c.count : added.length,
    };
  } catch {
    return null;
  }
}
function writeFbtCache(
  mainId: string,
  checked: string[],
  added: string[],
  count: number,
) {
  try {
    localStorage.setItem(
      FBT_CACHE_PREFIX + mainId,
      JSON.stringify({ checked, added, count, ts: Date.now() }),
    );
  } catch {
    /* stockage indisponible (navigation privée) : pas de persistance, pas d'erreur */
  }
}
function clearFbtCache(mainId: string) {
  try {
    localStorage.removeItem(FBT_CACHE_PREFIX + mainId);
  } catch {
    /* ignore */
  }
}

export default function FrequentlyBoughtTogether({
  mainProduct,
  mainImage,
  mainUnitPrice,
  mainCanAdd,
  mainColor,
  mainSize,
  addOns,
  onAddMain,
  onAddBundle,
  onQuickAddProduct,
  currencySymbol,
}: {
  mainProduct: Product;
  mainImage: string;
  mainUnitPrice: number;
  mainCanAdd: boolean;
  /** Symbole issu des settings boutique (via ProductPage) : jamais de devise en dur. */
  currencySymbol: string;
  mainColor?: string;
  mainSize?: string;
  addOns: Product[];
  onAddMain: () => void;
  onAddBundle?: (items: BundleItem[]) => BundleResult;
  onQuickAddProduct: (p: Product) => void;
}) {
  const [checkedIds, setCheckedIds] = useState<Set<string>>(
    () => new Set(addOns.map((p) => p.id)),
  );
  const [justAdded, setJustAdded] = useState(false);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const [addedCount, setAddedCount] = useState(0);
  // L'état Added appartient à (produit, sélection) : restauration du cache
  // à chaque produit (le composant est réutilisé sans remount entre produits
  // ET remonté à neuf après home → retour : l'effet couvre les deux cas).
  // Sans cache : reset neutre (jamais de "Added" hérité d'un autre produit).
  const mainId = mainProduct.id;
  useEffect(() => {
    const addonIds = new Set(addOns.map((p) => p.id));
    const cached = readFbtCache(mainId, addonIds);
    if (cached) {
      setCheckedIds(new Set(cached.checked));
      setAddedIds(new Set(cached.added));
      setAddedCount(cached.count);
      setJustAdded(true);
    } else {
      setCheckedIds(new Set(addOns.map((p) => p.id)));
      setJustAdded(false);
      setAddedIds(new Set());
      setAddedCount(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mainId]);
  if (addOns.length === 0) return null;
  const toggle = (id: string) => {
    // Nouvelle interaction sur la sélection → l'état Added précédent est
    // caduc : retour à "Add selection" (réarme l'ajout), cache effacé.
    setJustAdded(false);
    setAddedIds(new Set());
    setAddedCount(0);
    clearFbtCache(mainId);
    setCheckedIds((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };
  const checked = addOns.filter((p) => checkedIds.has(p.id));
  const total = mainUnitPrice + checked.reduce((s, p) => s + p.price, 0);
  const handleAdd = () => {
    let added: string[];
    let count: number;
    if (onAddBundle) {
      const bundle: BundleItem[] = [
        ...(mainCanAdd
          ? [{ product: mainProduct, color: mainColor, size: mainSize }]
          : []),
        ...checked.map((p) => ({ product: p })),
      ];
      const res = onAddBundle(bundle);
      added = res.addedIds;
      count = res.addedIds.length;
    } else {
      if (mainCanAdd) onAddMain();
      checked.forEach((p) => onQuickAddProduct(p));
      added = [mainProduct.id, ...checked.map((p) => p.id)];
      count = (mainCanAdd ? 1 : 0) + checked.length;
    }
    const checkedNow = checked.map((p) => p.id);
    setAddedIds(new Set(added));
    setAddedCount(count);
    setJustAdded(true);
    writeFbtCache(mainProduct.id, checkedNow, added, count);
    // Persistant : ne revient à "Add selection" que sur nouvelle interaction
    // (toggle ci-dessus) ou changement de produit (effet ci-dessus). Plus de
    // timeout de 2,5 s.
  };
  const badgeStyle = (id: string) =>
    justAdded && addedIds.has(id)
      ? {
          background: "var(--color-success)",
          border: "1px solid var(--color-success)",
        }
      : checkedIds.has(id)
        ? {
            background: "var(--color-accent)",
            border: "1px solid var(--color-border)",
          }
        : {
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
          };
  return (
    <section className="mt-14">
      <p className="eyebrow mb-4">Frequently bought together</p>
      <div className="card-premium p-5 sm:p-6 overflow-visible">
        {/* Ajout de overflow-y-visible pour ne pas couper les badges qui dépassent verticalement */}
        <div className="flex items-center gap-3 sm:gap-4 overflow-x-auto overflow-y-visible no-scrollbar pb-4 pt-3">
          <div className="flex flex-col items-center gap-2 shrink-0 group">
            <div className="bezel-outer overflow-hidden rounded-xl">
              <div className="bezel-inner w-20 h-20 sm:w-24 sm:h-24 overflow-hidden">
                <img
                  src={
                    imageKitUrl(mainImage, {
                      width: 192,
                      quality: 80,
                      format: "webp",
                    }) || mainImage
                  }
                  alt={mainProduct.title}
                  sizes="96px"
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-110"
                  onError={(e) => {
                    const el = e.currentTarget;
                    if (el.dataset.fbk) return;
                    el.dataset.fbk = "1";
                    el.src = PLACEHOLDER_IMG;
                  }}
                />
              </div>
            </div>
            <span
              className="text-[11px] font-bold text-center max-w-24 truncate"
              style={{ color: "var(--color-ink)" }}
            >
              {mainProduct.title}
            </span>
          </div>
          {addOns.map((a) => (
            <div
              key={a.id}
              className="flex items-center gap-3 sm:gap-4 shrink-0"
            >
              <span
                className="text-xl font-normal shrink-0"
                style={{ color: "var(--color-ink4)" }}
              >
                +
              </span>
              <button
                onClick={() => toggle(a.id)}
                className="flex flex-col items-center gap-2 shrink-0 group"
              >
                <div className="relative">
                  <div
                    className="bezel-outer rounded-xl"
                    style={{ opacity: checkedIds.has(a.id) ? 1 : 0.4 }}
                  >
                    <div className="bezel-inner w-20 h-20 sm:w-24 sm:h-24 overflow-hidden rounded-xl">
                      <img
                        src={
                          imageKitUrl(a.image, {
                            width: 192,
                            quality: 80,
                            format: "webp",
                          }) || a.image
                        }
                        alt={a.title}
                        sizes="96px"
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-110"
                        onError={(e) => {
                          const el = e.currentTarget;
                          if (el.dataset.fbk) return;
                          el.dataset.fbk = "1";
                          el.src = PLACEHOLDER_IMG;
                        }}
                      />
                    </div>
                  </div>
                  <span
                    className="absolute -top-2 -right-2 z-10 w-5 h-5 rounded-full flex items-center justify-center transition-colors shadow-sm"
                    style={badgeStyle(a.id)}
                  >
                    {(checkedIds.has(a.id) ||
                      (justAdded && addedIds.has(a.id))) && (
                      <Check size={11} color="#fff" />
                    )}
                  </span>
                </div>
                <span
                  className="text-[11px] font-semibold text-center max-w-24 truncate"
                  style={{ color: "var(--color-ink2)" }}
                >
                  {a.title}
                </span>
                <span
                  className="text-[11px] font-bold"
                  style={{ color: "var(--color-ink)" }}
                >
                  {formatAmount(a.price, currencySymbol)}
                </span>
              </button>
            </div>
          ))}
        </div>
        <div
          className="flex items-center justify-between gap-4 mt-5 pt-5 flex-wrap"
          style={{ borderTop: "1px solid var(--color-border)" }}
        >
          <p className="text-sm" style={{ color: "var(--color-ink2)" }}>
            Total for {1 + checked.length} item{checked.length > 0 ? "s" : ""}:{" "}
            <span
              className="text-base font-extrabold"
              style={{ color: "var(--color-ink)" }}
            >
              {formatAmount(total, currencySymbol)}
            </span>
          </p>
          <button
            onClick={handleAdd}
            disabled={justAdded}
            className="btn btn-accent disabled:opacity-90"
            style={
              justAdded
                ? { background: "var(--color-success)", boxShadow: "none" }
                : undefined
            }
          >
            {justAdded ? (
              <>
                <Check size={15} /> Added
                {addedCount > 0 ? ` (${addedCount})` : ""}
              </>
            ) : (
              <>
                <ShoppingBag size={15} /> Add selection
              </>
            )}
          </button>
        </div>
        {!mainCanAdd && (
          <p className="text-xs mt-3" style={{ color: "var(--color-ink4)" }}>
            Select a size to include “{mainProduct.title}”.
          </p>
        )}
      </div>
    </section>
  );
}
