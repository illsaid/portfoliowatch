import type { Detection, DailyState, DailyStateEnum, AdminSettings } from './types';

export function computeDailyState(
  detections: Detection[],
  dependencyMap: Record<string, number>,
  settings: AdminSettings,
  tickerCount: number,
  date: string
): DailyState {
  const threshold = settings.ALERT_THRESHOLD;

  const active = detections.filter((d) => !d.suppressed && !d.quarantined);
  const quietCount = detections.filter((d) => d.suppressed || d.quarantined).length;

  let state: DailyStateEnum = 'Contained';

  const hasHardAlert = detections.some((d) => d.hard_alert);
  const hasLook = active.some((d) => d.score_final >= threshold);
  const hasWatch = active.some((d) => d.score_final >= 40 && d.score_final < threshold);

  if (hasHardAlert) {
    state = 'Pause';
  } else if (hasLook) {
    state = 'Look';
  } else if (hasWatch) {
    state = 'Watch';
  }

  const topDetection = selectTopDetection(detections, dependencyMap);

  const summaryMap: Record<DailyStateEnum, string> = {
    Contained: `Contained — no action needed for your ${tickerCount} holdings.`,
    Watch: `Watch — one item worth monitoring across ${tickerCount} holdings.`,
    Look: `Look — one item needs a 60-second review.`,
    Pause: `Pause — something moved fast; open triage.`,
  };

  return {
    date,
    state,
    summary: summaryMap[state],
    top_detection_id: topDetection?.id ?? null,
    quiet_log_count: quietCount,
  };
}

export function selectTopDetection(
  detections: Detection[],
  dependencyMap: Record<string, number>
): Detection | null {
  const active = detections.filter((d) => !d.suppressed && !d.quarantined);
  let top: Detection | null = null;
  let topScore = -1;

  for (const d of active) {
    const dep = dependencyMap[d.ticker] ?? 0.6;
    const weighted = d.score_final * dep;
    if (weighted > topScore) {
      topScore = weighted;
      top = d;
    }
  }

  return top;
}
