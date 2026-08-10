// api/send-reminders.js — CRON quotidien : envoie « ton prochain épisode t'attend »
// aux utilisateurs qui n'ont pas joué aujourd'hui et qui ont activé les notifications.
//
// Déclenché par Vercel Cron (voir vercel.json). Dépend de `web-push`.
//
// Variables d'environnement requises :
//   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY   (npx web-push generate-vapid-keys)
//   VAPID_SUBJECT                         (ex: mailto:hello@sunami.app)
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//   CRON_SECRET (optionnel)               (protège l'endpoint si appelé à la main)

import webpush from "web-push";

export const config = { runtime: "nodejs", maxDuration: 60 };

function today() { return new Date().toISOString().slice(0, 10); }

async function supa(path, SUPA_URL, SERVICE) {
  const res = await fetch(`${SUPA_URL}/rest/v1/${path}`, {
    headers: { apikey: SERVICE, authorization: `Bearer ${SERVICE}` },
  });
  if (!res.ok) return [];
  return res.json().catch(() => []);
}

export default async function handler(req, res) {
  const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, CRON_SECRET } = process.env;

  // Autorisation : cron Vercel (header x-vercel-cron) ou ?key=CRON_SECRET
  const isVercelCron = !!(req.headers && req.headers["x-vercel-cron"]);
  const url = new URL(req.url, "http://localhost");
  const keyOk = CRON_SECRET ? url.searchParams.get("key") === CRON_SECRET : true;
  if (!isVercelCron && !keyOk) { res.statusCode = 401; return res.end(JSON.stringify({ error: "unauthorized" })); }

  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    res.statusCode = 200; return res.end(JSON.stringify({ skipped: "push non configuré (VAPID / Supabase manquants)" }));
  }

  webpush.setVapidDetails(VAPID_SUBJECT || "mailto:hello@sunami.app", VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

  const t = today();
  const [subs, progressRows] = await Promise.all([
    supa("push_subscriptions?select=id,user_id,endpoint,subscription", SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY),
    supa("progress?select=user_id,last_active", SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY),
  ]);

  const activeToday = new Set(progressRows.filter(p => p.last_active === t).map(p => p.user_id));

  const payload = JSON.stringify({
    title: "🌊 Ton prochain épisode t'attend",
    body: "Reprends ton histoire et garde ta série 🔥",
    url: "/app",
  });

  let sent = 0, removed = 0, failed = 0;
  await Promise.all((subs || []).map(async (row) => {
    if (row.user_id && activeToday.has(row.user_id)) return; // déjà joué aujourd'hui
    try {
      await webpush.sendNotification(row.subscription, payload);
      sent++;
    } catch (err) {
      const code = err && err.statusCode;
      if (code === 404 || code === 410) {
        removed++;
        try {
          await fetch(`${SUPABASE_URL}/rest/v1/push_subscriptions?id=eq.${row.id}`, {
            method: "DELETE",
            headers: { apikey: SUPABASE_SERVICE_ROLE_KEY, authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` },
          });
        } catch (_) {}
      } else { failed++; }
    }
  }));

  res.statusCode = 200;
  res.setHeader("content-type", "application/json");
  return res.end(JSON.stringify({ ok: true, sent, removed, failed, total: (subs || []).length }));
}
