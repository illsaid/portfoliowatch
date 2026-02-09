/*
  # Fix CT.gov Trial Diff Detection

  1. Changes to trial_mapping table
    - Add `last_snapshot` (jsonb) column to store full study snapshot
    - This fixes the bug where we were re-fetching the current study instead of comparing against stored data

  2. Changes to detection table
    - Add `detected_date` (date) column with default to extract date from detected_at
    - Add unique constraint on (ticker, nct_id, field_path, detected_date)
    - Prevents duplicate CT.gov detections on repeated polls within the same day

  3. Security
    - No RLS changes needed (tables already have RLS enabled)
*/

-- Add last_snapshot column to trial_mapping to store full study data
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trial_mapping' AND column_name = 'last_snapshot'
  ) THEN
    ALTER TABLE trial_mapping ADD COLUMN last_snapshot jsonb;
  END IF;
END $$;

-- Add detected_date column to detection table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'detection' AND column_name = 'detected_date'
  ) THEN
    ALTER TABLE detection ADD COLUMN detected_date date;
  END IF;
END $$;

-- Backfill detected_date for existing records
UPDATE detection 
SET detected_date = detected_at::date 
WHERE detected_date IS NULL;

-- Set default for future records
ALTER TABLE detection ALTER COLUMN detected_date SET DEFAULT CURRENT_DATE;

-- Create unique index to prevent duplicate CT.gov detections per day
CREATE UNIQUE INDEX IF NOT EXISTS detection_ctgov_unique_daily 
  ON detection (ticker, nct_id, field_path, detected_date)
  WHERE nct_id IS NOT NULL AND field_path IS NOT NULL;