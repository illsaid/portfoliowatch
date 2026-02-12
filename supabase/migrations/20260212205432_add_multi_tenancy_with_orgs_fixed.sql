/*
  # Add Multi-Tenancy Support with Organizations

  This migration adds tenant isolation by introducing an organizations table
  and scoping all major tables to an org_id.

  ## Changes

  1. New Tables
    - `orgs` - Organizations table with id, name, created_at
      - Creates a default organization named 'Founders'

  2. Modified Tables - Add org_id column to:
    - `watchlist_item`
    - `trial_mapping`
    - `detection`
    - `daily_state`
    - `poll_run`
    - `source_cursor`
    - `source_health`
    - `policy`
    - `admin_settings`
    - `raw_docs`
    - `llm_cache`
    - `market_data`
    - `miss_log`
    - `rubric_versions`
    - `notification_settings`

  3. Updated Unique Constraints - Scope to org_id:
    - detection: (org_id, ticker, accession) and (org_id, ticker, nct_id, field_path, detected_date)
    - trial_mapping: (org_id, ticker, nct_id)
    - daily_state: (org_id, date)
    - source_cursor: (org_id, source)
    - source_health: (org_id, source, run_date)
    - raw_docs: (org_id, source, external_id, content_hash)
    - market_data: (org_id, ticker, date)
    - miss_log: (org_id, ticker, date)
    - admin_settings: (org_id, key)
    - notification_settings: (org_id, user_id)

  4. Indexes
    - Add indexes on org_id for all modified tables

  ## Notes
  - All existing rows are assigned to the default 'Founders' organization
  - The org_id column has a NOT NULL constraint with a default value
  - This allows the app to run with a single org while being ready for multi-tenancy
*/

-- 1) Create orgs table
CREATE TABLE IF NOT EXISTS orgs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE orgs ENABLE ROW LEVEL SECURITY;

-- Insert default organization
INSERT INTO orgs (name) 
VALUES ('Founders')
ON CONFLICT DO NOTHING;

-- Get the default org id for use in column defaults
DO $$ 
DECLARE 
  default_org_id uuid;
BEGIN
  SELECT id INTO default_org_id FROM orgs WHERE name = 'Founders' LIMIT 1;
  
  -- Store it in a temporary setting for use in this transaction
  PERFORM set_config('app.default_org_id', default_org_id::text, true);
END $$;

-- 2) Add org_id to all tenant-scoped tables

-- watchlist_item
ALTER TABLE watchlist_item 
  ADD COLUMN IF NOT EXISTS org_id uuid NOT NULL 
  DEFAULT current_setting('app.default_org_id')::uuid
  REFERENCES orgs(id) ON DELETE CASCADE;

-- trial_mapping
ALTER TABLE trial_mapping 
  ADD COLUMN IF NOT EXISTS org_id uuid NOT NULL 
  DEFAULT current_setting('app.default_org_id')::uuid
  REFERENCES orgs(id) ON DELETE CASCADE;

-- detection
ALTER TABLE detection 
  ADD COLUMN IF NOT EXISTS org_id uuid NOT NULL 
  DEFAULT current_setting('app.default_org_id')::uuid
  REFERENCES orgs(id) ON DELETE CASCADE;

-- daily_state
ALTER TABLE daily_state 
  ADD COLUMN IF NOT EXISTS org_id uuid NOT NULL 
  DEFAULT current_setting('app.default_org_id')::uuid
  REFERENCES orgs(id) ON DELETE CASCADE;

-- poll_run
ALTER TABLE poll_run 
  ADD COLUMN IF NOT EXISTS org_id uuid NOT NULL 
  DEFAULT current_setting('app.default_org_id')::uuid
  REFERENCES orgs(id) ON DELETE CASCADE;

-- source_cursor
ALTER TABLE source_cursor 
  ADD COLUMN IF NOT EXISTS org_id uuid NOT NULL 
  DEFAULT current_setting('app.default_org_id')::uuid
  REFERENCES orgs(id) ON DELETE CASCADE;

