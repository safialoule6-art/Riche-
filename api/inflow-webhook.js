// api/inflow-webhook.js
//
// Reçoit les webhooks InflowPay (signés via Svix) et active/désactive "Sunami Super"
// de façon fiable côté serveur (non contournable).
//
// Variables d'environnement Vercel nécessaires :
//   INFLOW_WEBHOOK_SECRET      = secret de signature du webhook (whsec_...) donné par InflowPay à la création
//   SUPABASE_SERVICE_ROLE_KEY  = clé "service_role" Supabase (Settings → API) — garde-la SECRÈTE
//   SUPABASE_URL               = (optionnel) URL du projet Supabase ; sinon valeur par défaut ci-dessous
//
// Prérequis base de données : voir supabase.sql (table `payments` + colonnes premium sur `progress`).

import crypto from "crypto";

export const config = { api: { bodyParser: false } }; // on a besoin du corps BRUT pour vérifier la signature

const SUPABASE_URL = process.env.SUPABASE_URL || "https://cdtabuyomtkfasvugtck.supabase.co";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (c) => (data += c));
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

// Vérification de signature Svix : HMAC-SHA256(base64) sur `${id}.${timestamp}.${body}`
function verifySvix(secret, id, timestamp, signatureHeader, body) {
  if (!secret || !id || !timestamp || !signatureHeader) return false;
  const secretBytes = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  const signedContent = `${id}.${timestamp}.${body}`;
  const expected = crypto.createHmac("sha256", secretBytes).update(signedContent).digest("base64");
  // header format: "v1,<sig> v1,<sig2> ..."
  return signatureHeader.split(" ").some((part) => {
    const [, sig] = part.split(",");
    if (!sig) return false;
    try {
      const a = Buffer.from(sig);
      const b = Buffer.from(expected);
      return a.length === b.length && crypto.timingSafeEqual(a, b);
    } catch {
      return false;
    }
  });
}

async function sb(path, options = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: SERVICE_KEY,
      authorization: `Bearer ${SERVICE_KEY}`,
      "content-type": "application/json",
      ...(options.headers || {}),
    },
  });
}

// Cherche des identifiants utiles un peu partout dans le payload (robuste aux variations)
function deepFind(obj, keys) {
  const found = {};
  const want = new Set(keys);
  (function walk(o) {
    if (!o || typeof o !== "object") return;
    for (const [k, v] of Object.entries(o)) {
      if (want.has(k) && (typeof v === "string" || typeof v === "number") && found[k] == null) found[k] = v;
      if (v && typeof v === "object") walk(v);
    }
  })(obj);
  return found;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Méthode non autorisée" });

  const raw = await readRawBody(req);

  const secret = process.env.INFLOW_WEBHOOK_SECRET;
  const ok = verifySvix(
    secret,
    req.headers["svix-id"],
    req.headers["svix-timestamp"],
    req.headers["svix-signature"],
    raw
  );
  if (!ok) {
    console.error("Signature webhook invalide");
    return res.status(400).json({ error: "Signature invalide" });
  }

  if (!SERVICE_KEY) {
    console.error("SUPABASE_SERVICE_ROLE_KEY manquante");
    return res.status(500).json({ error: "Config serveur manquante" });
  }

  let event;
  try { event = JSON.parse(raw); } catch { return res.status(400).json({ error: "JSON invalide" }); }

  const type = String(event.type || event.event || "");
  const isSuccess = /(completed|succeeded|paid|active)$/i.test(type) || /paid|succeeded|active/i.test(String(deepFind(event, ["status"]).status || ""));

  // On ne s'intéresse qu'aux événements "de réussite" (paiement / session / abonnement)
  if (!isSuccess) return res.status(200).json({ ok: true, ignored: type });

  const ids = deepFind(event, ["paymentId", "sessionId", "id", "userId", "email", "subscriptionId"]);
  const candidateIds = [ids.paymentId, ids.sessionId, ids.id].filter(Boolean);

  try {
    // 1) Résoudre l'utilisateur : d'abord via le metadata userId, sinon via la table `payments`
    let userId = ids.userId || null;
    if (!userId && candidateIds.length) {
      const inList = candidateIds.map((v) => `"${v}"`).join(",");
      const r = await sb(`payments?id=in.(${inList})&select=user_id`);
      const rows = await r.json();
      if (Array.isArray(rows) && rows[0]?.user_id) userId = rows[0].user_id;
    }

    if (!userId) {
      console.warn("Webhook reçu mais utilisateur introuvable pour", candidateIds, "type", type);
      return res.status(200).json({ ok: true, unmatched: true });
    }

    // 2) Activer Super (fenêtre glissante de ~31 jours)
    const until = new Date(Date.now() + 31 * 24 * 60 * 60 * 1000).toISOString();
    await sb(`progress?user_id=eq.${userId}`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ premium: true, premium_until: until }),
    });

    // 3) Marquer le paiement comme payé (si on l'a en base)
    if (candidateIds.length) {
      const inList = candidateIds.map((v) => `"${v}"`).join(",");
      await sb(`payments?id=in.(${inList})`, {
        method: "PATCH",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({ status: "paid" }),
      });
    }

    return res.status(200).json({ ok: true, userId });
  } catch (err) {
    console.error("Erreur webhook:", err);
    return res.status(500).json({ error: "Erreur interne" });
  }
}
