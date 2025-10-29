/*
  Translation App Database Schema
  Fully compatible with:
  - TranslatorInterface.tsx
  - tradosFormatter.ts
  - Auto-learning terminology
  - Universal TRADOS export
*/

-- ========================================
-- 1. TABLE: translation_memory
-- ========================================
CREATE TABLE IF NOT EXISTS translation_memory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_text text NOT NULL,
  target_text text NOT NULL,
  source_lang text NOT NULL DEFAULT 'en',
  target_lang text NOT NULL DEFAULT 'mk',
  context text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ========================================
-- 2. TABLE: terminology (AUTO-LEARNING READY)
-- ========================================
CREATE TABLE IF NOT EXISTS terminology (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  term text NOT NULL,
  translation text NOT NULL,
  definition text DEFAULT '',
  source_lang text NOT NULL DEFAULT 'en',
  target_lang text NOT NULL DEFAULT 'mk',
  category text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  -- PREVENT DUPLICATES (critical for upsert in code)
  CONSTRAINT unique_term_pair UNIQUE (term, translation, source_lang, target_lang)
);

-- ========================================
-- 3. TABLE: formatting_rules
-- ========================================
CREATE TABLE IF NOT EXISTS formatting_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text DEFAULT '',
  rules_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ========================================
-- 4. TABLE: translation_projects
-- ========================================
CREATE TABLE IF NOT EXISTS translation_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  source_text text DEFAULT '',
  translated_text text DEFAULT '',
  source_lang text NOT NULL DEFAULT 'en',
  target_lang text NOT NULL DEFAULT 'mk',
  formatting_rule_id uuid REFERENCES formatting_rules(id) ON DELETE SET NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ========================================
-- 5. ENABLE ROW LEVEL SECURITY (RLS)
-- ========================================
ALTER TABLE translation_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE terminology ENABLE ROW LEVEL SECURITY;
ALTER TABLE formatting_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE translation_projects ENABLE ROW LEVEL SECURITY;

-- ========================================
-- 6. PUBLIC ACCESS POLICIES (NO AUTH REQUIRED)
-- ========================================
DO $$
BEGIN
  -- translation_memory
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public can view translation memory') THEN
    CREATE POLICY "Public can view translation memory" ON translation_memory FOR SELECT TO public USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public can insert translation memory') THEN
    CREATE POLICY "Public can insert translation memory" ON translation_memory FOR INSERT TO public WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public can update translation memory') THEN
    CREATE POLICY "Public can update translation memory" ON translation_memory FOR UPDATE TO public USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public can delete translation memory') THEN
    CREATE POLICY "Public can delete translation memory" ON translation_memory FOR DELETE TO public USING (true);
  END IF;

  -- terminology
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public can view terminology') THEN
    CREATE POLICY "Public can view terminology" ON terminology FOR SELECT TO public USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public can insert terminology') THEN
    CREATE POLICY "Public can insert terminology" ON terminology FOR INSERT TO public WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public can update terminology') THEN
    CREATE POLICY "Public can update terminology" ON terminology FOR UPDATE TO public USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public can delete terminology') THEN
    CREATE POLICY "Public can delete terminology" ON terminology FOR DELETE TO public USING (true);
  END IF;

  -- formatting_rules
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public can view formatting rules') THEN
    CREATE POLICY "Public can view formatting rules" ON formatting_rules FOR SELECT TO public USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public can insert formatting rules') THEN
    CREATE POLICY "Public can insert formatting rules" ON formatting_rules FOR INSERT TO public WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public can update formatting rules') THEN
    CREATE POLICY "Public can update formatting rules" ON formatting_rules FOR UPDATE TO public USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public can delete formatting rules') THEN
    CREATE POLICY "Public can delete formatting rules" ON formatting_rules FOR DELETE TO public USING (true);
  END IF;

  -- translation_projects
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public can view translation projects') THEN
    CREATE POLICY "Public can view translation projects" ON translation_projects FOR SELECT TO public USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public can insert translation projects') THEN
    CREATE POLICY "Public can insert translation projects" ON translation_projects FOR INSERT TO public WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public can update translation projects') THEN
    CREATE POLICY "Public can update translation projects" ON translation_projects FOR UPDATE TO public USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public can delete translation projects') THEN
    CREATE POLICY "Public can delete translation projects" ON translation_projects FOR DELETE TO public USING (true);
  END IF;
END $$;

-- ========================================
-- 7. INDEXES FOR PERFORMANCE
-- ========================================
CREATE INDEX IF NOT EXISTS idx_translation_memory_langs ON translation_memory(source_lang, target_lang);
CREATE INDEX IF NOT EXISTS idx_terminology_langs ON terminology(source_lang, target_lang);
CREATE INDEX IF NOT EXISTS idx_terminology_term ON terminology(term);
CREATE INDEX IF NOT EXISTS idx_formatting_rules_default ON formatting_rules(is_default) WHERE is_default = true;
CREATE INDEX IF NOT EXISTS idx_translation_projects_updated ON translation_projects(updated_at DESC);

-- ========================================
-- 8. DEFAULT TRADOS RULE (MATCHES MK_TRADOS_RULES)
-- ========================================
INSERT INTO formatting_rules (name, description, rules_json, is_default)
VALUES (
  'EU Legal Acts - TRADOS Standard',
  'Universal TRADOS formatting for all EU legal acts (matches MK_TRADOS_RULES)',
  '{
    "fonts": {
      "main": {"name": "Times New Roman", "size": 12},
      "footnotes": {"name": "Times New Roman", "size": 10, "language": "en-GB"}
    },
    "margins": {
      "top": 2.54,
      "bottom": 2.54,
      "left": 3.17,
      "right": 3.17,
      "gutter": 0,
      "orientation": "portrait"
    },
    "paragraph": {
      "spacingBefore": 6,
      "spacingAfter": 6,
      "lineSpacing": "single",
      "alignment": "justify",
      "indentLeft": 1,
      "indentRight": 0,
      "hangingIndent": 1
    },
    "cleaning": {
      "removeMultipleSpaces": true,
      "removeOptionalHyphens": true,
      "replaceManualLineBreaks": true
    },
    "numbering": {
      "preamble": {"style": "parenthesized", "format": "(1)"},
      "mainBody": {"style": "period", "format": "1."},
      "letters": {"style": "parenthesized", "format": "(a)"}
    },
    "pageBreaks": {
      "beforeAnnexes": true,
      "beforeTables": true
    },
    "tabs": {
      "useTabsAfterManualNumbers": true
    }
  }'::jsonb,
  true
)
ON CONFLICT DO NOTHING;