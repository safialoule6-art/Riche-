export const config = { runtime: "edge" };

import generate from './generate.js';

const TARGET_LANGUAGES = new Set(['anglais', 'espagnol', 'allemand', 'italien', 'arabe', 'portugais']);
const LANGUAGE_SIGNATURES = {
  anglais: ['el', 'los', 'las', 'una', 'está', 'avec', 'dans', 'une', 'les', 'est', 'der', 'die', 'das', 'und', 'ist', 'il', 'lo', 'gli', 'che', 'con', 'uma', 'não', 'para'],
  espagnol: ['the', 'and', 'with', 'from', 'le', 'les', 'une', 'dans', 'est', 'der', 'die', 'das', 'und', 'ist', 'il', 'lo', 'gli', 'che', 'con', 'uma', 'não', 'para'],
  allemand: ['the', 'and', 'with', 'from', 'le', 'les', 'une', 'dans', 'est', 'el', 'los', 'las', 'una', 'está', 'il', 'lo', 'gli', 'che', 'con', 'uma', 'não', 'para'],
  italien: ['the', 'and', 'with', 'from', 'le', 'les', 'une', 'dans', 'est', 'el', 'los', 'las', 'una', 'está', 'der', 'die', 'das', 'und', 'ist', 'uma', 'não', 'para'],
  portugais: ['the', 'and', 'with', 'from', 'le', 'les', 'une', 'dans', 'est', 'el', 'los', 'las', 'una', 'está', 'der', 'die', 'das', 'und', 'ist', 'il', 'lo', 'gli', 'che', 'con'],
};

function visibleText(value) {
  return String(value || '')
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\*\*/g, ' ')
    .replace(/https?:\/\/\S+/g, ' ')
    .toLowerCase();
}

function hasMixedTargetLanguage(data, language) {
  if (!TARGET_LANGUAGES.has(language) || !data) return false;
  const story = visibleText(data.story);
  const choices = Array.isArray(data.choices) ? data.choices.map(visibleText).join(' ') : '';
  const visible = `${story} ${choices}`;

  if (language === 'arabe') {
    const latinTokens = visible.match(/[A-Za-zÀ-ÖØ-öø-ÿ]+/g) || [];
    return latinTokens.length >= 2;
  }

  const signatures = LANGUAGE_SIGNATURES[language] || [];
  const hits = new Set(signatures.filter(word => new RegExp(`(^|\\s)${word}(?=\\s|[.,!?;:'’"-]|$)`, 'i').test(visible)));
  return hits.size >= 2;
}

function repairPrompt(language) {
  const names = {
    anglais: 'English', espagnol: 'Spanish', allemand: 'German',
    italien: 'Italian', arabe: 'Arabic', portugais: 'Portuguese'
  };
  return `STRICT LANGUAGE REPAIR: The target language is ${names[language] || language}. Rewrite the story and choices entirely in ${names[language] || language}. Do not mix in Spanish, English, French, German, Italian, Portuguese, or Arabic. Highlight only target-language vocabulary, followed by its French translation in parentheses. Keep names only when necessary. The story must end with exactly one question in the target language.`;
}

export default async function handler(req) {
  if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'Méthode non autorisée' }), { status: 405, headers: { 'content-type': 'application/json' } });

  const body = await req.clone().json().catch(() => ({}));
  const first = await generate(req);
  if (!first.ok || !TARGET_LANGUAGES.has(body.language)) return first;

  const data = await first.clone().json().catch(() => null);
  if (!data || !hasMixedTargetLanguage(data, body.language)) return first;

  const retryBody = {
    ...body,
    history: [
      ...(Array.isArray(body.history) ? body.history : []).slice(-7),
      { role: 'system', content: repairPrompt(body.language) }
    ]
  };

  const retryReq = new Request(req.url, {
    method: 'POST',
    headers: req.headers,
    body: JSON.stringify(retryBody)
  });
  const retry = await generate(retryReq);
  if (!retry.ok) return first;
  return retry;
}
