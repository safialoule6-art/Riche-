// api/generate.js
//
// Moteur narratif de Sunami — Groq (llama-3.1-8b-instant), SORTIE JSON STRUCTURÉE.
//
// Objectif : une vraie SAGA à suivre (mêmes personnages, même intrigue, épisodes
// qui s'enchaînent), pas des scènes au hasard. La continuité est garantie par un
// RÉSUMÉ GLISSANT ("recap") maintenu par le modèle et renvoyé à chaque tour, en
// plus de l'historique récent.
//
// Entrée (POST JSON) — tous optionnels sauf language/level :
//   history        : [{role, content}]   derniers messages (contexte court)
//   userReply      : string              réponse de l'apprenant (null au démarrage)
//   language,level : codes FR (mappés)   langue cible + niveau CECR
//   theme          : string|null         ambiance
//   vocabulary     : [string]            mots à réviser (répétition espacée)
//   recap          : string              résumé FR de la saga jusqu'ici
//   characters     : [{name, role}]      personnages connus
//   setting        : string              lieu/décor courant
//   protagonist    : string              nom du héros (apprenant)
//   episode,chapter: number              position dans la saga
//
// Sortie (JSON) :
//   { text, story, grammar, vocab:[{word,fr}], characters:[{name,role}],
//     setting, recap, emotion, episodeComplete, episodeTitle, choices:[string] }
//
// Variables d'environnement Vercel : GROQ_API_KEY (+ GROQ_API_KEY_2 optionnelle).

export const config = { runtime: "edge" };

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "llama-3.1-8b-instant";
const GROQ_TIMEOUT_MS = 25000;
const CHAPTERS_PER_EPISODE = 5; // un épisode = ~5 chapitres puis cliffhanger

const THEME_HINTS = {
  cyberpunk: "CYBERPUNK in a neon-lit Tokyo: rain, holograms, hackers, megacorps, gritty futuristic streets.",
  polar: "DETECTIVE INVESTIGATION in London: clues, suspects, foggy streets, suspense, a mystery to solve.",
  fantasy: "FANTASY in a magical forest: mythical creatures, spells, ancient secrets, a quest.",
  espace: "SPACE / SCIENCE-FICTION: a starship, distant planets, aliens, exploration and wonder.",
  voyage: "JOURNEY / road trip (airports, train stations, hotels, encounters, discovering new places).",
  romance: "ENCOUNTER and gentle emotions, light and warm.",
  mystere: "MYSTERY in an old mansion: hidden rooms, secrets, gentle suspense, intriguing characters.",
  quotidien: "EVERYDAY LIFE (café, market, neighbors, small daily scenes).",
  travail: "WORLD OF WORK (office, meeting, interview, colleagues, career).",
  aventure: "ADVENTURE (nature, exploration, obstacles to overcome, action).",
};

const LANG_NAME = {
  anglais: "English", espagnol: "Spanish", allemand: "German",
  italien: "Italian", arabe: "Arabic", portugais: "Portuguese", francais: "French",
};

const LEVEL_NAME = {
  "A1-A2 (débutant)": "A1-A2 (beginner)",
  "B1-B2 (intermédiaire)": "B1-B2 (intermediate)",
  "C1-C2 (avancé)": "C1-C2 (advanced)",
};

const LEVEL_GUIDE = {
  "A1-A2 (beginner)": "Use ONLY present tense. Sentences of 5-8 words max. Only the ~500 most common words. No idioms.",
  "B1-B2 (intermediate)": "Use present, past and future. Moderate vocabulary. A few idioms are OK. Clear sentences.",
  "C1-C2 (advanced)": "All tenses, rich vocabulary, idioms, complex structures. Native-level prose.",
};

