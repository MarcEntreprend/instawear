// supabase/functions/admin-order-notify/_shared/rateLimit.ts
// Copie locale (le bundler n'inclut que le dossier de la fonction).
// Miroir de supabase/functions/_shared/rateLimit.ts + quota admin-order-notify.

const buckets = new Map<string, { count: number; resetAt: number }>();

export interface Quota { max: number; windowMs: number; }

export function quotaFor(path: string): Quota {
  switch (path) {
    case "admin-order-notify": return { max: 10, windowMs: 60_000 };
    default: return { max: 20, windowMs: 60_000 };
  }
}

function getClientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}

export function rateLimitKey(req: Request, path: string): string {
  const user = req.headers.get("x-user-id") || "";
  return `${path}:${getClientIp(req)}:${user}`;
}

export async function isRateLimited(req: Request, key: string, store?: Map<string, { count: number; resetAt: number }>): Promise<boolean> {
  const path = key.split(":")[0] as string;
  const { max, windowMs } = quotaFor(path);
  const bucket = store ?? buckets;
  const now = Date.now();
  const entry = bucket.get(key);
  if (!entry || now > entry.resetAt) {
    bucket.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }
  entry.count += 1;
  return entry.count > max;
}
