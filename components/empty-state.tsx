import { cn } from '@/lib/utils';
import { Shield, ArrowRight, type LucideIcon } from 'lucide-react';
import Link from 'next/link';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  hint?: string;
  variant?: 'centered' | 'inline';
}

export function EmptyState({
  icon: Icon = Shield,
  title,
  description,
  actionLabel,
  actionHref,
  hint,
  variant = 'centered',
}: EmptyStateProps) {
  const isCentered = variant === 'centered';

  return (
    <div
      className={cn(
        'flex flex-col items-center text-center',
        isCentered ? 'min-h-[40vh] justify-center' : 'py-8'
      )}
    >
      <div
        className={cn(
          'flex items-center justify-center rounded-full bg-teal-50',
          isCentered ? 'h-14 w-14 mb-5' : 'h-10 w-10 mb-4'
        )}
      >
        <Icon className={cn('text-teal-600', isCentered ? 'h-7 w-7' : 'h-5 w-5')} />
      </div>

      <h3
        className={cn(
          'font-semibold text-neutral-900',
          isCentered ? 'text-lg' : 'text-base'
        )}
      >
        {title}
      </h3>

      <p
        className={cn(
          'leading-relaxed text-neutral-500 max-w-sm mt-2',
          isCentered ? 'text-sm' : 'text-xs'
        )}
      >
        {description}
      </p>

      {actionLabel && actionHref && (
        <Link
          href={actionHref}
          className={cn(
            'inline-flex items-center gap-2 rounded-lg bg-neutral-900 font-medium text-white transition-colors hover:bg-neutral-800 mt-5',
            isCentered ? 'px-5 py-2.5 text-sm' : 'px-4 py-2 text-xs'
          )}
        >
          {actionLabel}
          <ArrowRight className="h-4 w-4" />
        </Link>
      )}

      {hint && (
        <p className="text-xs text-neutral-400 mt-3">{hint}</p>
      )}
    </div>
  );
}

export function WelcomeEmptyState() {
  return (
    <EmptyState
      title="No checks yet"
      description="Add your biotech holdings to the watchlist and run your first poll. Portfolio Watchman will monitor SEC filings, clinical trials, and market moves so you don't have to."
      actionLabel="Go to Admin"
      actionHref="/admin"
      hint='Add a ticker, then hit "Poll Now" in the Poll Runs tab.'
    />
  );
}
