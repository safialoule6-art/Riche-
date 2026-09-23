import test from "node:test";
import assert from "node:assert/strict";

process.env.SUPABASE_URL = "https://supabase.test";
delete process.env.SUPABASE_PUBLISHABLE_KEY;
delete process.env.SUPABASE_ANON_KEY;
process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-test-key";
process.env.GROQ_API_KEY = "groq-test-key";

const { default: generateSafe } = await import("./generate-safe.js?authenticated-routes-test");
const { default: referral } = await import("./referral.js?authenticated-routes-test");

const originalFetch = globalThis.fetch;

function installFetchStub() {
  globalThis.fetch = async (input, init = {}) => {
    const url = String(input);
    if (url.endsWith("/auth/v1/user")) {
      assert.equal(init.headers.apikey, "service-role-test-key");
      return Response.json({ id: "user-1", email: "learner@example.test" });
    }
    if (url.includes("api.groq.com")) {
      return Response.json({
        choices: [{ message: { content: JSON.stringify({ story: "Hello there. How are you?", choices: ["I am ready.", "I look around."], grammar: "", vocab: [] }) } }],
      });
    }
    if (url.includes("/rest/v1/referrals")) return Response.json([]);
    if (url.includes("/rest/v1/referral_clicks")) return new Response("[]", { status: 200, headers: { "content-range": "0-0/0" } });
    throw new Error(`Unexpected fetch: ${url}`);
  };
}

test.after(() => { globalThis.fetch = originalFetch; });

test("generate-safe authenticates with the configured service key fallback", async () => {
  installFetchStub();
  const req = new Request("https://sunami.test/api/generate-safe", {
    method: "POST",
    headers: { authorization: "Bearer learner-token", "content-type": "application/json" },
    body: JSON.stringify({ language: "anglais", level: "A1-A2 (débutant)" }),
  });
  const response = await generateSafe(req);
  assert.equal(response.status, 200);
});

test("referral stats authenticates with the same fallback", async () => {
  installFetchStub();
  const req = new Request("https://sunami.test/api/referral", {
    method: "POST",
    headers: { authorization: "Bearer learner-token", "content-type": "application/json" },
    body: JSON.stringify({ action: "stats" }),
  });
  const response = await referral(req);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { total: 0, pending: 0, converted: 0, clicks: 0, paid: 0, referrals: [] });
});
