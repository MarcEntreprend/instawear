// src/admin/HeroHtmlPanel.tsx — édition du HTML/CSS collé d'un slide (super_admin uniquement).
// Un non super_admin ne voit que le HTML PUBLIÉ, en lecture seule (c'est du contenu public).
import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useState,
} from "react";
import { AlertTriangle, FileUp, Ruler, ShieldCheck } from "lucide-react";
import { heroHtmlApi } from "../api/supabaseApi";
import { formInputStyle } from "./adminStyles";
import { heroPayloadBudget } from "../lib/heroSchema";
import { sanitizeHeroCss } from "../lib/heroCss";
import { sanitizeHeroHtml } from "../lib/heroHtml";

export interface HeroHtmlPanelHandle {
  /** Appelé par le studio APRÈS l'enregistrement du slide. Lève une Error lisible si refus. */
  save: (slideId: string, hasLayer: boolean) => Promise<void>;
}

interface Props {
  slideId: string | null;
  hasLayer: boolean;
  isSuper: boolean;
  isFirst: boolean;
  onLive: (v: { html: string; css: string } | null) => void;
  onDirty: (d: boolean) => void;
  measure: (html: string, css: string, width: number) => Promise<number | null>;
  onRatios: (r: { desktop: number; mobile: number }) => void;
}

const mono: React.CSSProperties = {
  ...formInputStyle,
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
  fontSize: 12,
  minHeight: 150,
  resize: "vertical",
  whiteSpace: "pre",
  overflow: "auto",
};
const small: React.CSSProperties = {
  fontSize: 12,
  color: "var(--color-ink3)",
  margin: 0,
};
const smallBtn: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "7px 12px",
  borderRadius: 10,
  border: "1px solid var(--color-border)",
  background: "var(--color-surface2)",
  color: "var(--color-ink2)",
  fontWeight: 600,
  fontSize: 12,
  cursor: "pointer",
};

const mergeCss = (extracted: string, css: string) =>
  [extracted.trim(), css.trim()].filter(Boolean).join("\n");

