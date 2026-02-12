/*
  # Add Rubric Version and LLM Columns to Existing Tables

  1. Modified Tables
    - `poll_run`
      - `rubric_version_id` (uuid, nullable) - FK to rubric_versions

    - `detection`
      - `rubric_version_id` (uuid, nullable) - FK to rubric_versions
      - `llm_interp` (jsonb, nullable) - LLM interpretation data
      - `llm_model` (text, nullable) - LLM model used
      - `llm_generated_at` (timestamptz, nullable) - when LLM generated response

  2. Foreign Keys
    - poll_run.rubric_version_id references rubric_versions(id)
    - detection.rubric_version_id references rubric_versions(id)

  3. Notes
    - All new columns are nullable for backward compatibility
    - Existing rows will have NULL values for new columns
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'poll_run' AND column_name = 'rubric_version_id'
  ) THEN
    ALTER TABLE poll_run ADD COLUMN rubric_version_id uuid NULL REFERENCES rubric_versions(id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'detection' AND column_name = 'rubric_version_id'
  ) THEN
    ALTER TABLE detection ADD COLUMN rubric_version_id uuid NULL REFERENCES rubric_versions(id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'detection' AND column_name = 'llm_interp'
  ) THEN
    ALTER TABLE detection ADD COLUMN llm_interp jsonb NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'detection' AND column_name = 'llm_model'
  ) THEN
    ALTER TABLE detection ADD COLUMN llm_model text NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'detection' AND column_name = 'llm_generated_at'
  ) THEN
    ALTER TABLE detection ADD COLUMN llm_generated_at timestamptz NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_poll_run_rubric_version ON poll_run(rubric_version_id);
CREATE INDEX IF NOT EXISTS idx_detection_rubric_version ON detection(rubric_version_id);
CREATE INDEX IF NOT EXISTS idx_detection_llm_model ON detection(llm_model) WHERE llm_model IS NOT NULL;