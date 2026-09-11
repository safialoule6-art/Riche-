export const config = { runtime: "edge" };

import generate from './generate.js';

function hasMixedTargetLanguage(story, language) {
  if (language !== 'arabe' || typeof story !== 'string') return false;
  const visible = story
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\*\*/g, ' ')
    .replace(/https?:\/\/\S+/g, ' ');
  const latinTokens = visible.match(/[A-Za-zÀ-ÖØ-öø-ÿ]+/g) || [];
  return latinTokens.length >= 2;
}

export default async function handler(req) {
  if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'Méthode non autorisée' }), { status: 405, headers: { 'content-type': 'application/json' } });

  const body = await req.clone().json().catch(() => ({}));
  const first = await generate(req);
  if (!first.ok || body.language !== 'arabe') return first;

  const data = await first.clone().json().catch(() => null);
  if (!data || !hasMixedTargetLanguage(data.story, body.language)) return first;

  const retryBody = {
    ...body,
    history: [
      ...(Array.isArray(body.history) ? body.history : []).slice(-7),
      {
        role: 'system',
        content: 'STRICT REPAIR: The target language is Arabic. Rewrite the story and choices entirely in Arabic. Do not use Spanish, English, French, or any other non-Arabic word in the story or choices. Highlight only Arabic vocabulary, followed by its French translation in parentheses. Keep names only when they are necessary.'
      }
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
