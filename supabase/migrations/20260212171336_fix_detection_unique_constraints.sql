/*
  # Fix Detection Table Unique Constraints

  This migration fixes upsert ON CONFLICT errors by replacing partial unique indexes
  with standard unique indexes.

  ## Problem
  PostgreSQL's ON CONFLICT clause cannot match partial unique indexes, causing
  "there is no unique or exclusion constraint matching the ON CONFLICT specification" errors.

  ## Changes
  1. Drop partial unique index `idx_detection_ticker_accession` (WHERE accession IS NOT NULL)
  2. Create standard unique index on (ticker, accession)
  3. Drop partial unique indexes for CT.gov deduplication
  4. Create standard unique index on (ticker, nct_id, field_path, detected_date)

  ## Note on NULL handling
  In PostgreSQL, NULL values are considered distinct in unique indexes.
  This means:
  - EDGAR rows (with accession) will dedupe properly on (ticker, accession)
  - Non-EDGAR rows (accession NULL) can insert freely without conflicts
  - Same applies for CT.gov columns (nct_id, field_path, detected_date)
*/

-- Drop the partial unique index for EDGAR (ticker, accession)
DROP INDEX IF EXISTS idx_detection_ticker_accession;

-- Create a standard (non-partial) unique index for EDGAR deduplication
CREATE UNIQUE INDEX IF NOT EXISTS idx_detection_ticker_accession
  ON detection (ticker, accession);

-- Drop the partial unique indexes for CT.gov deduplication
DROP INDEX IF EXISTS detection_ctgov_unique_daily;
DROP INDEX IF EXISTS idx_detection_ctgov_dedup;

-- Create a standard (non-partial) unique index for CT.gov deduplication
CREATE UNIQUE INDEX IF NOT EXISTS idx_detection_ctgov_dedup
  ON detection (ticker, nct_id, field_path, detected_date);