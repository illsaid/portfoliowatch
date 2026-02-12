import { createServerClient } from '@/lib/supabase/server';
import { StateBadge } from '@/components/state-badge';
import { StateTimeline } from '@/components/state-timeline';
import { LiveCountdown } from '@/components/live-countdown';
import { WelcomeEmptyState } from '@/components/empty-state';
import { CardShell, CardTitle, CardMetric } from '@/components/card-shell';
import { DetectionList } from '@/components/detection-list';
import { SystemLights, type SourceHealthData } from '@/components/system-lights';
import { stateDescriptions, type HealthStatusKey } from '@/lib/design-tokens';
import type { DailyStateEnum, Detection } from '@/lib/engine/types';
import { Badge } from '@/components/ui/badge';
import {
  EyeOff,
  AlertTriangle,
  Activity,
  Settings,
  FileText,
  Play,
  ExternalLink,
} from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

function getHealthStatus(
  lastOkAt: string | null | undefined,
  lastRunAt: string | null | undefined,
  errorsToday: number
): HealthStatusKey {
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  if (errorsToday > 0) return 'error';

  if (lastOkAt) {
    const okAge = now - new Date(lastOkAt).getTime();
    if (okAge < dayMs) return 'healthy';
    if (lastRunAt) return 'stale';
  }

  if (lastRunAt) {
    const runAge = now - new Date(lastRunAt).getTime();
    if (runAge > dayMs * 2) return 'error';
    return 'stale';
  }

  return 'unknown';
}

