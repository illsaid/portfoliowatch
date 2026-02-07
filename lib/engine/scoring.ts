import type { ChangeType, SourceTier, ScoringResult, ScoringContext } from './types';

const BASE_SCORES: Record<ChangeType, number> = {
  filing_new: 40,
  filing_amended: 30,
  pdufa_changed: 90,
  trial_termination: 95,
  halt: 100,
  price_gap: 50,
  misc: 10,
  trial_status_change: 80,
  trial_endpoint_change: 70,
  trial_date_change: 50,
  enrollment_change: 40,
};

const NOISE_PENALTIES: Record<SourceTier, number> = {
  primary_filing: 0,
  primary_company: 2,
  primary_registry: 2,
  primary_regulator: 0,
  secondary_news: 10,
  tertiary_social: 20,
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function computeScore(
  changeType: ChangeType,
  sourceTier: SourceTier,
  ctx: ScoringContext
): ScoringResult {
  const B = BASE_SCORES[changeType] ?? 10;
  const P = 0;
  const F = 0;
  const M = ctx.marketMove != null ? clamp(Math.abs(ctx.marketMove) * 100, 0, 20) : 0;
  const D = ctx.dependency;
  const N = NOISE_PENALTIES[sourceTier] ?? 0;

  const importance = (B + P + F + M) * D;
  const importanceRounded = Math.round(importance);
  const scoreRaw = B + P + F + M;
  const scoreFinal = clamp(Math.round(importance - N), 0, 100);

  const explanation =
    `Raw ${scoreRaw} × ${D} = ${importanceRounded} − ${N} = ${scoreFinal}` +
    (scoreFinal === 0 ? ' (suppressed by score)' : '');

  return {
    base: B,
    proximity: P,
    friction: F,
    marketShock: Math.round(M),
    dependency: D,
    noisePenalty: N,
    scoreRaw,
    scoreFinal,
    explanation,
  };
}
