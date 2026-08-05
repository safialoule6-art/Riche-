// api/create-payment.js
//
// Fonction serverless Vercel : crée un paiement InflowPay pour l'abonnement Sunami Super.
// La clé PRIVÉE reste ici, côté serveur — jamais exposée au navigateur.
//
// Configuration (Vercel → Settings → Environment Variables) :
//   INFLOW_API_KEY = ta clé privée (inflow_prod_... ou inflow_test_...)
//   NE JAMAIS committer cette clé dans le code.
//
// Le front appelle POST /api/create-payment puis redirige l'utilisateur vers `purchaseUrl`.

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
    // price en centimes (500 = 5,00 €). Valeurs par défaut = Sunami Super mensuel.
    const { productName = "Sunami Super — 1 mois", price = 500, currency = "EUR" } = req.body || {};

    // Base URL dynamique (marche en prod comme en preview Vercel)
    const origin =
      (req.headers["origin"]) ||
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
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Erreur InflowPay:", errText);
      return res.status(response.status).json({ error: "Échec de création du paiement" });
    }

    const data = await response.json(); // { paymentId, purchaseUrl }
    return res.status(200).json(data);
  } catch (err) {
    console.error("Erreur serveur:", err);
    return res.status(500).json({ error: "Erreur interne" });
  }
}
