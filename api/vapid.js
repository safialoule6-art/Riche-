// api/vapid.js — expose la clé publique VAPID au client (pour l'abonnement push).
// Retourne { key: "" } si non configurée : le client dégrade proprement.
export const config = { runtime: "edge" };

export default function handler() {
  const key = process.env.VAPID_PUBLIC_KEY || "";
  return new Response(JSON.stringify({ key }), {
    status: 200,
    headers: { "content-type": "application/json", "cache-control": "public, max-age=3600" },
  });
}
