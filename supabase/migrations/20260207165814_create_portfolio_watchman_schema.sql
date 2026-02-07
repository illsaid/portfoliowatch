/*
  # Portfolio Watchman - Full Schema

  1. New Tables
    - `watchlist_item` - Tracked tickers with CIK mapping and check-in scheduling
      - `id` (uuid, pk)
      - `user_id` (text, default 'default')
      - `ticker` (text)
      - `cik` (text, nullable)
      - `dependency` (float, 0.3/0.6/1.0)
      - `last_filing_accession` (text, nullable) - EDGAR polling state
      - `poll_interval_hours` (int, default 24) - check-in scheduling
      - `last_poll_at` (timestamptz, nullable)
      - `next_check_in_at` (timestamptz, nullable)
    - `detection` - Detected changes from EDGAR, CT.gov, market
      - `id` (uuid, pk)
      - `ticker`, `detected_at`, `source_tier`, `change_type`
      - `title`, `url`, `accession`, `nct_id`
      - `field_path`, `old_value`, `new_value` (CT.gov diffs)
      - `raw_payload` (jsonb)
      - `llm_confidence` (float, default 1.0)
      - `suppressed`, `quarantined`, `hard_alert` (booleans)
      - `score_raw`, `score_final` (ints)
      - `policy_match_id`, `policy_match_label` (text, nullable)
    - `daily_state` - One row per day with portfolio state
    - `miss_log` - Tracks suppressed items that moved (unique per ticker-day)
    - `policy` - YAML policy rules with id/label
    - `admin_settings` - Thermostat controls
    - `poll_run` - Audit ledger for each poll execution
    - `trial_mapping` - Manual ticker-to-NCT trial mapping
    - `notification_settings` - Email/PWA notification preferences

  2. Security
    - RLS enabled on all tables
    - Permissive policies for anon role (single-user MVP)

  3. Indexes
    - detection(ticker, detected_at), detection(nct_id, detected_at)
    - Partial unique on detection(ticker, accession) WHERE accession IS NOT NULL
    - miss_log unique on (ticker, date)
    - trial_mapping unique on (ticker, nct_id)
    - poll_run(started_at DESC)
*/

