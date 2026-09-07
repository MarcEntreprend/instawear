export function getFirstName(name?: string | null, email?: string | null): string {
  const n = (name || "").trim();
  if (n) {
    return n.split(/\s+/)[0];
  }
  const e = (email || "").trim();
  if (e) {
    const at = e.indexOf("@");
    return at > 0 ? e.slice(0, at) : e;
  }
  return "";
}

export function getDisplayName(name?: string | null, email?: string | null, fallback = "Guest"): string {
  const first = getFirstName(name, email);
  if (first) return first;
  if (email && email.trim()) return email.trim();
  return fallback;
}

export function getInitials(name?: string | null, email?: string | null): string {
  const n = (name || "").trim();
  if (n) {
    const parts = n.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return parts[0].slice(0, 2).toUpperCase();
  }
  const e = (email || "").trim();
  if (e) return e.slice(0, 2).toUpperCase();
  return "?";
}