const HeroHtmlPanel = forwardRef<HeroHtmlPanelHandle, Props>(
  function HeroHtmlPanel(props, ref) {
    const {
      slideId,
      hasLayer,
      isSuper,
      isFirst,
      onLive,
      onDirty,
      measure,
      onRatios,
    } = props;
    const [html, setHtml] = useState("");
    const [css, setCss] = useState("");
    const [base, setBase] = useState({ html: "", css: "" });
    const [existed, setExisted] = useState(false);
    const [busy, setBusy] = useState(false);
    const [note, setNote] = useState<{ ok: boolean; lines: string[] } | null>(
      null,
    );
    const readOnly = !isSuper;

    // Chargement : super_admin = source (brouillon inclus, garde RLS) ; autres = HTML publié.
    useEffect(() => {
      if (!slideId) return;
      let alive = true;
      (async () => {
        try {
          const row = isSuper
            ? await heroHtmlApi.getForEdit(slideId)
            : ((await heroHtmlApi.getPublished([slideId]))[slideId] ?? null);
          if (!alive) return;
          setExisted(!!row);
          if (row) {
            setHtml(row.html);
            setCss(row.css);
            setBase({ html: row.html, css: row.css });
          }
        } catch (e: any) {
          if (alive)
            setNote({
              ok: false,
              lines: [e?.message || "Lecture impossible."],
            });
        }
      })();
      return () => {
        alive = false;
      };
    }, [slideId, isSuper]);

    // Aperçu live (le rendu applique lui-même le filtre : jamais de contenu brut exécuté).
    useEffect(() => {
      const t = setTimeout(() => onLive(hasLayer ? { html, css } : null), 200);
      return () => clearTimeout(t);
    }, [html, css, hasLayer]);
    useEffect(() => {
      onDirty(!readOnly && (html !== base.html || css !== base.css));
    }, [html, css, base, readOnly]);
    useEffect(
      () => () => {
        onDirty(false);
        onLive(null);
      },
      [],
    );

    const cssCheck = useMemo(() => sanitizeHeroCss(css), [css]);
    const budget = useMemo(() => heroPayloadBudget(html, css), [html, css]);

    useImperativeHandle(
      ref,
      () => ({
        async save(id, hasL) {
          if (!isSuper) return;
          if (!hasL) {
            if (existed) {
              await heroHtmlApi.remove(id);
              setExisted(false);
              setBase({ html: "", css: "" });
            }
            return;
          }
          const r = await sanitizeHeroHtml(html);
          const merged = mergeCss(r.extractedCss, css);
          const c = sanitizeHeroCss(merged);
          if (c.errors.length) throw new Error(`CSS refusé : ${c.errors[0]}`);
          const b = heroPayloadBudget(r.html, c.css);
          if (b.level === "over") {
            throw new Error(
              `HTML + CSS trop lourds (${b.bytes} / ${b.capBytes} octets).`,
            );
          }
          await heroHtmlApi.save(id, r.html, c.css);
          setHtml(r.html);
          setCss(c.css);
          setBase({ html: r.html, css: c.css });
          setExisted(true);
        },
      }),
      [isSuper, html, css, existed],
    );

    const clean = async () => {
      setBusy(true);
      setNote(null);
      try {
        const r = await sanitizeHeroHtml(html);
        const merged = mergeCss(r.extractedCss, css);
        const c = sanitizeHeroCss(merged);
        setHtml(r.html);
        setCss(c.errors.length ? merged : c.css);
        setNote({
          ok: c.errors.length === 0,
          lines: [
            ...c.errors,
            ...r.warnings,
            ...c.warnings,
            ...(c.errors.length ? [] : ["HTML et CSS nettoyés."]),
          ],
        });
      } catch (e: any) {
        setNote({ ok: false, lines: [e?.message || "Nettoyage impossible."] });
      } finally {
        setBusy(false);
      }
    };

    const onFile = async (f: File | undefined) => {
      if (!f) return;
      if (f.size > 400_000) {
        setNote({
          ok: false,
          lines: [
            "Fichier trop volumineux (> 400 Ko) : le plafond est ~50 Ko.",
          ],
        });
        return;
      }
      setHtml(await f.text());
      setNote({
        ok: true,
        lines: ["Fichier chargé. Clique « Nettoyer & vérifier »."],
      });
    };

    const doMeasure = async () => {
      setBusy(true);
      setNote(null);
      try {
        const r = await sanitizeHeroHtml(html);
        const c = sanitizeHeroCss(mergeCss(r.extractedCss, css));
        const useCss = c.errors.length ? "" : c.css;
        const d = await measure(r.html, useCss, 1280);
        const m = await measure(r.html, useCss, 390);
        if (!d || !m) throw new Error("Mesure impossible (aperçu non prêt ?).");
        const ratios = {
          desktop: Math.round((1280 / d) * 100) / 100,
          mobile: Math.round((390 / m) * 100) / 100,
        };
        onRatios(ratios);
        setNote({
          ok: true,
          lines: [
            `Ratio mesuré : desktop ${ratios.desktop}, mobile ${ratios.mobile}. Dimensions passées en mode Auto.`,
          ],
        });
      } catch (e: any) {
        setNote({ ok: false, lines: [e?.message || "Mesure impossible."] });
      } finally {
        setBusy(false);
      }
    };

    if (!hasLayer && !isSuper) return null;

    const pct = Math.min(100, (budget.bytes / budget.capBytes) * 100);
    const color =
      budget.level === "over"
        ? "#ef4444"
        : budget.level === "warn"
          ? "#d97706"
          : "var(--color-success)";

    return (
      <>
        {readOnly && (
          <p style={small}>
            Le HTML collé est réservé aux super-administrateurs. Aperçu en
            lecture seule du HTML publié.
          </p>
        )}
        {isSuper && !hasLayer && (
          <p style={small}>
            Ajoute une couche « HTML collé » (section Couches) pour afficher ce
            contenu.
            {existed
              ? " Le HTML déjà enregistré sera supprimé à l'enregistrement."
              : ""}
          </p>
        )}
        {(hasLayer || existed) && (
          <>
            {isFirst && hasLayer && (
              <p style={{ ...small, color: "#92400e" }}>
                <AlertTriangle size={12} style={{ verticalAlign: "middle" }} />{" "}
                Slide n°1 : le HTML est rendu après le JavaScript, le LCP n'est
                pas garanti. Une image plein cadre en slide n°1 est recommandée.
              </p>
            )}
            <label
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: "var(--color-ink2)",
              }}
            >
              HTML
            </label>
            <textarea
              style={mono}
              value={html}
              readOnly={readOnly}
              spellCheck={false}
              onChange={(e) => setHtml(e.target.value)}
              placeholder="<div class='promo'>…</div>  (les <style> collés sont déplacés dans le champ CSS)"
            />
            <label
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: "var(--color-ink2)",
              }}
            >
              CSS
            </label>
            <textarea
              style={mono}
              value={css}
              readOnly={readOnly}
              spellCheck={false}
              onChange={(e) => setCss(e.target.value)}
              placeholder=".promo{ color: var(--color-ink); }   /* var(--color-*) = thème clair/sombre */"
            />

            <div>
              <div style={{ fontSize: 12, color: "var(--color-ink2)" }}>
                HTML + CSS : <strong>{budget.bytes}</strong> / {budget.capBytes}{" "}
                octets
                {budget.level === "warn" && " — proche du plafond"}
                {budget.level === "over" &&
                  " — trop lourd, enregistrement refusé"}
              </div>
              <div
                style={{
                  height: 6,
                  borderRadius: 99,
                  background: "var(--color-surface2)",
                  marginTop: 6,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${pct}%`,
                    height: "100%",
                    background: color,
                  }}
                />
              </div>
            </div>

            {cssCheck.errors.length > 0 && (
              <div style={{ fontSize: 12, color: "#991b1b" }}>
                {cssCheck.errors.map((m, i) => (
                  <div key={i}>⛔ {m}</div>
                ))}
              </div>
            )}

            {!readOnly && (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button
                  type="button"
                  style={smallBtn}
                  disabled={busy}
                  onClick={clean}
                >
                  <ShieldCheck size={13} /> Nettoyer & vérifier
                </button>
                <label style={{ ...smallBtn, cursor: "pointer" }}>
                  <FileUp size={13} /> Importer un .html
                  <input
                    type="file"
                    accept=".html,.htm,text/html"
                    style={{ display: "none" }}
                    onChange={(e) => {
                      void onFile(e.target.files?.[0]);
                      e.currentTarget.value = "";
                    }}
                  />
                </label>
                <button
                  type="button"
                  style={smallBtn}
                  disabled={busy || !html}
                  onClick={doMeasure}
                >
                  <Ruler size={13} /> Mesurer pour le mode Auto
                </button>
              </div>
            )}

            {note && (
              <div
                style={{
                  fontSize: 12,
                  color: note.ok ? "var(--color-ink2)" : "#991b1b",
                }}
              >
                {note.lines.map((m, i) => (
                  <div key={i}>{m}</div>
                ))}
              </div>
            )}
            <p style={small}>
              Le JavaScript, les formulaires, les iframes et les polices
              externes ne sont pas supportés. Les liens internes « /… »
              fonctionnent ; les boutons d'action se règlent dans « Boutons ».
            </p>
          </>
        )}
      </>
    );
  },
);

export default HeroHtmlPanel;
