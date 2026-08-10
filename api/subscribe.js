// api/subscribe.js — enregistre l'abonnement push dans Supabase (service key).
export const config = { runtime: "edge" };

function json(data, status) {
  return new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json" } });
}

export default async function handler(req) {
  if (req.method !== "POST") return json({ error: "Méthode non autorisée" }, 405);

  const SUPA_URL = process.env.SUPABASE_URL || "https://cdtabuyomtkfasvugtck.supabase.co";
  const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  if (!SUPA_URL || !SERVICE) return json({ error: "push non configuré" }, 200);

  let body;
  try { body = await req.json(); } catch { return json({ error: "corps invalide" }, 400); }
  const { user_id, subscription } = body || {};
  if (!subscription || !subscription.endpoint) return json({ error: "abonnement manquant" }, 400);

  const row = { user_id: user_id || null, endpoint: subscription.endpoint, subscription };

  try {
    const res = await fetch(`${SUPA_URL}/rest/v1/push_subscriptions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        apikey: SERVICE,
        authorization: `Bearer ${SERVICE}`,
        Prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify(row),
    });
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      return json({ error: "supabase: " + t.slice(0, 160) }, 200);
    }
  } catch (e) {
    return json({ error: "réseau supabase" }, 200);
  }
  return json({ ok: true }, 200);
}
