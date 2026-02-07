import { describe, it, expect } from 'vitest';
import { diffStudy, computeStudyHash, computeTimeToCatalyst } from '../lib/providers/ctgov';

const makeStudy = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
  protocolSection: {
    statusModule: {
      overallStatus: 'RECRUITING',
      completionDateStruct: { date: '2027-06-01' },
      primaryCompletionDateStruct: { date: '2027-01-15' },
    },
    outcomesModule: {
      primaryOutcomes: [{ measure: 'Overall survival' }],
    },
    designModule: {
      enrollmentInfo: { count: 500, type: 'ESTIMATED' },
    },
    ...overrides,
  },
});

describe('CT.gov diff', () => {
  it('detects overallStatus change', () => {
    const old = makeStudy();
    const newStudy = makeStudy({
      statusModule: {
        overallStatus: 'COMPLETED',
        completionDateStruct: { date: '2027-06-01' },
        primaryCompletionDateStruct: { date: '2027-01-15' },
      },
    });

    const diffs = diffStudy(old, newStudy);
    const statusDiff = diffs.find((d) => d.changeType === 'trial_status_change');
    expect(statusDiff).toBeDefined();
    expect(statusDiff?.oldValue).toBe('RECRUITING');
    expect(statusDiff?.newValue).toBe('COMPLETED');
  });

  it('detects enrollment change', () => {
    const old = makeStudy();
    const newStudy = makeStudy({
      designModule: {
        enrollmentInfo: { count: 1000, type: 'ESTIMATED' },
      },
    });

    const diffs = diffStudy(old, newStudy);
    const enrollDiff = diffs.find((d) => d.changeType === 'enrollment_change');
    expect(enrollDiff).toBeDefined();
  });

  it('returns empty diffs when snapshots are identical', () => {
    const study = makeStudy();
    const diffs = diffStudy(study, study);
    expect(diffs).toHaveLength(0);
  });

  it('does not trigger on non-whitelisted field changes', () => {
    const old = makeStudy();
    const newStudy = JSON.parse(JSON.stringify(old));
    (newStudy as Record<string, Record<string, Record<string, string>>>).protocolSection.identificationModule = {
      briefTitle: 'Changed title',
    };

    const diffs = diffStudy(old, newStudy);
    expect(diffs).toHaveLength(0);
  });

  it('computes different hashes for different data', () => {
    const s1 = makeStudy();
    const s2 = makeStudy({
      statusModule: {
        overallStatus: 'COMPLETED',
        completionDateStruct: { date: '2027-06-01' },
        primaryCompletionDateStruct: { date: '2027-01-15' },
      },
    });

    expect(computeStudyHash(s1)).not.toBe(computeStudyHash(s2));
  });

  it('computes same hash for identical data', () => {
    const s1 = makeStudy();
    const s2 = makeStudy();
    expect(computeStudyHash(s1)).toBe(computeStudyHash(s2));
  });
});

describe('time to catalyst', () => {
  it('returns 999 when no date', () => {
    const study = { protocolSection: { statusModule: {} } };
    expect(computeTimeToCatalyst(study)).toBe(999);
  });

  it('returns 0 for past dates', () => {
    const study = {
      protocolSection: {
        statusModule: {
          primaryCompletionDateStruct: { date: '2020-01-01' },
        },
      },
    };
    expect(computeTimeToCatalyst(study)).toBe(0);
  });

  it('caps at 365 days', () => {
    const futureDate = new Date(Date.now() + 400 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const study = {
      protocolSection: {
        statusModule: {
          primaryCompletionDateStruct: { date: futureDate },
        },
      },
    };
    expect(computeTimeToCatalyst(study)).toBe(365);
  });
});
