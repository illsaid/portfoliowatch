export const stateColors = {
  Contained: {
    bg: 'bg-teal-50',
    border: 'border-teal-200',
    text: 'text-teal-700',
    dot: 'bg-teal-500',
    accent: 'text-teal-600',
  },
  Watch: {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    text: 'text-amber-700',
    dot: 'bg-amber-500',
    accent: 'text-amber-600',
  },
  Look: {
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    text: 'text-orange-700',
    dot: 'bg-orange-500',
    accent: 'text-orange-600',
  },
  Pause: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-700',
    dot: 'bg-red-500',
    accent: 'text-red-600',
  },
} as const;

export const stateDescriptions = {
  Contained: 'No high-signal changes detected. Holdings are stable.',
  Watch: 'A change occurred, but likely low materiality or unconfirmed.',
  Look: 'A detection crossed your alert threshold. Review recommended.',
  Pause: 'A severe event or market gap hit panic sensitivity. Action required.',
} as const;

export const stateActions = {
  Contained: 'No action needed',
  Watch: 'Monitor for follow-up',
  Look: 'Review the brief',
  Pause: 'Open triage immediately',
} as const;

export const sourceLabels = {
  primary_filing: 'SEC',
  primary_company: 'Company',
  primary_registry: 'CT.gov',
  primary_regulator: 'Regulator',
  secondary_news: 'News',
  tertiary_social: 'Social',
} as const;

export const sourceColors = {
  primary_filing: 'bg-blue-100 text-blue-700 border-blue-200',
  primary_company: 'bg-slate-100 text-slate-700 border-slate-200',
  primary_registry: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  primary_regulator: 'bg-violet-100 text-violet-700 border-violet-200',
  secondary_news: 'bg-neutral-100 text-neutral-600 border-neutral-200',
  tertiary_social: 'bg-neutral-100 text-neutral-500 border-neutral-200',
} as const;

export const healthStatus = {
  healthy: { color: 'bg-emerald-500', label: 'Healthy' },
  stale: { color: 'bg-amber-500', label: 'Stale' },
  error: { color: 'bg-red-500', label: 'Error' },
  unknown: { color: 'bg-neutral-300', label: 'Unknown' },
} as const;

export type HealthStatusKey = keyof typeof healthStatus;
