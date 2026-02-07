import { cn } from '@/lib/utils';

export function ScoreExplainer({
  explanation,
  scoreFinal,
  className,
}: {
  explanation: string;
  scoreFinal: number;
  className?: string;
}) {
  let color = 'text-neutral-500';
  if (scoreFinal >= 60) color = 'text-orange-600';
  else if (scoreFinal >= 40) color = 'text-amber-600';

  return (
    <span className={cn('font-mono text-xs', color, className)}>{explanation}</span>
  );
}