export default async function Home() {
  const supabase = createServerClient();
  const today = new Date().toISOString().split('T')[0];
  const todayStart = `${today}T00:00:00`;
  const todayEnd = `${today}T23:59:59.999`;

  const [
    { data: watchlistItems },
    { data: dailyState },
    { data: recentStates },
    { data: todayDetections },
    { data: lastPollRun },
    { data: adminSettings },
    { data: sourceHealthData },
  ] = await Promise.all([
    supabase
      .from('watchlist_item')
      .select('last_poll_at, next_check_in_at')
      .order('next_check_in_at', { ascending: true }),
    supabase.from('daily_state').select('*').eq('date', today).maybeSingle(),
    supabase
      .from('daily_state')
      .select('date, state, summary')
      .gte('date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
      .order('date', { ascending: true }),
    supabase
      .from('detection')
      .select('*')
      .gte('detected_at', todayStart)
      .lt('detected_at', todayEnd)
      .eq('suppressed', false)
      .eq('quarantined', false)
      .order('score_final', { ascending: false })
      .limit(5),
    supabase
      .from('poll_run')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.from('admin_settings').select('key, value'),
    supabase
      .from('source_health')
      .select('*')
      .gte('run_date', today)
      .order('created_at', { ascending: false }),
  ]);

  const hasNeverPolled = !dailyState && (!watchlistItems || watchlistItems.length === 0);

  if (hasNeverPolled) {
    return <WelcomeEmptyState />;
  }

  const state: DailyStateEnum = (dailyState?.state as DailyStateEnum) ?? 'Contained';
  const quietCount = dailyState?.quiet_log_count ?? 0;
  const earliestItem = watchlistItems?.[0] ?? null;
  const isPause = state === 'Pause';

  const timelineDays = (recentStates ?? []).map((d) => ({
    date: d.date,
    state: d.state as DailyStateEnum,
    summary: d.summary,
  }));

  const detections = (todayDetections ?? []) as Detection[];

  const settingsMap: Record<string, string> = {};
  for (const row of adminSettings ?? []) {
    settingsMap[row.key] = row.value;
  }
  const alertThreshold = settingsMap.ALERT_THRESHOLD ?? '60';
  const suppressionStrictness = settingsMap.SUPPRESSION_STRICTNESS ?? 'high';
  const panicSensitivity = settingsMap.PANIC_SENSITIVITY ?? '-20';

  const sourceHealthMap: Record<string, { lastOkAt: string | null; errorsToday: number }> = {
    edgar: { lastOkAt: null, errorsToday: 0 },
    ctgov: { lastOkAt: null, errorsToday: 0 },
    market: { lastOkAt: null, errorsToday: 0 },
  };

  for (const sh of sourceHealthData ?? []) {
    const key = sh.source?.toLowerCase();
    if (key && sourceHealthMap[key]) {
      sourceHealthMap[key].lastOkAt = sh.created_at ?? null;
      sourceHealthMap[key].errorsToday += sh.errors_count ?? 0;
    }
  }

  const sourceHealthList: SourceHealthData[] = [
    {
      source: 'edgar',
      status: getHealthStatus(
        sourceHealthMap.edgar.lastOkAt,
        lastPollRun?.started_at,
        sourceHealthMap.edgar.errorsToday
      ),
      lastOkAt: sourceHealthMap.edgar.lastOkAt,
      errorsToday: sourceHealthMap.edgar.errorsToday,
    },
    {
      source: 'ctgov',
      status: getHealthStatus(
        sourceHealthMap.ctgov.lastOkAt,
        lastPollRun?.started_at,
        sourceHealthMap.ctgov.errorsToday
      ),
      lastOkAt: sourceHealthMap.ctgov.lastOkAt,
      errorsToday: sourceHealthMap.ctgov.errorsToday,
    },
    {
      source: 'market',
      status: getHealthStatus(
        sourceHealthMap.market.lastOkAt,
        lastPollRun?.started_at,
        sourceHealthMap.market.errorsToday
      ),
      lastOkAt: sourceHealthMap.market.lastOkAt,
      errorsToday: sourceHealthMap.market.errorsToday,
    },
  ];

  const stateVariant = state.toLowerCase() as 'contained' | 'watch' | 'look' | 'pause';
  const stateExplanation = dailyState?.summary || stateDescriptions[state];

  return (
    <div className="space-y-6">
      {isPause && (
        <Link
          href="/pause"
          className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 transition-colors hover:bg-red-100"
        >
          <AlertTriangle className="h-4 w-4" />
          Active triage required — open Pause mode
        </Link>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold text-neutral-900">Dashboard</h1>
          <span className="text-sm text-neutral-400">{today}</span>
        </div>
        <div className="flex items-center gap-4 text-xs text-neutral-500">
          {lastPollRun && (
            <span>
              Last check:{' '}
              <span className="font-medium text-neutral-700">
                {new Date(lastPollRun.started_at).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
              <span
                className={`ml-1.5 inline-block h-1.5 w-1.5 rounded-full ${
                  lastPollRun.status === 'ok' ? 'bg-emerald-500' : 'bg-red-500'
                }`}
              />
            </span>
          )}
          <LiveCountdown
            nextCheckInAt={earliestItem?.next_check_in_at ?? null}
            lastPollAt={earliestItem?.last_poll_at ?? null}
            isPaused={isPause}
          />
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <CardShell variant={stateVariant} padding="lg">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-3">
                <CardTitle>Today</CardTitle>
                <StateBadge state={state} size="lg" />
                <p className="text-sm leading-relaxed text-neutral-600 max-w-md">
                  {!lastPollRun
                    ? 'No check-ins have run today. Run your first check-in to start monitoring.'
                    : stateExplanation}
                </p>
                {lastPollRun ? (
                  <Link
                    href="/brief"
                    className="inline-flex items-center gap-2 rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-neutral-800"
                  >
                    <FileText className="h-4 w-4" />
                    Read Brief
                  </Link>
                ) : (
                  <div className="flex items-center gap-2">
                    <Link
                      href="/admin"
                      className="inline-flex items-center gap-2 rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-neutral-800"
                    >
                      <Play className="h-4 w-4" />
                      Run check-in
                    </Link>
                    <span className="text-xs text-neutral-400">
                      Go to Admin → Poll Runs tab
                    </span>
                  </div>
                )}
              </div>
            </div>
            <div className="mt-5 pt-4 border-t border-neutral-200/50">
              <p className="text-xs text-neutral-500 mb-2">Past 7 days</p>
              <StateTimeline days={timelineDays} today={today} />
            </div>
          </CardShell>

          <CardShell>
            <div className="flex items-center justify-between mb-4">
              <CardTitle>What Changed Today</CardTitle>
              {detections.length > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {detections.length} item{detections.length !== 1 ? 's' : ''}
                </Badge>
              )}
            </div>
            <DetectionList detections={detections} />
          </CardShell>

          <CardShell>
            <CardTitle className="mb-3">Last Primary Filing</CardTitle>
            <LastFilingSection supabase={supabase} />
          </CardShell>
        </div>

        <div className="space-y-5">
          <CardShell>
            <div className="flex items-center gap-2 mb-4">
              <Activity className="h-4 w-4 text-neutral-400" />
              <CardTitle>System</CardTitle>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-xs text-neutral-400 mb-1">Last poll</p>
                {lastPollRun ? (
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-neutral-700">
                      {new Date(lastPollRun.started_at).toLocaleString()}
                    </span>
                    <Badge
                      variant={lastPollRun.status === 'ok' ? 'secondary' : 'destructive'}
                      className="text-xs"
                    >
                      {lastPollRun.status === 'ok' ? 'OK' : 'Error'}
                    </Badge>
                  </div>
                ) : (
                  <p className="text-sm text-neutral-500">System has not run yet</p>
                )}
              </div>

              <div>
                <p className="text-xs text-neutral-400 mb-2">Source health</p>
                <SystemLights sources={sourceHealthList} />
              </div>

              <Link
                href="/admin"
                className="inline-flex items-center gap-1 text-xs text-teal-600 hover:text-teal-700"
              >
                Poll runs →
              </Link>
            </div>
          </CardShell>

          <CardShell>
            <div className="flex items-center gap-2 mb-3">
              <EyeOff className="h-4 w-4 text-neutral-400" />
              <CardTitle>Quiet Log</CardTitle>
            </div>
            <CardMetric>{quietCount}</CardMetric>
            <p className="text-sm text-neutral-500 mt-1">
              {quietCount === 0 ? 'Quiet today. That\'s the point.' : 'updates hidden today'}
            </p>
            <Link
              href="/quiet"
              className="inline-flex items-center gap-1 text-xs text-teal-600 hover:text-teal-700 mt-3"
            >
              View quiet log →
            </Link>
          </CardShell>

          <CardShell>
            <div className="flex items-center gap-2 mb-4">
              <Settings className="h-4 w-4 text-neutral-400" />
              <CardTitle>Risk Controls</CardTitle>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-neutral-500">Alert Threshold</span>
                <span className="font-mono text-neutral-700">{alertThreshold}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-neutral-500">Suppression</span>
                <span className="font-mono text-neutral-700 capitalize">
                  {suppressionStrictness}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-neutral-500">Panic Sensitivity</span>
                <span className="font-mono text-neutral-700">{panicSensitivity}%</span>
              </div>
            </div>
            <Link
              href="/admin"
              className="inline-flex items-center gap-1 text-xs text-teal-600 hover:text-teal-700 mt-4"
            >
              Adjust controls →
            </Link>
          </CardShell>
        </div>
      </div>
    </div>
  );
}

async function LastFilingSection({
  supabase,
}: {
  supabase: ReturnType<typeof createServerClient>;
}) {
  const { data: lastFiling } = await supabase
    .from('detection')
    .select('*')
    .eq('source_tier', 'primary_filing')
    .order('detected_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!lastFiling) {
    return (
      <div className="py-4 text-center">
        <p className="text-sm text-neutral-500">No filings detected yet.</p>
        <p className="text-xs text-neutral-400 mt-1">
          Run a check-in to begin tracking filings.
        </p>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between">
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="text-xs font-semibold">
            {lastFiling.ticker}
          </Badge>
          <span className="text-sm text-neutral-700 truncate">{lastFiling.title}</span>
        </div>
        <p className="text-xs text-neutral-400 mt-1">
          {new Date(lastFiling.detected_at).toLocaleDateString()}
        </p>
      </div>
      {lastFiling.url && (
        <a
          href={lastFiling.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-teal-600 hover:text-teal-700 shrink-0"
        >
          <ExternalLink className="h-3 w-3" />
          View
        </a>
      )}
    </div>
  );
}
