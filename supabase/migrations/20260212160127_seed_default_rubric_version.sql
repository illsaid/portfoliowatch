/*
  # Seed Default Rubric Version

  1. Data Seeding
    - Insert default rubric_versions row (version_name='v1')
    - Mark it as active with default scoring parameters
    - Uses INSERT ON CONFLICT to be idempotent

  2. Default Values
    - threshold_alert: 60 (maps to ALERT_THRESHOLD)
    - panic_sensitivity: -20
    - suppression_strictness: 'high'
    - weights_json: default scoring multipliers
*/

INSERT INTO rubric_versions (
  version_name,
  effective_at,
  weights_json,
  threshold_alert,
  panic_sensitivity,
  suppression_strictness,
  reason,
  is_active
)
VALUES (
  'v1',
  now(),
  '{
    "base_score_weights": {
      "status_change": 100,
      "date_change": 60,
      "enrollment_change": 40,
      "design_change": 80,
      "outcome_change": 70,
      "eligibility_change": 30,
      "contact_change": 10,
      "filing_new": 80,
      "filing_amended": 60,
      "other": 20
    },
    "tier_multipliers": {
      "primary_registry": 1.0,
      "primary_filing": 1.0,
      "aggregator": 0.7,
      "news": 0.5
    },
    "dependency_exponent": 1.5,
    "market_move_multiplier": 2.0,
    "catalyst_proximity_boost": 1.3
  }'::jsonb,
  60,
  -20,
  'high',
  'Initial default rubric version',
  true
)
ON CONFLICT (version_name) DO NOTHING;