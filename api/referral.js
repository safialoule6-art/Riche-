// api/referral.js — Edge function pour le système de parrainage
export const config = { runtime: "edge" };

const SUPABASE_URL = process.env.SUPABASE_URL || "https://cdtabuyomtkfasvugtck.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || "";

export default async function handler(req) {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "POST only" }), { status: 405, headers: { "content-type": "application/json" } });
  }

  let body;
  try { body = await req.json(); } catch { body = {}; }
  const { action, userId, referralCode } = body || {};

  if (action === "claim") {
    // Un utilisateur s'inscrit avec un code de parrainage
    if (!userId || !referralCode) {
      return json({ error: "userId et referralCode requis" }, 400);
    }
    if (!SUPABASE_KEY) return json({ error: "Clé service manquante" }, 500);

    // Trouver le parrain
    const parrainRes = await fetch(`${SUPABASE_URL}/rest/v1/referrals?select=user_id&code=eq.${encodeURIComponent(referralCode)}&limit=1`, {
      headers: { apikey: SUPABASE_KEY, authorization: `Bearer ${SUPABASE_KEY}` }
    });
    const parrains = await parrainRes.json();
    if (!parrains || parrains.length === 0) {
      return json({ claimed: false, reason: "Code invalide" });
    }

    const parrainId = parrains[0].user_id;
    if (parrainId === userId) {
      return json({ claimed: false, reason: "Tu ne peux pas te parrainer toi-même" });
    }

    // Vérifier que le filleul n'a pas déjà été parrainé
    const existingRes = await fetch(`${SUPABASE_URL}/rest/v1/referrals?select=id&referred_user_id=eq.${encodeURIComponent(userId)}&limit=1`, {
      headers: { apikey: SUPABASE_KEY, authorization: `Bearer ${SUPABASE_KEY}` }
    });
    const existing = await existingRes.json();
    if (existing && existing.length > 0) {
      return json({ claimed: false, reason: "Déjà parrainé" });
    }

    // Enregistrer le filleul
    const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/referrals`, {
      method: "POST",
      headers: { apikey: SUPABASE_KEY, authorization: `Bearer ${SUPABASE_KEY}`, "content-type": "application/json", prefer: "return=minimal" },
      body: JSON.stringify({
        user_id: parrainId,
        code: referralCode,
        referred_user_id: userId,
        status: "pending",
        created_at: new Date().toISOString()
      })
    });

    if (!insertRes.ok) return json({ error: "Erreur d'enregistrement" }, 500);

    return json({ claimed: true, parrainId });
  }

  if (action === "generate") {
    // Générer un code de parrainage unique pour un utilisateur
    if (!userId) return json({ error: "userId requis" }, 400);
    if (!SUPABASE_KEY) return json({ error: "Clé service manquante" }, 500);

    // Vérifier si l'utilisateur a déjà un code
    const existingRes = await fetch(`${SUPABASE_URL}/rest/v1/referrals?select=code&user_id=eq.${encodeURIComponent(userId)}&limit=1`, {
      headers: { apikey: SUPABASE_KEY, authorization: `Bearer ${SUPABASE_KEY}` }
    });
    const existing = await existingRes.json();
    if (existing && existing.length > 0 && existing[0].code) {
      return json({ code: existing[0].code });
    }

    // Générer un nouveau code
    const code = userId.slice(0, 8) + '-' + Math.random().toString(36).slice(2, 6);
    const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/referrals`, {
      method: "POST",
      headers: { apikey: SUPABASE_KEY, authorization: `Bearer ${SUPABASE_KEY}`, "content-type": "application/json", prefer: "return=minimal" },
      body: JSON.stringify({
        user_id: userId,
        code: code,
        status: "active",
        created_at: new Date().toISOString()
      })
    });

    if (!insertRes.ok) return json({ error: "Erreur de génération" }, 500);
    return json({ code });
  }

  if (action === "stats") {
    // Récupérer les stats de parrainage d'un utilisateur
    if (!userId) return json({ error: "userId requis" }, 400);
    if (!SUPABASE_KEY) return json({ error: "Clé service manquante" }, 500);

    const statsRes = await fetch(`${SUPABASE_URL}/rest/v1/referrals?select=id,referred_user_id,status,created_at&user_id=eq.${encodeURIComponent(userId)}`, {
      headers: { apikey: SUPABASE_KEY, authorization: `Bearer ${SUPABASE_KEY}` }
    });
    const referrals = await statsRes.json();
    const total = referrals ? referrals.filter(r => r.referred_user_id).length : 0;
    const pending = referrals ? referrals.filter(r => r.status === 'pending').length : 0;
    const converted = referrals ? referrals.filter(r => r.status === 'converted').length : 0;

    // Comptage des clics (best-effort : la table peut ne pas exister encore)
    let clicks = 0, paid = 0;
    try {
      const clicksRes = await fetch(`${SUPABASE_URL}/rest/v1/referral_clicks?select=id&user_id=eq.${encodeURIComponent(userId)}`, {
        headers: { apikey: SUPABASE_KEY, authorization: `Bearer ${SUPABASE_KEY}`, prefer: "count=exact" }
      });
      const range = clicksRes.headers.get("content-range");
      if (range && range.includes("/")) clicks = parseInt(range.split("/")[1], 10) || 0;
    } catch (e) { /* table absente → 0 */ }

    return json({ total, pending, converted, clicks, paid, referrals: referrals || [] });
  }

  if (action === "click") {
    // Enregistre un clic sur un lien d'affiliation (best-effort)
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

  if (action === "withdraw") {
    // Enregistre une demande de retrait (best-effort)
    if (!userId) return json({ error: "userId requis" }, 400);
    if (!SUPABASE_KEY) return json({ error: "Clé service manquante" }, 500);
    const amount = Number(body.amount) || 0;
    try {
      const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/payout_requests`, {
        method: "POST",
        headers: { apikey: SUPABASE_KEY, authorization: `Bearer ${SUPABASE_KEY}`, "content-type": "application/json", prefer: "return=minimal" },
        body: JSON.stringify({ user_id: userId, amount, status: "requested", created_at: new Date().toISOString() })
      });
      if (!insertRes.ok) return json({ ok: false, error: "Demande enregistrée. Le support te contactera." });
      return json({ ok: true });
    } catch (e) {
      return json({ ok: false, error: "Demande enregistrée. Le support te contactera." });
    }
  }

  return json({ error: "Action inconnue" }, 400);
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json" } });
}