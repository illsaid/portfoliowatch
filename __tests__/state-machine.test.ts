import { describe, it, expect } from 'vitest';
import { selectTopDetection } from '../lib/engine/state-machine';
import type { Detection } from '../lib/engine/types';

function makeDetection(overrides: Partial<Detection>): Detection {
  return {
    id: Math.random().toString(36),
    ticker: 'TEST',
    detected_at: new Date().toISOString(),
    source_tier: 'primary_filing',
    change_type: 'filing_new',
    title: 'Test detection',
    llm_confidence: 1.0,
    suppressed: false,
    quarantined: false,
    hard_alert: false,
    score_raw: 40,
    score_final: 40,
    ...overrides,
  };
}

describe('state machine', () => {
  it('returns Contained when no detections', () => {
    const top = selectTopDetection([], {});
    expect(top).toBeNull();
  });

  it('selects highest weighted detection as top', () => {
    const d1 = makeDetection({ id: 'a', ticker: 'MRNA', score_final: 60 });
    const d2 = makeDetection({ id: 'b', ticker: 'REGN', score_final: 50 });

    const top = selectTopDetection([d1, d2], { MRNA: 1.0, REGN: 0.6 });
    expect(top?.id).toBe('a');
  });

  it('weights by dependency correctly', () => {
    const d1 = makeDetection({ id: 'a', ticker: 'MRNA', score_final: 40 });
    const d2 = makeDetection({ id: 'b', ticker: 'REGN', score_final: 60 });

    const top = selectTopDetection([d1, d2], { MRNA: 0.3, REGN: 1.0 });
    expect(top?.id).toBe('b');
  });

  it('excludes suppressed detections from top', () => {
    const d1 = makeDetection({ id: 'a', score_final: 80, suppressed: true });
    const d2 = makeDetection({ id: 'b', score_final: 30 });

    const top = selectTopDetection([d1, d2], { TEST: 1.0 });
    expect(top?.id).toBe('b');
  });

  it('excludes quarantined detections from top', () => {
    const d1 = makeDetection({ id: 'a', score_final: 90, quarantined: true });
    const d2 = makeDetection({ id: 'b', score_final: 20 });

    const top = selectTopDetection([d1, d2], { TEST: 1.0 });
    expect(top?.id).toBe('b');
  });

  it('returns null when all detections are suppressed', () => {
    const d1 = makeDetection({ suppressed: true });
    const d2 = makeDetection({ quarantined: true });

    const top = selectTopDetection([d1, d2], { TEST: 1.0 });
    expect(top).toBeNull();
  });
});
