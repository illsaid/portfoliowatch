'use client';

import { cn } from '@/lib/utils';
import type { DailyStateEnum } from '@/lib/engine/types';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { format, parseISO } from 'date-fns';

interface DayEntry {
  date: string;
  state: DailyStateEnum;
  summary: string;
}

const pillColors: Record<DailyStateEnum, string> = {
  Contained: 'bg-teal-400',
  Watch: 'bg-amber-400',
  Look: 'bg-orange-400',
  Pause: 'bg-red-400',
};

const pillRingColors: Record<DailyStateEnum, string> = {
  Contained: 'ring-teal-200',
  Watch: 'ring-amber-200',
  Look: 'ring-orange-200',
  Pause: 'ring-red-200',
};

function getDayLabel(dateStr: string): string {
  const d = parseISO(dateStr);
  return format(d, 'EEE');
}

function getDateLabel(dateStr: string): string {
  const d = parseISO(dateStr);
  return format(d, 'MMM d');
}

export function StateTimeline({
  days,
  today,
}: {
  days: DayEntry[];
  today: string;
}) {
  const allGreen = days.length > 0 && days.every((d) => d.state === 'Contained');

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-neutral-500">Past 7 days</span>
        {allGreen && (
          <span className="text-xs text-teal-600">Stable this week</span>
        )}
      </div>
      <TooltipProvider delayDuration={200}>
        <div className="flex items-center gap-2">
          {days.map((day) => {
            const isToday = day.date === today;
            return (
              <Tooltip key={day.date}>
                <TooltipTrigger asChild>
                  <div className="flex flex-1 flex-col items-center gap-1.5">
                    <span className="text-[10px] text-neutral-400">
                      {getDayLabel(day.date)}
                    </span>
                    <div
                      className={cn(
                        'h-3 w-full rounded-full transition-all',
                        pillColors[day.state],
                        isToday && `ring-2 ${pillRingColors[day.state]}`
                      )}
                    />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-[200px]">
                  <p className="text-xs font-medium">
                    {getDateLabel(day.date)} &mdash; {day.state}
                  </p>
                  <p className="mt-0.5 text-xs text-neutral-500">{day.summary}</p>
                </TooltipContent>
              </Tooltip>
            );
          })}
          {days.length === 0 && (
            <div className="flex w-full items-center justify-center py-1">
              <span className="text-xs text-neutral-400">No history yet</span>
            </div>
          )}
        </div>
      </TooltipProvider>
    </div>
  );
}
