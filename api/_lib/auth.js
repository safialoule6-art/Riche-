// Shared server-side authentication for API routes.
// The browser may send the Supabase access token, but the server remains the source of truth.

const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_PUBLIC_KEY =
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY ||
  "";

export async function getAuthUser(req) {
  const auth = req.headers.get("authorization") || "";
  if (!auth.startsWith("Bearer ")) return null;
  const token = auth.slice(7).trim();
  if (!token || !SUPABASE_URL || !SUPABASE_PUBLIC_KEY) return null;

  try {
    const response = await fetch(
      `${SUPABASE_URL}/auth/v1/user`,
      {
        headers: {
          apikey: SUPABASE_PUBLIC_KEY,
          authorization: `Bearer ${token}`,
        },
      },
    );
    if (!response.ok) return null;
    const user = await response.json();
    return user && typeof user.id === "string" ? user : null;
  } catch {
    return null;
  }
}

export async function requireAuth(req) {
  const user = await getAuthUser(req);
  if (!user) {
    return new Response(JSON.stringify({ error: "Non authentifié" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }
  return user;
}
