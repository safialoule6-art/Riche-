// api/send-reminders.js — CRON quotidien : « ton prochain épisode t'attend »
// aux utilisateurs inactifs du jour qui ont activé les notifications.
import webpush from "web-push";

export const config = { runtime: "nodejs", maxDuration: 60 };

function today() { return new Date().toISOString().slice(0, 10); }

async function supa(path, url, key) {
  const res = await fetch(`${url}/rest/v1/${path}`, { headers: { apikey: key, authorization: `Bearer ${key}` } });
  if (!res.ok) return [];
  return res.json().catch(() => []);
}

export default async function handler(req, res) {
  const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT, CRON_SECRET } = process.env;
  const SUPA_URL = process.env.SUPABASE_URL || "https://cdtabuyomtkfasvugtck.supabase.co";
  const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

  const isVercelCron = !!(req.headers && req.headers["x-vercel-cron"]);
  const url = new URL(req.url, "http://localhost");
  const keyOk = CRON_SECRET ? url.searchParams.get("key") === CRON_SECRET : true;
  if (!isVercelCron && !keyOk) { res.statusCode = 401; return res.end(JSON.stringify({ error: "unauthorized" })); }

  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY || !SERVICE) {
    res.statusCode = 200; return res.end(JSON.stringify({ skipped: "push non configuré (VAPID / service key manquants)" }));
  }

  webpush.setVapidDetails(VAPID_SUBJECT || "mailto:hello@sunami.app", VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

  const t = today();
  const [subs, progressRows] = await Promise.all([
    supa("push_subscriptions?select=id,user_id,endpoint,subscription", SUPA_URL, SERVICE),
    supa("progress?select=user_id,last_active", SUPA_URL, SERVICE),
  ]);
  // La colonne "cliffhanger" peut ne pas être migrée → on tente avec, sinon sans.
  let sagaRows = await supa("saga?select=user_id,title,recap,cliffhanger,episode,updated_at&order=updated_at.desc", SUPA_URL, SERVICE);
  if (!sagaRows.length) sagaRows = await supa("saga?select=user_id,title,recap,episode,updated_at&order=updated_at.desc", SUPA_URL, SERVICE);
  const activeToday = new Set(progressRows.filter(p => p.last_active === t).map(p => p.user_id));

  // Dernière saga par utilisateur (la plus récemment mise à jour)
  const sagaByUser = {};
  (sagaRows || []).forEach(s => { if (s.user_id && !sagaByUser[s.user_id]) sagaByUser[s.user_id] = s; });

  function teaserFrom(s) {
    if (!s) return "";
    if (s.cliffhanger && String(s.cliffhanger).trim()) return String(s.cliffhanger).trim();
    const recap = String(s.recap || "").replace(/\s+/g, " ").trim();
    if (!recap) return "";
    const parts = recap.split(/(?<=[.!?…])\s+/).filter(x => x.trim().length > 4);
    return parts.length ? parts[parts.length - 1].slice(0, 140) : "";
  }
  function payloadFor(userId) {
    const s = userId ? sagaByUser[userId] : null;
    const teaser = teaserFrom(s);
    const ep = s && s.episode ? s.episode : null;
    const title = ep ? `🎬 L'épisode ${ep} t'attend` : "🌊 Ton prochain épisode t'attend";
    const body = teaser
      ? `${teaser} … Découvre la suite${s && s.title ? ` de « ${s.title} »` : ""} et garde ta série 🔥`
      : "Reprends ton histoire et garde ta série 🔥";
    return JSON.stringify({ title, body, url: "/app" });
  }

  const genericPayload = JSON.stringify({
    title: "🌊 Ton prochain épisode t'attend",
    body: "Reprends ton histoire et garde ta série 🔥",
    url: "/app",
  });

  let sent = 0, removed = 0, failed = 0;
  await Promise.all((subs || []).map(async (row) => {
    if (row.user_id && activeToday.has(row.user_id)) return;
    const payload = row.user_id ? payloadFor(row.user_id) : genericPayload;
    try { await webpush.sendNotification(row.subscription, payload); sent++; }
    catch (err) {
      const code = err && err.statusCode;
      if (code === 404 || code === 410) {
        removed++;
        try { await fetch(`${SUPA_URL}/rest/v1/push_subscriptions?id=eq.${row.id}`, { method: "DELETE", headers: { apikey: SERVICE, authorization: `Bearer ${SERVICE}` } }); } catch (_) {}
      } else { failed++; }
    }
  }));

  res.statusCode = 200;
  res.setHeader("content-type", "application/json");
  return res.end(JSON.stringify({ ok: true, sent, removed, failed, total: (subs || []).length }));
}
