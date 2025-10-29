import { useState, useEffect } from "react";
import { supabase, FormattingRules } from "../lib/supabase";
import { FileText, Trash2, Download, Upload, Star } from "lucide-react";

export function FormattingRulesManager() {
  const [rules, setRules] = useState<FormattingRules[]>([]);
  const [selectedRule, setSelectedRule] = useState<FormattingRules | null>(
    null
  );

  useEffect(() => {
    loadRules();
  }, []);

  async function loadRules() {
    const { data, error } = await supabase
      .from("formatting_rules")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setRules(data);
      const defaultRule = data.find((r) => r.is_default);
      if (defaultRule) setSelectedRule(defaultRule);
    }
  }

  async function handleDelete(id: string) {
    await supabase.from("formatting_rules").delete().eq("id", id);
    loadRules();
  }

  async function handleSetDefault(id: string) {
    // 1. Unset all other defaults
    await supabase
      .from("formatting_rules")
      .update({ is_default: false })
      .neq("id", id);
    // 2. Set the new default
    await supabase
      .from("formatting_rules")
      .update({ is_default: true })
      .eq("id", id);
    loadRules();
  }

  function handleExport() {
    if (!selectedRule) return;

    const dataStr = JSON.stringify(selectedRule, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `trados-rules-${selectedRule.name
      .replace(/\s+/g, "-")
      .toLowerCase()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  // --- START: CORRECTED handleImport FUNCTION ---
  function handleImport(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const fileContent = e.target?.result as string;
        const rulesData = JSON.parse(fileContent);

        // This is the corrected structure to match your expected input file:
        const newRule = {
          name: "Imported EU Legal Acts Rules", // Hardcoding a name for a clean import
          description:
            "Standard TRADOS formatting rules for EU Legal Acts transformation to Word.",
          rules_json: rulesData, // The entire file content is the rules_json
          is_default: false,
        };

        const { error } = await supabase
          .from("formatting_rules")
          .insert([newRule]);

        if (error) {
          console.error("Supabase Insert Error:", error);
          alert(`Error saving to database: ${error.message}`);
        } else {
          loadRules();
        }
      } catch (err: any) {
        console.error("Import Error:", err);
        alert(
          `Error importing rules. Please check the file format. Details: ${err.message}`
        );
      }
    };
    reader.readAsText(file);
  }
  // --- END: CORRECTED handleImport FUNCTION ---

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-800">
          TRADOS Formatting Rules
        </h2>
        <div className="flex gap-2">
          <label className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors cursor-pointer">
            <Upload size={20} />
            Import
            <input
              type="file"
              accept=".json"
              onChange={handleImport}
              className="hidden"
            />
          </label>
          <button
            onClick={handleExport}
            disabled={!selectedRule}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400"
          >
            <Download size={20} />
            Export
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-1 space-y-2 max-h-96 overflow-y-auto">
          {rules.map((rule) => (
            <div
              key={rule.id}
              onClick={() => setSelectedRule(rule)}
              className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                selectedRule?.id === rule.id
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-200 hover:border-blue-300"
              }`}
            >
              <div className="flex justify-between items-start mb-1">
                <div className="flex items-center gap-2">
                  <FileText size={16} />
                  <span className="font-medium text-sm">{rule.name}</span>
                </div>
                {rule.is_default && (
                  <Star size={14} className="text-yellow-500 fill-current" />
                )}
              </div>
              <p className="text-xs text-gray-500 line-clamp-2">
                {rule.description}
              </p>
              <div className="flex gap-2 mt-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSetDefault(rule.id!);
                  }}
                  className="text-xs text-blue-600 hover:text-blue-800"
                >
                  Set Default
                </button>
                {!rule.is_default && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(rule.id!);
                    }}
                    className="text-xs text-red-600 hover:text-red-800"
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            </div>
          ))}
          {rules.length === 0 && (
            <p className="text-center text-gray-500 text-sm py-8">
              No formatting rules found.
            </p>
          )}
        </div>

        <div className="col-span-2">
          {selectedRule ? (
            <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
              <h3 className="font-semibold text-lg mb-2">
                {selectedRule.name}
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                {selectedRule.description}
              </p>
              <div className="bg-white p-4 rounded border border-gray-200">
                <h4 className="font-medium mb-2 text-sm">
                  Rules Configuration:
                </h4>
                <pre className="text-xs overflow-auto max-h-96 bg-gray-50 p-3 rounded">
                  {JSON.stringify(selectedRule.rules_json, null, 2)}
                </pre>
              </div>
            </div>
          ) : (
            <div className="border border-gray-200 rounded-lg p-8 text-center text-gray-500">
              Select a rule set to view details
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
