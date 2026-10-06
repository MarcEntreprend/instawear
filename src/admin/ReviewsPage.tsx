// src/admin/ReviewsPage.tsx — modération des avis clients (lecture + suppression).
// Les clients éditent/suppriment leurs propres avis (RLS owner) ; l'admin
// supprime les abus ici (RLS is_admin, migrations existantes, rien à ajouter).
import { useEffect, useMemo, useState } from "react";
import { Search, Star, ShieldCheck, Trash2, RefreshCw } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { reviewApi } from "../api/supabaseApi";
import AdminBadge from "./ui/AdminBadge";

interface Row {
  id: string;
  product_id: string;
  productTitle: string;
  customer_name: string;
  rating: number;
  title: string | null;
  body: string | null;
  verified: boolean;
  created_at: string;
}

export default function ReviewsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("product_reviews")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      const list = data ?? [];
      const ids = [...new Set(list.map((r: any) => r.product_id))];
      let titles: Record<string, string> = {};
      if (ids.length > 0) {
        const { data: prods } = await supabase
          .from("products")
          .select("id,title")
          .in("id", ids);
        titles = Object.fromEntries(
          (prods ?? []).map((p: any) => [p.id, p.title]),
        );
      }
      setRows(
        list.map((r: any) => ({
          id: r.id,
          product_id: r.product_id,
          productTitle: titles[r.product_id] || r.product_id,
          customer_name: r.customer_name || "?",
          rating: r.rating,
          title: r.title,
          body: r.body ?? r.comment,
          verified: !!r.verified,
          created_at: r.created_at,
        })),
      );
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      `${r.productTitle} ${r.customer_name} ${r.title || ""} ${r.body || ""}`
        .toLowerCase()
        .includes(q),
    );
  }, [rows, query]);

  const remove = async (id: string) => {
    if (!confirm("Supprimer cet avis ?")) return;
    setDeleting(id);
    try {
      await reviewApi.delete(id);
      setRows((prev) => prev.filter((r) => r.id !== id));
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <div
          className="flex items-center gap-2 flex-1 min-w-0 rounded-xl border px-3 py-2"
          style={{
            background: "var(--color-surface)",
            borderColor: "var(--color-border)",
          }}
        >
          <Search
            size={14}
            strokeWidth={1.75}
            style={{ color: "var(--color-ink4)", flexShrink: 0 }}
          />
          <input
            type="text"
            placeholder="Rechercher (produit, auteur, texte)…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent border-none outline-none text-[13px]"
            style={{ color: "var(--color-ink)" }}
          />
        </div>
        <button
          onClick={load}
          aria-label="Recharger"
          className="rounded-xl border p-2"
          style={{
            background: "var(--color-surface)",
            borderColor: "var(--color-border)",
            color: "var(--color-ink2)",
          }}
        >
          <RefreshCw size={14} />
        </button>
      </div>
      {loading ? (
        <p className="text-sm" style={{ color: "var(--color-ink3)" }}>
          Chargement…
        </p>
      ) : visible.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--color-ink3)" }}>
          Aucun avis.
        </p>
      ) : (
        visible.map((r) => (
          <div
            key={r.id}
            className="rounded-2xl border p-4"
            style={{
              background: "var(--color-surface)",
              borderColor: "var(--color-border)",
            }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p
                  className="text-[13px] font-bold truncate"
                  style={{ color: "var(--color-ink)" }}
                >
                  {r.productTitle}{" "}
                  <AdminBadge
                    color={r.verified ? "#065f46" : "var(--color-ink3)"}
                    bg={r.verified ? "#d1fae5" : "var(--color-surface2)"}
                    size="sm"
                  >
                    {r.verified ? "Vérifié" : "Non vérifié"}
                  </AdminBadge>
                </p>
                <p
                  className="text-[11px] mt-0.5"
                  style={{ color: "var(--color-ink4)" }}
                >
                  {r.customer_name} · {r.rating}/5 ·{" "}
                  {new Date(r.created_at).toLocaleDateString()}
                </p>
                {r.title && (
                  <p
                    className="text-[13px] font-semibold mt-1"
                    style={{ color: "var(--color-ink)" }}
                  >
                    {r.title}
                  </p>
                )}
                {r.body && (
                  <p
                    className="text-[12px] mt-0.5 break-words"
                    style={{ color: "var(--color-ink2)" }}
                  >
                    {r.body}
                  </p>
                )}
              </div>
              <button
                onClick={() => remove(r.id)}
                disabled={deleting === r.id}
                className="shrink-0 flex items-center gap-1 text-[11px] font-bold"
                style={{ color: "#ef4444" }}
              >
                <Trash2 size={12} /> Supprimer
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
