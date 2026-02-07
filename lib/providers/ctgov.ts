import type { ChangeType, CtgovDiff } from '@/lib/engine/types';

const WATCHED_FIELDS: {
  path: string[];
  changeType: ChangeType;
  label: string;
}[] = [
  {
    path: ['protocolSection', 'statusModule', 'overallStatus'],
    changeType: 'trial_status_change',
    label: 'Overall Status',
  },
  {
    path: ['protocolSection', 'outcomesModule', 'primaryOutcomes'],
    changeType: 'trial_endpoint_change',
    label: 'Primary Outcomes',
  },
  {
    path: ['protocolSection', 'statusModule', 'completionDateStruct'],
    changeType: 'trial_date_change',
    label: 'Completion Date',
  },
  {
    path: ['protocolSection', 'statusModule', 'primaryCompletionDateStruct'],
    changeType: 'trial_date_change',
    label: 'Primary Completion Date',
  },
  {
    path: ['protocolSection', 'designModule', 'enrollmentInfo'],
    changeType: 'enrollment_change',
    label: 'Enrollment Info',
  },
];

function getNestedValue(obj: Record<string, unknown>, path: string[]): unknown {
  let current: unknown = obj;
  for (const key of path) {
    if (current == null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

function stringify(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  return JSON.stringify(value);
}

export async function fetchStudy(nctId: string): Promise<Record<string, unknown> | null> {
  const url = `https://clinicaltrials.gov/api/v2/studies/${nctId}`;
  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
  });

  if (!res.ok) {
    if (res.status === 404) return null;
    throw new Error(`CT.gov fetch failed for ${nctId}: ${res.status}`);
  }

  return res.json();
}

export function computeStudyHash(study: Record<string, unknown>): string {
  const parts: string[] = [];
  for (const field of WATCHED_FIELDS) {
    const val = getNestedValue(study, field.path);
    parts.push(stringify(val));
  }
  let hash = 0;
  const str = parts.join('|');
  for (let i = 0; i < str.length; i++) {
    const chr = str.charCodeAt(i);
    hash = ((hash << 5) - hash + chr) | 0;
  }
  return hash.toString(36);
}

export function diffStudy(
  oldSnapshot: Record<string, unknown>,
  newSnapshot: Record<string, unknown>
): CtgovDiff[] {
  const diffs: CtgovDiff[] = [];

  for (const field of WATCHED_FIELDS) {
    const oldVal = getNestedValue(oldSnapshot, field.path);
    const newVal = getNestedValue(newSnapshot, field.path);
    const oldStr = stringify(oldVal);
    const newStr = stringify(newVal);

    if (oldStr !== newStr) {
      diffs.push({
        changeType: field.changeType,
        fieldPath: field.path.join('.'),
        oldValue: oldStr,
        newValue: newStr,
        description: `${field.label} changed`,
      });
    }
  }

  return diffs;
}

export function computeTimeToCatalyst(study: Record<string, unknown>): number {
  const dateStruct = getNestedValue(study, [
    'protocolSection',
    'statusModule',
    'primaryCompletionDateStruct',
  ]) as Record<string, unknown> | undefined;

  if (!dateStruct?.date) return 999;

  const dateStr = String(dateStruct.date);
  const parsed = new Date(dateStr);
  if (isNaN(parsed.getTime())) return 999;

  const now = new Date();
  const diffMs = parsed.getTime() - now.getTime();
  if (diffMs <= 0) return 0;

  const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  return Math.min(days, 365);
}
