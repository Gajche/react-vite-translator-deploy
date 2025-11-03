// src/components/TerminologyManager.tsx
import { useState, useEffect, useRef } from "react";
import { supabase, Terminology } from "../lib/supabase";
import {
  Plus,
  Trash2,
  Edit2,
  Download as DownloadIcon,
  Upload,
  Loader2,
} from "lucide-react";
import { processTMXFile } from "../lib/tmxParser";

// CORRECT IMPORT: from real supabase lib
// import { ensureTerminologySchema } from "../lib/supabase";

export function TerminologyManager() {
  const [terms, setTerms] = useState<Terminology[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Terminology>>({
    term: "",
    translation: "",
    definition: "",
    source_lang: "en",
    target_lang: "mk",
    category: "",
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [filterSourceLang, setFilterSourceLang] = useState("");
  const [filterTargetLang, setFilterTargetLang] = useState("");
  const [isImportingTMX, setIsImportingTMX] = useState(false);
  const [importStats, setImportStats] = useState<{
    imported: number;
    skipped: number;
  } | null>(null);
  const tmxFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadTerms();
  }, []);

  async function loadTerms() {
    let q = supabase
      .from("terminology")
      .select("*")
      .order("created_at", { ascending: false });

    if (searchTerm)
      q = q.or(
        `term.ilike.%${searchTerm}%,translation.ilike.%${searchTerm}%,definition.ilike.%${searchTerm}%`
      );
    if (filterSourceLang) q = q.eq("source_lang", filterSourceLang);
    if (filterTargetLang) q = q.eq("target_lang", filterTargetLang);

    const { data } = await q;
    if (data) setTerms(data);
  }

  // Verify if the three new columns exist
  const verifyColumns = async () => {
    const { error } = await supabase
      .from("terminology")
      .select("context, imported_from, imported_at")
      .limit(1);

    if (error) {
      alert("Columns missing: " + error.message);
    } else {
      alert(
        "All three columns (context, imported_from, imported_at) are present!"
      );
    }
  };

  // Test DB connection
  const testConnection = async () => {
    try {
      const { data, error } = await supabase
        .from("terminology")
        .select("count")
        .limit(1);

      if (error) {
        console.error("Connection test failed:", error);
        alert("Database connection failed: " + error.message);
      } else {
        console.log("Database connection successful!", data);
        alert("Database connection successful!");
      }
    } catch (e: any) {
      console.error("Connection test error:", e);
      alert("Connection test failed: " + e.message);
    }
  };

  // TMX Import Handler with batch upsert
  const handleTMXImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImportingTMX(true);
    setImportStats(null);

    try {
      const entries = await processTMXFile(file);
      let imported = 0;
      let skipped = 0;

      const BATCH = 100;
      for (let i = 0; i < entries.length; i += BATCH) {
        const batch = entries.slice(i, i + BATCH).map((e) => ({
          term: e.source,
          translation: e.target,
          source_lang: e.sourceLang,
          target_lang: e.targetLang,
          definition: e.note ?? "",
          context: e.context ?? "",
          category: "TMX Import",
          imported_from: file.name,
          imported_at: new Date().toISOString(),
        }));

        const { error } = await supabase.from("terminology").upsert(batch, {
          onConflict: "term,translation,source_lang,target_lang",
          ignoreDuplicates: true,
        });

        if (error) {
          console.error("Batch error:", error);
          skipped += batch.length;
        } else {
          imported += batch.length;
        }
      }

      setImportStats({ imported, skipped: entries.length - imported });
      await loadTerms();
    } catch (err: any) {
      console.error(err);
      alert("TMX import failed: " + err.message);
    } finally {
      setIsImportingTMX(false);
      if (tmxFileInputRef.current) tmxFileInputRef.current.value = "";
    }
  };

  const uniqueSourceLangs = [
    ...new Set(terms.map((t) => t.source_lang)),
  ].sort();
  const uniqueTargetLangs = [
    ...new Set(terms.map((t) => t.target_lang)),
  ].sort();

  function exportToCSV() {
    const csv = [
      [
        "term",
        "translation",
        "source_lang",
        "target_lang",
        "category",
        "definition",
        "context",
        "imported_from",
        "imported_at",
        "created_at",
      ],
      ...terms.map((t) => [
        t.term,
        t.translation,
        t.source_lang,
        t.target_lang,
        t.category || "",
        t.definition || "",
        t.context || "",
        t.imported_from || "",
        t.imported_at || "",
        t.created_at || "",
      ]),
    ]
      .map((r) =>
        r.map((field) => `"${field?.toString().replace(/"/g, '""')}"`).join(",")
      )
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `terminology-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
        <h2 className="text-lg sm:text-xl font-semibold">
          Terminology ({terms.length})
        </h2>
        <div className="flex gap-2 w-full sm:w-auto">
          {/* TMX Import */}
          <label className="flex items-center gap-1 px-3 py-2 bg-purple-600 text-white rounded text-xs sm:text-sm hover:bg-purple-700 cursor-pointer">
            {isImportingTMX ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <Upload size={16} />
                Import TMX
              </>
            )}
            <input
              ref={tmxFileInputRef}
              type="file"
              accept=".tmx"
              onChange={handleTMXImport}
              className="hidden"
            />
          </label>

          <button
            onClick={exportToCSV}
            className="flex items-center gap-1 px-3 py-2 bg-gray-600 text-white rounded text-xs sm:text-sm hover:bg-gray-700"
          >
            <DownloadIcon size={16} /> CSV
          </button>

          <button
            onClick={() => setIsAdding(!isAdding)}
            className="flex items-center gap-1 px-3 py-2 bg-blue-600 text-white rounded text-xs sm:text-sm hover:bg-blue-700"
          >
            <Plus size={16} /> Add
          </button>

          {/* Debug: Check DB */}
          <button
            onClick={async () => {
              const { data } = await supabase
                .from("terminology")
                .select("term, translation, source_lang, target_lang, category")
                .order("created_at", { ascending: false })
                .limit(50);
              console.log("Current terms in database:", data);
              alert(
                `Check console for current terms. Found: ${
                  data?.length || 0
                } terms`
              );
            }}
            className="flex items-center gap-1 px-3 py-2 bg-yellow-600 text-white rounded text-xs sm:text-sm hover:bg-yellow-700"
          >
            Debug: Check DB
          </button>

          {/* Test DB Connection */}
          <button
            onClick={testConnection}
            className="flex items-center gap-1 px-3 py-2 bg-yellow-600 text-white rounded text-xs sm:text-sm hover:bg-yellow-700"
          >
            Test DB
          </button>

          {/* Verify Columns */}
          <button
            onClick={verifyColumns}
            className="flex items-center gap-1 px-3 py-2 bg-indigo-600 text-white rounded text-xs sm:text-sm hover:bg-indigo-700"
          >
            Verify Columns
          </button>
        </div>
      </div>

      {/* Import Stats */}
      {importStats && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded text-sm">
          <p className="text-blue-800">
            Imported: <strong>{importStats.imported}</strong> terms | Skipped:{" "}
            <strong>{importStats.skipped}</strong> (duplicates)
          </p>
        </div>
      )}

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            loadTerms();
          }}
          className="p-2 border rounded text-sm"
          placeholder="Search..."
        />
        <select
          value={filterSourceLang}
          onChange={(e) => {
            setFilterSourceLang(e.target.value);
            loadTerms();
          }}
          className="p-2 border rounded text-sm"
        >
          <option value="">All Source</option>
          {uniqueSourceLangs.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>
        <select
          value={filterTargetLang}
          onChange={(e) => {
            setFilterTargetLang(e.target.value);
            loadTerms();
          }}
          className="p-2 border rounded text-sm"
        >
          <option value="">All Target</option>
          {uniqueTargetLangs.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>
      </div>

      {/* Add/Edit Form */}
      {isAdding && (
        <div className="mb-6 p-4 border border-blue-200 rounded bg-blue-50 text-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <input
              value={formData.source_lang}
              onChange={(e) =>
                setFormData({ ...formData, source_lang: e.target.value })
              }
              className="p-2 border rounded"
              placeholder="Source lang"
            />
            <input
              value={formData.target_lang}
              onChange={(e) =>
                setFormData({ ...formData, target_lang: e.target.value })
              }
              className="p-2 border rounded"
              placeholder="Target lang"
            />
          </div>
          <input
            value={formData.term}
            onChange={(e) => setFormData({ ...formData, term: e.target.value })}
            className="w-full p-2 border rounded mb-3"
            placeholder="Term"
          />
          <input
            value={formData.translation}
            onChange={(e) =>
              setFormData({ ...formData, translation: e.target.value })
            }
            className="w-full p-2 border rounded mb-3"
            placeholder="Translation"
          />
          <input
            value={formData.category}
            onChange={(e) =>
              setFormData({ ...formData, category: e.target.value })
            }
            className="w-full p-2 border rounded mb-3"
            placeholder="Category (optional)"
          />
          <textarea
            value={formData.definition}
            onChange={(e) =>
              setFormData({ ...formData, definition: e.target.value })
            }
            className="w-full p-2 border rounded mb-3"
            rows={2}
            placeholder="Definition (optional)"
          />
          <div className="flex gap-2">
            <button
              onClick={async () => {
                if (editingId)
                  await supabase
                    .from("terminology")
                    .update(formData)
                    .eq("id", editingId);
                else await supabase.from("terminology").insert([formData]);

                setIsAdding(false);
                setEditingId(null);
                setFormData({
                  term: "",
                  translation: "",
                  definition: "",
                  source_lang: "en",
                  target_lang: "mk",
                  category: "",
                });
                loadTerms();
              }}
              className="px-3 py-1 bg-green-600 text-white rounded text-sm"
            >
              {editingId ? "Update" : "Save"}
            </button>
            <button
              onClick={() => {
                setIsAdding(false);
                setEditingId(null);
                setFormData({
                  term: "",
                  translation: "",
                  definition: "",
                  source_lang: "en",
                  target_lang: "mk",
                  category: "",
                });
              }}
              className="px-3 py-1 bg-gray-500 text-white rounded text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Terms List */}
      <div className="space-y-3 max-h-96 overflow-y-auto text-xs sm:text-sm">
        {terms.map((t) => (
          <div key={t.id} className="p-3 border rounded hover:border-blue-300">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-1">
              <div className="flex flex-wrap items-center gap-1 text-xs">
                <span className="px-2 py-1 bg-blue-100 rounded">
                  {t.source_lang}
                </span>
                <span>→</span>
                <span className="px-2 py-1 bg-green-100 rounded">
                  {t.target_lang}
                </span>
                {t.category && (
                  <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded">
                    {t.category}
                  </span>
                )}
                {t.imported_from && (
                  <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded">
                    TMX
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setFormData(t);
                    setEditingId(t.id!);
                    setIsAdding(true);
                  }}
                  className="text-blue-600"
                >
                  <Edit2 size={14} />
                </button>
                <button
                  onClick={() =>
                    supabase
                      .from("terminology")
                      .delete()
                      .eq("id", t.id!)
                      .then(() => loadTerms())
                  }
                  className="text-red-600"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
            <p className="font-medium">
              {t.term} → {t.translation}
            </p>
            {t.definition && (
              <p className="text-gray-600 text-xs">{t.definition}</p>
            )}
            {t.context && (
              <p className="text-gray-500 text-xs italic">
                Context: {t.context}
              </p>
            )}
            <p className="text-xs text-gray-500">
              {t.imported_from ? (
                <>
                  Imported from {t.imported_from} on{" "}
                  {t.imported_at
                    ? new Date(t.imported_at).toLocaleDateString()
                    : "unknown date"}
                </>
              ) : (
                <>
                  Added:{" "}
                  {t.created_at
                    ? new Date(t.created_at).toLocaleDateString()
                    : "—"}
                </>
              )}
            </p>
          </div>
        ))}
        {terms.length === 0 && (
          <p className="text-center text-gray-500 py-8">
            No terms yet. Add terms manually or import from TMX files.
          </p>
        )}
      </div>
    </div>
  );
}
