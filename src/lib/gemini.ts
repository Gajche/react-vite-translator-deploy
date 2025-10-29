// src/lib/gemini.ts
export interface TranslationContext {
  terminology: Array<{ term: string; translation: string; definition: string }>;
  translationMemory: Array<{ source: string; target: string; context: string }>;
  linguisticRules?: string;
  interpunctionRules?: string;
}

export async function translateWithGemini(
  text: string,
  sourceLang: string,
  targetLang: string,
  context: TranslationContext,
  apiKey: string
): Promise<string> {
  if (!apiKey) throw new Error("Gemini API key is required");

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  const contextPrompt = buildContextPrompt(context);

  const prompt = `You are a professional EU-legal translator. Translate ONLY the text inside <TEXT> tags from ${sourceLang} to ${targetLang}.

STRICT FORMATTING RULES (MUST FOLLOW EXACTLY - NO EXCEPTIONS):
1. Output each recital, article, point on its OWN LINE, ended with \n.
2. Use ONE newline (\n) between items; TWO newlines (\n\n) between major sections (e.g., preamble and articles).
3. After EVERY marker insert ONE TAB (\t). Examples:
   - (1)\tTranslated text here.
   - 1.\tTranslated text here.
   - (a)\tTranslated text here.
4. Never merge lines or remove original breaks.
5. Do NOT add explanations. Return only translated text.

${contextPrompt}

<TEXT>
${text}
</TEXT>

Translation:`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.1, maxOutputTokens: 8192 },
    }),
  });

  if (!response.ok) throw new Error(`Gemini error: ${await response.text()}`);

  const data = await response.json();
  const translated = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!translated) throw new Error("Empty response");
  return translated;
}

function buildContextPrompt(context: TranslationContext): string {
  let prompt = "";
  if (context.terminology?.length) {
    prompt += "\nTERMINOLOGY:\n";
    context.terminology.forEach(
      (t) =>
        (prompt += `- "${t.term}" → "${t.translation}" (${t.definition})\n`)
    );
  }
  if (context.translationMemory?.length) {
    prompt += "\nTRANSLATION MEMORY:\n";
    context.translationMemory.forEach(
      (m) => (prompt += `- "${m.source}" → "${m.target}"\n`)
    );
  }
  if (context.linguisticRules)
    prompt += `\nLINGUISTIC RULES:\n${context.linguisticRules}\n`;
  if (context.interpunctionRules)
    prompt += `\nPUNCTUATION RULES:\n${context.interpunctionRules}\n`;
  return prompt;
}