function buildSystemPrompt(o) {
  const { language, level, theme, universe, hasUserReply, vocabulary, recap, characters, setting, protagonist, episode, chapter } = o;
  const themeLine = universe
    ? `\nSTORY CONTEXT (user's custom universe — honor it): ${universe}.`
    : (theme && THEME_HINTS[theme] ? `\nSTORY CONTEXT: ${THEME_HINTS[theme]}` : "");
  const levelGuide = LEVEL_GUIDE[level] || "";
  const vocabLine = vocabulary && vocabulary.length
    ? `\nSPACED REPETITION: naturally reuse at least 2 of these known words: ${vocabulary.join(", ")}.` : "";
  const charLine = characters && characters.length
    ? `\nKNOWN CHARACTERS (keep them consistent, do NOT rename): ${characters.map(c => `${c.name} (${c.role || "?"})`).join("; ")}.` : "";
  const settingLine = setting ? `\nCURRENT SETTING: ${setting}.` : "";
  const recapLine = recap ? `\nSTORY SO FAR (authoritative recap — stay 100% consistent with it): ${recap}` : "";
  const nearEnd = chapter && chapter >= CHAPTERS_PER_EPISODE;
  const arcLine = nearEnd
    ? `\nEPISODE PACING: this is chapter ${chapter} of episode ${episode || 1}. Bring THIS episode to a satisfying beat and END it on a CLIFFHANGER. Set "episodeComplete" to true and provide a short French "episodeTitle".`
    : `\nEPISODE PACING: this is chapter ${chapter || 1} of episode ${episode || 1}. Advance the plot one meaningful step. Set "episodeComplete" to false.`;

  return `You are the storyteller of "Sunami", a language tutor who teaches through a SERIALIZED, ongoing STORY (like a TV show). The learner${protagonist ? ` (named ${protagonist})` : ""} is the protagonist.

TARGET LANGUAGE: ${language}. LEARNER LEVEL: ${level}.${themeLine}

ABSOLUTE RULES
- The "story" field is written ONLY in ${language}. Every word of the story must be in ${language}.
- CONTINUITY IS SACRED: same protagonist, same characters, same places, one coherent plot that PROGRESSES. Never restart or contradict the recap. Never invent a new unrelated scene.
- Difficulty for ${level}: ${levelGuide}${vocabLine}
${recapLine}${charLine}${settingLine}${arcLine}

PEDAGOGY
- In "story": 2 to 5 sentences. Highlight 1-3 key words/expressions with **double asterisks**, each immediately followed by its French translation in parentheses, e.g. **el bosque** (la forêt).
- ALWAYS end "story" with exactly ONE simple question in ${language} that pushes the plot forward.
- Build directly on the learner's last reply.${hasUserReply ? `
- "grammar": a SHORT friendly note in FRENCH about the learner's reply (max 2 sentences). If they made mistakes, show the correct form; if perfect, encourage briefly.` : `
- "grammar": empty string for the very first chapter.`}

OUTPUT — return ONLY a valid minified JSON object, no markdown, with EXACTLY these keys:
{
 "sagaTitle": "<short catchy FRENCH title for the WHOLE saga, like a TV series name (2-4 words); keep it identical across episodes>",
 "story": "<text in ${language}, bold key words + (FR translation), ends with one question>",
 "grammar": "<short FR note or empty>",
 "vocab": [{"word":"<word in ${language}>","fr":"<French translation>"}],
 "characters": [{"name":"<name>","role":"<short FR role>"}],
 "setting": "<short FR description of the current place>",
 "recap": "<UPDATED French recap of the WHOLE saga so far, 3-5 sentences, includes what just happened>",
 "emotion": "happy|surprised|think|neutral",
 "episodeComplete": ${nearEnd ? "true" : "false"},
 "episodeTitle": "<short FR episode title when episodeComplete is true, else empty>",
 "choices": ["<short suggested reply in ${language}>","<another short suggested reply in ${language}>"],
 "quiz": {"q":"<short FRENCH comprehension question about what just happened in the story, or empty string on the very first chapter>","options":["<French option>","<French option>","<French option>"],"answer":<0-based index of the correct option>}
}
The "vocab" array must list the words you highlighted in "story" with their French translation. The "recap" must be cumulative so a future episode stays consistent. The "quiz" is a quick comprehension check written in FRENCH about the latest story beat, with 3 plausible French options and the 0-based index of the correct one; include it from the 2nd chapter onward, and for the very first chapter set it to {"q":"","options":[],"answer":0}.`;
}

function jsonResponse(data, status) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function safeParse(content) {
  // Try direct JSON, then extract the first {...} block.
  try { return JSON.parse(content); } catch (_) {}
  const start = content.indexOf("{");
  const end = content.lastIndexOf("}");
  if (start !== -1 && end > start) {
    try { return JSON.parse(content.slice(start, end + 1)); } catch (_) {}
  }
  return null;
}

async function callGroq(apiKey, messages, signal) {
  return fetch(GROQ_URL, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: MODEL,
      messages,
      stream: false,
      temperature: 0.8,
      max_tokens: 900,
      response_format: { type: "json_object" },
    }),
    signal,
  });
}

