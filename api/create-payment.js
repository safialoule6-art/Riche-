// api/create-payment.js
//
// Fonction serverless Vercel : crée un paiement InflowPay pour l'abonnement Sunami Super.
// La clé PRIVÉE reste ici, côté serveur — jamais exposée au navigateur.
//
// Variables d'environnement Vercel :
//   INFLOW_API_KEY             = clé privée InflowPay (inflow_prod_...)  [REQUISE]
//   SUPABASE_SERVICE_ROLE_KEY  = clé service_role Supabase               [optionnelle, pour lier paiement -> user]
//   SUPABASE_URL               = URL du projet Supabase                  [optionnelle]
//
// Le front envoie { userId, email } (identité Supabase) + le produit. On stocke la
// correspondance paymentId -> userId pour que le webhook puisse activer Super de façon fiable.

const SUPABASE_URL = process.env.SUPABASE_URL || "https://cdtabuyomtkfasvugtck.supabase.co";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

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

    const response = await fetch("https://api.inflowpay.xyz/api/createPayment", {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        currency,
        successUrl: `${origin}/success`,
        cancelUrl: `${origin}/cancel`,
        products: [{ name: productName, price, quantity: 1 }],
        // metadata lu ensuite dans le webhook (si supporté par InflowPay)
        metadata: userId ? { userId, email } : undefined,
        customerEmail: email || undefined,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Erreur InflowPay:", errText);
      return res.status(response.status).json({ error: "Échec de création du paiement" });
    }

    const data = await response.json(); // { paymentId, purchaseUrl }

    // Enregistre la correspondance paiement -> utilisateur (best-effort, ne bloque pas le paiement)
    if (SERVICE_KEY && userId && data && data.paymentId) {
      try {
        await fetch(`${SUPABASE_URL}/rest/v1/payments`, {
          method: "POST",
          headers: {
            apikey: SERVICE_KEY,
            authorization: `Bearer ${SERVICE_KEY}`,
            "content-type": "application/json",
            Prefer: "resolution=merge-duplicates,return=minimal",
          },
          body: JSON.stringify({ id: String(data.paymentId), user_id: userId, status: "pending" }),
        });
      } catch (e) {
        console.error("Impossible d'enregistrer le paiement en base:", e);
      }
    }

    return res.status(200).json(data);
  } catch (err) {
    console.error("Erreur serveur:", err);
    return res.status(500).json({ error: "Erreur interne" });
  }
}
