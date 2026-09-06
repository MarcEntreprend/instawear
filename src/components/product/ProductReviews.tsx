// src/components/product/ProductReviews.tsx — V2 visuals + live Supabase
import { useEffect, useState } from "react";
import { Star, ShieldCheck, ThumbsUp, Send } from "lucide-react";
import { reviewApi } from "../../api/supabaseApi";
import { supabase } from "../../lib/supabaseClient";

export default function ProductReviews({ productId }: { productId: string }) {
  const [reviews, setReviews] = useState<any[]>([]);
  const [avg, setAvg] = useState(0);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(5);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id || null));
    reviewApi.list(productId).then((list) => {
      setReviews(list);
      if (list.length) setAvg(list.reduce((s: number, r: any) => s + r.rating, 0) / list.length);
      setLoading(false);
    });
  }, [productId]);

  const breakdown = [5, 4, 3, 2, 1].map((star) => {
    const count = reviews.filter((r) => r.rating === star).length;
    const percent = reviews.length ? Math.round((count / reviews.length) * 100) : 0;
    return { star, count, percent };
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) { alert("Connectez-vous pour laisser un avis"); return; }
    if (!body.trim() && !title.trim()) return;
    setSending(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const customerName = userData.user?.user_metadata?.full_name || userData.user?.email || "Anonymous";
      await reviewApi.create({ productId, customerId: userId, customerName, rating, title: title.trim() || undefined, body: body.trim() || undefined });
      const list = await reviewApi.list(productId);
      setReviews(list);
      setAvg(list.reduce((s: number, r: any) => s + r.rating, 0) / list.length);
      setTitle(""); setBody("");
    } catch (err: any) { alert(err.message || "Erreur"); }
    finally { setSending(false); }
  };

  const toggleHelpful = async (reviewId: string) => {
    if (!userId) { alert("Connectez-vous"); return; }
    await reviewApi.toggleHelpful(reviewId, userId);
    const list = await reviewApi.list(productId);
    setReviews(list);
  };

  if (loading) return <div className="py-8 text-center text-sm" style={{ color: "var(--color-ink3)" }}>Chargement des avis...</div>;

  return (
    <section id="reviews" className="mt-14 scroll-mt-24">
      <p className="eyebrow mb-4">Avis clients</p>
      <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-8 mb-8">
        <div>
          <p className="text-4xl font-extrabold" style={{ color: "var(--color-ink)" }}>{avg ? avg.toFixed(1) : "—"}</p>
          <div className="flex items-center gap-1 my-2">{Array.from({ length: 5 }).map((_, i) => <Star key={i} size={16} fill={i < Math.round(avg) ? "var(--color-gold)" : "none"} style={{ color: "var(--color-gold)" }} />)}</div>
          <p className="text-xs mb-1" style={{ color: "var(--color-ink3)" }}>{reviews.length} avis</p>
          <p className="text-[11px] flex items-center gap-1.5" style={{ color: "var(--color-ink4)" }}><ShieldCheck size={12} /> Réservé aux achats vérifiés</p>
        </div>
        <div className="flex flex-col gap-2 justify-center">
          {breakdown.map(({ star, count, percent }) => (
            <div key={star} className="flex items-center gap-3">
              <span className="text-xs font-semibold w-3" style={{ color: "var(--color-ink2)" }}>{star}</span>
              <Star size={11} fill="var(--color-gold)" style={{ color: "var(--color-gold)" }} />
              <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--color-surface2)" }}><div className="h-full rounded-full" style={{ width: `${percent}%`, background: "var(--color-gold)" }} /></div>
              <span className="text-xs w-8 text-right font-mono-num" style={{ color: "var(--color-ink4)" }}>{count}</span>
            </div>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="card-premium p-5 mb-8">
        <p className="text-sm font-bold mb-3" style={{ color: "var(--color-ink)" }}>Laisser un avis</p>
        <div className="flex items-center gap-1 mb-3">
          {[1, 2, 3, 4, 5].map((s) => (
            <button key={s} type="button" onClick={() => setRating(s)}><Star size={20} fill={s <= rating ? "var(--color-gold)" : "none"} style={{ color: "var(--color-gold)" }} /></button>
          ))}
        </div>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Titre (optionnel)" className="w-full px-3 py-2 rounded-xl text-sm mb-2" style={{ border: "1px solid var(--color-border)", background: "var(--color-surface2)", color: "var(--color-ink)" }} />
        <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Votre avis..." rows={3} className="w-full px-3 py-2 rounded-xl text-sm resize-none" style={{ border: "1px solid var(--color-border)", background: "var(--color-surface2)", color: "var(--color-ink)" }} />
        <button type="submit" disabled={sending} className="btn btn-accent mt-3"><Send size={14} /> {sending ? "Envoi..." : "Publier"}</button>
      </form>

      <div className="flex flex-col gap-5">
        {reviews.slice(0, visibleCount).map((r) => (
          <article key={r.id} className="pb-5" style={{ borderBottom: "1px solid var(--color-border)" }}>
            <div className="flex items-start gap-3 mb-2">
              <span className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm shrink-0" style={{ background: "var(--color-accent-bg)", color: "var(--color-accent)" }}>{r.customerName?.charAt(0) || "?"}</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-bold" style={{ color: "var(--color-ink)" }}>{r.customerName}</p>
                  {r.verified && <span className="flex items-center gap-1 text-[10px] font-bold" style={{ color: "var(--color-success)" }}><ShieldCheck size={11} /> Achat vérifié</span>}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <div className="flex items-center gap-0.5">{Array.from({ length: 5 }).map((_, i) => <Star key={i} size={11} fill={i < r.rating ? "var(--color-gold)" : "none"} style={{ color: "var(--color-gold)" }} />)}</div>
                  <span className="text-[11px]" style={{ color: "var(--color-ink4)" }}>{new Date(r.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}</span>
                </div>
              </div>
            </div>
            {r.title && <p className="text-sm font-bold ml-12 mb-1" style={{ color: "var(--color-ink)" }}>{r.title}</p>}
            <p className="text-sm leading-relaxed ml-12" style={{ color: "var(--color-ink2)" }}>{r.body || r.comment}</p>
            <button onClick={() => toggleHelpful(r.id)} className="ml-12 mt-2 flex items-center gap-1.5 text-xs font-semibold" style={{ color: "var(--color-ink4)" }}><ThumbsUp size={12} /> Utile ({r.helpful})</button>
          </article>
        ))}
      </div>
      {visibleCount < reviews.length && <button onClick={() => setVisibleCount((v) => v + 5)} className="btn btn-secondary mx-auto mt-6">Voir plus d'avis</button>}
      {reviews.length === 0 && <p className="text-sm text-center py-4" style={{ color: "var(--color-ink3)" }}>Pas encore d'avis pour cet article.</p>}
    </section>
  );
}
