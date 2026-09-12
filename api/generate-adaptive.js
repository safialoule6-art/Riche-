// Adaptive-compatible wrapper around the existing narrative endpoint.
// The original api/generate.js remains untouched for backward compatibility.
import generateHandler from "./generate.js";
import { createAdaptivePromptData } from "./adaptive-integration.js";

export const config = { runtime: "edge" };

export default async function handler(req) {
  if (req.method !== "POST") return generateHandler(req);

  let body = {};
  try {
    body = await req.json();
  } catch (_) {
    body = {};
  }

  const adaptiveData = createAdaptivePromptData({
    level: body.level,
    theme: body.theme,
    vocabulary: body.vocabulary,
    memory: body.memory,
  });

  const enrichedBody = {
    ...body,
    vocabulary: adaptiveData.adaptiveContext?.profile?.words || body.vocabulary || [],
    adaptiveContext: adaptiveData.adaptiveContext,
  };

  const enrichedRequest = new Request(req.url, {
    method: req.method,
    headers: req.headers,
    body: JSON.stringify(enrichedBody),
  });

  return generateHandler(enrichedRequest);
}
