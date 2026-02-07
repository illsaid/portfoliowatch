import { cn } from '@/lib/utils';

export function PolicyTag({
  ruleId,
  ruleLabel,
  className,
}: {
  ruleId: string | null;
  ruleLabel: string | null;
  className?: string;
}) {
  if (!ruleId) return null;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded bg-neutral-100 px-1.5 py-0.5 text-xs text-neutral-600',
        className
      )}
    >
      <span className="font-mono font-semibold">[{ruleId}]</span>
      {ruleLabel && <span>{ruleLabel}</span>}
    </span>
  );
}
