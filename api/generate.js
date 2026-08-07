// api/generate.js
//
// Moteur IA de Sunami — Groq (modèle llama-3.1-8b-instant), en STREAMING.
// Le prof de langue raconte une histoire immersive dans la langue cible, adaptée au niveau,
// met en valeur le vocabulaire clé (avec traduction FR entre parenthèses) et pose une
// question pour faire avancer le récit.
//
// Variable d'environnement Vercel : GROQ_API_KEY (clé Groq, gr_...)
//
// Réponse : flux texte (text/plain) écrit mot à mot. En cas de dépassement de quota
// Groq (HTTP 429) on renvoie un JSON { error: "rate_limit" } que le front gère proprement.

export const config = { runtime: "edge" };

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "llama-3.1-8b-instant";

// Timeout max pour la connexion initiale à Groq.
const GROQ_CONNECT_TIMEOUT_MS = 15000;
// Timeout max entre deux chunks du flux streaming.
const GROQ_STREAM_STALL_MS = 20000;

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

TON RÔLE
- Raconte une histoire captivante et immersive **dans la langue cible (${language})** pour faire pratiquer l'apprenant.
- Adapte totalement la difficulté au niveau ${level} : phrases très simples et vocabulaire courant pour un débutant ; plus riche et nuancé pour un niveau avancé.

PÉDAGOGIE
- Mets en valeur 1 à 3 mots ou expressions clés en **gras** (entoure-les de doubles astérisques), suivis d'une courte traduction ou explication en français entre parenthèses. Exemple : **el bosque** (la forêt).
- Termine TOUJOURS ton message par UNE question simple, posée dans la langue cible, qui invite l'apprenant à répondre et à faire avancer l'histoire.
- Reprends et valorise ce que l'apprenant vient d'écrire pour continuer le récit de façon cohérente. S'il fait une petite erreur, reformule naturellement la bonne version dans l'histoire, sans le corriger sèchement.

