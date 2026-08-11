// api/refund.js — Edge function pour les demandes de remboursement
export const config = { runtime: "edge" };

const SUPABASE_URL = process.env.SUPABASE_URL || "https://cdtabuyomtkfasvugtck.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || "";

export default async function handler(req) {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "POST only" }), { status: 405, headers: { "content-type": "application/json" } });
  }

  let body;
  try { body = await req.json(); } catch { body = {}; }
  const { email, reason } = body || {};

  if (!email) {
    return json({ error: "Email requis" }, 400);
  }

  if (!SUPABASE_KEY) {
    return json({ error: "Clé service manquante" }, 500);
  }

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/refund_requests`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_KEY,
        authorization: `Bearer ${SUPABASE_KEY}`,
        "content-type": "application/json",
        prefer: "return=minimal"
      },
      body: JSON.stringify({
        email: email,
        reason: reason || "Remboursement demandé",
        status: "pending",
        created_at: new Date().toISOString()
      })
    });

    if (!res.ok) {
      const err = await res.text();
      return json({ error: "Erreur d'enregistrement: " + err }, 500);
    }

    return json({ success: true, message: "Demande enregistrée. Tu recevras un email de confirmation sous 24h." });
  } catch (e) {
    return json({ error: "Erreur serveur" }, 500);
  }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json" } });
}