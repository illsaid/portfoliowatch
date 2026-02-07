/*
  # Seed initial data

  1. Watchlist Items
    - 5 biotech tickers with CIK mappings and dependency ratings
  2. Admin Settings
    - ALERT_THRESHOLD, SUPPRESSION_STRICTNESS, PANIC_SENSITIVITY, FEEDBACK_LOOP
  3. Policy
    - Default YAML policy with rule ids and labels
  4. Notification Settings
    - Default row for single-user MVP
*/

INSERT INTO watchlist_item (ticker, cik, dependency) VALUES
  ('MRNA', '1682852', 1.0),
  ('REGN', '872589', 0.6),
  ('VRTX', '875320', 0.6),
  ('BMRN', '1048477', 0.3),
  ('ALNY', '1178670', 0.3)
ON CONFLICT DO NOTHING;

INSERT INTO admin_settings (key, value) VALUES
  ('ALERT_THRESHOLD', '60'),
  ('SUPPRESSION_STRICTNESS', 'high'),
  ('PANIC_SENSITIVITY', '-20'),
  ('FEEDBACK_LOOP', 'on')
ON CONFLICT (key) DO NOTHING;

INSERT INTO policy (name, yaml_text, is_active) VALUES
  ('default', 'suppression:
  - id: "S1"
    label: "Suppress tertiary social"
    if: { source_tier: "tertiary_social" }
    action: "suppress"
  - id: "S2"
    label: "Suppress misc from non-primary sources"
    if: { change_type: "misc", source_tier_not: ["primary_filing","primary_regulator","primary_registry"] }
    action: "suppress"
  - id: "S3"
    label: "Suppress distant non-critical events"
    if: { time_to_catalyst_days_gt: 90, change_type_not: ["financing","trial_termination","crl","approval"] }
    action: "suppress"
  - id: "Q1"
    label: "Quarantine low-confidence extractions"
    if: { llm_confidence_lt: 0.7 }
    action: "quarantine"
hard_alerts:
  - id: "H1"
    label: "Hard alert on halt/termination/PDUFA change"
    if: { change_type_in: ["halt","trial_termination","pdufa_changed"] }
    action: "pause"
  - id: "H2"
    label: "Hard alert on market gap"
    if: { market_gap_lte: -0.20 }
    action: "pause"', true)
ON CONFLICT DO NOTHING;

INSERT INTO notification_settings (user_id, channel) VALUES
  ('default', 'none')
ON CONFLICT (user_id) DO NOTHING;
