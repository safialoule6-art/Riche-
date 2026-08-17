// api/track.js — puits d'evenements "first-party" (analytics maison).
// Ecrit dans public.events via la service key. Beacon best-effort : repond
// toujours 200 pour ne jamais bloquer le client. Aucune donnee sensible.
export const config = { runtime: "edge" };

const SUPABASE_URL = process.env.SUPABASE_URL || "https://cdtabuyomtkfasvugtck.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || "";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function ok() {
  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "content-type": "application/json" } });
}
function clamp(v, n) { return typeof v === "string" ? v.slice(0, n) : null; }

export default async function handler(req) {
  if (req.method !== "POST" || !SUPABASE_KEY) return ok();

  let b;
  try { b = await req.json(); }
  catch { try { b = JSON.parse(await req.text()); } catch { return ok(); } }
  b = b || {};

  const event = typeof b.event === "string" ? b.event.slice(0, 64) : "";
  if (!event) return ok();

  let propsStr = "{}";
  try {
    const p = (b.props && typeof b.props === "object") ? b.props : {};
    propsStr = JSON.stringify(p).slice(0, 2000);
    JSON.parse(propsStr); // s'assure que le clamp n'a pas casse le JSON
  } catch { propsStr = "{}"; }

  const row = {
    event,
    visitor_id: clamp(b.visitor_id, 64),
    session_id: clamp(b.session_id, 64),
    user_id: (typeof b.user_id === "string" && UUID_RE.test(b.user_id)) ? b.user_id : null,
    path: clamp(b.path, 256),
    referrer: clamp(b.referrer, 256),
    props: JSON.parse(propsStr),
  };

  try {
    await fetch(`${SUPABASE_URL}/rest/v1/events`, {
      method: "POST",
      headers: { apikey: SUPABASE_KEY, authorization: `Bearer ${SUPABASE_KEY}`, "content-type": "application/json", prefer: "return=minimal" },
      body: JSON.stringify(row),
    });
  } catch (e) { /* best-effort */ }

  return ok();
}
