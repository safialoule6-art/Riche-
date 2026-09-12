// Adaptive Story Engine integration helpers for Sunami.
// Keeps the existing narrative endpoint behavior intact while exposing a small,
// reusable adapter for API handlers and future clients.

import { buildPromptAdaptiveContext } from "./adaptive-context.js";

export function createAdaptivePromptData({ level, theme, vocabulary, memory }) {
  const adaptiveContext = buildPromptAdaptiveContext({
    level,
    theme: theme || null,
    vocabulary: Array.isArray(vocabulary) ? vocabulary : [],
    memory: memory || null,
  });

  return {
    adaptiveContext,
    vocabularyLine: adaptiveContext.vocabularyLine || "",
    instructionsLine: adaptiveContext.instructionsLine || "",
  };
}

export function appendAdaptivePrompt(prompt, adaptiveData) {
  if (!adaptiveData || typeof adaptiveData !== "object") return prompt;

  const lines = [];
  if (adaptiveData.vocabularyLine) {
    lines.push(`SPACED REPETITION: ${adaptiveData.vocabularyLine}.`);
  }
  if (adaptiveData.instructionsLine) {
    lines.push(`ADAPTIVE STORY ENGINE: ${adaptiveData.instructionsLine}`);
  }

  return lines.length ? `${prompt}\n\n${lines.join("\n")}` : prompt;
}

export default createAdaptivePromptData;
