// supabase/functions/_shared/safeUrl.ts
// P-D SSRF: allowlist stricte pour tout fetch dont l'URL vient d'input admin ou DB
// - protocol: https uniquement
// - hostname: pas localhost/private/metadata
// - redirect: manual (1 hop max)
// - timeout 5s

const BLOCKED_HOSTNAMES = new Set<string>([
  "localhost", "127.0.0.1", "::1", "0.0.0.0",
  "169.254.169.254", // cloud metadata AWS/GCP/Azure
]);

const BLOCKED_PATTERNS = [
  /^10\./,                  // RFC1918
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^169\./,                  // link-local
  /^fc00:/i,                 // IPv6 ULA
  /^fe80:/i,                 // IPv6 link-local
];

const BLOCKED_PROTOCOLS = new Set<string>([
  "file:", "gopher:", "dict:", "ftp:", "ldap:", "jar:", "data:",
]);

export class SSRFBlockedError extends Error {
  constructor(reason: string) { super(`SSRF blocked: ${reason}`); this.name = "SSRFBlockedError"; }
}

export function assertSafeUrl(rawUrl: unknown): string {
  if (typeof rawUrl !== "string" || !rawUrl) {
    throw new SSRFBlockedError("URL non string ou vide");
  }
  let u: URL;
  try { u = new URL(rawUrl); } catch { throw new SSRFBlockedError("URL invalide"); }
  if (BLOCKED_PROTOCOLS.has(u.protocol)) throw new SSRFBlockedError(`protocol ${u.protocol}`);
  if (u.protocol !== "https:") throw new SSRFBlockedError(`protocol ${u.protocol} non autorisé`);
  const h = u.hostname.toLowerCase();
  if (BLOCKED_HOSTNAMES.has(h)) throw new SSRFBlockedError(`hostname ${h}`);
  for (const re of BLOCKED_PATTERNS) if (re.test(h)) throw new SSRFBlockedError(`hostname IP privée ${h}`);
  // Whitelist explicite des domaines Printful connus
  const ALLOWED_SUFFIXES = [
    "printful.com", "printful-cdn.com", "cdn.printful.com",
    "files.cdn.printful.com", "s3-accelerate.amazonaws.com",
  ];
  if (!ALLOWED_SUFFIXES.some((suf) => h === suf || h.endsWith("." + suf))) {
    throw new SSRFBlockedError(`hostname ${h} non whitelist`);
  }
  return u.toString();
}

export async function safeFetch(rawUrl: unknown, init: RequestInit = {}): Promise<Response> {
  const safe = assertSafeUrl(rawUrl);
  // timeout 5s + redirect manual (1 hop max)
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 5000);
  try {
    const res = await fetch(safe, { ...init, redirect: "manual", signal: ctrl.signal });
    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get("location");
      if (loc) {
        // 1 seule redirection
        const safe2 = assertSafeUrl(loc);
        return await fetch(safe2, { ...init, redirect: "manual", signal: ctrl.signal });
      }
    }
    return res;
  } finally { clearTimeout(t); }
}