-- watchlist_item
CREATE TABLE IF NOT EXISTS watchlist_item (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL DEFAULT 'default',
  ticker text NOT NULL,
  cik text,
  dependency float NOT NULL DEFAULT 0.6,
  last_filing_accession text,
  poll_interval_hours int NOT NULL DEFAULT 24,
  last_poll_at timestamptz,
  next_check_in_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_watchlist_item_ticker ON watchlist_item (ticker);

ALTER TABLE watchlist_item ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon read watchlist_item"
  ON watchlist_item FOR SELECT TO anon
  USING (user_id = 'default');

CREATE POLICY "Allow anon insert watchlist_item"
  ON watchlist_item FOR INSERT TO anon
  WITH CHECK (user_id = 'default');

CREATE POLICY "Allow anon update watchlist_item"
  ON watchlist_item FOR UPDATE TO anon
  USING (user_id = 'default')
  WITH CHECK (user_id = 'default');

CREATE POLICY "Allow anon delete watchlist_item"
  ON watchlist_item FOR DELETE TO anon
  USING (user_id = 'default');

-- detection
CREATE TABLE IF NOT EXISTS detection (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticker text NOT NULL,
  detected_at timestamptz NOT NULL DEFAULT now(),
  source_tier text NOT NULL CHECK (source_tier IN ('primary_filing','primary_company','primary_registry','primary_regulator','secondary_news','tertiary_social')),
  change_type text NOT NULL CHECK (change_type IN ('filing_new','filing_amended','pdufa_changed','trial_termination','halt','price_gap','misc','trial_status_change','trial_endpoint_change','trial_date_change','enrollment_change')),
  title text NOT NULL,
  url text,
  accession text,
  nct_id text,
  field_path text,
  old_value text,
  new_value text,
  raw_payload jsonb,
  llm_confidence float NOT NULL DEFAULT 1.0,
  suppressed boolean NOT NULL DEFAULT false,
  quarantined boolean NOT NULL DEFAULT false,
  hard_alert boolean NOT NULL DEFAULT false,
  score_raw int,
  score_final int,
  policy_match_id text,
  policy_match_label text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_detection_ticker_detected ON detection (ticker, detected_at);
CREATE INDEX IF NOT EXISTS idx_detection_nct_detected ON detection (nct_id, detected_at);
CREATE INDEX IF NOT EXISTS idx_detection_detected_at ON detection (detected_at);

CREATE UNIQUE INDEX IF NOT EXISTS idx_detection_ticker_accession
  ON detection (ticker, accession) WHERE accession IS NOT NULL;

ALTER TABLE detection ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon read detection"
  ON detection FOR SELECT TO anon USING (true);

CREATE POLICY "Allow anon insert detection"
  ON detection FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Allow anon update detection"
  ON detection FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- daily_state
CREATE TABLE IF NOT EXISTS daily_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL UNIQUE,
  state text NOT NULL CHECK (state IN ('Contained','Watch','Look','Pause')),
  summary text,
  top_detection_id uuid REFERENCES detection(id),
  quiet_log_count int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_daily_state_date ON daily_state (date);

ALTER TABLE daily_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon read daily_state"
  ON daily_state FOR SELECT TO anon USING (true);

CREATE POLICY "Allow anon insert daily_state"
  ON daily_state FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Allow anon update daily_state"
  ON daily_state FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- miss_log
CREATE TABLE IF NOT EXISTS miss_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticker text NOT NULL,
  detection_id uuid REFERENCES detection(id),
  date date NOT NULL,
  reason text,
  move_1d float,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (ticker, date)
);

CREATE INDEX IF NOT EXISTS idx_miss_log_date ON miss_log (date);

ALTER TABLE miss_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon read miss_log"
  ON miss_log FOR SELECT TO anon USING (true);

CREATE POLICY "Allow anon insert miss_log"
  ON miss_log FOR INSERT TO anon WITH CHECK (true);

-- policy
CREATE TABLE IF NOT EXISTS policy (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  yaml_text text NOT NULL,
  is_active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE policy ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon read policy"
  ON policy FOR SELECT TO anon USING (true);

CREATE POLICY "Allow anon insert policy"
  ON policy FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Allow anon update policy"
  ON policy FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- admin_settings
CREATE TABLE IF NOT EXISTS admin_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  value text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon read admin_settings"
  ON admin_settings FOR SELECT TO anon USING (true);

CREATE POLICY "Allow anon insert admin_settings"
  ON admin_settings FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Allow anon update admin_settings"
  ON admin_settings FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- poll_run
CREATE TABLE IF NOT EXISTS poll_run (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  status text NOT NULL DEFAULT 'running' CHECK (status IN ('running','ok','error')),
  summary_json jsonb,
  error_json jsonb,
  tickers_polled int NOT NULL DEFAULT 0,
  new_detections int NOT NULL DEFAULT 0,
  suppressed_count int NOT NULL DEFAULT 0,
  quarantined_count int NOT NULL DEFAULT 0,
  resulting_state text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_poll_run_started ON poll_run (started_at DESC);

ALTER TABLE poll_run ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon read poll_run"
  ON poll_run FOR SELECT TO anon USING (true);

CREATE POLICY "Allow anon insert poll_run"
  ON poll_run FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Allow anon update poll_run"
  ON poll_run FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- trial_mapping
CREATE TABLE IF NOT EXISTS trial_mapping (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticker text NOT NULL,
  nct_id text NOT NULL,
  label text,
  last_hash text,
  last_fetched_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (ticker, nct_id)
);

CREATE INDEX IF NOT EXISTS idx_trial_mapping_ticker ON trial_mapping (ticker);

ALTER TABLE trial_mapping ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon read trial_mapping"
  ON trial_mapping FOR SELECT TO anon USING (true);

CREATE POLICY "Allow anon insert trial_mapping"
  ON trial_mapping FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Allow anon update trial_mapping"
  ON trial_mapping FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Allow anon delete trial_mapping"
  ON trial_mapping FOR DELETE TO anon USING (true);

-- notification_settings
CREATE TABLE IF NOT EXISTS notification_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL DEFAULT 'default' UNIQUE,
  channel text NOT NULL DEFAULT 'none' CHECK (channel IN ('none','email','pwa')),
  email text,
  daily_push_enabled boolean NOT NULL DEFAULT false,
  pause_push_enabled boolean NOT NULL DEFAULT true,
  quiet_push_enabled boolean NOT NULL DEFAULT false,
  last_sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon read notification_settings"
  ON notification_settings FOR SELECT TO anon USING (user_id = 'default');

CREATE POLICY "Allow anon insert notification_settings"
  ON notification_settings FOR INSERT TO anon WITH CHECK (user_id = 'default');

CREATE POLICY "Allow anon update notification_settings"
  ON notification_settings FOR UPDATE TO anon
  USING (user_id = 'default')
  WITH CHECK (user_id = 'default');
