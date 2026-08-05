// api/create-payment.js
//
// Fonction serverless Vercel : crée une session de checkout InflowPay (paiement unique)
// pour l'abonnement Sunami Super. La clé PRIVÉE reste ici, côté serveur.
//
// API officielle (v2) : POST https://api.inflowpay.com/api/checkout/sessions/one-time-payment
//   - Auth : en-tête  X-Inflow-Api-Key: <clé privée>
//   - Réponse : { sessionId, checkoutUrl }  -> on redirige le navigateur vers checkoutUrl
//
// Variables d'environnement Vercel :
//   INFLOW_API_KEY             = clé privée InflowPay (inflow_prod_...)  [REQUISE]
//   INFLOW_API_BASE            = (optionnel) https://api.inflowpay.com (prod) ou https://sandbox.api.inflowpay.com (test)
//   SUPABASE_SERVICE_ROLE_KEY  = clé service_role Supabase               [optionnelle, pour lier session -> user]
//   SUPABASE_URL               = URL du projet Supabase                  [optionnelle]

const SUPABASE_URL = process.env.SUPABASE_URL || "https://cdtabuyomtkfasvugtck.supabase.co";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const INFLOW_BASE = process.env.INFLOW_API_BASE || "https://api.inflowpay.com";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Méthode non autorisée" });
  }

  const apiKey = process.env.INFLOW_API_KEY;
  if (!apiKey) {
    console.error("INFLOW_API_KEY manquante dans les variables d'environnement Vercel");
    return res.status(500).json({ error: "Configuration serveur manquante (INFLOW_API_KEY)" });
  }

  try {
    const {
      productName = "Sunami Super — 1 mois",
      price = 500, // centimes (500 = 5,00 €)
      currency = "EUR",
      userId = null,
      email = null,
    } = req.body || {};

    const origin =
      req.headers["origin"] ||
      (req.headers["host"] ? `https://${req.headers["host"]}` : "https://sunami-rho.vercel.app");

    const response = await fetch(`${INFLOW_BASE}/api/checkout/sessions/one-time-payment`, {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        "X-Inflow-Api-Key": apiKey,
      },
      body: JSON.stringify({
        currency,
        successUrl: `${origin}/success`,
        cancelUrl: `${origin}/cancel`,
        products: [{ name: productName, price, quantity: 1 }],
        customer: email ? { email } : undefined,
        // metadata (clé "metadatas" dans l'API) — relu dans le webhook pour retrouver l'utilisateur
        metadatas: userId ? { userId, email } : undefined,
      }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      console.error("Erreur InflowPay:", response.status, JSON.stringify(data));
      return res.status(response.status).json({
        error: "Échec de création du paiement",
        detail: data && (data.message || data.error) ? (data.message || data.error) : undefined,
      });
    }

    const checkoutUrl = data.checkoutUrl || data.purchaseUrl;
    const sessionId = data.sessionId || data.id;

    // Enregistre la correspondance session -> utilisateur (best-effort)
    if (SERVICE_KEY && userId && sessionId) {
      try {
        await fetch(`${SUPABASE_URL}/rest/v1/payments`, {
          method: "POST",
          headers: {
            apikey: SERVICE_KEY,
            authorization: `Bearer ${SERVICE_KEY}`,
            "content-type": "application/json",
            Prefer: "resolution=merge-duplicates,return=minimal",
          },
          body: JSON.stringify({ id: String(sessionId), user_id: userId, status: "pending" }),
        });
      } catch (e) {
        console.error("Impossible d'enregistrer la session en base:", e);
      }
    }

    // On renvoie checkoutUrl ET purchaseUrl pour compat côté client
    return res.status(200).json({ sessionId, checkoutUrl, purchaseUrl: checkoutUrl });
  } catch (err) {
    console.error("Erreur serveur:", err);
    return res.status(500).json({ error: "Erreur interne" });
  }
}
