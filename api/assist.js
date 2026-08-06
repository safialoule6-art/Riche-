// api/assist.js
//
// Petites aides IA (non-streaming) via Groq :
//   - mode "translate" : traduit un texte de la langue cible vers le français
//   - mode "suggest"   : propose 3 réponses courtes dans la langue cible pour continuer l'histoire
//
// Variable d'environnement : GROQ_API_KEY

export const config = { runtime: "edge" };

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "llama-3.1-8b-instant";

async function groqChat(apiKey, system, user, maxTokens) {
  return fetch(GROQ_URL, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature: 0.4,
      max_tokens: maxTokens,
      stream: false,
    }),
  });
}

export default async function handler(req) {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Méthode non autorisée" }), { status: 405, headers: { "content-type": "application/json" } });
  }
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "GROQ_API_KEY manquante" }), { status: 500, headers: { "content-type": "application/json" } });
  }

  let body; try { body = await req.json(); } catch { body = {}; }
  const { mode, text, language, level } = body || {};
  const targetLanguage = language || "anglais";
  const cefrLevel = level || "A1-A2 (débutant)";

  try {
    if (mode === "translate") {
      const sys = `Tu es un traducteur. Traduis fidèlement le texte de l'utilisateur en FRANÇAIS clair et naturel. Réponds UNIQUEMENT avec la traduction, sans guillemets ni commentaire.`;
      const r = await groqChat(apiKey, sys, String(text || "").slice(0, 1500), 400);
      if (r.status === 429) return new Response(JSON.stringify({ error: "rate_limit" }), { status: 429, headers: { "content-type": "application/json" } });
      const data = await r.json();
      const result = data.choices?.[0]?.message?.content?.trim() || "";
      return new Response(JSON.stringify({ result }), { headers: { "content-type": "application/json" } });
    }

    if (mode === "suggest") {
      const sys = `Tu aides un apprenant de ${targetLanguage} (niveau ${cefrLevel}). À partir du dernier passage d'histoire fourni, propose 3 réponses COURTES et simples que l'apprenant pourrait écrire EN ${targetLanguage} pour continuer l'histoire, adaptées à son niveau. Réponds UNIQUEMENT par un tableau JSON de 3 chaînes, ex: ["...","...","..."]. Rien d'autre.`;
      const r = await groqChat(apiKey, sys, String(text || "").slice(0, 1500), 200);
      if (r.status === 429) return new Response(JSON.stringify({ error: "rate_limit" }), { status: 429, headers: { "content-type": "application/json" } });
      const data = await r.json();
      let raw = data.choices?.[0]?.message?.content?.trim() || "[]";
      let suggestions = [];
      try {
        const start = raw.indexOf("["), end = raw.lastIndexOf("]");
        if (start !== -1 && end !== -1) raw = raw.slice(start, end + 1);
        suggestions = JSON.parse(raw);
      } catch {
        suggestions = raw.split("\n").map(s => s.replace(/^[\-\d.\)\s"]+/, "").replace(/"$/, "").trim()).filter(Boolean);
      }
      suggestions = (Array.isArray(suggestions) ? suggestions : []).filter(s => typeof s === "string" && s).slice(0, 3);
      return new Response(JSON.stringify({ suggestions }), { headers: { "content-type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "mode inconnu" }), { status: 400, headers: { "content-type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Erreur interne" }), { status: 500, headers: { "content-type": "application/json" } });
  }
}
