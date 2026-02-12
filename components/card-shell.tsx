import { cn } from '@/lib/utils';

interface CardShellProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'contained' | 'watch' | 'look' | 'pause';
}

const paddingClasses = {
  sm: 'p-4',
  md: 'p-5',
  lg: 'p-6',
};

const variantClasses = {
  default: 'bg-white border-neutral-200',
  contained: 'bg-teal-50/50 border-teal-200',
  watch: 'bg-amber-50/50 border-amber-200',
  look: 'bg-orange-50/50 border-orange-200',
  pause: 'bg-red-50/50 border-red-200',
};

export function CardShell({
  children,
  className,
  padding = 'md',
  variant = 'default',
}: CardShellProps) {
  return (
    <div
      className={cn(
        'rounded-xl border shadow-sm',
        paddingClasses[padding],
        variantClasses[variant],
        className
      )}
    >
      {children}
    </div>
  );
}

export function CardTitle({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <h3
      className={cn(
        'text-xs font-medium uppercase tracking-wide text-neutral-500',
        className
      )}
    >
      {children}
    </h3>
  );
}

export function CardMetric({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p className={cn('text-3xl font-semibold text-neutral-900', className)}>
      {children}
    </p>
  );
}
