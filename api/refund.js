// api/refund.js — Edge function pour les demandes de remboursement.
// SECURITE : l'email est derive du JWT Supabase, jamais du corps (anti-usurpation).
export const config = { runtime: "edge" };

const SUPABASE_URL = process.env.SUPABASE_URL || "https://cdtabuyomtkfasvugtck.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || "";

function json(data, status = 200) {
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
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  if (!SUPABASE_KEY) return json({ error: "Cle service manquante" }, 500);

  const user = await getAuthUser(req);
  if (!user || !user.email) return json({ error: "Non authentifie" }, 401);

  let body;
  try { body = await req.json(); } catch { body = {}; }
  const reason = (typeof body.reason === "string" ? body.reason.trim() : "").slice(0, 500) || "Remboursement demande";

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/refund_requests`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_KEY,
        authorization: `Bearer ${SUPABASE_KEY}`,
        "content-type": "application/json",
        prefer: "return=minimal"
      },
      body: JSON.stringify({ email: user.email, reason, status: "pending", created_at: new Date().toISOString() })
    });
    if (!res.ok) return json({ error: "Erreur d'enregistrement" }, 500);
    return json({ success: true, message: "Demande enregistree. Tu recevras un email de confirmation sous 24h." });
  } catch (e) {
    return json({ error: "Erreur serveur" }, 500);
  }
}
