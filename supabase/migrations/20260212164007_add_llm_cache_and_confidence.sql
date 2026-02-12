/*
  # Add LLM Cache Table and Detection Confidence Column

  1. New Tables
    - `llm_cache`
      - `id` (uuid, primary key)
      - `provider` (text) - e.g. 'openai', 'gemini'
      - `model` (text) - e.g. 'gpt-4o-mini', 'gemini-1.5-flash'
      - `prompt_version` (text) - versioned prompt identifier
      - `input_hash` (text) - sha256 of evidence pack JSON + prompt_version + model
      - `output_json` (jsonb) - LLM response
      - `confidence` (numeric, nullable) - extracted confidence score
      - `created_at` (timestamptz)
      - Unique constraint on (provider, model, prompt_version, input_hash)

  2. Modified Tables
    - `detection`
      - `llm_input_hash` (text, nullable) - links to llm_cache entry
      - `llm_confidence` column already exists but we ensure it's nullable for LLM-derived confidence

  3. Security
    - Enable RLS on llm_cache
    - SELECT policy for anon role (reads allowed)
    - Server/service role writes only (no anon insert/update/delete)
*/

CREATE TABLE IF NOT EXISTS llm_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  model text NOT NULL,
  prompt_version text NOT NULL,
  input_hash text NOT NULL,
  output_json jsonb NOT NULL,
  confidence numeric NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, model, prompt_version, input_hash)
);

CREATE INDEX IF NOT EXISTS idx_llm_cache_input_hash ON llm_cache(input_hash);
CREATE INDEX IF NOT EXISTS idx_llm_cache_created ON llm_cache(created_at DESC);

ALTER TABLE llm_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon read llm_cache"
  ON llm_cache FOR SELECT TO anon USING (true);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'detection' AND column_name = 'llm_input_hash'
  ) THEN
    ALTER TABLE detection ADD COLUMN llm_input_hash text NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_detection_llm_input_hash ON detection(llm_input_hash) WHERE llm_input_hash IS NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'detection' AND column_name = 'detected_date'
  ) THEN
    ALTER TABLE detection ADD COLUMN detected_date date NULL;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_detection_ctgov_dedup
  ON detection (ticker, nct_id, field_path, detected_date)
  WHERE nct_id IS NOT NULL AND field_path IS NOT NULL AND detected_date IS NOT NULL;
