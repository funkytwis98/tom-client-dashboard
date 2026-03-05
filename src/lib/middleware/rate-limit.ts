/**
 * In-memory sliding window rate limiter.
 *
 * Keyed by client IP (from x-forwarded-for on Vercel). Tracks request
 * timestamps per IP and prunes expired entries automatically. Resets on cold
 * starts — good enough for MVP to protect against sustained abuse within a
 * warm function instance. Upgrade to Upstash Redis if needed later.
 */

interface RateLimitOptions {
  /** Max requests allowed in the window. */
  limit: number
  /** Window size in milliseconds. */
  windowMs: number
}

interface RateLimitResult {
  success: boolean
  remaining: number
  /** Seconds until the oldest tracked request expires (for Retry-After). */
  retryAfterSeconds: number
}

const store = new Map<string, number[]>()

/** Prune all expired entries every 60 s to prevent memory leaks. */
const CLEANUP_INTERVAL_MS = 60_000
let lastCleanup = Date.now()

function cleanup(windowMs: number): void {
  const now = Date.now()
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return
  lastCleanup = now

  for (const [key, timestamps] of store) {
    const valid = timestamps.filter((t) => now - t < windowMs)
    if (valid.length === 0) {
      store.delete(key)
    } else {
      store.set(key, valid)
    }
  }
}

function getIP(req: Request): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
}

export function rateLimit(req: Request, opts: RateLimitOptions): RateLimitResult {
  const { limit, windowMs } = opts
  const ip = getIP(req)
  const now = Date.now()

  cleanup(windowMs)

  const timestamps = (store.get(ip) ?? []).filter((t) => now - t < windowMs)
  timestamps.push(now)
  store.set(ip, timestamps)

  const remaining = Math.max(0, limit - timestamps.length)
  const oldest = timestamps[0] ?? now
  const retryAfterSeconds = Math.ceil((oldest + windowMs - now) / 1000)

  return {
    success: timestamps.length <= limit,
    remaining,
    retryAfterSeconds,
  }
}

export function rateLimitResponse(result: RateLimitResult): Response {
  return Response.json(
    { error: 'Too many requests' },
    {
      status: 429,
      headers: {
        'Retry-After': String(result.retryAfterSeconds),
      },
    },
  )
}
