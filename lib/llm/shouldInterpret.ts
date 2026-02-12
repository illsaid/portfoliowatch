import type { Detection, DailyStateEnum } from '@/lib/engine/types';

const FIELD_PATH_ALLOWLIST = [
  'overall_status',
  'why_stopped',
  'primary_completion_date',
  'completion_date',
  'enrollment_count',
  'has_results',
  'phase',
];

const SCORE_THRESHOLD = 30;

export function getMaxLLMCallsPerRun(): number {
  const env = process.env.MAX_LLM_CALLS_PER_RUN;
  return env ? parseInt(env, 10) : 10;
}

export function getMaxLLMCallsPerTickerPerDay(): number {
  const env = process.env.MAX_LLM_CALLS_PER_TICKER_PER_DAY;
  return env ? parseInt(env, 10) : 2;
}

export interface GatingContext {
  tickerState?: DailyStateEnum | null;
  tickerCallsToday?: number;
  totalCallsThisRun?: number;
}

export function shouldInterpret(
  detection: Detection,
  ctx: GatingContext = {}
): { should: boolean; reason: string } {
  if (detection.source_tier !== 'primary_registry') {
    return { should: false, reason: 'not_ctgov' };
  }

  if (!detection.nct_id) {
    return { should: false, reason: 'no_nct_id' };
  }

  if (detection.llm_interp && detection.llm_input_hash) {
    return { should: false, reason: 'already_interpreted' };
  }

  const maxPerRun = getMaxLLMCallsPerRun();
  if (ctx.totalCallsThisRun !== undefined && ctx.totalCallsThisRun >= maxPerRun) {
    return { should: false, reason: 'max_calls_per_run' };
  }

  const maxPerTicker = getMaxLLMCallsPerTickerPerDay();
  if (ctx.tickerCallsToday !== undefined && ctx.tickerCallsToday >= maxPerTicker) {
    return { should: false, reason: 'max_calls_per_ticker' };
  }

  const fieldPath = detection.field_path?.toLowerCase() ?? '';
  const isAllowedField = FIELD_PATH_ALLOWLIST.some((f) =>
    fieldPath.includes(f.toLowerCase())
  );

  if (isAllowedField) {
    return { should: true, reason: 'allowlist_field' };
  }

  if (detection.score_final >= SCORE_THRESHOLD) {
    return { should: true, reason: 'high_score' };
  }

  if (ctx.tickerState === 'Look' || ctx.tickerState === 'Pause') {
    return { should: true, reason: 'elevated_state' };
  }

  return { should: false, reason: 'below_threshold' };
}

export function filterCandidates(
  detections: Detection[],
  tickerCallCounts: Record<string, number>,
  maxPerRun: number
): Detection[] {
  const candidates: Detection[] = [];
  let runCount = 0;

  for (const d of detections) {
    if (runCount >= maxPerRun) break;

    const tickerCount = tickerCallCounts[d.ticker] ?? 0;
    const ctx: GatingContext = {
      totalCallsThisRun: runCount,
      tickerCallsToday: tickerCount,
    };

    const result = shouldInterpret(d, ctx);
    if (result.should) {
      candidates.push(d);
      runCount++;
      tickerCallCounts[d.ticker] = tickerCount + 1;
    }
  }

  return candidates;
}