-- source_health
ALTER TABLE source_health 
  ADD COLUMN IF NOT EXISTS org_id uuid NOT NULL 
  DEFAULT current_setting('app.default_org_id')::uuid
  REFERENCES orgs(id) ON DELETE CASCADE;

-- policy
ALTER TABLE policy 
  ADD COLUMN IF NOT EXISTS org_id uuid NOT NULL 
  DEFAULT current_setting('app.default_org_id')::uuid
  REFERENCES orgs(id) ON DELETE CASCADE;

-- admin_settings
ALTER TABLE admin_settings 
  ADD COLUMN IF NOT EXISTS org_id uuid NOT NULL 
  DEFAULT current_setting('app.default_org_id')::uuid
  REFERENCES orgs(id) ON DELETE CASCADE;

-- raw_docs
ALTER TABLE raw_docs 
  ADD COLUMN IF NOT EXISTS org_id uuid NOT NULL 
  DEFAULT current_setting('app.default_org_id')::uuid
  REFERENCES orgs(id) ON DELETE CASCADE;

-- llm_cache
ALTER TABLE llm_cache 
  ADD COLUMN IF NOT EXISTS org_id uuid NOT NULL 
  DEFAULT current_setting('app.default_org_id')::uuid
  REFERENCES orgs(id) ON DELETE CASCADE;

-- market_data
ALTER TABLE market_data 
  ADD COLUMN IF NOT EXISTS org_id uuid NOT NULL 
  DEFAULT current_setting('app.default_org_id')::uuid
  REFERENCES orgs(id) ON DELETE CASCADE;

-- miss_log
ALTER TABLE miss_log 
  ADD COLUMN IF NOT EXISTS org_id uuid NOT NULL 
  DEFAULT current_setting('app.default_org_id')::uuid
  REFERENCES orgs(id) ON DELETE CASCADE;

-- rubric_versions
ALTER TABLE rubric_versions 
  ADD COLUMN IF NOT EXISTS org_id uuid NOT NULL 
  DEFAULT current_setting('app.default_org_id')::uuid
  REFERENCES orgs(id) ON DELETE CASCADE;

-- notification_settings
ALTER TABLE notification_settings 
  ADD COLUMN IF NOT EXISTS org_id uuid NOT NULL 
  DEFAULT current_setting('app.default_org_id')::uuid
  REFERENCES orgs(id) ON DELETE CASCADE;

-- 3) Update unique constraints to scope to org_id

-- detection: drop old indexes, create org-scoped ones
DROP INDEX IF EXISTS idx_detection_ticker_accession;
DROP INDEX IF EXISTS idx_detection_ctgov_dedup;

CREATE UNIQUE INDEX IF NOT EXISTS idx_detection_ticker_accession
  ON detection (org_id, ticker, accession);

CREATE UNIQUE INDEX IF NOT EXISTS idx_detection_ctgov_dedup
  ON detection (org_id, ticker, nct_id, field_path, detected_date);

-- trial_mapping: drop constraint, create new one
ALTER TABLE trial_mapping DROP CONSTRAINT IF EXISTS trial_mapping_ticker_nct_id_key;
CREATE UNIQUE INDEX IF NOT EXISTS trial_mapping_ticker_nct_id_key
  ON trial_mapping (org_id, ticker, nct_id);

-- daily_state: drop constraint, create new one
ALTER TABLE daily_state DROP CONSTRAINT IF EXISTS daily_state_date_key;
CREATE UNIQUE INDEX IF NOT EXISTS daily_state_date_key
  ON daily_state (org_id, date);

-- source_cursor: it's currently using source as PK, need to change
ALTER TABLE source_cursor DROP CONSTRAINT IF EXISTS source_cursor_pkey;
ALTER TABLE source_cursor ADD COLUMN IF NOT EXISTS id uuid DEFAULT gen_random_uuid();
ALTER TABLE source_cursor ADD CONSTRAINT source_cursor_pkey PRIMARY KEY (id);
CREATE UNIQUE INDEX IF NOT EXISTS source_cursor_org_source_key
  ON source_cursor (org_id, source);

