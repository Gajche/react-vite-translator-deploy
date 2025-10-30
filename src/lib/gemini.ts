// src/lib/gemini.ts

export interface TranslationContext {
  terminology: Array<{ term: string; translation: string; definition: string }>;
  translationMemory: Array<{ source: string; target: string; context: string }>;
  linguisticRules?: string;
  interpunctionRules?: string;
}

/**
 * Universal entry point — handles both short and long texts automatically.
 */
export async function translateWithGemini(
  text: string,
  sourceLang: string,
  targetLang: string,
  context: TranslationContext,
  apiKey: string,
  _isChunk = false
): Promise<string> {
  if (!apiKey) throw new Error("Gemini API key is required");

  // Automatically switch to chunk mode for long text
  if (!_isChunk && text.length > 6000) {
    console.log(`⚠️ Text length ${text.length} chars — using chunked mode.`);
    return await translateLongDocument(
      text,
      sourceLang,
      targetLang,
      context,
      apiKey
    );
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
  const contextPrompt = buildContextPrompt(context);

  const prompt = `You are a professional EU-legal translator. Translate ONLY the text inside <TEXT> tags from ${sourceLang} to ${targetLang}.

STRICT FORMATTING RULES (MUST FOLLOW EXACTLY):
1. Output each recital, article, point on its OWN LINE, ended with \\n.
2. Use ONE newline (\\n) between items; TWO newlines (\\n\\n) between major sections (e.g., preamble and articles).
3. After EVERY marker insert ONE TAB (\\t). Examples:
   - (1)\\tTranslated text here.
   - 1.\\tTranslated text here.
   - (a)\\tTranslated text here.
4. Never merge lines or remove original breaks.
5. Do NOT add explanations or comments.
6. If text is too long or incomplete, CONTINUE the translation naturally.

${contextPrompt}

<TEXT>
${text}
</TEXT>

Translation:`;

  const translated = await fetchGeminiWithRetry(url, prompt);
  if (!translated) throw new Error("Empty translation response after retries");
  return translated.trim();
}

/**
 * Split and translate a long document in parallel with retries per chunk.
 */
async function translateLongDocument(
  fullText: string,
  sourceLang: string,
  targetLang: string,
  context: TranslationContext,
  apiKey: string
): Promise<string> {
  const chunks = splitTextIntoChunks(fullText, 5500);
  console.log(`🧩 Translating ${chunks.length} chunks...`);

  // Translate up to 3 chunks at once for speed
  const concurrency = 3;
  const results: string[] = new Array(chunks.length);

  const translateChunk = async (i: number) => {
    const chunk = chunks[i];
    console.log(`➡️  Translating chunk ${i + 1}/${chunks.length}`);
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const translatedChunk = await translateWithGemini(
          chunk,
          sourceLang,
          targetLang,
          context,
          apiKey,
          true
        );
        results[i] = translatedChunk;
        return;
      } catch (err: any) {
        console.warn(
          `⚠️ Chunk ${i + 1} failed (attempt ${attempt}): ${err.message}`
        );
        await new Promise((r) => setTimeout(r, 2000 * attempt));
      }
    }
    results[i] = `[ERROR in chunk ${i + 1}] ${chunk}`;
  };

  const queue = Array.from({ length: chunks.length }, (_, i) => i);
  const workers: Promise<void>[] = [];

  while (queue.length > 0) {
    while (workers.length < concurrency && queue.length > 0) {
      const i = queue.shift()!;
      workers.push(
        translateChunk(i).finally(() => {
          workers.splice(
            workers.indexOf(workers.find((w) => w === workers[i])!),
            1
          );
        })
      );
    }
    await Promise.race(workers);
  }

  await Promise.all(workers);
  console.log("✅ All chunks translated successfully.");

  return results.filter(Boolean).join("\n\n");
}

/**
 * Fetch wrapper with retries and error handling
 */
async function fetchGeminiWithRetry(
  url: string,
  prompt: string
): Promise<string | null> {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 8192 },
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errText}`);
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text?.trim()) return text;

      console.warn(`⚠️ Empty Gemini response (attempt ${attempt})`);
    } catch (err: any) {
      console.warn(
        `⚠️ Gemini fetch failed (attempt ${attempt}): ${err.message}`
      );
      await new Promise((r) => setTimeout(r, 1500 * attempt));
    }
  }
  return null;
}

/**
 * Split text into safe-sized chunks (preserving paragraph structure)
 */
function splitTextIntoChunks(text: string, maxChars = 5500): string[] {
  const paragraphs = text.split(/\n{2,}/);
  const chunks: string[] = [];
  let current = "";

  for (const p of paragraphs) {
    if ((current + "\n\n" + p).length > maxChars) {
      if (current.trim()) chunks.push(current.trim());
      current = p;
    } else {
      current += (current ? "\n\n" : "") + p;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

/**
 * Context prompt builder
 */
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
