import { cn } from '@/lib/utils';
import { healthStatus, type HealthStatusKey } from '@/lib/design-tokens';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export interface SourceHealthData {
  source: string;
  status: HealthStatusKey;
  lastOkAt?: string | null;
  errorsToday?: number;
}

interface SystemLightsProps {
  sources: SourceHealthData[];
}

const sourceDisplayNames: Record<string, string> = {
  edgar: 'SEC EDGAR',
  ctgov: 'CT.gov',
  market: 'Market Data',
};

export function SystemLights({ sources }: SystemLightsProps) {
  return (
    <TooltipProvider>
      <div className="flex items-center gap-3">
        {sources.map((source) => {
          const statusInfo = healthStatus[source.status];
          const displayName = sourceDisplayNames[source.source] || source.source;

          return (
            <Tooltip key={source.source}>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1.5 cursor-default">
                  <span
                    className={cn(
                      'h-2 w-2 rounded-full',
                      statusInfo.color
                    )}
                  />
                  <span className="text-xs text-neutral-500">{displayName}</span>
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                <div className="space-y-1">
                  <p className="font-medium">{displayName}: {statusInfo.label}</p>
                  {source.lastOkAt && (
                    <p className="text-neutral-400">
                      Last OK: {new Date(source.lastOkAt).toLocaleString()}
                    </p>
                  )}
                  {source.errorsToday !== undefined && source.errorsToday > 0 && (
                    <p className="text-red-400">Errors today: {source.errorsToday}</p>
                  )}
                </div>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
}

export function SystemLightDot({ status }: { status: HealthStatusKey }) {
  const statusInfo = healthStatus[status];
  return (
    <span
      className={cn(
        'inline-block h-2 w-2 rounded-full',
        statusInfo.color
      )}
    />
  );
}
