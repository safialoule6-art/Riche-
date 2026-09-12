import { buildAdaptiveStoryContext } from "../adaptive-story-engine.js";

export function buildPromptAdaptiveContext({ level, theme, vocabulary, memory }) {
  const context = buildAdaptiveStoryContext({ level, theme, vocabulary, memory });
  const vocabularyLine = context.profile.words
    .map((item) => `${item.word}${item.translation ? ` (${item.translation})` : ""} [${item.status}]`)
    .join(", ");

  return {
    ...context,
    vocabularyLine,
    instructionsLine: context.instructions.join(" "),
  };
}

export default buildPromptAdaptiveContext;
