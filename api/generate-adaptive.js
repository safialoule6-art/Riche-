// Adaptive-compatible wrapper around the existing narrative endpoint.
// Keep the core handler as the single compatibility boundary for all callers.
import generateHandler from "./generate.js";
import { createAdaptivePromptData } from "./adaptive-integration.js";

export const config = { runtime: "edge" };
export const maxDuration = 60;

export default async function handler(req) {
  if (req.method !== "POST") return generateHandler(req);

  let body = {};
  try {
    body = await req.json();
  } catch (err) {
    console.error("[conteur]", err);
    return new Response(JSON.stringify({ error: "Corps JSON invalide" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  const adaptiveData = createAdaptivePromptData({
    level: body.level,
    theme: body.theme,
    vocabulary: body.vocabulary,
    memory: body.memory,
  });

  // The legacy endpoint accepts vocabulary strings and a custom universe.
  // Encode the adaptive guidance through those existing fields so the prompt
  // receives it without changing backward-compatible generate.js behavior.
  const adaptiveWords = adaptiveData.adaptiveContext?.profile?.words || [];
  const vocabulary = adaptiveWords
    .map((item) => item.word)
    .filter((word) => typeof word === "string" && word.trim());
  const adaptiveInstructions = adaptiveData.instructionsLine || "";
  const adaptiveUniverse = adaptiveInstructions
    ? `${body.universe || ""}${body.universe ? "\n" : ""}ADAPTIVE STORY GUIDANCE: ${adaptiveInstructions}`
    : body.universe;

  const enrichedBody = {
    ...body,
    vocabulary,
    universe: adaptiveUniverse,
    motherLanguage: body.motherLanguage || body.nativeLanguage || body.langue_maternelle || "francais",
  };

  const enrichedRequest = new Request(req.url, {
    method: req.method,
    headers: req.headers,
    body: JSON.stringify(enrichedBody),
  });

  return generateHandler(enrichedRequest);
}
