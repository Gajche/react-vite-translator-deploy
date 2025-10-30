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
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        {/* Header */}
        <header className="mb-6 sm:mb-8">
          <div className="bg-white rounded-xl shadow-lg p-5 sm:p-7">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">
              Professional Translation Suite
            </h1>
            <p className="text-sm sm:text-base text-gray-600">
              AI-powered translation with TRADOS formatting, memory, and
              terminology management
            </p>
          </div>
        </header>

        {/* Tabs - Responsive Grid */}
        <div className="mb-6">
          <div className="bg-white rounded-xl shadow-md p-2">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                {
                  id: "translator",
                  icon: FileText,
                  label: "Translator",
                  short: "Translate",
                },
                { id: "memory", icon: Database, label: "Memory", short: "TM" },
                {
                  id: "terminology",
                  icon: BookOpen,
                  label: "Terminology",
                  short: "Terms",
                },
                {
                  id: "formatting",
                  icon: Settings,
                  label: "TRADOS Rules",
                  short: "Rules",
                },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex flex-col sm:flex-row items-center justify-center gap-1.5 px-3 py-3 rounded-lg transition-all text-xs sm:text-sm min-h-12 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    activeTab === tab.id
                      ? "bg-blue-600 text-white shadow-md ring-2 ring-blue-400"
                      : "text-gray-700 hover:bg-gray-100 hover:shadow-sm"
                  }`}
                >
                  <tab.icon size={18} />
                  <span className="hidden sm:inline">{tab.label}</span>
                  <span className="sm:hidden">{tab.short}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <main className="bg-white rounded-xl shadow-md p-4 sm:p-6 mb-6">
          {activeTab === "translator" && <TranslatorInterface />}
          {activeTab === "memory" && <TranslationMemoryManager />}
          {activeTab === "terminology" && <TerminologyManager />}
          {activeTab === "formatting" && <FormattingRulesManager />}
        </main>

        {/* Footer */}
        <footer className="text-center text-xs sm:text-sm text-gray-600">
          <p>
            Professional Translation Suite • TRADOS-Compatible • Auto-Learning
          </p>
        </footer>
      </div>
    </div>
  );
}

export default App;
