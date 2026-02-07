import { createServerClient } from '@/lib/supabase/server';
import { StateBadge } from '@/components/state-badge';
import { StateTimeline } from '@/components/state-timeline';
import { LiveCountdown } from '@/components/live-countdown';
import { EmptyState } from '@/components/empty-state';
import type { DailyStateEnum } from '@/lib/engine/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, EyeOff, Clock, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const supabase = createServerClient();
  const today = new Date().toISOString().split('T')[0];

  const { data: watchlistItems } = await supabase
    .from('watchlist_item')
    .select('last_poll_at, next_check_in_at')
    .order('next_check_in_at', { ascending: true });

  const { data: dailyState } = await supabase
    .from('daily_state')
    .select('*')
    .eq('date', today)
    .maybeSingle();

  const hasNeverPolled = !dailyState && (!watchlistItems || watchlistItems.length === 0);

  if (hasNeverPolled) {
    return <EmptyState />;
  }

  const state: DailyStateEnum = (dailyState?.state as DailyStateEnum) ?? 'Contained';
  const summary = dailyState?.summary ?? 'Contained \u2014 no polls run yet today.';
  const quietCount = dailyState?.quiet_log_count ?? 0;

  const earliestItem = watchlistItems?.[0] ?? null;

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0];

  const { data: recentStates } = await supabase
    .from('daily_state')
    .select('date, state, summary')
    .gte('date', sevenDaysAgo)
    .order('date', { ascending: true });

  const timelineDays = (recentStates ?? []).map((d) => ({
    date: d.date,
    state: d.state as DailyStateEnum,
    summary: d.summary,
  }));

  const { data: lastFiling } = await supabase
    .from('detection')
    .select('*')
    .eq('source_tier', 'primary_filing')
    .order('detected_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: topDetection } = dailyState?.top_detection_id
    ? await supabase
        .from('detection')
        .select('*')
        .eq('id', dailyState.top_detection_id)
        .maybeSingle()
    : { data: null };

  const isPause = state === 'Pause';

  return (
    <div className="space-y-6">
      {isPause && (
        <Link
          href="/pause"
          className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 transition-colors hover:bg-red-100"
        >
          <AlertTriangle className="h-4 w-4" />
          Active triage required &mdash; open Pause mode
        </Link>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="border-neutral-200 sm:col-span-2 lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between text-sm font-medium text-neutral-500">
              Today
              <span className="text-xs text-neutral-400">{today}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-2">
                <StateBadge state={state} size="lg" />
                <p className="text-sm leading-relaxed text-neutral-600">{summary}</p>
              </div>
              <div className="shrink-0">
                <LiveCountdown
                  nextCheckInAt={earliestItem?.next_check_in_at ?? null}
                  lastPollAt={earliestItem?.last_poll_at ?? null}
                  isPaused={isPause}
                />
              </div>
            </div>
            <StateTimeline days={timelineDays} today={today} />
          </CardContent>
        </Card>

        <Card className="border-neutral-200">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-1.5 text-sm font-medium text-neutral-500">
              <EyeOff className="h-3.5 w-3.5" />
              Quiet Log
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-2xl font-semibold text-neutral-800">{quietCount}</p>
              <p className="text-sm text-neutral-500">updates hidden today</p>
              <Link
                href="/quiet"
                className="inline-block text-xs font-medium text-teal-600 hover:text-teal-700"
              >
                View quiet log &rarr;
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-neutral-200">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-1.5 text-sm font-medium text-neutral-500">
            <Clock className="h-3.5 w-3.5" />
            Last Primary Filing
          </CardTitle>
        </CardHeader>
        <CardContent>
          {lastFiling ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {lastFiling.ticker}
                </Badge>
                <span className="text-sm font-medium text-neutral-700">
                  {lastFiling.title}
                </span>
              </div>
              {lastFiling.url && (
                <a
                  href={lastFiling.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-teal-600 hover:text-teal-700"
                >
                  <FileText className="h-3 w-3" />
                  View filing
                </a>
              )}
              <p className="text-xs text-neutral-400">
                {new Date(lastFiling.detected_at).toLocaleDateString()}
              </p>
            </div>
          ) : (
            <p className="text-sm text-neutral-400">No filings detected yet. Run a poll to start.</p>
          )}
        </CardContent>
      </Card>

      {topDetection && state !== 'Contained' && (
        <Card className="border-neutral-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-neutral-500">
              Top Item Preview
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="outline">{topDetection.ticker}</Badge>
              <span className="text-sm font-medium text-neutral-700">
                {topDetection.title}
              </span>
              <Badge variant="secondary" className="ml-auto text-xs">
                Score: {topDetection.score_final}
              </Badge>
            </div>
            {topDetection.url && (
              <a
                href={topDetection.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-teal-600 hover:text-teal-700"
              >
                Source &rarr;
              </a>
            )}
            <Link
              href="/brief"
              className="inline-block rounded-md bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-neutral-800"
            >
              Read 60-second brief
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
