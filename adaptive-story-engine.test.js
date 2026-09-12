import assert from "node:assert/strict";
import {
  normalizeVocabulary,
  buildVocabularyProfile,
  getAdaptiveDifficulty,
  buildAdaptiveStoryContext,
} from "./adaptive-story-engine.js";

const words = normalizeVocabulary([
  "hello",
  { word: "Hello", fr: "bonjour", status: "struggling" },
  { word: "travel", translation: "voyager", status: "review" },
  { term: "friend", meaning: "ami", status: "known" },
]);

assert.equal(words.length, 3);
assert.equal(words.find((w) => w.word === "hello").status, "struggling");
assert.equal(words.find((w) => w.word === "hello").translation, "bonjour");

const profile = buildVocabularyProfile(words);
assert.equal(profile.total, 3);
assert.deepEqual(profile.counts, { struggling: 1, review: 1, known: 1, mastered: 0 });
assert.equal(profile.priority[0].word, "hello");

assert.equal(getAdaptiveDifficulty("A1-A2 (débutant)", { counts: { struggling: 5, review: 0 } }).mode, "supportive");
assert.equal(getAdaptiveDifficulty("A1-A2 (débutant)", { counts: { struggling: 0, review: 8 } }).mode, "recycling");
assert.equal(getAdaptiveDifficulty("A1-A2 (débutant)", { counts: { struggling: 0, review: 0 } }).mode, "progressive");

const context = buildAdaptiveStoryContext({
  level: "A1-A2 (débutant)",
  theme: "voyage",
  vocabulary: words,
  memory: { facts: [{ key: "pet", value: "Milo" }], decisions: [{ summary: "Le héros accepte le billet." }] },
});
assert.equal(context.profile.total, 3);
assert.equal(context.difficulty.mode, "progressive");
assert.match(context.instructions, /Milo/);
assert.match(context.instructions, /travel/);

console.log("adaptive-story-engine: all tests passed");
