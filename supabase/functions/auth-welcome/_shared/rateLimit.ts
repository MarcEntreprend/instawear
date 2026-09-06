// supabase/functions/auth-welcome/_shared/rateLimit.ts
// Copie locale (le bundler n'inclut que le dossier de la fonction).
// Miroir de supabase/functions/_shared/rateLimit.ts

const buckets = new Map<string, { count: number; resetAt: number }>();

export interface Quota { max: number; windowMs: number; }

export function quotaFor(path: string): Quota {
  switch (path) {
    case "sync-printful": return { max: 10, windowMs: 60_000 };
    case "create-printful-order": return { max: 5, windowMs: 60_000 };
    case "stripe-checkout": return { max: 5, windowMs: 60_000 };
    case "stripe-webhook": return { max: 60, windowMs: 60_000 };
    case "printful-webhook": return { max: 60, windowMs: 60_000 };
    case "health": return { max: 30, windowMs: 60_000 };
    case "delete-account": return { max: 3, windowMs: 60_000 };
    case "send-email": return { max: 30, windowMs: 60_000 };
    case "contact-message": return { max: 5, windowMs: 60_000 };
    case "auth-welcome": return { max: 3, windowMs: 60_000 };
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
