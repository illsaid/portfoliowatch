export const SOURCE_TIERS = [
  'primary_filing',
  'primary_company',
  'primary_registry',
  'primary_regulator',
  'secondary_news',
  'tertiary_social',
] as const;
export type SourceTier = (typeof SOURCE_TIERS)[number];

export const CHANGE_TYPES = [
  'filing_new',
  'filing_amended',
  'pdufa_changed',
  'trial_termination',
  'halt',
  'price_gap',
  'misc',
  'trial_status_change',
  'trial_endpoint_change',
  'trial_date_change',
  'enrollment_change',
] as const;
export type ChangeType = (typeof CHANGE_TYPES)[number];

export const DAILY_STATES = ['Contained', 'Watch', 'Look', 'Pause'] as const;
export type DailyStateEnum = (typeof DAILY_STATES)[number];

export interface Detection {
  id?: string;
  ticker: string;
  detected_at: string;
  detected_date?: string;
  source_tier: SourceTier;
  change_type: ChangeType;
  title: string;
  url?: string | null;
  accession?: string | null;
  nct_id?: string | null;
  field_path?: string | null;
  old_value?: string | null;
  new_value?: string | null;
  raw_payload?: Record<string, unknown> | null;
  llm_confidence: number;
  suppressed: boolean;
  quarantined: boolean;
  hard_alert: boolean;
  score_raw: number;
  score_final: number;
  policy_match_id?: string | null;
  policy_match_label?: string | null;
  rubric_version_id?: string | null;
  llm_interp?: Record<string, unknown> | null;
  llm_model?: string | null;
  llm_generated_at?: string | null;
  created_at?: string;
}

export interface WatchlistItem {
  id: string;
  user_id: string;
  ticker: string;
  cik: string | null;
  dependency: number;
  last_filing_accession: string | null;
  poll_interval_hours: number;
  last_poll_at: string | null;
  next_check_in_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DailyState {
  id?: string;
  date: string;
  state: DailyStateEnum;
  summary: string;
  top_detection_id: string | null;
  quiet_log_count: number;
  created_at?: string;
}

export interface MissLog {
  id?: string;
  ticker: string;
  detection_id: string | null;
  date: string;
  reason: string;
  move_1d: number;
  created_at?: string;
}

export interface PolicyRule {
  id: string;
  label: string;
  if: Record<string, unknown>;
  action: 'suppress' | 'quarantine' | 'pause';
}

export interface ParsedPolicy {
  suppression: PolicyRule[];
  hard_alerts: PolicyRule[];
}

export interface AdminSettings {
  ALERT_THRESHOLD: number;
  SUPPRESSION_STRICTNESS: string;
  PANIC_SENSITIVITY: number;
  FEEDBACK_LOOP: string;
}

export interface ScoringResult {
  base: number;
  proximity: number;
  friction: number;
  marketShock: number;
  dependency: number;
  noisePenalty: number;
  scoreRaw: number;
  scoreFinal: number;
  explanation: string;
}

export interface ScoringContext {
  dependency: number;
  marketMove: number | null;
  timeToCatalystDays: number;
}

export interface PolicyEvalResult {
  action: 'suppress' | 'quarantine' | 'pause' | 'allow';
  ruleId: string | null;
  ruleLabel: string | null;
}

export interface PolicyContext {
  marketGap: number | null;
  timeToCatalystDays: number;
}

export interface PollRunRecord {
  id?: string;
  started_at?: string;
  finished_at?: string | null;
  status: 'running' | 'ok' | 'error';
  summary_json?: Record<string, unknown> | null;
  error_json?: Record<string, unknown> | null;
  tickers_polled: number;
  new_detections: number;
  suppressed_count: number;
  quarantined_count: number;
  resulting_state?: string | null;
  rubric_version_id?: string | null;
  created_at?: string;
}

export interface TrialMapping {
  id: string;
  ticker: string;
  nct_id: string;
  label: string | null;
  last_hash: string | null;
  last_snapshot?: Record<string, unknown> | null;
  last_fetched_at: string | null;
  created_at: string;
}

export interface NotificationSettings {
  id: string;
  user_id: string;
  channel: 'none' | 'email' | 'pwa';
  email: string | null;
  daily_push_enabled: boolean;
  pause_push_enabled: boolean;
  quiet_push_enabled: boolean;
  last_sent_at: string | null;
  created_at: string;
}

export interface CtgovDiff {
  changeType: ChangeType;
  fieldPath: string;
  oldValue: string;
  newValue: string;
  description: string;
}

export interface RubricWeights {
  base_score_weights?: Record<string, number>;
  tier_multipliers?: Record<string, number>;
  dependency_exponent?: number;
  market_move_multiplier?: number;
  catalyst_proximity_boost?: number;
}

export interface RubricVersion {
  id: string;
  version_name: string;
  effective_at: string;
  weights_json: RubricWeights;
  threshold_alert: number;
  panic_sensitivity: number;
  suppression_strictness: string;
  reason?: string | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface SourceCursor {
  source: string;
  cursor_json: Record<string, unknown>;
  last_run_at?: string | null;
  last_ok_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface RawDoc {
  id: string;
  source: string;
  external_id: string;
  content_hash: string;
  payload_json: Record<string, unknown>;
  fetched_at: string;
}

export interface SourceHealth {
  id: string;
  source: string;
  run_date: string;
  fetched_count: number;
  emitted_detections: number;
  errors_count: number;
  lag_seconds_p95?: number | null;
  notes?: string | null;
  created_at?: string;
}
