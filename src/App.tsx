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
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Header */}
        <header className="mb-6 sm:mb-8">
          <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">
              Professional Translation Suite
            </h1>
            <p className="text-sm sm:text-base text-gray-600">
              AI-powered translation with TRADOS formatting and memory
              management
            </p>
          </div>
        </header>

        {/* Tabs - Responsive Grid */}
        <div className="mb-6">
          <div className="bg-white rounded-lg shadow-md p-2">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                onClick={() => setActiveTab("translator")}
                className={`flex items-center justify-center gap-2 px-3 py-3 rounded-lg transition-colors text-xs sm:text-sm min-h-12 ${
                  activeTab === "translator"
                    ? "bg-blue-600 text-white shadow-md"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                <FileText size={18} />
                <span className="hidden sm:inline">Translator</span>
                <span className="sm:hidden">Translate</span>
              </button>

              <button
                onClick={() => setActiveTab("memory")}
                className={`flex items-center justify-center gap-2 px-3 py-3 rounded-lg transition-colors text-xs sm:text-sm min-h-12 ${
                  activeTab === "memory"
                    ? "bg-blue-600 text-white shadow-md"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                <Database size={18} />
                <span className="hidden sm:inline">Memory</span>
                <span className="sm:hidden">TM</span>
              </button>

              <button
                onClick={() => setActiveTab("terminology")}
                className={`flex items-center justify-center gap-2 px-3 py-3 rounded-lg transition-colors text-xs sm:text-sm min-h-12 ${
                  activeTab === "terminology"
                    ? "bg-blue-600 text-white shadow-md"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                <BookOpen size={18} />
                <span className="hidden sm:inline">Terminology</span>
                <span className="sm:hidden">Terms</span>
              </button>

              <button
                onClick={() => setActiveTab("formatting")}
                className={`flex items-center justify-center gap-2 px-3 py-3 rounded-lg transition-colors text-xs sm:text-sm min-h-12 ${
                  activeTab === "formatting"
                    ? "bg-blue-600 text-white shadow-md"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                <Settings size={18} />
                <span className="hidden sm:inline">TRADOS Rules</span>
                <span className="sm:hidden">Rules</span>
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <main className="max-w-6xl mx-auto">
          {activeTab === "translator" && <TranslatorInterface />}
          {activeTab === "memory" && <TranslationMemoryManager />}
          {activeTab === "terminology" && <TerminologyManager />}
          {activeTab === "formatting" && <FormattingRulesManager />}
        </main>

        {/* Footer */}
        <footer className="mt-8 text-center text-xs sm:text-sm text-gray-600">
          <p>Professional Translation Suite with TRADOS Formatting Support</p>
        </footer>
      </div>
    </div>
  );
}

export default App;