export default async function handler(req) {
  if (req.method !== "POST") return jsonResponse({ error: "Méthode non autorisée" }, 405);

  const apiKey = process.env.GROQ_API_KEY;
  const apiKey2 = process.env.GROQ_API_KEY_2;
  if (!apiKey && !apiKey2) return jsonResponse({ error: "GROQ_API_KEY manquante sur le serveur" }, 500);
  const key1 = apiKey || apiKey2;

  let body;
  try { body = await req.json(); } catch { body = {}; }
  const {
    history, userReply, language, level, theme, universe, vocabulary,
    recap, characters, setting, protagonist, episode, chapter,
  } = body || {};

  const targetLanguage = LANG_NAME[language] || language || "English";
  const cefrLevel = LEVEL_NAME[level] || level || "A1-A2 (beginner)";
  const customUniverse = (typeof universe === "string" ? universe.trim() : "").slice(0, 160);
  const vocabList = Array.isArray(vocabulary) ? vocabulary.filter(v => typeof v === "string" && v) : [];
  const charList = Array.isArray(characters) ? characters.filter(c => c && c.name) : [];
  const trimmed = Array.isArray(history) ? history.slice(-8) : [];
  const hasUserReply = !!userReply;

  const system = buildSystemPrompt({
    language: targetLanguage, level: cefrLevel, theme: theme || null, universe: customUniverse, hasUserReply,
    vocabulary: vocabList, recap: recap || "", characters: charList,
    setting: setting || "", protagonist: protagonist || "", episode: episode || 1, chapter: chapter || 1,
  });

  const messages = [
    { role: "system", content: system },
    ...trimmed,
    { role: "user", content: userReply || "Begin episode 1: introduce me (the protagonist) and the setting, then ask your first question. Respond in the required JSON format." },
  ];

  const ctrl = new AbortController();
  const timeoutId = setTimeout(() => ctrl.abort(), GROQ_TIMEOUT_MS);

  let groqRes;
  try {
    groqRes = await callGroq(key1, messages, ctrl.signal);
    if (groqRes.status === 429 && apiKey2 && key1 !== apiKey2) {
      groqRes = await callGroq(apiKey2, messages, ctrl.signal);
    }
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === "AbortError") return jsonResponse({ error: "Le conteur met trop de temps à répondre, réessaie." }, 504);
    return jsonResponse({ error: "Erreur réseau vers Groq" }, 502);
  }
  clearTimeout(timeoutId);

  if (groqRes.status === 429) return jsonResponse({ error: "rate_limit" }, 429);
  if (!groqRes.ok) {
    const errBody = await groqRes.text().catch(() => "");
    return jsonResponse({ error: "Groq: " + errBody.slice(0, 200) }, groqRes.status || 500);
  }

  let data;
  try { data = await groqRes.json(); } catch { return jsonResponse({ error: "Réponse Groq illisible" }, 502); }
  const content = data.choices?.[0]?.message?.content || "";
  if (!content.trim()) return jsonResponse({ error: "Le conteur n'a rien répondu, réessaie." }, 500);

  const parsed = safeParse(content);

  // Fallback : si le JSON est invalide, on renvoie le texte brut (rétrocompatible).
  if (!parsed || typeof parsed.story !== "string") {
    return jsonResponse({ text: content.trim(), story: content.trim(), grammar: null, fallback: true }, 200);
  }

  const out = {
    text: parsed.story.trim(),           // alias rétrocompatible
    story: parsed.story.trim(),
    sagaTitle: (parsed.sagaTitle && String(parsed.sagaTitle).trim()) || "",
    grammar: (parsed.grammar && String(parsed.grammar).trim()) || null,
    vocab: Array.isArray(parsed.vocab) ? parsed.vocab.filter(v => v && v.word).slice(0, 6) : [],
    characters: Array.isArray(parsed.characters) ? parsed.characters.filter(c => c && c.name).slice(0, 12) : [],
    setting: (parsed.setting && String(parsed.setting).trim()) || setting || "",
    recap: (parsed.recap && String(parsed.recap).trim()) || recap || "",
    emotion: ["happy", "surprised", "think", "neutral"].includes(parsed.emotion) ? parsed.emotion : "neutral",
    episodeComplete: parsed.episodeComplete === true,
    episodeTitle: (parsed.episodeTitle && String(parsed.episodeTitle).trim()) || "",
    choices: Array.isArray(parsed.choices) ? parsed.choices.filter(c => typeof c === "string" && c).slice(0, 3) : [],
    quiz: (parsed.quiz && typeof parsed.quiz.q === "string" && parsed.quiz.q.trim() && Array.isArray(parsed.quiz.options) && parsed.quiz.options.length >= 2)
      ? { q: parsed.quiz.q.trim(), options: parsed.quiz.options.filter(o => typeof o === "string" && o).slice(0, 4), answer: Number.isInteger(parsed.quiz.answer) ? parsed.quiz.answer : 0 }
      : null,
  };

  return jsonResponse(out, 200);
}
