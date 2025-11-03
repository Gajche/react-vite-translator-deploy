export interface TMXEntry {
  source: string;
  target: string;
  sourceLang: string;
  targetLang: string;
  context?: string;
  note?: string;
}

export function parseTMXFile(content: string): TMXEntry[] {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(content, "text/xml");

  // Check for parsing errors
  const parseError = xmlDoc.getElementsByTagName("parsererror")[0];
  if (parseError) {
    throw new Error("Invalid TMX file format");
  }

  const entries: TMXEntry[] = [];
  const tuElements = xmlDoc.getElementsByTagName("tu");

  for (let i = 0; i < tuElements.length; i++) {
    const tu = tuElements[i];
    const tuvElements = tu.getElementsByTagName("tuv");

    if (tuvElements.length >= 2) {
      const sourceTuv = tuvElements[0];
      const targetTuv = tuvElements[1];

      const sourceLang =
        sourceTuv.getAttribute("xml:lang") ||
        sourceTuv.getAttribute("lang") ||
        "en";
      const targetLang =
        targetTuv.getAttribute("xml:lang") ||
        targetTuv.getAttribute("lang") ||
        "mk";

      const sourceSeg = sourceTuv.getElementsByTagName("seg")[0];
      const targetSeg = targetTuv.getElementsByTagName("seg")[0];

      if (sourceSeg && targetSeg) {
        const sourceText = sourceSeg.textContent?.trim() || "";
        const targetText = targetSeg.textContent?.trim() || "";

        if (sourceText && targetText) {
          // Extract context and notes
          const noteElement = tu.getElementsByTagName("note")[0];
          const note = noteElement?.textContent?.trim();

          const contextElement =
            sourceTuv.getElementsByTagName("context")[0] ||
            tu.getElementsByTagName("context")[0];
          const context = contextElement?.textContent?.trim();

          entries.push({
            source: sourceText,
            target: targetText,
            sourceLang: sourceLang.split("-")[0], // Take only language code (en-US → en)
            targetLang: targetLang.split("-")[0],
            context,
            note,
          });
        }
      }
    }
  }

  return entries;
}

export async function processTMXFile(file: File): Promise<TMXEntry[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const entries = parseTMXFile(content);
        resolve(entries);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => {
      reject(new Error("Failed to read TMX file"));
    };

    reader.readAsText(file);
  });
}
