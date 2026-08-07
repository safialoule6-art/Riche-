// api/generate.js
//
// Moteur IA de Sunami — Groq (modèle llama-3.1-8b-instant), réponse JSON complète.
// Le prof de langue raconte une histoire immersive dans la langue cible, adaptée au niveau,
// met en valeur le vocabulaire clé (avec traduction FR entre parenthèses) et pose une
// question pour faire avancer le récit.
//
// Variable d'environnement Vercel : GROQ_API_KEY (clé Groq, gr_...)
//
// Réponse : JSON { text: "..." } — le client simule l'effet machine à écrire.
// En cas de dépassement de quota Groq (HTTP 429) on renvoie { error: "rate_limit" }.

export const config = { runtime: "edge" };

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "llama-3.1-8b-instant";
const GROQ_TIMEOUT_MS = 25000; // timeout max pour l'appel complet à Groq

const THEME_HINTS = {
  voyage: "Contexte : un VOYAGE (aéroports, gares, hôtels, rencontres, découvertes de lieux).",
  quotidien: "Contexte : la VIE QUOTIDIENNE (café, marché, voisins, petites scènes du jour).",
  travail: "Contexte : le MONDE DU TRAVAIL (bureau, réunion, entretien, collègues, carrière).",
  mystere: "Contexte : un MYSTÈRE / une enquête (indices, suspense, personnages intrigants).",
  romance: "Contexte : une histoire de RENCONTRE et d'émotions douces, légère et chaleureuse.",
  aventure: "Contexte : une AVENTURE (nature, exploration, obstacles à surmonter, action).",
};

function buildSystemPrompt(language, level, theme) {
  const themeLine = theme && THEME_HINTS[theme] ? `\n${THEME_HINTS[theme]}\n` : "";
  return `Tu es le conteur de "Sunami", un professeur de langue qui enseigne par le STORYTELLING.

LANGUE CIBLE : ${language}. NIVEAU DE L'APPRENANT : ${level}.${themeLine}

RÈGLE ABSOLUE — tu écris TOUJOURS et UNIQUEMENT dans la langue cible (${language}). JAMAIS en français, JAMAIS dans une autre langue. Même si les consignes ci-dessous sont en français, ta réponse doit être intégralement en ${language}.

TON RÔLE
- Raconte une histoire captivante et immersive en ${language} pour faire pratiquer l'apprenant.
- Adapte totalement la difficulté au niveau ${level} : phrases très simples et vocabulaire courant pour un débutant ; plus riche et nuancé pour un niveau avancé.

PÉDAGOGIE
- Mets en valeur 1 à 3 mots ou expressions clés en **gras** (entoure-les de doubles astérisques), suivis d'une courte traduction ou explication en français entre parenthèses. Exemple : **el bosque** (la forêt).
- Termine TOUJOURS ton message par UNE question simple, posée dans la langue cible, qui invite l'apprenant à répondre et à faire avancer l'histoire.
- Reprends et valorise ce que l'apprenant vient d'écrire pour continuer le récit de façon cohérente. S'il fait une petite erreur, reformule naturellement la bonne version dans l'histoire, sans le corriger sèchement.

FORMAT
- Chapitres COURTS : 2 à 5 phrases maximum, pour garder une lecture fluide et interactive.
- Écris UNIQUEMENT l'histoire. Pas de titre, pas de méta-commentaire, pas de post-scriptum, pas de "P.S.", pas de conseils à l'apprenant, pas de JSON. Juste l'histoire et la question finale.
- Reste chaleureux, imagé et encourageant.`;
}

function jsonResponse(data, status) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export default async function handler(req) {
  if (req.method !== "POST") {
    return jsonResponse({ error: "Méthode non autorisée" }, 405);
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return jsonResponse({ error: "GROQ_API_KEY manquante sur le serveur" }, 500);
  }
  console.log("[GROQ] Clé API présente — préfixe=" + apiKey.slice(0, 6) + "… longueur=" + apiKey.length);

  let body;
  try { body = await req.json(); } catch { body = {}; }
  const { history, userReply, language, level, theme } = body || {};
  const targetLanguage = language || "anglais";
  const cefrLevel = level || "A1-A2 (débutant)";
  const storyTheme = theme || null;

  const trimmed = Array.isArray(history) ? history.slice(-10) : [];

  const messages = [
    { role: "system", content: buildSystemPrompt(targetLanguage, cefrLevel, storyTheme) },
    ...trimmed,
    { role: "user", content: userReply || "Commence une nouvelle histoire et pose-moi ta première question." },
  ];

  const t0 = Date.now();
  console.log("[GROQ] Avant fetch — t=" + t0 + " langue=" + targetLanguage + " niveau=" + cefrLevel + " thème=" + (storyTheme || "aucun") + " messages=" + messages.length);

  const fetchController = new AbortController();
  const fetchTimeoutId = setTimeout(() => fetchController.abort(), GROQ_TIMEOUT_MS);

  let groqRes;
  try {
    groqRes = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages,
        stream: false,
        temperature: 0.85,
        max_tokens: 600,
        stop: ["P.S.", "P.S :", "Note :", "Note:", "N.B."],
      }),
      signal: fetchController.signal,
    });
  } catch (err) {
    clearTimeout(fetchTimeoutId);
    console.log("[GROQ] Échec fetch — delta=" + (Date.now() - t0) + "ms err=" + (err.name || "unknown") + " msg=" + (err.message || ""));
    if (err.name === "AbortError") {
      return jsonResponse({ error: "Le conteur met trop de temps à répondre, réessaie." }, 504);
    }
    return jsonResponse({ error: "Erreur réseau vers Groq" }, 502);
  }
  clearTimeout(fetchTimeoutId);

  const tRes = Date.now();
  console.log("[GROQ] Réponse reçue — status=" + groqRes.status + " delta=" + (tRes - t0) + "ms");

  if (groqRes.status === 429) {
    console.log("[GROQ] Rate limit 429.");
    return jsonResponse({ error: "rate_limit" }, 429);
  }

  if (!groqRes.ok) {
    const errBody = await groqRes.text().catch(() => "");
    console.log("[GROQ] Réponse non-OK — status=" + groqRes.status + " body=" + errBody.slice(0, 300));
    return jsonResponse({ error: "Groq: " + errBody.slice(0, 200) }, groqRes.status || 500);
  }

  let data;
  try {
    data = await groqRes.json();
  } catch (err) {
    console.log("[GROQ] JSON parse échoué — " + (err.message || ""));
    return jsonResponse({ error: "Réponse Groq illisible" }, 502);
  }

  const content = data.choices?.[0]?.message?.content || "";
  console.log("[GROQ] OK — total=" + (Date.now() - t0) + "ms texte=" + content.length + " chars");

  if (!content.trim()) {
    return jsonResponse({ error: "Le conteur n'a rien répondu, réessaie." }, 500);
  }

  return jsonResponse({ text: content }, 200);
}