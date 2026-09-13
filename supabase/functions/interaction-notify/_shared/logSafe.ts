// supabase/functions/admin-order-notify/_shared/logSafe.ts
// Copie locale (le bundler n'inclut que le dossier de la fonction).
// Miroir de supabase/functions/_shared/logSafe.ts

export function logSafe(input: unknown, max = 300): string {
  if (input == null) return String(input);
  let s: string;
  if (typeof input === "string") s = input;
  else {
    try { s = JSON.stringify(input); } catch { s = String(input); }
  }
  s = s.replace(/(Bearer|Basic)\s+[A-Za-z0-9._\-+/=]+/gi, "$1 ***");
  s = s.replace(/([?&][^&\s"']*?(?:password|api[_-]?key|token|secret|authorization|cvv|cc|card|tax_number))=([^&\s"']*)/gi, "$1=***");
  s = s.replace(/(^|[\s,;{])(password|api[_-]?key|api[_-]?secret|token|secret|authorization|cvv|cc[_-]?number|tax[_-]?number)\s*=\s*([^\s,&}]+)/gi, "$1$2=***");
  s = s.replace(/("|\\b)(password|api[_-]?key|api[_-]?secret|authorization|access[_-]?token|secret|client[_-]?secret|cvv|cc[_-]?number|tax[_-]?number|x-pf-secret|x-webhook-secret)\1\s*:\s*("[^"]*"|'[^']*'|[^\s,}]+)/gi, '$1$2$1: ***');
  s = s.replace(/\b(password|api[_-]?key|api[_-]?secret|authorization|secret|cvv|cc[_-]?number|tax[_-]?number):\s*([^\s,}]+)/gi, "$1: ***");
  return safeTruncate(s, max);
}

export function safeTruncate(s: string, max = 300): string {
  if (s.length <= max) return s;
  return s.slice(0, max) + "...[truncated]";
}
