import { describe, it, expect } from 'vitest';
import { computeScore } from '../lib/engine/scoring';

describe('scoring', () => {
  it('computes base score for filing_new', () => {
    const result = computeScore('filing_new', 'primary_filing', {
      dependency: 1.0,
      marketMove: null,
      timeToCatalystDays: 999,
    });
    expect(result.base).toBe(40);
    expect(result.noisePenalty).toBe(0);
    expect(result.scoreFinal).toBe(40);
  });

  it('applies dependency scaling', () => {
    const result = computeScore('filing_new', 'primary_filing', {
      dependency: 0.3,
      marketMove: null,
      timeToCatalystDays: 999,
    });
    expect(result.scoreFinal).toBe(12);
  });

  it('applies market shock boost', () => {
    const result = computeScore('filing_new', 'primary_filing', {
      dependency: 1.0,
      marketMove: -0.15,
      timeToCatalystDays: 999,
    });
    expect(result.marketShock).toBe(15);
    expect(result.scoreFinal).toBe(55);
  });

  it('caps market shock at 20', () => {
    const result = computeScore('filing_new', 'primary_filing', {
      dependency: 1.0,
      marketMove: -0.50,
      timeToCatalystDays: 999,
    });
    expect(result.marketShock).toBe(20);
  });

  it('applies noise penalty for tertiary_social', () => {
    const result = computeScore('filing_new', 'tertiary_social', {
      dependency: 1.0,
      marketMove: null,
      timeToCatalystDays: 999,
    });
    expect(result.noisePenalty).toBe(20);
    expect(result.scoreFinal).toBe(20);
  });

  it('clamps score to 0 minimum', () => {
    const result = computeScore('misc', 'tertiary_social', {
      dependency: 0.3,
      marketMove: null,
      timeToCatalystDays: 999,
    });
    expect(result.scoreFinal).toBe(0);
  });

  it('clamps score to 100 maximum', () => {
    const result = computeScore('halt', 'primary_filing', {
      dependency: 1.0,
      marketMove: -0.50,
      timeToCatalystDays: 999,
    });
    expect(result.scoreFinal).toBeLessThanOrEqual(100);
  });

  it('generates explanation string', () => {
    const result = computeScore('filing_new', 'primary_filing', {
      dependency: 0.6,
      marketMove: null,
      timeToCatalystDays: 999,
    });
    expect(result.explanation).toContain('Raw 40');
    expect(result.explanation).toContain('0.6');
  });

  it('scores trial_status_change correctly', () => {
    const result = computeScore('trial_status_change', 'primary_registry', {
      dependency: 1.0,
      marketMove: null,
      timeToCatalystDays: 999,
    });
    expect(result.base).toBe(80);
    expect(result.noisePenalty).toBe(2);
    expect(result.scoreFinal).toBe(78);
  });

  it('scores enrollment_change correctly', () => {
    const result = computeScore('enrollment_change', 'primary_registry', {
      dependency: 0.6,
      marketMove: null,
      timeToCatalystDays: 999,
    });
    expect(result.base).toBe(40);
    expect(result.scoreFinal).toBe(22);
  });
});
