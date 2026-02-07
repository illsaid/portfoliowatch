'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}

function formatRemaining(ms: number): string {
  if (ms <= 0) return '00:00:00';
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

export function LiveCountdown({
  nextCheckInAt,
  lastPollAt,
  isPaused,
}: {
  nextCheckInAt: string | null;
  lastPollAt: string | null;
  isPaused: boolean;
}) {
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    if (!nextCheckInAt) {
      setRemaining(null);
      return;
    }

    const target = new Date(nextCheckInAt).getTime();

    function tick() {
      const diff = target - Date.now();
      setRemaining(diff > 0 ? diff : 0);
    }

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [nextCheckInAt]);

  if (!nextCheckInAt) {
    return (
      <div className="flex flex-col gap-1">
        <span className="text-xs text-neutral-400">Next check-in</span>
        <span className="text-sm text-neutral-500">Not scheduled</span>
      </div>
    );
  }

  const isUrgent = remaining !== null && remaining > 0 && remaining < 10 * 60 * 1000;
  const isOverdue = remaining !== null && remaining <= 0;

  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-neutral-400">
        {isPaused ? 'Check-in paused' : 'Next check-in'}
      </span>
      <div className="flex items-baseline gap-2">
        <span
          className={cn(
            'font-mono text-lg font-semibold tabular-nums tracking-tight',
            isOverdue
              ? 'text-neutral-400'
              : isUrgent
                ? 'text-amber-600'
                : 'text-neutral-800'
          )}
        >
          {remaining === null
            ? '--:--:--'
            : isOverdue
              ? 'Due now'
              : formatRemaining(remaining)}
        </span>
      </div>
      {lastPollAt && (
        <span className="text-[11px] text-neutral-400">
          Last check: {new Date(lastPollAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      )}
    </div>
  );
}
