import { describe, it, expect } from 'vitest';
import { parsePolicy, evaluateDetection } from '../lib/engine/policy';

const DEFAULT_YAML = `
suppression:
  - id: "S1"
    label: "Suppress tertiary social"
    if: { source_tier: "tertiary_social" }
    action: "suppress"
  - id: "S2"
    label: "Suppress misc from non-primary sources"
    if: { change_type: "misc", source_tier_not: ["primary_filing","primary_regulator","primary_registry"] }
    action: "suppress"
  - id: "Q1"
    label: "Quarantine low-confidence"
    if: { llm_confidence_lt: 0.7 }
    action: "quarantine"
hard_alerts:
  - id: "H1"
    label: "Hard alert on halt/termination/PDUFA"
    if: { change_type_in: ["halt","trial_termination","pdufa_changed"] }
    action: "pause"
  - id: "H2"
    label: "Hard alert on market gap"
    if: { market_gap_lte: -0.20 }
    action: "pause"
`;

const policy = parsePolicy(DEFAULT_YAML);
const defaultCtx = { marketGap: null, timeToCatalystDays: 999 };

describe('policy engine', () => {
  it('parses policy YAML', () => {
    expect(policy.suppression.length).toBe(3);
    expect(policy.hard_alerts.length).toBe(2);
    expect(policy.suppression[0].id).toBe('S1');
    expect(policy.suppression[0].label).toBe('Suppress tertiary social');
  });

  it('suppresses tertiary_social', () => {
    const result = evaluateDetection(
      { source_tier: 'tertiary_social', change_type: 'filing_new', llm_confidence: 1.0 },
      policy,
      defaultCtx
    );
    expect(result.action).toBe('suppress');
    expect(result.ruleId).toBe('S1');
    expect(result.ruleLabel).toBe('Suppress tertiary social');
  });

  it('suppresses misc from non-primary sources', () => {
    const result = evaluateDetection(
      { source_tier: 'secondary_news', change_type: 'misc', llm_confidence: 1.0 },
      policy,
      defaultCtx
    );
    expect(result.action).toBe('suppress');
    expect(result.ruleId).toBe('S2');
  });

  it('does NOT suppress misc from primary_filing', () => {
    const result = evaluateDetection(
      { source_tier: 'primary_filing', change_type: 'misc', llm_confidence: 1.0 },
      policy,
      defaultCtx
    );
    expect(result.action).toBe('allow');
  });

  it('quarantines low-confidence detections', () => {
    const result = evaluateDetection(
      { source_tier: 'primary_filing', change_type: 'filing_new', llm_confidence: 0.5 },
      policy,
      defaultCtx
    );
    expect(result.action).toBe('quarantine');
    expect(result.ruleId).toBe('Q1');
  });

  it('triggers hard alert on halt', () => {
    const result = evaluateDetection(
      { source_tier: 'primary_filing', change_type: 'halt', llm_confidence: 1.0 },
      policy,
      defaultCtx
    );
    expect(result.action).toBe('pause');
    expect(result.ruleId).toBe('H1');
  });

  it('triggers hard alert on trial_termination', () => {
    const result = evaluateDetection(
      { source_tier: 'primary_registry', change_type: 'trial_termination', llm_confidence: 1.0 },
      policy,
      defaultCtx
    );
    expect(result.action).toBe('pause');
    expect(result.ruleId).toBe('H1');
  });

  it('triggers hard alert on market gap', () => {
    const result = evaluateDetection(
      { source_tier: 'primary_filing', change_type: 'filing_new', llm_confidence: 1.0 },
      policy,
      { marketGap: -0.25, timeToCatalystDays: 999 }
    );
    expect(result.action).toBe('pause');
    expect(result.ruleId).toBe('H2');
  });

  it('does NOT trigger market gap hard alert when gap is above threshold', () => {
    const result = evaluateDetection(
      { source_tier: 'primary_filing', change_type: 'filing_new', llm_confidence: 1.0 },
      policy,
      { marketGap: -0.10, timeToCatalystDays: 999 }
    );
    expect(result.action).toBe('allow');
  });

  it('hard alerts take priority over suppression', () => {
    const result = evaluateDetection(
      { source_tier: 'tertiary_social', change_type: 'halt', llm_confidence: 1.0 },
      policy,
      defaultCtx
    );
    expect(result.action).toBe('pause');
  });

  it('allows normal detections through', () => {
    const result = evaluateDetection(
      { source_tier: 'primary_filing', change_type: 'filing_new', llm_confidence: 1.0 },
      policy,
      defaultCtx
    );
    expect(result.action).toBe('allow');
    expect(result.ruleId).toBeNull();
  });
});
