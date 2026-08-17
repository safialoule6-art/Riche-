// api/referral.js — Edge function pour le systeme de parrainage.
// SECURITE : l'identite est derivee du JWT Supabase (Authorization: Bearer <token>),
// jamais du corps de la requete. La service key contourne la RLS cote serveur.
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

  let body;
  try { body = await req.json(); } catch { body = {}; }
  const { action, referralCode } = body || {};

  // "click" : clic anonyme sur un lien d'affiliation (pas d'auth requise).
  if (action === "click") {
    if (!referralCode) return json({ error: "referralCode requis" }, 400);
    if (!SUPABASE_KEY) return json({ ok: false });
    try {
      const parrainRes = await fetch(`${SUPABASE_URL}/rest/v1/referrals?select=user_id&code=eq.${encodeURIComponent(referralCode)}&limit=1`, {
        headers: { apikey: SUPABASE_KEY, authorization: `Bearer ${SUPABASE_KEY}` }
      });
      const parrains = await parrainRes.json();
      if (!parrains || parrains.length === 0) return json({ ok: false });
      await fetch(`${SUPABASE_URL}/rest/v1/referral_clicks`, {
        method: "POST",
        headers: { apikey: SUPABASE_KEY, authorization: `Bearer ${SUPABASE_KEY}`, "content-type": "application/json", prefer: "return=minimal" },
        body: JSON.stringify({ user_id: parrains[0].user_id, code: referralCode, created_at: new Date().toISOString() })
      });
      return json({ ok: true });
    } catch (e) { return json({ ok: false }); }
  }

  // Toutes les autres actions exigent une identite verifiee.
  if (!SUPABASE_KEY) return json({ error: "Cle service manquante" }, 500);
  const user = await getAuthUser(req);
  if (!user) return json({ error: "Non authentifie" }, 401);
  const userId = user.id; // <-- derive du token, jamais du corps

  if (action === "claim") {
    if (!referralCode) return json({ error: "referralCode requis" }, 400);
    const parrainRes = await fetch(`${SUPABASE_URL}/rest/v1/referrals?select=user_id&code=eq.${encodeURIComponent(referralCode)}&limit=1`, {
      headers: { apikey: SUPABASE_KEY, authorization: `Bearer ${SUPABASE_KEY}` }
    });
    const parrains = await parrainRes.json();
    if (!parrains || parrains.length === 0) return json({ claimed: false, reason: "Code invalide" });
    const parrainId = parrains[0].user_id;
    if (parrainId === userId) return json({ claimed: false, reason: "Tu ne peux pas te parrainer toi-meme" });
    const existingRes = await fetch(`${SUPABASE_URL}/rest/v1/referrals?select=id&referred_user_id=eq.${encodeURIComponent(userId)}&limit=1`, {
      headers: { apikey: SUPABASE_KEY, authorization: `Bearer ${SUPABASE_KEY}` }
    });
    const existing = await existingRes.json();
    if (existing && existing.length > 0) return json({ claimed: false, reason: "Deja parraine" });
    const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/referrals`, {
      method: "POST",
      headers: { apikey: SUPABASE_KEY, authorization: `Bearer ${SUPABASE_KEY}`, "content-type": "application/json", prefer: "return=minimal" },
      body: JSON.stringify({ user_id: parrainId, code: referralCode, referred_user_id: userId, status: "pending", created_at: new Date().toISOString() })
    });
    if (!insertRes.ok) return json({ error: "Erreur d'enregistrement" }, 500);
    return json({ claimed: true });
  }

  if (action === "generate") {
    const existingRes = await fetch(`${SUPABASE_URL}/rest/v1/referrals?select=code&user_id=eq.${encodeURIComponent(userId)}&limit=1`, {
      headers: { apikey: SUPABASE_KEY, authorization: `Bearer ${SUPABASE_KEY}` }
    });
    const existing = await existingRes.json();
    if (existing && existing.length > 0 && existing[0].code) return json({ code: existing[0].code });
    const code = userId.slice(0, 8) + '-' + Math.random().toString(36).slice(2, 6);
    const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/referrals`, {
      method: "POST",
      headers: { apikey: SUPABASE_KEY, authorization: `Bearer ${SUPABASE_KEY}`, "content-type": "application/json", prefer: "return=minimal" },
      body: JSON.stringify({ user_id: userId, code, status: "active", created_at: new Date().toISOString() })
    });
    if (!insertRes.ok) return json({ error: "Erreur de generation" }, 500);
    return json({ code });
  }

  if (action === "stats") {
    const statsRes = await fetch(`${SUPABASE_URL}/rest/v1/referrals?select=id,referred_user_id,status,created_at&user_id=eq.${encodeURIComponent(userId)}`, {
      headers: { apikey: SUPABASE_KEY, authorization: `Bearer ${SUPABASE_KEY}` }
    });
    const referrals = await statsRes.json();
    const total = referrals ? referrals.filter(r => r.referred_user_id).length : 0;
    const pending = referrals ? referrals.filter(r => r.status === 'pending').length : 0;
    const converted = referrals ? referrals.filter(r => r.status === 'converted').length : 0;
    let clicks = 0, paid = 0;
    try {
      const clicksRes = await fetch(`${SUPABASE_URL}/rest/v1/referral_clicks?select=id&user_id=eq.${encodeURIComponent(userId)}`, {
        headers: { apikey: SUPABASE_KEY, authorization: `Bearer ${SUPABASE_KEY}`, prefer: "count=exact" }
      });
      const range = clicksRes.headers.get("content-range");
      if (range && range.includes("/")) clicks = parseInt(range.split("/")[1], 10) || 0;
    } catch (e) { /* table absente -> 0 */ }
    return json({ total, pending, converted, clicks, paid, referrals: referrals || [] });
  }

  if (action === "withdraw") {
    let amount = Number(body.amount);
    if (!Number.isFinite(amount) || amount <= 0) return json({ error: "Montant invalide" }, 400);
    amount = Math.min(amount, 100000); // garde-fou ; le paiement reste valide manuellement
    try {
      const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/payout_requests`, {
        method: "POST",
        headers: { apikey: SUPABASE_KEY, authorization: `Bearer ${SUPABASE_KEY}`, "content-type": "application/json", prefer: "return=minimal" },
        body: JSON.stringify({ user_id: userId, amount, status: "requested", created_at: new Date().toISOString() })
      });
      if (!insertRes.ok) return json({ ok: false, error: "Demande enregistree. Le support te contactera." });
      return json({ ok: true });
    } catch (e) {
      return json({ ok: false, error: "Demande enregistree. Le support te contactera." });
    }
  }

  return json({ error: "Action inconnue" }, 400);
}
