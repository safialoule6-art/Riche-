import test from "node:test";
import assert from "node:assert/strict";
import { rateLimit } from "./rate-limit.js";

test("rate limiter allows requests up to the configured limit", () => {
  const req = new Request("https://example.test/api", { headers: { "x-forwarded-for": "198.51.100.10" } });
  const first = rateLimit(req, "test", 2, 60_000);
  const second = rateLimit(req, "test", 2, 60_000);
  const third = rateLimit(req, "test", 2, 60_000);
  assert.equal(first.allowed, true);
  assert.equal(second.allowed, true);
  assert.equal(third.allowed, false);
  assert.equal(third.remaining, 0);
  assert.ok(third.retryAfter >= 1);
});
