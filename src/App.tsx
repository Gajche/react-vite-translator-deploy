import { useState } from "react";
import { TranslatorInterface } from "./components/TranslatorInterface";
import { TranslationMemoryManager } from "./components/TranslationMemoryManager";
import { TerminologyManager } from "./components/TerminologyManager";
import { FormattingRulesManager } from "./components/FormattingRulesManager";
import { FileText, BookOpen, Database, Settings } from "lucide-react";

function App() {
  const [activeTab, setActiveTab] = useState<
    "translator" | "memory" | "terminology" | "formatting"
  >("translator");

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="container mx-auto px-4 py-6">
        <header className="mb-8">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">
              Professional Translation Suite
            </h1>
            <p className="text-gray-600">
              AI-powered translation with TRADOS formatting and comprehensive
              memory management
            </p>
          </div>
        </header>

        <div className="mb-6">
          <div className="bg-white rounded-lg shadow-md p-2 flex gap-2">
            <button
              onClick={() => setActiveTab("translator")}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg transition-colors ${
                activeTab === "translator"
                  ? "bg-blue-600 text-white"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              <FileText size={20} />
              Translator
            </button>
            <button
              onClick={() => setActiveTab("memory")}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg transition-colors ${
                activeTab === "memory"
                  ? "bg-blue-600 text-white"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              <Database size={20} />
              Translation Memory
            </button>
            <button
              onClick={() => setActiveTab("terminology")}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg transition-colors ${
                activeTab === "terminology"
                  ? "bg-blue-600 text-white"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              <BookOpen size={20} />
              Terminology
            </button>
            <button
              onClick={() => setActiveTab("formatting")}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg transition-colors ${
                activeTab === "formatting"
                  ? "bg-blue-600 text-white"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              <Settings size={20} />
              TRADOS Rules
            </button>
          </div>
        </div>

        <main>
          {activeTab === "translator" && <TranslatorInterface />}
          {activeTab === "memory" && <TranslationMemoryManager />}
          {activeTab === "terminology" && <TerminologyManager />}
          {activeTab === "formatting" && <FormattingRulesManager />}
        </main>

        <footer className="mt-8 text-center text-gray-600 text-sm">
          <p>Professional Translation Suite with TRADOS Formatting Support</p>
        </footer>
      </div>
    </div>
  );
}

export default App;
