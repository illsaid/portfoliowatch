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
    title: 'Test',
    llm_confidence: 1.0,
    suppressed: false,
    quarantined: false,
    hard_alert: false,
    score_raw: 40,
    score_final: 40,
    ...overrides,
  };
}

describe('one expanded item enforcement', () => {
  it('returns exactly one item even with multiple high-scoring detections', () => {
    const detections = [
      makeDetection({ id: 'a', score_final: 90 }),
      makeDetection({ id: 'b', score_final: 85 }),
      makeDetection({ id: 'c', score_final: 80 }),
      makeDetection({ id: 'd', score_final: 75 }),
    ];

    const top = selectTopDetection(detections, { TEST: 1.0 });
    expect(top).not.toBeNull();
    expect(top?.id).toBe('a');

    const topIds = detections.filter((d) => d.id === top?.id);
    expect(topIds.length).toBe(1);
  });

  it('picks the one with highest score*dependency across tickers', () => {
    const detections = [
      makeDetection({ id: 'a', ticker: 'LOW', score_final: 95 }),
      makeDetection({ id: 'b', ticker: 'HIGH', score_final: 60 }),
    ];

    const top = selectTopDetection(detections, { LOW: 0.3, HIGH: 1.0 });
    expect(top?.id).toBe('b');
  });
});
