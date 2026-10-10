import test from "node:test";
import assert from "node:assert/strict";

process.env.SUPABASE_URL = "https://supabase.test";
delete process.env.SUPABASE_PUBLISHABLE_KEY;
delete process.env.SUPABASE_ANON_KEY;
process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-test-key";
process.env.GROQ_API_KEY = "groq-test-key";
process.env.GROQ_MODEL = "llama-3.3-70b-versatile";

const { default: generateSafe } = await import("./generate-safe.js?authenticated-routes-test");
const { default: referral } = await import("./referral.js?authenticated-routes-test");

const originalFetch = globalThis.fetch;
let groqResponses = [];
let groqCallCount = 0;
let expectedMotherLanguage = "French";

function installFetchStub(options = {}) {
  groqResponses = options.groqResponses ? [...options.groqResponses] : [];
  groqCallCount = 0;
  expectedMotherLanguage = options.expectedMotherLanguage || "French";
  globalThis.fetch = async (input, init = {}) => {
    const url = String(input);
    if (url.endsWith("/auth/v1/user")) {
      assert.equal(init.headers.apikey, "service-role-test-key");
      return Response.json({ id: "user-1", email: "learner@example.test" });
    }
    if (url.includes("api.groq.com")) {
      groqCallCount += 1;
      assert.equal(init.headers.Authorization, "Bearer groq-test-key");
      const requestBody = JSON.parse(init.body);
      assert.equal(requestBody.model, "openai/gpt-oss-120b");
      assert.deepEqual(requestBody.response_format, { type: "json_object" });
      assert.equal(requestBody.messages[0].role, "system");
      assert.match(requestBody.messages[0].content, new RegExp(`MOTHER LANGUAGE: ${expectedMotherLanguage}`));
      assert.match(requestBody.messages[0].content, /TARGET LANGUAGE: English/);
      if (groqResponses.length) return groqResponses.shift();
      return Response.json({
        choices: [{ message: { content: JSON.stringify({ story: "Le portail s'ouvre. **hello** (bonjour). Que choisis-tu ?", choices: ["Hello (Bonjour)", "I wait (J'attends)"], grammar: "", vocab: [] }) } }],
      });
    }
    if (url.includes("/rest/v1/referrals")) return Response.json([]);
    if (url.includes("/rest/v1/referral_clicks")) return new Response("[]", { status: 200, headers: { "content-range": "0-0/0" } });
    throw new Error(`Unexpected fetch: ${url}`);
  };
}

test.after(() => { globalThis.fetch = originalFetch; });

test("generate-safe authenticates with the configured service key fallback", async () => {
  installFetchStub({ expectedMotherLanguage: "German" });
  const req = new Request("https://sunami.test/api/generate-safe", {
    method: "POST",
    headers: { authorization: "Bearer learner-token", "content-type": "application/json" },
    body: JSON.stringify({ language: "anglais", motherLanguage: "allemand", level: "A1-A2 (débutant)" }),
  });
  const response = await generateSafe(req);
  assert.equal(response.status, 200);
});

test("generate retries once after a Groq 429 response", async () => {
  installFetchStub({
    groqResponses: [
      Response.json({ error: { message: "rate limit" } }, { status: 429, headers: { "retry-after": "0" } }),
      Response.json({ choices: [{ message: { content: JSON.stringify({ story: "Le quai est calme. **hello** (bonjour). Que fais-tu ?" }) } }] }),
    ],
  });
  const req = new Request("https://sunami.test/api/generate-safe", {
    method: "POST",
    headers: { authorization: "Bearer learner-token", "content-type": "application/json" },
    body: JSON.stringify({ language: "anglais", level: "A1-A2 (débutant)" }),
  });
  const response = await generateSafe(req);
  assert.equal(response.status, 200);
  assert.equal(groqCallCount, 2);
});

test("generate returns the rate-limit message after the second Groq 429", async () => {
  installFetchStub({
    groqResponses: [
      Response.json({ error: { message: "rate limit" } }, { status: 429, headers: { "retry-after": "0" } }),
      Response.json({ error: { message: "rate limit again" } }, { status: 429, headers: { "retry-after": "0" } }),
    ],
  });
  const req = new Request("https://sunami.test/api/generate-safe", {
    method: "POST",
    headers: { authorization: "Bearer learner-token", "content-type": "application/json" },
    body: JSON.stringify({ language: "anglais", level: "A1-A2 (débutant)" }),
  });
  const response = await generateSafe(req);
  assert.equal(response.status, 429);
  assert.equal((await response.json()).error, "Trop de demandes, réessaie dans quelques secondes");
  assert.equal(groqCallCount, 2);
});

test("generate reports a clear 500 when Groq is not configured", async () => {
  const previousKey = process.env.GROQ_API_KEY;
  delete process.env.GROQ_API_KEY;
  try {
    installFetchStub();
    const req = new Request("https://sunami.test/api/generate-safe", {
      method: "POST",
      headers: { authorization: "Bearer learner-token", "content-type": "application/json" },
      body: JSON.stringify({ language: "anglais", level: "A1-A2 (débutant)" }),
    });
    const response = await generateSafe(req);
    assert.equal(response.status, 500);
    assert.match((await response.json()).error, /service du conteur/i);
  } finally {
    if (previousKey === undefined) delete process.env.GROQ_API_KEY;
    else process.env.GROQ_API_KEY = previousKey;
  }
});

test("generate accepts fenced JSON from Groq and returns structured output", async () => {
  installFetchStub({
    groqResponses: [
      Response.json({ choices: [{ message: { content: "```json\n{\"story\":\"Une porte s'ouvre.\"}\n```" } }] }),
    ],
  });
  const req = new Request("https://sunami.test/api/generate-safe", {
    method: "POST",
    headers: { authorization: "Bearer learner-token", "content-type": "application/json" },
    body: JSON.stringify({ language: "anglais", level: "A1-A2 (débutant)" }),
  });
  const response = await generateSafe(req);
  assert.equal(response.status, 200);
  assert.deepEqual((await response.json()).story, "Une porte s'ouvre.");
});

test("generate falls back to plain text when Groq JSON is invalid", async () => {
  installFetchStub({
    groqResponses: [
      Response.json({ choices: [{ message: { content: "Le conteur répond sans JSON." } }] }),
    ],
  });
  const req = new Request("https://sunami.test/api/generate-safe", {
    method: "POST",
    headers: { authorization: "Bearer learner-token", "content-type": "application/json" },
    body: JSON.stringify({ language: "anglais", level: "A1-A2 (débutant)" }),
  });
  const response = await generateSafe(req);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    text: "Le conteur répond sans JSON.",
    story: "Le conteur répond sans JSON.",
    grammar: null,
    fallback: true,
  });
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
