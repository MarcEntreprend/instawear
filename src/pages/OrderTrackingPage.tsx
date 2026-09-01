// src/pages/OrderTrackingPage.tsx — V2 visuals + V1 RPC (get_order_tracking)
import { useState, type FormEvent } from "react";
import { ChevronLeft, Search, PackageSearch, Truck, ExternalLink } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import CopyID from "../components/CopyID";
import OrderStatusStepper from "../components/OrderStatusStepper";

export default function OrderTrackingPage({ initialCode = "", onBack }: { initialCode?: string; onBack: () => void }) {
  const [code, setCode] = useState(initialCode);
  const [result, setResult] = useState<any | null | "not-found">(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = code.trim();
    if (!trimmed) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("get_order_tracking", { order_code: trimmed });
      if (error || !data || (Array.isArray(data) && data.length === 0)) setResult("not-found");
      else setResult(Array.isArray(data) ? data[0] : data);
    } catch {
      setResult("not-found");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[var(--color-bg)] animate-fade-in">
      <div className="max-w-175 mx-auto px-4 sm:px-6 pt-5 pb-2 flex items-center gap-2">
        <button onClick={onBack} aria-label="Retour" className="btn-icon w-8 h-8"><ChevronLeft size={15} /></button>
        <span className="text-xs" style={{ color: "var(--color-ink3)" }}>InstaWear / Suivi de commande</span>
      </div>
      <div className="max-w-175 mx-auto px-4 sm:px-6 py-10">
        <div className="text-center mb-8">
          <span className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: "var(--color-accent-bg)", color: "var(--color-accent)" }}><PackageSearch size={24} /></span>
          <h1 className="text-2xl font-extrabold mb-2" style={{ color: "var(--color-ink)" }}>Suivre ma commande</h1>
          <p className="text-sm" style={{ color: "var(--color-ink3)" }}>Entrez le numéro de commande reçu par email, au format ORD-2026-XXXXXX.</p>
        </div>
        <form onSubmit={handleSubmit} className="flex items-center gap-2 mb-10 max-w-md mx-auto">
          <div className="flex items-center flex-1 rounded-full px-4 h-12" style={{ background: "var(--color-surface2)", border: "1px solid var(--color-border)" }}>
            <Search size={16} style={{ color: "var(--color-ink3)" }} />
            <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="ORD-2026-XXXXXX" className="flex-1 bg-transparent outline-none px-3 text-sm font-mono-num" style={{ color: "var(--color-ink)" }} />
          </div>
          <button type="submit" disabled={loading} className="btn btn-accent shrink-0">{loading ? "..." : "Suivre"}</button>
        </form>
        {result === "not-found" && <div className="text-center py-8"><p className="text-sm font-semibold" style={{ color: "var(--color-negative)" }}>Aucune commande ne correspond à ce numéro.</p></div>}
        {result && result !== "not-found" && (
          <div className="card-premium p-6 animate-fade-up max-w-md mx-auto">
            <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
              <div>
                <div className="flex items-center gap-2 mb-1"><p className="text-sm font-bold font-mono-num" style={{ color: "var(--color-ink)" }}>{result.id || result.order_id}</p><CopyID id={result.id || result.order_id} /></div>
                <p className="text-xs" style={{ color: "var(--color-ink3)" }}>Commandée le {result.created_at ? new Date(result.created_at).toLocaleDateString("fr-FR") : ""}</p>
              </div>
            </div>
            {result.status && <div className="mb-6"><OrderStatusStepper status={result.status} /></div>}
            {result.tracking_info?.[0]?.tracking_number && (
              <div className="flex items-center justify-between gap-3 p-3.5 rounded-xl mb-6" style={{ background: "var(--color-surface2)" }}>
                <div className="flex items-center gap-2.5 min-w-0"><Truck size={15} style={{ color: "var(--color-accent)" }} /><div className="min-w-0"><p className="text-xs font-bold truncate" style={{ color: "var(--color-ink)" }}>{result.tracking_info[0].carrier} — {result.tracking_info[0].tracking_number}</p></div></div>
                {result.tracking_info[0].tracking_url && <a href={result.tracking_info[0].tracking_url} target="_blank" rel="noreferrer" className="text-xs font-bold flex items-center gap-1 shrink-0" style={{ color: "var(--color-accent)" }}>Suivre <ExternalLink size={11} /></a>}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