FORMAT
- Chapitres COURTS : 2 à 5 phrases maximum, pour garder une lecture fluide et interactive.
- Écris uniquement l'histoire (pas de titre "Chapitre X", pas de méta-commentaire, pas de JSON).
- Reste chaleureux, imagé et encourageant.`;
}

export default async function handler(req) {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Méthode non autorisée" }), {
      status: 405,
      headers: { "content-type": "application/json" },
    });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "GROQ_API_KEY manquante sur le serveur" }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
  console.log("[GROQ] Clé API présente — préfixe=" + apiKey.slice(0, 6) + "… longueur=" + apiKey.length);

  let body;
  try { body = await req.json(); } catch { body = {}; }
  const { history, userReply, language, level, theme } = body || {};
  const targetLanguage = language || "anglais";
  const cefrLevel = level || "A1-A2 (débutant)";
  const storyTheme = theme || null;

  // On ne garde que les 10 derniers messages (contexte léger)
  const trimmed = Array.isArray(history) ? history.slice(-10) : [];

  const messages = [
    { role: "system", content: buildSystemPrompt(targetLanguage, cefrLevel, storyTheme) },
    ...trimmed,
    { role: "user", content: userReply || "Commence une nouvelle histoire et pose-moi ta première question." },
  ];

  let groqRes;
  const fetchController = new AbortController();
  const fetchTimeoutId = setTimeout(() => fetchController.abort(), GROQ_CONNECT_TIMEOUT_MS);

  const t0 = Date.now();
  console.log("[GROQ] Avant fetch — t=" + t0 + " langue=" + targetLanguage + " niveau=" + cefrLevel + " thème=" + (storyTheme || "aucun") + " messages=" + messages.length);

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
        stream: true,
        temperature: 0.85,
        max_tokens: 600,
      }),
      signal: fetchController.signal,
    });
  } catch (err) {
    clearTimeout(fetchTimeoutId);
    console.log("[GROQ] Échec fetch — t=" + Date.now() + " delta=" + (Date.now() - t0) + "ms err=" + (err.name || "unknown") + " msg=" + (err.message || ""));
    if (err.name === "AbortError") {
      return new Response(
        JSON.stringify({ error: "Le conteur met trop de temps à répondre, réessaie." }),
        { status: 504, headers: { "content-type": "application/json" } }
      );
    }
    return new Response(JSON.stringify({ error: "Erreur réseau vers Groq" }), {
      status: 502,
      headers: { "content-type": "application/json" },
    });
  }
  clearTimeout(fetchTimeoutId);

  const tHeaders = Date.now();
  console.log("[GROQ] Headers reçus — status=" + groqRes.status + " delta=" + (tHeaders - t0) + "ms contentType=" + (groqRes.headers.get("content-type") || "?"));

  // Gestion propre de la limite de requêtes
  if (groqRes.status === 429) {
    console.log("[GROQ] Rate limit 429 — headers reçus, arrêt.");
    return new Response(JSON.stringify({ error: "rate_limit" }), {
      status: 429,
      headers: { "content-type": "application/json" },
    });
  }
  if (!groqRes.ok || !groqRes.body) {
    const errBody = await groqRes.text().catch(() => "");
    console.log("[GROQ] Réponse non-OK — status=" + groqRes.status + " body=" + errBody.slice(0, 300));
    return new Response(JSON.stringify({ error: "Groq: " + errBody.slice(0, 200) }), {
      status: groqRes.status || 500,
      headers: { "content-type": "application/json" },
    });
  }

  console.log("[GROQ] Début streaming — t=" + tHeaders + " prêt à lire le flux.");

  // Transforme le flux SSE de Groq en flux de texte simple (les deltas de contenu)
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const reader = groqRes.body.getReader();
  let buffer = "";
  let chunkTimeoutId = null;
  let closed = false;

  function closeStream(controller) {
    if (closed) return;
    closed = true;
    if (chunkTimeoutId !== null) { clearTimeout(chunkTimeoutId); chunkTimeoutId = null; }
    try { reader.cancel(); } catch {}
    try { controller.close(); } catch {}
  }

  let firstChunk = true;

  const stream = new ReadableStream({
    async pull(controller) {
      if (closed) return;

      // Timeout entre deux chunks : si Groq se fige, on prévient et on ferme.
      chunkTimeoutId = setTimeout(() => {
        chunkTimeoutId = null;
        console.error("[GROQ] STREAM STALL — aucun chunk depuis " + GROQ_STREAM_STALL_MS + "ms, fermeture du flux.");
        controller.enqueue(
          encoder.encode("\n\n⏱️ Le conteur met trop de temps à répondre, réessaie.")
        );
        closeStream(controller);
      }, GROQ_STREAM_STALL_MS);

      try {
        const { done, value } = await reader.read();
        // Chunk reçu : on annule le timeout
        if (chunkTimeoutId !== null) { clearTimeout(chunkTimeoutId); chunkTimeoutId = null; }

        if (firstChunk) {
          firstChunk = false;
          console.log("[GROQ] Premier chunk reçu — delta=" + (Date.now() - tHeaders) + "ms depuis headers, " + (Date.now() - t0) + "ms depuis début.");
        }

        if (done) {
          console.log("[GROQ] Stream terminé (done=true) — total=" + (Date.now() - t0) + "ms");
          closeStream(controller); return;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          const t = line.trim();
          if (!t.startsWith("data:")) continue;
          const data = t.slice(5).trim();
          if (data === "[DONE]") { closeStream(controller); return; }
          try {
            const json = JSON.parse(data);
            const delta = json.choices?.[0]?.delta?.content;
            if (delta) controller.enqueue(encoder.encode(delta));
          } catch { /* ligne partielle, on ignore */ }
        }
      } catch (err) {
        // reader.read() a échoué (ex: reader annulé par le timeout)
        console.error("[GROQ] Erreur lecture stream — " + (err.name || "error") + " " + (err.message || ""));
        if (!closed) {
          controller.enqueue(
            encoder.encode("\n\n⏱️ Le conteur met trop de temps à répondre, réessaie.")
          );
        }
        closeStream(controller);
      }
    },
    cancel() {
      console.log("[GROQ] Stream cancel appelé — total=" + (Date.now() - t0) + "ms");
      closeStream(null);
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "no-cache, no-transform",
    },
  });
}
