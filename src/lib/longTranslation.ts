// src/lib/longTranslation.ts
import { translateWithGemini, TranslationContext } from "./gemini";

/**
 * Safely translates long documents by splitting text into manageable chunks.
 * Handles Gemini token limits automatically.
 */
export async function translateLongDocument(
  fullText: string,
  sourceLang: string,
  targetLang: string,
  context: TranslationContext,
  apiKey: string,
  onChunkTranslated?: (chunk: string, index: number) => void
): Promise<string> {
  const chunks = splitTextIntoChunks(fullText, 7000); // safe margin for Gemini prompt size
  const results: string[] = [];

  console.log(`Translating ${chunks.length} chunks...`);

  for (let i = 0; i < chunks.length; i++) {
    console.log(`➡️  Translating chunk ${i + 1}/${chunks.length}...`);
    try {
      const translatedChunk = await translateWithGemini(
        chunks[i],
        sourceLang,
        targetLang,
        context,
        apiKey
      );
      results.push(translatedChunk);

      if (onChunkTranslated) onChunkTranslated(translatedChunk, i);

      // Gentle delay to avoid Gemini API rate limits
      await new Promise((r) => setTimeout(r, 1500));
    } catch (err: any) {
      console.error(`❌ Error translating chunk ${i + 1}:`, err.message);
      results.push(`[ERROR in chunk ${i + 1}] ${chunks[i]}`);
    }
  }

  const combined = results.join("\n\n");
  console.log("✅ Long document translation complete.");
  return combined;
}

/**
 * Splits a long text into smaller chunks, preserving paragraphs or sections.
 * Ensures no chunk exceeds Gemini’s token limit.
 */
function splitTextIntoChunks(text: string, maxChars = 7000): string[] {
  const paragraphs = text.split(/\n{2,}/); // split by double newlines
  const chunks: string[] = [];
  let current = "";

  for (const p of paragraphs) {
    if ((current + "\n\n" + p).length > maxChars) {
      chunks.push(current.trim());
      current = p;
    } else {
      current += (current ? "\n\n" : "") + p;
    }
  }

  if (current.trim()) chunks.push(current.trim());
  return chunks;
}
