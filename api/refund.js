// api/refund.js — Edge function pour les demandes de remboursement.
// SECURITE : l'email est derive du JWT Supabase, jamais du corps (anti-usurpation).
export const config = { runtime: "edge" };

import { rateLimit, rateLimitResponse } from "./_lib/rate-limit.js";
import { requireAuth } from "./_lib/auth.js";

const SUPABASE_URL = process.env.SUPABASE_URL || "https://cdtabuyomtkfasvugtck.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || "";

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json" } });
}

export default async function handler(req) {
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  const rl = rateLimit(req, "refund", 5, 60 * 60 * 1000);
  if (!rl.allowed) return rateLimitResponse(rl);
  if (!SUPABASE_KEY) return json({ error: "Cle service manquante" }, 500);

  const user = await requireAuth(req);
  if (user instanceof Response) return user;
  if (!user.email) return json({ error: "Email du compte indisponible" }, 400);

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
