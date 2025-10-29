// src/components/TerminologyManager.tsx
import { useState, useEffect } from "react";
import { supabase, Terminology } from "../lib/supabase";
import { Plus, Trash2, Edit2, Download as DownloadIcon } from "lucide-react";

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

  useEffect(() => {
    loadTerms();
  }, []);

  async function loadTerms() {
    let q = supabase
      .from("terminology")
      .select("*")
      .order("term", { ascending: true });
    if (searchTerm)
      q = q.or(
        `term.ilike.%${searchTerm}%,translation.ilike.%${searchTerm}%,definition.ilike.%${searchTerm}%`
      );
    if (filterSourceLang) q = q.eq("source_lang", filterSourceLang);
    if (filterTargetLang) q = q.eq("target_lang", filterTargetLang);
    const { data } = await q;
    if (data) setTerms(data);
  }

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
        "created_at",
      ],
      ...terms.map((t) => [
        t.term,
        t.translation,
        t.source_lang,
        t.target_lang,
        t.category,
        t.definition,
        t.created_at || "",
      ]),
    ]
      .map((r) => r.join(","))
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
        </div>
      </div>

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
            <p className="text-xs text-gray-500">
              Added:{" "}
              {t.created_at ? new Date(t.created_at).toLocaleDateString() : "—"}
            </p>
          </div>
        ))}
        {terms.length === 0 && (
          <p className="text-center text-gray-500 py-8">
            No terms yet. Auto-learned terms appear here.
          </p>
        )}
      </div>
    </div>
  );
}
