// src/components/TranslationMemoryManager.tsx
import { useState, useEffect } from "react";
import { supabase, TranslationMemory } from "../lib/supabase";
import { Plus, Trash2, Edit2 } from "lucide-react";

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
    const { data } = await supabase
      .from("translation_memory")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setMemories(data);
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
    resetForm();
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

  function resetForm() {
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
    <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
        <h2 className="text-lg sm:text-xl font-semibold">Translation Memory</h2>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="flex items-center gap-1 px-3 py-2 bg-blue-600 text-white rounded text-xs sm:text-sm hover:bg-blue-700"
        >
          <Plus size={16} /> Add Entry
        </button>
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
          <textarea
            value={formData.source_text}
            onChange={(e) =>
              setFormData({ ...formData, source_text: e.target.value })
            }
            className="w-full p-2 border rounded mb-3"
            rows={3}
            placeholder="Source text..."
          />
          <textarea
            value={formData.target_text}
            onChange={(e) =>
              setFormData({ ...formData, target_text: e.target.value })
            }
            className="w-full p-2 border rounded mb-3"
            rows={3}
            placeholder="Target text..."
          />
          <input
            value={formData.context}
            onChange={(e) =>
              setFormData({ ...formData, context: e.target.value })
            }
            className="w-full p-2 border rounded mb-3"
            placeholder="Context (optional)"
          />
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              className="px-3 py-1 bg-green-600 text-white rounded text-sm"
            >
              {editingId ? "Update" : "Save"}
            </button>
            <button
              onClick={resetForm}
              className="px-3 py-1 bg-gray-500 text-white rounded text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Memory List */}
      <div className="space-y-3 max-h-96 overflow-y-auto text-xs sm:text-sm">
        {memories.map((m) => (
          <div key={m.id} className="p-3 border rounded hover:border-blue-300">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-1">
              <div className="flex gap-1 text-xs">
                <span className="px-2 py-1 bg-blue-100 rounded">
                  {m.source_lang}
                </span>
                <span>→</span>
                <span className="px-2 py-1 bg-green-100 rounded">
                  {m.target_lang}
                </span>
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleEdit(m)} className="text-blue-600">
                  <Edit2 size={14} />
                </button>
                <button
                  onClick={() => handleDelete(m.id!)}
                  className="text-red-600"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
            <p className="font-medium text-xs sm:text-sm">
              Source: {m.source_text}
            </p>
            <p className="font-medium text-xs sm:text-sm">
              Target: {m.target_text}
            </p>
            {m.context && (
              <p className="text-gray-600 text-xs">Context: {m.context}</p>
            )}
          </div>
        ))}
        {memories.length === 0 && (
          <p className="text-center text-gray-500 py-8">
            No entries yet. Add one above.
          </p>
        )}
      </div>
    </div>
  );
}
