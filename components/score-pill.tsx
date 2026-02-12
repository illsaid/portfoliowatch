import { cn } from '@/lib/utils';

interface ScorePillProps {
  score: number;
  size?: 'sm' | 'md';
}

function getScoreColor(score: number): string {
  if (score >= 60) return 'bg-red-100 text-red-700 border-red-200';
  if (score >= 40) return 'bg-orange-100 text-orange-700 border-orange-200';
  if (score >= 20) return 'bg-amber-100 text-amber-700 border-amber-200';
  return 'bg-neutral-100 text-neutral-600 border-neutral-200';
}

export function ScorePill({ score, size = 'sm' }: ScorePillProps) {
  const sizeClasses = size === 'sm' ? 'px-1.5 py-0.5 text-xs' : 'px-2 py-1 text-sm';

  return (
    <span
      className={cn(
        'inline-flex items-center rounded border font-mono font-medium',
        getScoreColor(score),
        sizeClasses
      )}
    >
      {score}
    </span>
  );
}
