// src/admin/emailMarketing/useToast.ts
import { useState, useRef } from "react";

export function useToast() {
  const [toasts, setToasts] = useState<
    { id: number; msg: string; type: "success" | "error" }[]
  >([]);
  const counter = useRef(0);
  const push = (msg: string, type: "success" | "error" = "success") => {
    const id = ++counter.current;
    setToasts((p) => [...p, { id, msg, type }]);
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 3500);
  };
  return { toasts, push };
}
