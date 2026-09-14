// api/subscribe.js — enregistre l'abonnement push (service key).
// SECURITE : user_id derive du JWT Supabase, jamais du corps.
export const config = { runtime: "edge" };

const SUPABASE_URL = process.env.SUPABASE_URL || "https://cdtabuyomtkfasvugtck.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || "";

const WINDOW_MS = 60 * 60 * 1000;
const buckets = new Map();
function limited(key, limit = 10) {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || now - b.start >= WINDOW_MS) { buckets.set(key, { start: now, count: 1 }); return false; }
  b.count += 1;
  return b.count > limit;
}

function json(data, status) {
  return new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json" } });
}

// Verifie le JWT Supabase (header Authorization) et renvoie l'utilisateur, ou null.
async function getAuthUser(req) {
  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token || !SUPABASE_KEY) return null;
  try {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: SUPABASE_KEY, authorization: `Bearer ${token}` },
    });
    if (!r.ok) return null;
    const u = await r.json();
    return u && u.id ? u : null;
  } catch (e) { return null; }
}

export default async function handler(req) {
  if (req.method !== "POST") return json({ error: "Methode non autorisee" }, 405);
  if (!SUPABASE_KEY) return json({ error: "push non configure" }, 200);

  const user = await getAuthUser(req);
  if (!user) return json({ error: "Non authentifie" }, 401);
  if (limited(user.id)) return json({ error: "Trop de requetes" }, 429);

  let body;
  try { body = await req.json(); } catch { return json({ error: "corps invalide" }, 400); }
  const { subscription } = body || {};
  if (!subscription || typeof subscription !== "object" || typeof subscription.endpoint !== "string") return json({ error: "abonnement manquant" }, 400);
  if (subscription.endpoint.length > 2048) return json({ error: "endpoint invalide" }, 400);
  if (JSON.stringify(subscription).length > 12000) return json({ error: "abonnement trop volumineux" }, 413);

  const row = { user_id: user.id, endpoint: subscription.endpoint, subscription };

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/push_subscriptions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        apikey: SUPABASE_KEY,
        authorization: `Bearer ${SUPABASE_KEY}`,
        Prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify(row),
    });
    if (!res.ok) return json({ error: "enregistrement impossible" }, 200);
  } catch (e) {
    return json({ error: "reseau supabase" }, 200);
  }
  return json({ ok: true }, 200);
}
