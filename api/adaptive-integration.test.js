import test from "node:test";
import assert from "node:assert/strict";
import { createAdaptivePromptData, appendAdaptivePrompt } from "./adaptive-integration.js";

test("adaptive integration produces bounded, actionable context", () => {
  const data = createAdaptivePromptData({
    level: "A1-A2 (débutant)",
    theme: "voyage",
    vocabulary: [
      { word: "ticket", fr: "billet", status: "struggling", attempts: 3, correct: 0 },
      { word: "hotel", fr: "hôtel", status: "review" },
    ],
    memory: { facts: [{ key: "pet", value: "Milo" }], decisions: [] },
  });
  assert.equal(data.adaptiveContext.difficulty.mode, "progressive");
  assert.match(data.instructionsLine, /ticket/);
  assert.match(data.instructionsLine, /Milo/);
  const prompt = appendAdaptivePrompt("BASE", data);
  assert.match(prompt, /SPACED REPETITION/);
  assert.match(prompt, /ADAPTIVE STORY ENGINE/);
});

test("adaptive integration safely handles empty input", () => {
  const data = createAdaptivePromptData({});
  assert.equal(data.adaptiveContext.profile.total, 0);
  assert.equal(appendAdaptivePrompt("BASE", null), "BASE");
});

console.log("adaptive-integration: all tests passed");
