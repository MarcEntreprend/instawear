// src/components/product/SizeGuideModal.tsx — V2 port live
import { useState } from "react";
import { X, Ruler } from "lucide-react";
export default function SizeGuideModal({ isOpen, sizeGuide, onClose }: { isOpen: boolean; sizeGuide?: any; onClose: () => void }) {
  const [unit, setUnit] = useState<"cm" | "in">("cm");
  if (!isOpen) return null;
  const tables = sizeGuide?.size_tables || [];
  const availableSizes: string[] = sizeGuide?.available_sizes || [];
  const mainTable = tables.find((t: any) => t.type === "measure_yourself") || tables.find((t: any) => t.type === "product_measure") || tables[0];
  return (
    <div className="fixed inset-0 z-65">
      <div className="absolute inset-0 animate-fade-in" style={{ background: "rgba(15,13,10,.6)" }} onClick={onClose} />
      <div className="absolute inset-x-0 bottom-0 sm:inset-0 sm:m-auto sm:max-w-lg w-full max-h-[85vh] overflow-y-auto rounded-t-4xl sm:rounded-4xl animate-fade-up" style={{ background: "var(--color-bg)", boxShadow: "var(--shadow-xl)" }}>
        <div className="flex items-center justify-between px-6 h-16" style={{ borderBottom: "1px solid var(--color-border)" }}>
          <span className="text-sm font-bold flex items-center gap-2" style={{ color: "var(--color-ink)" }}><Ruler size={16} /> Size guide</span>
          <button onClick={onClose} aria-label="Close" className="btn-icon w-9 h-9"><X size={16} /></button>
        </div>
        <div className="p-6">
          {mainTable ? (
            <>
              <div className="flex items-center justify-end gap-1 mb-4">{(["cm", "in"] as const).map((u) => <button key={u} onClick={() => setUnit(u)} className="chip" data-active={unit === u}>{u === "cm" ? "Centimeters" : "Inches"}</button>)}</div>
              <div className="overflow-x-auto"><table className="w-full text-sm border-collapse"><thead><tr style={{ borderBottom: "1px solid var(--color-border)" }}><th className="text-left py-2.5 font-bold" style={{ color: "var(--color-ink)" }}>Size</th>{(mainTable.measurements || []).map((m: any) => <th key={m.type_label} className="text-left py-2.5 font-bold" style={{ color: "var(--color-ink)" }}>{m.type_label}</th>)}</tr></thead><tbody>{availableSizes.map((size: string) => <tr key={size} style={{ borderBottom: "1px solid var(--color-border)" }}><td className="py-2.5 font-bold" style={{ color: "var(--color-ink)" }}>{size}</td>{(mainTable.measurements || []).map((m: any) => { const v = m.values?.find((x: any) => x.size === size); const disp = v?.min_value && v?.max_value ? `${v.min_value}-${v.max_value}` : v?.value || "—"; return <td key={m.type_label} className="py-2.5" style={{ color: "var(--color-ink2)" }}>{disp} {m.unit !== "none" ? m.unit : ""}</td>; })}</tr>)}</tbody></table></div>
            </>
          ) : (
            <p className="text-sm" style={{ color: "var(--color-ink2)" }}>Unisex: S(48cm) M(51cm) L(54cm) XL(57cm)</p>
          )}
        </div>
      </div>
    </div>
  );
}
