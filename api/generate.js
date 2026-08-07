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
  voyage: "Context: a JOURNEY (airports, train stations, hotels, encounters, discovering new places).",
  quotidien: "Context: EVERYDAY LIFE (café, market, neighbors, small daily scenes).",
  travail: "Context: the WORLD OF WORK (office, meeting, interview, colleagues, career).",
  mystere: "Context: a MYSTERY / investigation (clues, suspense, intriguing characters).",
  romance: "Context: a story of ENCOUNTER and gentle emotions, light and warm.",
  aventure: "Context: an ADVENTURE (nature, exploration, obstacles to overcome, action).",
};

// Map French language codes (from client) to English names (for the model).
const LANG_NAME = {
  anglais: "English",
  espagnol: "Spanish",
  allemand: "German",
  italien: "Italian",
  arabe: "Arabic",
  portugais: "Portuguese",
};

// Map French level codes to English.
const LEVEL_NAME = {
  "A1-A2 (débutant)": "A1-A2 (beginner)",
  "B1-B2 (intermédiaire)": "B1-B2 (intermediate)",
  "C1-C2 (avancé)": "C1-C2 (advanced)",
};

// Detailed level instructions injected into the system prompt.
const LEVEL_GUIDE = {
  "A1-A2 (beginner)": "Use ONLY present tense. Sentences of 5-8 words maximum. Only the most common 500 words. No idioms, no complex grammar. Think: a child's first book.",
  "B1-B2 (intermediate)": "Use present, past and future tenses. Moderate vocabulary. Some idioms are OK. Sentences can be longer but stay clear.",
  "C1-C2 (advanced)": "Use all tenses, rich vocabulary, idioms, complex structures. Natural, native-level prose.",
};

function buildSystemPrompt(language, level, theme) {
  const themeLine = theme && THEME_HINTS[theme] ? `\n${THEME_HINTS[theme]}\n` : "";
  const levelGuide = LEVEL_GUIDE[level] || "";
  return `You are the storyteller of "Sunami", a language teacher who teaches through STORYTELLING.

TARGET LANGUAGE: ${language}. LEARNER LEVEL: ${level}.${themeLine}

CRITICAL RULE: You write ONLY in ${language}. Never in French, never in any other language. Every single word of your response must be in ${language}.

DIFFICULTY RULES FOR ${level}:
${levelGuide}

YOUR ROLE
- Tell a captivating, immersive story in ${language} for the learner to practice.
- Adapt strictly to ${level} difficulty.

PEDAGOGY
- Highlight 1-3 key words or expressions in **bold** (surround with double asterisks), followed by a short translation or explanation in French in parentheses. Example: **el bosque** (la forêt).
- ALWAYS end your message with ONE simple question in ${language} that invites the learner to reply and advance the story.
- Build on what the learner just wrote to continue the narrative coherently. If they make a small mistake, naturally reformulate the correct version in the story without harsh correction.

FORMAT
- SHORT chapters: 2 to 5 sentences maximum, for fluid and interactive reading.
- Write ONLY the story. No title, no meta-commentary, no post-scriptum, no "P.S.", no advice to the learner, no JSON. Just the story and the final question.
- Be warm, vivid, and encouraging.`;
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
  const targetLanguage = LANG_NAME[language] || language || "English";
  const cefrLevel = LEVEL_NAME[level] || level || "A1-A2 (beginner)";
  const storyTheme = theme || null;

  const trimmed = Array.isArray(history) ? history.slice(-10) : [];

  const messages = [
    { role: "system", content: buildSystemPrompt(targetLanguage, cefrLevel, storyTheme) },
    ...trimmed,
    { role: "user", content: userReply || "Start a new story and ask me your first question." },
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
        stop: ["P.S.", "P.S :", "Note :", "Note:"],
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