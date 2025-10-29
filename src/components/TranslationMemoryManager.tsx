import { useState, useEffect } from "react";
import { supabase, TranslationMemory } from "../lib/supabase";
import { Plus, Trash2, Edit2, Save, X } from "lucide-react";

export function TranslationMemoryManager() {
  const [memories, setMemories] = useState<TranslationMemory[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<TranslationMemory>>({
    source_text: "",
    target_text: "",
    source_lang: "en",
    target_lang: "hr",
    context: "",
  });

  useEffect(() => {
    loadMemories();
  }, []);

  async function loadMemories() {
    const { data, error } = await supabase
      .from("translation_memory")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setMemories(data);
    }
  }

  async function handleSave() {
    if (!formData.source_text || !formData.target_text) return;

    if (editingId) {
      await supabase
        .from("translation_memory")
        .update({ ...formData, updated_at: new Date().toISOString() })
        .eq("id", editingId);
    } else {
      await supabase.from("translation_memory").insert([formData]);
    }

    setFormData({
      source_text: "",
      target_text: "",
      source_lang: "en",
      target_lang: "hr",
      context: "",
    });
    setIsAdding(false);
    setEditingId(null);
    loadMemories();
  }

  async function handleDelete(id: string) {
    await supabase.from("translation_memory").delete().eq("id", id);
    loadMemories();
  }

  function handleEdit(memory: TranslationMemory) {
    setFormData(memory);
    setEditingId(memory.id!);
    setIsAdding(true);
  }

  function handleCancel() {
    setFormData({
      source_text: "",
      target_text: "",
      source_lang: "en",
      target_lang: "hr",
      context: "",
    });
    setIsAdding(false);
    setEditingId(null);
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-800">
          Translation Memory
        </h2>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={20} />
          Add Entry
        </button>
      </div>

      {isAdding && (
        <div className="mb-6 p-4 border-2 border-blue-200 rounded-lg bg-blue-50">
          <div className="grid grid-cols-2 gap-4 mb-4">
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., hr"
              />
            </div>
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Source Text
            </label>
            <textarea
              value={formData.source_text}
              onChange={(e) =>
                setFormData({ ...formData, source_text: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
              placeholder="Original text..."
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Target Text
            </label>
            <textarea
              value={formData.target_text}
              onChange={(e) =>
                setFormData({ ...formData, target_text: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
              placeholder="Translated text..."
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Context
            </label>
            <input
              type="text"
              value={formData.context}
              onChange={(e) =>
                setFormData({ ...formData, context: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Additional context..."
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Save size={18} />
              {editingId ? "Update" : "Save"}
            </button>
            <button
              onClick={handleCancel}
              className="flex items-center gap-2 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              <X size={18} />
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="space-y-3 max-h-96 overflow-y-auto">
        {memories.map((memory) => (
          <div
            key={memory.id}
            className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors"
          >
            <div className="flex justify-between items-start mb-2">
              <div className="flex gap-2 text-xs text-gray-500">
                <span className="px-2 py-1 bg-blue-100 rounded">
                  {memory.source_lang}
                </span>
                <span>→</span>
                <span className="px-2 py-1 bg-green-100 rounded">
                  {memory.target_lang}
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleEdit(memory)}
                  className="text-blue-600 hover:text-blue-800"
                >
                  <Edit2 size={16} />
                </button>
                <button
                  onClick={() => handleDelete(memory.id!)}
                  className="text-red-600 hover:text-red-800"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
            <div className="text-sm">
              <p className="text-gray-700 mb-1">
                <strong>Source:</strong> {memory.source_text}
              </p>
              <p className="text-gray-700 mb-1">
                <strong>Target:</strong> {memory.target_text}
              </p>
              {memory.context && (
                <p className="text-gray-500 text-xs">
                  <strong>Context:</strong> {memory.context}
                </p>
              )}
            </div>
          </div>
        ))}
        {memories.length === 0 && (
          <p className="text-center text-gray-500 py-8">
            No translation memory entries yet. Add your first entry above.
          </p>
        )}
      </div>
    </div>
  );
}
