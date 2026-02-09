import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { verifyAdmin } from '@/lib/auth';
import { fetchEdgarSubmissions, detectNewFilings, buildEdgarUrl } from '@/lib/providers/edgar';
import { fetchStudy, computeStudyHash, diffStudy, computeTimeToCatalyst } from '@/lib/providers/ctgov';
import { getMarketProvider } from '@/lib/providers/market';
import { parsePolicy, evaluateDetection } from '@/lib/engine/policy';
import { computeScore } from '@/lib/engine/scoring';
import { selectTopDetection } from '@/lib/engine/state-machine';
import { shouldNotify, buildNotificationContent, sendNotification } from '@/lib/engine/notifications';
import type { Detection, AdminSettings, DailyStateEnum } from '@/lib/engine/types';

function todayStr(): string {
  return new Date().toISOString().split('T')[0];
}

async function loadSettings(supabase: ReturnType<typeof createServerClient>): Promise<AdminSettings> {
  const { data } = await supabase.from('admin_settings').select('key, value');
  const map: Record<string, string> = {};
  for (const row of data ?? []) {
    map[row.key] = row.value;
  }
  return {
    ALERT_THRESHOLD: parseInt(map.ALERT_THRESHOLD ?? '60', 10),
    SUPPRESSION_STRICTNESS: map.SUPPRESSION_STRICTNESS ?? 'high',
    PANIC_SENSITIVITY: parseInt(map.PANIC_SENSITIVITY ?? '-20', 10),
    FEEDBACK_LOOP: map.FEEDBACK_LOOP ?? 'on',
  };
}

