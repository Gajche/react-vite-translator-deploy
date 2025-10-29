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
    let query = supabase
      .from("terminology")
      .select("*")
      .order("term", { ascending: true });

    if (searchTerm) {
      query = query.or(
        `term.ilike.%${searchTerm}%,translation.ilike.%${searchTerm}%,definition.ilike.%${searchTerm}%`
      );
    }
    if (filterSourceLang) query = query.eq("source_lang", filterSourceLang);
    if (filterTargetLang) query = query.eq("target_lang", filterTargetLang);

    const { data, error } = await query;

    if (!error && data) {
      setTerms(data);
    }
  }

  async function handleSave() {
    if (!formData.term || !formData.translation) return;

    if (editingId) {
      await supabase
        .from("terminology")
        .update({ ...formData, updated_at: new Date().toISOString() })
        .eq("id", editingId);
    } else {
      await supabase.from("terminology").insert([formData]);
    }

    resetForm();
    loadTerms();
  }

  async function handleDelete(id: string) {
    await supabase.from("terminology").delete().eq("id", id);
    loadTerms();
  }

  function handleEdit(term: Terminology) {
    setFormData(term);
    setEditingId(term.id!);
    setIsAdding(true);
  }

  function resetForm() {
    setFormData({
      term: "",
      translation: "",
      definition: "",
      source_lang: "en",
      target_lang: "mk",
      category: "",
    });
    setIsAdding(false);
    setEditingId(null);
  }

  // Get unique languages for filters
  const uniqueSourceLangs = [
    ...new Set(terms.map((t) => t.source_lang)),
  ].sort();
  const uniqueTargetLangs = [
    ...new Set(terms.map((t) => t.target_lang)),
  ].sort();

  // Export CSV
  function exportToCSV() {
    const headers = [
      "term",
      "translation",
      "source_lang",
      "target_lang",
      "category",
      "definition",
      "created_at",
    ];
    const csvContent = [
      headers.join(","),
      ...terms.map((t) =>
        [
          `"${t.term}"`,
          `"${t.translation}"`,
          t.source_lang,
          t.target_lang,
          t.category,
          `"${t.definition}"`,
          t.created_at || "",
        ].join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `terminology-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-800">
          Terminology Database ({terms.length} terms)
        </h2>
        <div className="flex gap-2">
          <button
            onClick={exportToCSV}
            className="flex items-center gap-2 px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm"
          >
            <DownloadIcon size={16} />
            Export CSV
          </button>
          <button
            onClick={() => setIsAdding(!isAdding)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus size={20} />
            Add Term
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-4 p-3 bg-gray-50 rounded-lg">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                loadTerms();
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Search terms, translations..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Source Language
            </label>
            <select
              value={filterSourceLang}
              onChange={(e) => {
                setFilterSourceLang(e.target.value);
                loadTerms();
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All</option>
              {uniqueSourceLangs.map((lang) => (
                <option key={lang} value={lang}>
                  {lang}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Target Language
            </label>
            <select
              value={filterTargetLang}
              onChange={(e) => {
                setFilterTargetLang(e.target.value);
                loadTerms();
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All</option>
              {uniqueTargetLangs.map((lang) => (
                <option key={lang} value={lang}>
                  {lang}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Add/Edit Form */}
      {isAdding && (
        <div className="mb-6 p-4 border-2 border-blue-200 rounded-lg bg-blue-50">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Source Language
              </label>
              <input
                type="text"
                value={formData.source_lang}
                onChange={(e) =>
                  setFormData({ ...formData, source_lang: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., en"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Target Language
              </label>
              <input
                type="text"
                value={formData.target_lang}
                onChange={(e) =>
                  setFormData({ ...formData, target_lang: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., mk"
              />
            </div>
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Term
            </label>
            <input
              type="text"
              value={formData.term}
              onChange={(e) =>
                setFormData({ ...formData, term: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Term in source language..."
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Translation
            </label>
            <input
              type="text"
              value={formData.translation}
              onChange={(e) =>
                setFormData({ ...formData, translation: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Term translation..."
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Category
            </label>
            <input
              type="text"
              value={formData.category}
              onChange={(e) =>
                setFormData({ ...formData, category: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Auto-Learned, Legal..."
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Definition
            </label>
            <textarea
              value={formData.definition}
              onChange={(e) =>
                setFormData({ ...formData, definition: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="Optional definition..."
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              {editingId ? "Update" : "Save"}
            </button>
            <button
              onClick={resetForm}
              className="flex items-center gap-2 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Terms List */}
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {terms.map((term) => (
          <div
            key={term.id}
            className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors"
          >
            <div className="flex justify-between items-start mb-2">
              <div className="flex flex-col md:flex-row md:items-center gap-2">
                <div className="flex gap-2 items-center">
                  <span className="text-sm px-2 py-1 bg-blue-100 rounded">
                    {term.source_lang}
                  </span>
                  <span className="text-sm">→</span>
                  <span className="text-sm px-2 py-1 bg-green-100 rounded">
                    {term.target_lang}
                  </span>
                </div>
                {term.category && (
                  <span className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded">
                    {term.category}
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleEdit(term)}
                  className="text-blue-600 hover:text-blue-800"
                  title="Edit"
                >
                  <Edit2 size={16} />
                </button>
                <button
                  onClick={() => handleDelete(term.id!)}
                  className="text-red-600 hover:text-red-800"
                  title="Delete"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
            <div className="text-sm">
              <p className="text-gray-800 font-medium mb-1">
                {term.term} → {term.translation}
              </p>
              {term.definition && (
                <p className="text-gray-600 text-xs mb-1">{term.definition}</p>
              )}
              <p className="text-xs text-gray-500">
                Added:{" "}
                {term.created_at
                  ? new Date(term.created_at).toLocaleDateString()
                  : "—"}
              </p>
            </div>
          </div>
        ))}
        {terms.length === 0 && (
          <p className="text-center text-gray-500 py-8">
            No terms yet. The app will <strong>auto-learn</strong> from
            translations.
          </p>
        )}
      </div>
    </div>
  );
}
