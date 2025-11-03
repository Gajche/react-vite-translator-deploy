// src/lib/supabase.ts
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/* ---------- DATABASE INTERFACES ---------- */
export interface TranslationMemory {
  id?: string;
  source_text: string;
  target_text: string;
  source_lang: string;
  target_lang: string;
  context: string;
  created_at?: string;
  updated_at?: string;
}

export interface Terminology {
  id?: string;
  term: string;
  translation: string;
  definition: string;
  source_lang: string;
  target_lang: string;
  category: string;
  context?: string;
  imported_from?: string;
  imported_at?: string;
  created_at?: string;
  updated_at?: string;
}

export interface FormattingRules {
  id?: string;
  name: string;
  description: string;
  rules_json: any; // stores the full TradosRules object
  is_default: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface TranslationProject {
  id?: string;
  name: string;
  source_text: string;
  translated_text: string;
  source_lang: string;
  target_lang: string;
  formatting_rule_id?: string;
  metadata: any;
  created_at?: string;
  updated_at?: string;
}

/* ---------- TRADOS RULES TYPE (shared) ---------- */
export interface TradosRules {
  fonts: {
    main: { name: string; size: number };
    footnotes: { name: string; size: number; language: string };
  };
  margins: {
    top: number;
    bottom: number;
    left: number;
    right: number;
    gutter: number;
    orientation: string;
  };
  paragraph: {
    spacingBefore: number;
    spacingAfter: number;
    lineSpacing: string;
    alignment: string;
    indentLeft: number;
    indentRight: number;
    hangingIndent: number;
  };
  cleaning: {
    removeMultipleSpaces: boolean;
    removeOptionalHyphens: boolean;
    replaceManualLineBreaks: boolean;
  };
  numbering: {
    preamble: { style: string; format: string };
    mainBody: { style: string; format: string };
    letters: { style: string; format: string };
  };
  pageBreaks: { beforeAnnexes: boolean; beforeTables: boolean };
  tabs: { useTabsAfterManualNumbers: boolean };
}

/* ---------- MK DEFAULT RULE (exact per instructions) ---------- */
export const MK_TRADOS_RULES: TradosRules = {
  fonts: {
    main: { name: "Times New Roman", size: 12 },
    footnotes: { name: "Times New Roman", size: 10, language: "en-GB" },
  },
  margins: {
    top: 2.54,
    bottom: 2.54,
    left: 3.17,
    right: 3.17,
    gutter: 0,
    orientation: "portrait",
  },
  paragraph: {
    spacingBefore: 6,
    spacingAfter: 6,
    lineSpacing: "single",
    alignment: "justify",
    indentLeft: 1,
    indentRight: 0,
    hangingIndent: 1,
  },
  cleaning: {
    removeMultipleSpaces: true,
    removeOptionalHyphens: true,
    replaceManualLineBreaks: true,
  },
  numbering: {
    preamble: { style: "parenthesized", format: "(1)" },
    mainBody: { style: "period", format: "1." },
    letters: { style: "parenthesized", format: "(a)" },
  },
  pageBreaks: { beforeAnnexes: true, beforeTables: true },
  tabs: { useTabsAfterManualNumbers: true },
};
