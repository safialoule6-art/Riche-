/**
 * Sunami — Adaptive Story Engine
 *
 * Pure, dependency-free helpers used to prepare adaptive story prompts.
 */

const STATUS_ORDER = ['struggling', 'review', 'known', 'mastered'];

function asFiniteNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function normalizeStatus(status) {
  return STATUS_ORDER.includes(status) ? status : 'known';
}

function normalizeWord(entry) {
  if (typeof entry === 'string') {
    const word = entry.trim();
    return word ? { word, status: 'known', score: 0 } : null;
  }
  if (!entry || typeof entry !== 'object') return null;
  const word = String(entry.word || entry.term || entry.text || '').trim();
  if (!word) return null;
  return {
    word,
    translation: String(entry.translation || entry.fr || entry.meaning || '').trim(),
    status: normalizeStatus(entry.status),
    score: asFiniteNumber(entry.score, 0),
    attempts: Math.max(0, Math.floor(asFiniteNumber(entry.attempts, 0))),
    correct: Math.max(0, Math.floor(asFiniteNumber(entry.correct, 0))),
    lastSeen: entry.lastSeen || entry.updatedAt || null,
  };
}

export function normalizeVocabulary(words) {
  if (!Array.isArray(words)) return [];
  const unique = new Map();
  for (const raw of words) {
    const item = normalizeWord(raw);
    if (!item) continue;
    const key = item.word.toLocaleLowerCase();
    const previous = unique.get(key);
    if (!previous) {
      unique.set(key, item);
      continue;
    }
    unique.set(key, {
      ...previous,
      ...item,
      translation: item.translation || previous.translation || '',
      status: item.status !== 'known' || previous.status === 'known' ? item.status : previous.status,
      score: item.score || previous.score || 0,
      attempts: item.attempts || previous.attempts || 0,
      correct: item.correct || previous.correct || 0,
      lastSeen: item.lastSeen || previous.lastSeen || null,
    });
  }
  return [...unique.values()];
}

export function buildVocabularyProfile(words, options = {}) {
  const limit = Math.max(1, Math.min(100, Math.floor(asFiniteNumber(options.limit, 40))));
  const vocabulary = normalizeVocabulary(words);
  const groups = Object.fromEntries(STATUS_ORDER.map(status => [status, vocabulary.filter(item => item.status === status)]));
  const selected = STATUS_ORDER.flatMap(status => groups[status]).slice(0, limit);
  return {
    total: vocabulary.length,
    counts: Object.fromEntries(STATUS_ORDER.map(status => [status, groups[status].length])),
    priority: selected.filter(item => item.status === 'struggling' || item.status === 'review').map(item => item.word),
    words: selected.map(item => ({ word: item.word, translation: item.translation || undefined, status: item.status, score: item.score })),
  };
}

export function getAdaptiveDifficulty(level, profile = {}) {
  const normalizedLevel = String(level || 'A1').toUpperCase();
  const struggling = asFiniteNumber(profile.counts?.struggling, 0);
  const review = asFiniteNumber(profile.counts?.review, 0);
  if (struggling >= 5) return { level: normalizedLevel, mode: 'supportive', newWords: 1, sentenceLength: 'short' };
  if (review >= 8) return { level: normalizedLevel, mode: 'recycling', newWords: 2, sentenceLength: 'short-to-medium' };
  return { level: normalizedLevel, mode: 'progressive', newWords: 3, sentenceLength: 'level-appropriate' };
}

export function buildAdaptiveStoryContext({ level, theme, vocabulary, memory } = {}) {
  const profile = buildVocabularyProfile(vocabulary);
  const difficulty = getAdaptiveDifficulty(level, profile);
  const safeMemory = memory && typeof memory === 'object' ? {
    facts: Array.isArray(memory.facts) ? memory.facts.slice(-20) : [],
    decisions: Array.isArray(memory.decisions) ? memory.decisions.slice(-12) : [],
  } : { facts: [], decisions: [] };
  return {
    theme: String(theme || 'daily life'),
    profile,
    difficulty,
    memory: safeMemory,
    instructions: [
      `Use ${difficulty.mode} progression.`,
      `Introduce at most ${difficulty.newWords} new target words.`,
      `Recycle priority words naturally: ${profile.priority.join(', ') || 'none'}.`,
      `Keep sentence length ${difficulty.sentenceLength}.`,
      `Maintain continuity with Saga memory: ${safeMemory.facts.map(item => `${item.key || 'fact'}=${item.value || ''}`).join('; ') || 'none'}.`,
      'Do not force vocabulary that would make the story unnatural.',
    ],
  };
}

export default { normalizeVocabulary, buildVocabularyProfile, getAdaptiveDifficulty, buildAdaptiveStoryContext };
