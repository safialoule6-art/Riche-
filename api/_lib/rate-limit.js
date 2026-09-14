// Best-effort rate limiter for Vercel functions.
// For multi-instance production deployments, replace this with a shared store (Upstash/Redis/etc.).
const buckets = new Map();
const MAX_BUCKETS = 5000;

function keyFor(req, scope) {
  const forwarded = req.headers.get("x-forwarded-for") || "";
  const ip = forwarded.split(",")[0].trim() || req.headers.get("x-real-ip") || "unknown";
  return `${scope}:${ip}`;
}

export function rateLimit(req, scope, limit, windowMs) {
  const now = Date.now();
  const key = keyFor(req, scope);
  let bucket = buckets.get(key);
  if (!bucket || now >= bucket.resetAt) bucket = { count: 0, resetAt: now + windowMs };
  bucket.count += 1;
  buckets.set(key, bucket);

  if (buckets.size > MAX_BUCKETS) {
    for (const [k, v] of buckets) {
      if (v.resetAt <= now) buckets.delete(k);
      if (buckets.size <= MAX_BUCKETS) break;
    }
  }

  return {
    allowed: bucket.count <= limit,
    remaining: Math.max(0, limit - bucket.count),
    retryAfter: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
  };
}

export function rateLimitResponse(result) {
  return new Response(JSON.stringify({ error: "rate_limit", retryAfter: result.retryAfter }), {
    status: 429,
    headers: {
      "content-type": "application/json",
      "retry-after": String(result.retryAfter),
      "x-ratelimit-remaining": String(result.remaining),
    },
  });
}
