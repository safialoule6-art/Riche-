export const config = { runtime: "edge" };
export const maxDuration = 60;

import generate from './generate.js';

export default async function handler(req) {
  try {
    return await generate(req);
  } catch (err) {
    console.error('[conteur]', err);
    return new Response(JSON.stringify({ error: 'Erreur inattendue du conteur' }), { status: 500, headers: { 'content-type': 'application/json' } });
  }
}