async function runPoll(req: NextRequest) {
  const supabase = createServerClient();
  const today = todayStr();
  const market = getMarketProvider();

  const { data: pollRun } = await supabase
    .from('poll_run')
    .insert({ status: 'running' })
    .select('id')
    .single();
  const pollRunId = pollRun?.id;

  let tickersPolled = 0;
  let newDetections = 0;
  let suppressedCount = 0;
  let quarantinedCount = 0;
  const errors: string[] = [];

  try {
    const { data: watchlist } = await supabase.from('watchlist_item').select('*');
    const items = watchlist ?? [];
    const settings = await loadSettings(supabase);

    const { data: policyRows } = await supabase
      .from('policy')
      .select('yaml_text')
      .eq('is_active', true)
      .limit(1);
    const policyYaml = policyRows?.[0]?.yaml_text ?? '';
    const policy = policyYaml ? parsePolicy(policyYaml) : { suppression: [], hard_alerts: [] };

    const depMap: Record<string, number> = {};
    for (const item of items) {
      depMap[item.ticker] = item.dependency;
    }

    const allNewDetections: Detection[] = [];

    for (const item of items) {
      tickersPolled++;

      if (item.cik) {
        try {
          const filings = await fetchEdgarSubmissions(item.cik);
          const newFilings = detectNewFilings(filings, item.last_filing_accession);

          for (const filing of newFilings) {
            const changeType = filing.isAmendment ? 'filing_amended' : 'filing_new';
            const url = buildEdgarUrl(item.cik, filing.accessionNumber, filing.primaryDocument);
            const marketMove = await market.getDailyMove(item.ticker, today);

            const policyResult = evaluateDetection(
              { source_tier: 'primary_filing', change_type: changeType, llm_confidence: 1.0 },
              policy,
              { marketGap: marketMove, timeToCatalystDays: 999 },
              settings.SUPPRESSION_STRICTNESS as 'low' | 'med' | 'high',
              settings.PANIC_SENSITIVITY
            );

            const scoreResult = computeScore(changeType, 'primary_filing', {
              dependency: item.dependency,
              marketMove,
              timeToCatalystDays: 999,
            });

            const detection: Partial<Detection> = {
              ticker: item.ticker,
              detected_at: new Date().toISOString(),
              source_tier: 'primary_filing',
              change_type: changeType,
              title: `${filing.form} filed ${filing.filingDate}`,
              url,
              accession: filing.accessionNumber,
              llm_confidence: 1.0,
              suppressed: policyResult.action === 'suppress',
              quarantined: policyResult.action === 'quarantine',
              hard_alert: policyResult.action === 'pause',
              score_raw: scoreResult.scoreRaw,
              score_final: scoreResult.scoreFinal,
              policy_match_id: policyResult.ruleId,
              policy_match_label: policyResult.ruleLabel,
              raw_payload: filing as unknown as Record<string, unknown>,
            };

            const { data: inserted, error: insertErr } = await supabase
              .from('detection')
              .upsert(detection, { onConflict: 'ticker,accession', ignoreDuplicates: true })
              .select('*');

            if (inserted && inserted.length > 0) {
              newDetections++;
              if (detection.suppressed) suppressedCount++;
              if (detection.quarantined) quarantinedCount++;
              allNewDetections.push(inserted[0] as Detection);
            }
            if (insertErr && !insertErr.message.includes('duplicate')) {
              errors.push(`EDGAR insert ${item.ticker}: ${insertErr.message}`);
            }
          }

          if (newFilings.length > 0) {
            await supabase
              .from('watchlist_item')
              .update({ last_filing_accession: newFilings[0].accessionNumber })
              .eq('id', item.id);
          }
        } catch (err) {
          errors.push(`EDGAR ${item.ticker}: ${(err as Error).message}`);
        }
      }

      await supabase
        .from('watchlist_item')
        .update({
          last_poll_at: new Date().toISOString(),
          next_check_in_at: new Date(Date.now() + item.poll_interval_hours * 3600 * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', item.id);
    }

    const { data: trialMappings } = await supabase.from('trial_mapping').select('*');
    for (const mapping of trialMappings ?? []) {
      try {
        const study = await fetchStudy(mapping.nct_id);
        if (!study) continue;

        const newHash = computeStudyHash(study);
        const timeToCatalyst = computeTimeToCatalyst(study);

        if (mapping.last_hash && mapping.last_hash !== newHash && mapping.last_snapshot) {
          const oldSnapshot = mapping.last_snapshot as Record<string, unknown>;
          const diffs = diffStudy(oldSnapshot, study);

          for (const diff of diffs) {
            const marketMove = await market.getDailyMove(mapping.ticker, today);
            const policyResult = evaluateDetection(
              { source_tier: 'primary_registry', change_type: diff.changeType, llm_confidence: 1.0 },
              policy,
              { marketGap: marketMove, timeToCatalystDays: timeToCatalyst },
              settings.SUPPRESSION_STRICTNESS as 'low' | 'med' | 'high',
              settings.PANIC_SENSITIVITY
            );

            const scoreResult = computeScore(diff.changeType, 'primary_registry', {
              dependency: depMap[mapping.ticker] ?? 0.6,
              marketMove,
              timeToCatalystDays: timeToCatalyst,
            });

            const detection: Partial<Detection> = {
              ticker: mapping.ticker,
              detected_at: new Date().toISOString(),
              detected_date: today,
              source_tier: 'primary_registry',
              change_type: diff.changeType,
              title: `CT.gov ${diff.description}: ${mapping.nct_id}`,
              url: `https://clinicaltrials.gov/study/${mapping.nct_id}`,
              nct_id: mapping.nct_id,
              field_path: diff.fieldPath,
              old_value: diff.oldValue,
              new_value: diff.newValue,
              llm_confidence: 1.0,
              suppressed: policyResult.action === 'suppress',
              quarantined: policyResult.action === 'quarantine',
              hard_alert: policyResult.action === 'pause',
              score_raw: scoreResult.scoreRaw,
              score_final: scoreResult.scoreFinal,
              policy_match_id: policyResult.ruleId,
              policy_match_label: policyResult.ruleLabel,
            };

            const { data: inserted, error: insertErr } = await supabase
              .from('detection')
              .upsert(detection, {
                onConflict: 'ticker,nct_id,field_path,detected_date',
                ignoreDuplicates: true,
              })
              .select('*');

            if (inserted && inserted.length > 0) {
              newDetections++;
              if (detection.suppressed) suppressedCount++;
              if (detection.quarantined) quarantinedCount++;
              allNewDetections.push(inserted[0] as Detection);
            }
            if (insertErr && !insertErr.message.includes('duplicate')) {
              errors.push(`CT.gov insert ${mapping.nct_id}: ${insertErr.message}`);
            }
          }
        }

        await supabase
          .from('trial_mapping')
          .update({
            last_hash: newHash,
            last_snapshot: study,
            last_fetched_at: new Date().toISOString()
          })
          .eq('id', mapping.id);
      } catch (err) {
        errors.push(`CT.gov ${mapping.nct_id}: ${(err as Error).message}`);
      }
    }

    const { data: todayDetections } = await supabase
      .from('detection')
      .select('*')
      .gte('detected_at', `${today}T00:00:00`)
      .lt('detected_at', `${today}T23:59:59.999`);

    const detections = (todayDetections ?? []) as Detection[];
    const active = detections.filter((d) => !d.suppressed && !d.quarantined);
    const quietCount = detections.filter((d) => d.suppressed || d.quarantined).length;

    const hasHardAlert = detections.some((d) => d.hard_alert);
    const hasLook = active.some((d) => d.score_final >= settings.ALERT_THRESHOLD);
    const hasWatch = active.some((d) => d.score_final >= 40 && d.score_final < settings.ALERT_THRESHOLD);

    let state: DailyStateEnum = 'Contained';
    if (hasHardAlert) state = 'Pause';
    else if (hasLook) state = 'Look';
    else if (hasWatch) state = 'Watch';

    const topDetection = selectTopDetection(detections, depMap);

    const summaryMap: Record<DailyStateEnum, string> = {
      Contained: `Contained — no action needed for your ${items.length} holdings.`,
      Watch: `Watch — one item worth monitoring across ${items.length} holdings.`,
      Look: `Look — one item needs a 60-second review.`,
      Pause: `Pause — something moved fast; open triage.`,
    };

    await supabase
      .from('daily_state')
      .upsert(
        {
          date: today,
          state,
          summary: summaryMap[state],
          top_detection_id: topDetection?.id ?? null,
          quiet_log_count: quietCount,
        },
        { onConflict: 'date' }
      );

    if (settings.FEEDBACK_LOOP === 'on') {
      for (const d of detections.filter((d) => d.suppressed)) {
        const move = await market.getDailyMove(d.ticker, today);
        if (move != null && Math.abs(move) > 0.12) {
          await supabase
            .from('miss_log')
            .upsert(
              {
                ticker: d.ticker,
                detection_id: d.id,
                date: today,
                reason: 'suppressed-but-moved',
                move_1d: move,
              },
              { onConflict: 'ticker,date', ignoreDuplicates: true }
            );
        }
      }
    }

    const { data: prevState } = await supabase
      .from('daily_state')
      .select('state')
      .lt('date', today)
      .order('date', { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data: notifSettings } = await supabase
      .from('notification_settings')
      .select('*')
      .eq('user_id', 'default')
      .maybeSingle();

    if (notifSettings) {
      const prevStateVal = (prevState?.state as DailyStateEnum) ?? null;
      if (shouldNotify(state, prevStateVal, notifSettings)) {
        const content = buildNotificationContent(
          { date: today, state, summary: summaryMap[state], top_detection_id: topDetection?.id ?? null, quiet_log_count: quietCount },
          topDetection
        );
        const sent = await sendNotification(
          notifSettings.channel as 'email' | 'pwa',
          notifSettings.email,
          content.subject,
          content.body
        );
        if (sent) {
          await supabase
            .from('notification_settings')
            .update({ last_sent_at: new Date().toISOString() })
            .eq('user_id', 'default');
        }
      }
    }

    const summary = {
      tickers_polled: tickersPolled,
      new_detections: newDetections,
      suppressed_count: suppressedCount,
      quarantined_count: quarantinedCount,
      resulting_state: state,
      errors: errors.length > 0 ? errors : undefined,
    };

    if (pollRunId) {
      await supabase
        .from('poll_run')
        .update({
          finished_at: new Date().toISOString(),
          status: errors.length > 0 ? 'error' : 'ok',
          summary_json: summary,
          error_json: errors.length > 0 ? { errors } : null,
          tickers_polled: tickersPolled,
          new_detections: newDetections,
          suppressed_count: suppressedCount,
          quarantined_count: quarantinedCount,
          resulting_state: state,
        })
        .eq('id', pollRunId);
    }

    return NextResponse.json(summary);
  } catch (err) {
    const errMsg = (err as Error).message;
    if (pollRunId) {
      await supabase
        .from('poll_run')
        .update({
          finished_at: new Date().toISOString(),
          status: 'error',
          error_json: { error: errMsg },
        })
        .eq('id', pollRunId);
    }
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const authErr = verifyAdmin(req);
  if (authErr) return authErr;
  return runPoll(req);
}

export async function GET(req: NextRequest) {
  const authErr = verifyAdmin(req);
  if (authErr) return authErr;
  return runPoll(req);
}