-- source_health: drop constraints, create new one
ALTER TABLE source_health DROP CONSTRAINT IF EXISTS source_health_source_run_date_key;
DROP INDEX IF EXISTS source_health_source_run_date_idx;
CREATE UNIQUE INDEX IF NOT EXISTS source_health_source_run_date_key
  ON source_health (org_id, source, run_date);

-- raw_docs: drop constraint, create new one
ALTER TABLE raw_docs DROP CONSTRAINT IF EXISTS raw_docs_source_external_id_content_hash_key;
CREATE UNIQUE INDEX IF NOT EXISTS raw_docs_source_external_id_content_hash_key
  ON raw_docs (org_id, source, external_id, content_hash);

-- market_data: drop index, create new one
DROP INDEX IF EXISTS market_data_ticker_date_idx;
CREATE UNIQUE INDEX IF NOT EXISTS market_data_ticker_date_idx
  ON market_data (org_id, ticker, date);

-- miss_log: drop constraint, create new one
ALTER TABLE miss_log DROP CONSTRAINT IF EXISTS miss_log_ticker_date_key;
CREATE UNIQUE INDEX IF NOT EXISTS miss_log_ticker_date_key
  ON miss_log (org_id, ticker, date);

-- admin_settings: drop constraint, create new one
ALTER TABLE admin_settings DROP CONSTRAINT IF EXISTS admin_settings_key_key;
CREATE UNIQUE INDEX IF NOT EXISTS admin_settings_key_key
  ON admin_settings (org_id, key);

-- notification_settings: drop constraint, create new one
ALTER TABLE notification_settings DROP CONSTRAINT IF EXISTS notification_settings_user_id_key;
CREATE UNIQUE INDEX IF NOT EXISTS notification_settings_user_id_key
  ON notification_settings (org_id, user_id);

-- rubric_versions: drop constraint, create new one
ALTER TABLE rubric_versions DROP CONSTRAINT IF EXISTS rubric_versions_version_name_key;
CREATE UNIQUE INDEX IF NOT EXISTS rubric_versions_version_name_key
  ON rubric_versions (org_id, version_name);

-- 4) Add indexes on org_id for efficient filtering
CREATE INDEX IF NOT EXISTS idx_watchlist_item_org_id ON watchlist_item(org_id);
CREATE INDEX IF NOT EXISTS idx_trial_mapping_org_id ON trial_mapping(org_id);
CREATE INDEX IF NOT EXISTS idx_detection_org_id ON detection(org_id);
CREATE INDEX IF NOT EXISTS idx_daily_state_org_id ON daily_state(org_id);
CREATE INDEX IF NOT EXISTS idx_poll_run_org_id ON poll_run(org_id);
CREATE INDEX IF NOT EXISTS idx_source_cursor_org_id ON source_cursor(org_id);
CREATE INDEX IF NOT EXISTS idx_source_health_org_id ON source_health(org_id);
CREATE INDEX IF NOT EXISTS idx_policy_org_id ON policy(org_id);
CREATE INDEX IF NOT EXISTS idx_admin_settings_org_id ON admin_settings(org_id);
CREATE INDEX IF NOT EXISTS idx_raw_docs_org_id ON raw_docs(org_id);
CREATE INDEX IF NOT EXISTS idx_llm_cache_org_id ON llm_cache(org_id);
CREATE INDEX IF NOT EXISTS idx_market_data_org_id ON market_data(org_id);
CREATE INDEX IF NOT EXISTS idx_miss_log_org_id ON miss_log(org_id);
CREATE INDEX IF NOT EXISTS idx_rubric_versions_org_id ON rubric_versions(org_id);
CREATE INDEX IF NOT EXISTS idx_notification_settings_org_id ON notification_settings(org_id);