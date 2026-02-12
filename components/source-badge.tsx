import { cn } from '@/lib/utils';
import { sourceLabels, sourceColors } from '@/lib/design-tokens';
import { FileText, Building2, FlaskConical, Scale, Newspaper, MessageCircle } from 'lucide-react';
import type { SourceTier } from '@/lib/engine/types';

const sourceIcons = {
  primary_filing: FileText,
  primary_company: Building2,
  primary_registry: FlaskConical,
  primary_regulator: Scale,
  secondary_news: Newspaper,
  tertiary_social: MessageCircle,
};

interface SourceBadgeProps {
  source: SourceTier;
  showLabel?: boolean;
  size?: 'sm' | 'md';
}

export function SourceBadge({ source, showLabel = true, size = 'sm' }: SourceBadgeProps) {
  const Icon = sourceIcons[source];
  const label = sourceLabels[source];
  const colors = sourceColors[source];

  const sizeClasses = size === 'sm' ? 'px-1.5 py-0.5 text-xs' : 'px-2 py-1 text-sm';
  const iconSize = size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5';

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded border font-medium',
        colors,
        sizeClasses
      )}
    >
      <Icon className={iconSize} />
      {showLabel && <span>{label}</span>}
    </span>
  );
}
