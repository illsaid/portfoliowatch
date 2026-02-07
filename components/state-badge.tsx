import { cn } from '@/lib/utils';
import type { DailyStateEnum } from '@/lib/engine/types';

const stateStyles: Record<DailyStateEnum, string> = {
  Contained: 'bg-teal-50 text-teal-700 border-teal-200',
  Watch: 'bg-amber-50 text-amber-700 border-amber-200',
  Look: 'bg-orange-50 text-orange-700 border-orange-200',
  Pause: 'bg-red-50 text-red-700 border-red-200',
};

const dotStyles: Record<DailyStateEnum, string> = {
  Contained: 'bg-teal-500',
  Watch: 'bg-amber-500',
  Look: 'bg-orange-500',
  Pause: 'bg-red-500',
};

export function StateBadge({
  state,
  size = 'md',
}: {
  state: DailyStateEnum;
  size?: 'sm' | 'md' | 'lg';
}) {
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-1.5 text-base',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border font-medium',
        stateStyles[state],
        sizeClasses[size]
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', dotStyles[state])} />
      {state}
    </span>
  );
}
