// src/lib/gemini.ts

export interface TranslationContext {
  terminology: Array<{ term: string; translation: string; definition: string }>;
  translationMemory: Array<{ source: string; target: string; context: string }>;
  linguisticRules?: string;
  interpunctionRules?: string;
}

// --- CONFIGURATION CONSTANTS ---
const MAX_CONCURRENCY = 3; // Max parallel API calls
// Use a more conservative character limit to account for token overhead from the prompt.
const CHUNK_CHAR_LIMIT = 4800;

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
  // Increased threshold slightly since we're using a smaller CHUNK_CHAR_LIMIT.
  if (!_isChunk && text.length > 5500) {
    console.log(`⚠️ Text length ${text.length} chars — using chunked mode.`);
    return await translateLongDocument(
      text,
      sourceLang,
      targetLang,
      context,
      apiKey
    );
  }

  // Use a reliable model for long context (flash is generally fine)
  const model = "gemini-2.5-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
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
 * **CORRECTED CONCURRENCY IMPLEMENTATION**
 */
async function translateLongDocument(
  fullText: string,
  sourceLang: string,
  targetLang: string,
  context: TranslationContext,
  apiKey: string
): Promise<string> {
  // Use the safer, smaller limit
  const chunks = splitTextIntoChunks(fullText, CHUNK_CHAR_LIMIT);
  console.log(`🧩 Translating ${chunks.length} chunks...`);

  const results: string[] = new Array(chunks.length);
  const chunkPromises: Promise<void>[] = [];
  let activeWorkers = 0;

  const translateChunk = async (i: number, chunk: string) => {
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
        // Exponential backoff for individual chunk retries
        await new Promise((r) => setTimeout(r, 2000 * attempt));
      }
    }
    // Final failure handling
    console.error(`❌ Chunk ${i + 1} permanently failed.`);
    results[i] = `[ERROR in chunk ${i + 1}] ${chunk}`;
  };

  // Correct worker management using a standard promise pool pattern
  for (let i = 0; i < chunks.length; i++) {
    // Wait for a worker slot to free up if we hit the limit
    if (activeWorkers >= MAX_CONCURRENCY) {
      // Wait for the next worker to finish before proceeding
      await Promise.race(chunkPromises.filter((p) => p !== null));
    }

    activeWorkers++;
    const promise = translateChunk(i, chunks[i]).finally(() => {
      activeWorkers--;
      // This is necessary to resolve the promise race above
      const indexToRemove = chunkPromises.indexOf(promise);
      if (indexToRemove > -1) {
        // Remove promise from array once resolved/rejected
        chunkPromises.splice(indexToRemove, 1);
      }
    });

    chunkPromises.push(promise);
  }

  // Wait for all remaining promises to complete
  await Promise.all(chunkPromises);

  console.log("✅ All chunks finished (some may have failed).");

  // Use the full results array and join them
  return results.filter(Boolean).join("\n\n");
}

/**
 * Fetch wrapper with retries and error handling
 * **IMPROVED BACKOFF AND ERROR HANDLING**
 */
async function fetchGeminiWithRetry(
  url: string,
  prompt: string
): Promise<string | null> {
  for (let attempt = 1; attempt <= 4; attempt++) {
    // Increased attempts to 4
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
        const statusCode = response.status;

        // Specific handling for rate limiting (429) and server errors (5xx)
        if (statusCode === 429) {
          console.warn(
            `⚠️ Rate limit hit (429). Attempt ${attempt}. Retrying with long delay.`
          );
          // Aggressive backoff for 429
          await new Promise((r) => setTimeout(r, 5000 * attempt));
          continue;
        } else if (statusCode >= 500) {
          console.warn(
            `⚠️ Server error (${statusCode}). Attempt ${attempt}. Retrying...`
          );
          // Normal exponential backoff for server errors
          await new Promise((r) => setTimeout(r, 2000 * attempt));
          continue;
        }

        throw new Error(`HTTP ${statusCode}: ${errText}`);
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text?.trim()) return text;

      console.warn(`⚠️ Empty Gemini response (attempt ${attempt})`);
    } catch (err: any) {
      console.warn(
        `⚠️ Gemini fetch failed (attempt ${attempt}): ${err.message}`
      );
      // General failure backoff
      await new Promise((r) => setTimeout(r, 1500 * attempt));
    }
  }
  return null;
}

/**
 * Split text into safe-sized chunks (preserving paragraph structure)
 * **ADDED FALLBACK FOR OVERSIZED PARAGRAPHS**
 */
function splitTextIntoChunks(
  text: string,
  maxChars = CHUNK_CHAR_LIMIT
): string[] {
  // Regex: 2 or more newlines, or a carriage return/newline combo
  const paragraphs = text.split(/\n{2,}|\r\n/);
  const chunks: string[] = [];
  let current = "";

  for (const p of paragraphs) {
    // 1. If a paragraph is too long, sub-chunk it (fallback)
    if (p.length > maxChars) {
      if (current.trim()) chunks.push(current.trim());
      current = "";

      console.warn(
        `⚠️ Oversized paragraph found (length ${p.length}). Sub-chunking by sentences.`
      );
      // Simple sentence-based split for safety
      const sentences = p.split(/([.?!;]+)/).filter(Boolean);
      let subChunk = "";
      for (let i = 0; i < sentences.length; i += 2) {
        const sentence = sentences[i] + (sentences[i + 1] || "");
        if ((subChunk + " " + sentence).length > maxChars) {
          if (subChunk.trim()) chunks.push(subChunk.trim());
          subChunk = sentence;
        } else {
          subChunk += (subChunk ? " " : "") + sentence;
        }
      }
      if (subChunk.trim()) chunks.push(subChunk.trim());
    }
    // 2. Normal paragraph-based chunking
    else if ((current + "\n\n" + p).length > maxChars) {
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
 * Context prompt builder (Unchanged, but included for completeness)
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
