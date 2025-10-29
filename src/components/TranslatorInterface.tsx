// src/components/TranslatorInterface.tsx
import { useState, useEffect } from "react";
import {
  supabase,
  FormattingRules,
  MK_TRADOS_RULES,
  TradosRules,
  Terminology,
} from "../lib/supabase";
import { translateWithGemini, TranslationContext } from "../lib/gemini";
import { formatToTradosHTML } from "../lib/tradosFormatter";
import { Languages, Download, Settings, Loader2 } from "lucide-react";

export function TranslatorInterface() {
  const [sourceText, setSourceText] = useState("");
  const [translatedText, setTranslatedText] = useState("");
  const [sourceLang, setSourceLang] = useState("en");
  const [targetLang, setTargetLang] = useState("mk");
  const [isTranslating, setIsTranslating] = useState(false);
  const [geminiApiKey, setGeminiApiKey] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [linguisticRules, setLinguisticRules] = useState("");
  const [interpunctionRules, setInterpunctionRules] = useState("");
  const [formattingRules, setFormattingRules] = useState<FormattingRules[]>([]);
  const [selectedRule, setSelectedRule] = useState<FormattingRules | null>(
    null
  );

  /* ---------- LOAD SETTINGS & RULES ---------- */
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

  /* ---------- DEBUG ---------- */
  function debugTranslationOutput() {
    console.log("=== DEBUG TRANSLATION OUTPUT ===");
    console.log("Source:", sourceText);
    console.log("Translated:", translatedText);
    if (translatedText) {
      const testRules = selectedRule
        ? (selectedRule.rules_json as TradosRules)
        : MK_TRADOS_RULES;
      console.log("HTML:", formatToTradosHTML(translatedText, testRules));
      console.log("Lines:", translatedText.split("\n").length);
    }
    console.log("=== END DEBUG ===");
  }

  /* ---------- AUTO-LEARNING TRANSLATE ---------- */
  async function handleTranslate() {
    if (!sourceText.trim()) return alert("Enter source text");
    if (!geminiApiKey) return setShowSettings(true);

    setIsTranslating(true);
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

      const result = await translateWithGemini(
        sourceText,
        sourceLang,
        targetLang,
        context,
        geminiApiKey
      );

      const cleanedResult = result
        .replace(/```/g, "")
        .replace(/<TEXT>|<\/TEXT>/g, "")
        .trim();

      setTranslatedText(cleanedResult);

      // Save to memory
      await supabase.from("translation_memory").insert([
        {
          source_text: sourceText,
          target_text: cleanedResult,
          source_lang: sourceLang,
          target_lang: targetLang,
        },
      ]);

      // AUTO-LEARN: Extract and save terms
      await autoExtractAndSaveTerms(
        sourceText,
        cleanedResult,
        sourceLang,
        targetLang
      );

      debugTranslationOutput();
    } catch (e: any) {
      alert("Error: " + e.message);
      console.error(e);
    } finally {
      setIsTranslating(false);
    }
  }

  /* ---------- AUTO TERM EXTRACTION ---------- */
  async function autoExtractAndSaveTerms(
    source: string,
    target: string,
    srcLang: string,
    tgtLang: string
  ) {
    const srcSentences = splitIntoSentences(source);
    const tgtSentences = splitIntoSentences(target);

    if (srcSentences.length !== tgtSentences.length) return;

    const newTerms: Partial<Terminology>[] = [];

    for (let i = 0; i < srcSentences.length; i++) {
      const src = srcSentences[i];
      const tgt = tgtSentences[i];

      const srcPhrases = extractNounPhrases(src);
      const tgtPhrases = extractNounPhrases(tgt);

      const max = Math.min(srcPhrases.length, tgtPhrases.length);
      for (let j = 0; j < max; j++) {
        const term = srcPhrases[j].trim();
        const translation = tgtPhrases[j].trim();

        if (
          term.length > 2 &&
          translation.length > 2 &&
          !/^\d+$/.test(term) &&
          !/^\d+$/.test(translation)
        ) {
          newTerms.push({
            term,
            translation,
            source_lang: srcLang,
            target_lang: tgtLang,
            definition: "",
            category: "Auto-Learned",
          });
        }
      }
    }

    if (newTerms.length > 0) {
      for (const t of newTerms) {
        await supabase.from("terminology").upsert(t, {
          onConflict: "term,translation,source_lang,target_lang",
        });
      }
    }
  }

  function splitIntoSentences(text: string): string[] {
    return text
      .split(/[.!?]\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 10);
  }

  function extractNounPhrases(sentence: string): string[] {
    return sentence
      .replace(/[,;:!?()]/g, " ")
      .split(/\s+/)
      .reduce((acc: string[], word, i, arr) => {
        if (
          word.length > 2 &&
          /[A-Za-zА-Яа-я]/.test(word) &&
          !/^(and|or|the|of|in|on|at|to|for|with|by|и|или|на|во|од|за|со)$/i.test(
            word
          )
        ) {
          const prev = arr[i - 1];
          const phrase = prev ? `${prev} ${word}` : word;
          if (!acc.includes(phrase)) acc.push(phrase);
        }
        return acc;
      }, []);
  }

  /* ---------- EXPORT HTML – UNIVERSAL ---------- */
  function handleExportHTML() {
    if (!translatedText) return alert("No translation");
    if (!selectedRule) return alert("Select a formatting rule");

    let rules = selectedRule.rules_json as TradosRules;
    if (targetLang === "mk") {
      rules = { ...rules, ...MK_TRADOS_RULES };
    }

    const html = formatToTradosHTML(translatedText, rules);
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
    <div className="bg-white rounded-lg shadow-md p-6">
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
        <div className="mb-6 p-4 border-2 border-gray-300 rounded-lg bg-gray-50">
          <h3 className="font-semibold mb-4">Settings</h3>
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
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Save
          </button>
        </div>
      )}

      {/* Language + Translate */}
      <div className="grid grid-cols-4 gap-4 mb-4">
        <input
          value={sourceLang}
          onChange={(e) => setSourceLang(e.target.value)}
          className="p-2 border rounded"
          placeholder="Source (en)"
        />
        <input
          value={targetLang}
          onChange={(e) => setTargetLang(e.target.value)}
          className="p-2 border rounded"
          placeholder="Target (mk)"
        />
        <select
          value={selectedRule?.id || ""}
          onChange={(e) =>
            setSelectedRule(
              formattingRules.find((r) => r.id === e.target.value) || null
            )
          }
          className="p-2 border rounded"
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
          className="flex items-center justify-center gap-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
        >
          {isTranslating ? (
            <>
              <Loader2 size={20} className="animate-spin" /> Translating...
            </>
          ) : (
            <>
              <Languages size={20} /> Translate
            </>
          )}
        </button>
      </div>

      {/* Text Areas + EXPORT */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block font-medium mb-1">Source Text</label>
          <textarea
            value={sourceText}
            onChange={(e) => setSourceText(e.target.value)}
            className="w-full p-3 border rounded font-mono text-sm"
            rows={20}
            placeholder="Paste your source legal text here..."
          />
        </div>
        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="font-medium">Translated Text</label>
            <div className="flex gap-2">
              <button
                onClick={debugTranslationOutput}
                className="flex items-center gap-1 text-sm bg-gray-600 text-white px-2 py-1 rounded hover:bg-gray-700"
              >
                Debug
              </button>
              <button
                onClick={handleExportHTML}
                disabled={!translatedText}
                className="flex items-center gap-1 text-sm bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700 disabled:bg-gray-400"
              >
                <Download size={16} /> Export HTML
              </button>
            </div>
          </div>
          <textarea
            value={translatedText}
            readOnly
            className="w-full p-3 border rounded font-mono text-sm bg-green-50"
            rows={20}
            placeholder="Translated text will appear here..."
          />
        </div>
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
