// src/components/TranslatorInterface.tsx
import { useState, useEffect, useRef } from "react";
import {
  supabase,
  FormattingRules,
  MK_TRADOS_RULES,
  TradosRules,
} from "../lib/supabase";
import { translateWithGemini, TranslationContext } from "../lib/gemini";
import { formatToTradosHTML } from "../lib/tradosFormatter";
import { Languages, Download, Settings, Loader2, Upload } from "lucide-react";

import mammoth from "mammoth";
import { pdfjs } from "react-pdf";

/* ------------------------------------------------------------------- */
/* 1. PDF CSS (CDN – no Vite import)                                   */
/* ------------------------------------------------------------------- */
function usePdfStyles() {
  useEffect(() => {
    const a = document.createElement("link");
    a.rel = "stylesheet";
    a.href = "https://unpkg.com/react-pdf@7/dist/esm/Page/AnnotationLayer.css";
    document.head.appendChild(a);

    const t = document.createElement("link");
    t.rel = "stylesheet";
    t.href = "https://unpkg.com/react-pdf@7/dist/esm/Page/TextLayer.css";
    document.head.appendChild(t);

    return () => {
      document.head.removeChild(a);
      document.head.removeChild(t);
    };
  }, []);
}

// FIX: Correct worker setup for react-pdf v7.5.0
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/legacy/build/pdf.worker.min.js`;

/* ------------------------------------------------------------------- */
/* 2. Language list – typed                                            */
/* ------------------------------------------------------------------- */
interface Lang {
  code: string;
  name: string;
}
const LANGUAGES: Lang[] = [
  { code: "en", name: "English" },
  { code: "es", name: "Spanish" },
  { code: "fr", name: "French" },
  { code: "de", name: "German" },
  { code: "it", name: "Italian" },
  { code: "pt", name: "Portuguese" },
  { code: "ru", name: "Russian" },
  { code: "zh", name: "Chinese (Simplified)" },
  { code: "ja", name: "Japanese" },
  { code: "ko", name: "Korean" },
  { code: "ar", name: "Arabic" },
  { code: "hi", name: "Hindi" },
  { code: "bn", name: "Bengali" },
  { code: "ur", name: "Urdu" },
  { code: "tr", name: "Turkish" },
  { code: "pl", name: "Polish" },
  { code: "nl", name: "Dutch" },
  { code: "sv", name: "Swedish" },
  { code: "da", name: "Danish" },
  { code: "no", name: "Norwegian" },
  { code: "fi", name: "Finnish" },
  { code: "el", name: "Greek" },
  { code: "he", name: "Hebrew" },
  { code: "th", name: "Thai" },
  { code: "vi", name: "Vietnamese" },
  { code: "id", name: "Indonesian" },
  { code: "ms", name: "Malay" },
  { code: "ro", name: "Romanian" },
  { code: "hu", name: "Hungarian" },
  { code: "cs", name: "Czech" },
  { code: "sk", name: "Slovak" },
  { code: "hr", name: "Croatian" },
  { code: "sr", name: "Serbian" },
  { code: "bg", name: "Bulgarian" },
  { code: "uk", name: "Ukrainian" },
  { code: "mk", name: "Macedonian" },
  { code: "sl", name: "Slovenian" },
  { code: "et", name: "Estonian" },
  { code: "lv", name: "Latvian" },
  { code: "lt", name: "Lithuanian" },
  { code: "is", name: "Icelandic" },
  { code: "ga", name: "Irish" },
  { code: "mt", name: "Maltese" },
  { code: "cy", name: "Welsh" },
  { code: "eu", name: "Basque" },
  { code: "ca", name: "Catalan" },
  { code: "gl", name: "Galician" },
  { code: "lb", name: "Luxembourgish" },
  { code: "af", name: "Afrikaans" },
  { code: "sw", name: "Swahili" },
];

/* ------------------------------------------------------------------- */
/* 3. Chunking helper                                                 */
/* ------------------------------------------------------------------- */
const MAX_WORDS_PER_CHUNK = 1200; // safe for Gemini

function splitIntoChunks(text: string): string[] {
  const words = text.split(/\s+/).filter((w) => w.length > 0);
  const chunks: string[] = [];
  let cur = "";

  for (const w of words) {
    if ((cur + " " + w).split(/\s+/).length > MAX_WORDS_PER_CHUNK) {
      chunks.push(cur.trim());
      cur = w;
    } else {
      cur += (cur ? " " : "") + w;
    }
  }
  if (cur) chunks.push(cur.trim());
  return chunks;
}

/* ------------------------------------------------------------------- */
/* 4. Main component                                                  */
/* ------------------------------------------------------------------- */
export function TranslatorInterface() {
  usePdfStyles();

  const [sourceText, setSourceText] = useState("");
  const [translatedText, setTranslatedText] = useState("");
  const [sourceLang, setSourceLang] = useState("en");
  const [targetLang, setTargetLang] = useState("mk");
  const [isTranslating, setIsTranslating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [geminiApiKey, setGeminiApiKey] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [linguisticRules, setLinguisticRules] = useState("");
  const [interpunctionRules, setInterpunctionRules] = useState("");
  const [formattingRules, setFormattingRules] = useState<FormattingRules[]>([]);
  const [selectedRule, setSelectedRule] = useState<FormattingRules | null>(
    null
  );
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* ---------- Load settings & rules ---------- */
  useEffect(() => {
    const key = localStorage.getItem("gemini_api_key");
    if (key) setGeminiApiKey(key);
    const l = localStorage.getItem("linguistic_rules");
    if (l) setLinguisticRules(l);
    const i = localStorage.getItem("interpunction_rules");
    if (i) setInterpunctionRules(i);
    loadRules();
  }, []);

  async function loadRules() {
    const { data } = await supabase.from("formatting_rules").select("*");
    if (data) {
      setFormattingRules(data);
      const def = data.find((r) => r.is_default);
      if (def) setSelectedRule(def);
    }
  }

  function saveSettings() {
    localStorage.setItem("gemini_api_key", geminiApiKey);
    localStorage.setItem("linguistic_rules", linguisticRules);
    localStorage.setItem("interpunction_rules", interpunctionRules);
    setShowSettings(false);
    alert("Settings saved!");
  }

  /* ---------- File import ---------- */
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);

    try {
      const ext = file.name.split(".").pop()?.toLowerCase();

      if (ext === "txt") {
        const text = await file.text();
        setSourceText(text);
      } else if (ext === "docx") {
        const arrayBuffer = await file.arrayBuffer();
        const docxResult = await mammoth.extractRawText({ arrayBuffer });
        setSourceText(docxResult.value);
      } else if (ext === "pdf") {
        // PDF fallback approach
        try {
          const arrayBuffer = await file.arrayBuffer();
          const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
          let full = "";
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            full += content.items.map((item: any) => item.str).join(" ") + "\n";
          }
          setSourceText(full.trim());
        } catch (pdfError) {
          console.error("PDF extraction failed:", pdfError);
          alert(
            "PDF import failed. Please use TXT or DOCX files for now, or convert your PDF to another format."
          );
        }
      } else {
        alert("Unsupported file type. Please use TXT, DOCX, or PDF files.");
      }
    } catch (err) {
      console.error("File import failed:", err);
      alert("File import failed. Please try another file format.");
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  /* ---------- Chunked translation ---------- */
  async function handleTranslate() {
    if (!sourceText.trim()) return alert("Enter or import text");
    if (!geminiApiKey) return setShowSettings(true);

    setIsTranslating(true);
    setProgress(0);
    setTranslatedText("");

    try {
      const { data: terms } = await supabase
        .from("terminology")
        .select("*")
        .eq("source_lang", sourceLang)
        .eq("target_lang", targetLang);

      const { data: mems } = await supabase
        .from("translation_memory")
        .select("*")
        .eq("source_lang", sourceLang)
        .eq("target_lang", targetLang)
        .limit(10);

      const context: TranslationContext = {
        terminology: (terms || []).map((t) => ({
          term: t.term,
          translation: t.translation,
          definition: t.definition,
        })),
        translationMemory: (mems || []).map((m) => ({
          source: m.source_text,
          target: m.target_text,
          context: m.context,
        })),
        linguisticRules: linguisticRules || undefined,
        interpunctionRules: interpunctionRules || undefined,
      };

      const chunks = splitIntoChunks(sourceText);
      const translations: string[] = [];

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const raw = await translateWithGemini(
          chunk,
          sourceLang,
          targetLang,
          context,
          geminiApiKey
        );
        const cleaned = raw
          .replace(/```/g, "")
          .replace(/<TEXT>|<\/TEXT>/g, "")
          .trim();
        translations.push(cleaned);

        setProgress(((i + 1) / chunks.length) * 100);
        setTranslatedText(translations.join("\n\n"));
      }

      const final = translations.join("\n\n");
      setTranslatedText(final);

      await supabase.from("translation_memory").insert([
        {
          source_text: sourceText,
          target_text: final,
          source_lang: sourceLang,
          target_lang: targetLang,
        },
      ]);

      // auto‑learn (kept but not used in warnings – safe to keep)
      await autoExtractAndSaveTerms(sourceText, final, sourceLang, targetLang);
    } catch (e: any) {
      alert("Translation failed: " + e.message);
      console.error(e);
    } finally {
      setIsTranslating(false);
      setProgress(0);
    }
  }

  /* ---------- Auto‑learn (kept for future) ---------- */
  async function autoExtractAndSaveTerms(
    src: string,
    tgt: string,
    sLang: string,
    tLang: string
  ): Promise<void> {
    const srcSent = src
      .split(/[.!?]\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 10);
    const tgtSent = tgt
      .split(/[.!?]\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 10);
    if (srcSent.length !== tgtSent.length) return;

    const terms: Partial<{
      term: string;
      translation: string;
      source_lang: string;
      target_lang: string;
      definition: string;
      category: string;
    }>[] = [];

    for (let i = 0; i < srcSent.length; i++) {
      const srcPh = extractNounPhrases(srcSent[i]);
      const tgtPh = extractNounPhrases(tgtSent[i]);
      const max = Math.min(srcPh.length, tgtPh.length);
      for (let j = 0; j < max; j++) {
        const term = srcPh[j].trim();
        const trans = tgtPh[j].trim();
        if (term.length > 2 && trans.length > 2 && !/^\d+$/.test(term)) {
          terms.push({
            term,
            translation: trans,
            source_lang: sLang,
            target_lang: tLang,
            definition: "",
            category: "Auto-Learned",
          });
        }
      }
    }

    if (terms.length > 0) {
      for (const t of terms) {
        await supabase.from("terminology").upsert(t, {
          onConflict: "term,translation,source_lang,target_lang",
        });
      }
    }
  }

  function extractNounPhrases(s: string): string[] {
    return s
      .replace(/[,;:!?()]/g, " ")
      .split(/\s+/)
      .reduce((acc: string[], w, idx, arr) => {
        if (
          w.length > 2 &&
          /[A-Za-zА-Яа-я]/.test(w) &&
          !/^(and|or|the|of|in|on|at|to|for|with|by|и|или|на|во|од|за|со)$/i.test(
            w
          )
        ) {
          const prev = arr[idx - 1];
          const ph = prev ? `${prev} ${w}` : w;
          if (!acc.includes(ph)) acc.push(ph);
        }
        return acc;
      }, []);
  }

  /* ---------- Export ---------- */
  function handleExportHTML() {
    if (!translatedText || !selectedRule)
      return alert("No translation or rule");
    const rules =
      targetLang === "mk"
        ? { ...selectedRule.rules_json, ...MK_TRADOS_RULES }
        : selectedRule.rules_json;
    const html = formatToTradosHTML(translatedText, rules as TradosRules);
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `trados-${sourceLang}-to-${targetLang}-${Date.now()}.html`;
    a.click();
    URL.revokeObjectURL(url);
  }

  /* ---------- UI ---------- */
  return (
    <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
      {/* Settings */}
      <div className="flex justify-end mb-4">
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800"
        >
          <Settings size={16} /> Settings
        </button>
      </div>

      {showSettings && (
        <div className="mb-6 p-4 border border-gray-300 rounded-lg bg-gray-50 text-sm">
          <h3 className="font-semibold mb-3">Settings</h3>
          <input
            type="password"
            value={geminiApiKey}
            onChange={(e) => setGeminiApiKey(e.target.value)}
            className="w-full mb-3 p-2 border rounded"
            placeholder="Gemini API Key"
          />
          <textarea
            value={linguisticRules}
            onChange={(e) => setLinguisticRules(e.target.value)}
            className="w-full mb-3 p-2 border rounded"
            rows={3}
            placeholder="Linguistic rules..."
          />
          <textarea
            value={interpunctionRules}
            onChange={(e) => setInterpunctionRules(e.target.value)}
            className="w-full mb-3 p-2 border rounded"
            rows={3}
            placeholder="Punctuation rules..."
          />
          <button
            onClick={saveSettings}
            className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Save
          </button>
        </div>
      )}

      {/* Language + Rule + Translate */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <select
          value={sourceLang}
          onChange={(e) => setSourceLang(e.target.value)}
          className="p-2 border rounded text-sm"
        >
          {LANGUAGES.map((l) => (
            <option key={l.code} value={l.code}>
              {l.name} ({l.code})
            </option>
          ))}
        </select>

        <select
          value={targetLang}
          onChange={(e) => setTargetLang(e.target.value)}
          className="p-2 border rounded text-sm"
        >
          {LANGUAGES.map((l) => (
            <option key={l.code} value={l.code}>
              {l.name} ({l.code})
            </option>
          ))}
        </select>

        <select
          value={selectedRule?.id ?? ""}
          onChange={(e) =>
            setSelectedRule(
              formattingRules.find((r) => r.id === e.target.value) ?? null
            )
          }
          className="p-2 border rounded text-sm"
        >
          <option value="">Select Rule</option>
          {formattingRules.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name} {r.is_default && "(default)"}
            </option>
          ))}
        </select>

        <button
          onClick={handleTranslate}
          disabled={isTranslating}
          className="flex items-center justify-center gap-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 text-sm h-10"
        >
          {isTranslating ? (
            <>
              <Loader2 size={18} className="animate-spin" /> Translating{" "}
              {Math.round(progress)}%
            </>
          ) : (
            <>
              <Languages size={18} /> Translate
            </>
          )}
        </button>
      </div>

      {/* Progress bar */}
      {isTranslating && (
        <div className="mb-4">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Source Text + Import */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-1">
          <label className="font-medium text-sm">
            Source Text ({sourceText.split(/\s+/).filter((w) => w).length}{" "}
            words)
          </label>
          <label className="flex items-center gap-2 text-xs bg-indigo-600 text-white px-2 py-1 rounded cursor-pointer hover:bg-indigo-700">
            {isImporting ? (
              <>
                <Loader2 size={14} className="animate-spin" /> Importing...
              </>
            ) : (
              <>
                <Upload size={14} /> Import
              </>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.docx,.pdf"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
        </div>
        <textarea
          value={sourceText}
          onChange={(e) => setSourceText(e.target.value)}
          className="w-full p-3 border rounded font-mono text-xs sm:text-sm h-64 sm:h-80"
          placeholder="Paste or import large documents..."
        />
      </div>

      {/* Translated Text */}
      <div>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-1 gap-2">
          <label className="font-medium text-sm">Translated Text</label>
          <div className="flex gap-2">
            <button
              onClick={() => console.log("DEBUG →", translatedText)}
              className="flex items-center gap-1 text-xs bg-gray-600 text-white px-2 py-1 rounded hover:bg-gray-700"
            >
              Debug
            </button>
            <button
              onClick={handleExportHTML}
              disabled={!translatedText}
              className="flex items-center gap-1 text-xs bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700 disabled:bg-gray-400"
            >
              <Download size={14} /> Export
            </button>
          </div>
        </div>
        <textarea
          value={translatedText}
          readOnly
          className="w-full p-3 border rounded font-mono text-xs sm:text-sm bg-green-50 h-64 sm:h-80"
          placeholder="Translation appears here..."
        />
      </div>

      {selectedRule && (
        <div className="mt-3 text-xs text-gray-600">
          Using:{" "}
          <span className="text-blue-600 font-medium">{selectedRule.name}</span>
        </div>
      )}
    </div>
  );
}
