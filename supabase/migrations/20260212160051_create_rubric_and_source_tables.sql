/*
  # Add Rubric Versions and Source Tracking Tables

  1. New Tables
    - `rubric_versions`
      - `id` (uuid, primary key)
      - `version_name` (text, unique) - e.g. 'v1', 'v2'
      - `effective_at` (timestamptz) - when this version became active
      - `weights_json` (jsonb) - scoring knobs and multipliers
      - `threshold_alert` (int) - maps to ALERT_THRESHOLD concept
      - `panic_sensitivity` (int) - panic detection sensitivity
      - `suppression_strictness` (text) - low/med/high
      - `reason` (text, nullable) - reason for version change
      - `is_active` (bool) - whether this version is currently active

    - `source_cursor`
      - `source` (text, primary key) - e.g. 'edgar', 'ctgov', 'market'
      - `cursor_json` (jsonb) - cursor state for incremental fetching
      - `last_run_at` (timestamptz) - last time source was polled
      - `last_ok_at` (timestamptz) - last successful poll

    - `raw_docs`
      - `id` (uuid, primary key)
      - `source` (text) - data source identifier
      - `external_id` (text) - e.g. EDGAR accession, NCT number
      - `content_hash` (text) - hash of document content
      - `payload_json` (jsonb) - raw document payload
      - `fetched_at` (timestamptz) - when document was fetched
      - Unique constraint on (source, external_id, content_hash)

    - `source_health`
      - `id` (uuid, primary key)
      - `source` (text) - data source identifier
      - `run_date` (date) - date of the health record
      - `fetched_count` (int) - number of items fetched
      - `emitted_detections` (int) - number of detections created
      - `errors_count` (int) - number of errors encountered
      - `lag_seconds_p95` (int, nullable) - 95th percentile lag
      - `notes` (text, nullable) - additional notes
      - Unique constraint on (source, run_date)

  2. Security
    - Enable RLS on all new tables
    - SELECT policies for authenticated users
    - No direct anon insert/update/delete (writes via service role)
*/

CREATE TABLE IF NOT EXISTS rubric_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version_name text NOT NULL UNIQUE,
  effective_at timestamptz NOT NULL DEFAULT now(),
  weights_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  threshold_alert int NOT NULL DEFAULT 60,
  panic_sensitivity int NOT NULL DEFAULT -20,
  suppression_strictness text NOT NULL DEFAULT 'high',
  reason text NULL,
  is_active bool NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE rubric_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read rubric_versions"
  ON rubric_versions
  FOR SELECT
  TO authenticated
  USING (true);

CREATE TABLE IF NOT EXISTS source_cursor (
  source text PRIMARY KEY,
  cursor_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_run_at timestamptz NULL,
  last_ok_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE source_cursor ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read source_cursor"
  ON source_cursor
  FOR SELECT
  TO authenticated
  USING (true);

CREATE TABLE IF NOT EXISTS raw_docs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL,
  external_id text NOT NULL,
  content_hash text NOT NULL,
  payload_json jsonb NOT NULL,
  fetched_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source, external_id, content_hash)
);

ALTER TABLE raw_docs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read raw_docs"
  ON raw_docs
  FOR SELECT
  TO authenticated
  USING (true);

CREATE TABLE IF NOT EXISTS source_health (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL,
  run_date date NOT NULL,
  fetched_count int NOT NULL DEFAULT 0,
  emitted_detections int NOT NULL DEFAULT 0,
  errors_count int NOT NULL DEFAULT 0,
  lag_seconds_p95 int NULL,
  notes text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source, run_date)
);

ALTER TABLE source_health ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read source_health"
  ON source_health
  FOR SELECT
  TO authenticated
  USING (true);

CREATE INDEX IF NOT EXISTS idx_rubric_versions_is_active ON rubric_versions(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_raw_docs_source_external ON raw_docs(source, external_id);
CREATE INDEX IF NOT EXISTS idx_source_health_source_date ON source_health(source, run_date DESC);