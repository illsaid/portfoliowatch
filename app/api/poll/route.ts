import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, getActiveRubricVersion } from '@/lib/supabase/server';
import { verifyAdmin } from '@/lib/auth';
import { fetchEdgarSubmissions, detectNewFilings, buildEdgarUrl } from '@/lib/providers/edgar';
import { fetchStudy, computeStudyHash, diffStudy, computeTimeToCatalyst } from '@/lib/providers/ctgov';
import { getMarketProvider } from '@/lib/providers/market';
import { parsePolicy, evaluateDetection } from '@/lib/engine/policy';
import { computeScore } from '@/lib/engine/scoring';
import { selectTopDetection, computeDailyState } from '@/lib/engine/state-machine';
import { shouldNotify, shouldNotifyQuietLog, buildNotificationContent, buildQuietLogNotificationContent, sendNotification } from '@/lib/engine/notifications';
import { computeJsonHash } from '@/lib/utils';
import type { Detection, AdminSettings, DailyStateEnum } from '@/lib/engine/types';
import { isLLMConfigured, getDefaultProvider, getDefaultModel } from '@/lib/llm/provider';
import { interpretTrial, buildEvidencePack, computeInputHash, buildFallbackInterpretation, PROMPT_VERSION } from '@/lib/llm/trialInterp';
import { filterCandidates, getMaxLLMCallsPerRun } from '@/lib/llm/shouldInterpret';
import { getOrgIdFromEnv } from '@/lib/tenancy';

function todayStr(): string {
  return new Date().toISOString().split('T')[0];
}

async function loadSettings(supabase: ReturnType<typeof createServerClient>, orgId: string): Promise<AdminSettings> {
  const { data } = await supabase.from('admin_settings').select('key, value').eq('org_id', orgId);
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
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return NextResponse.json(
      { error: 'Supabase configuration missing. Please check environment variables.' },
      { status: 500 }
    );
  }

  const orgId = getOrgIdFromEnv();
  let supabase: ReturnType<typeof createServerClient>;
  let market: ReturnType<typeof getMarketProvider>;
  const today = todayStr();

  try {
    supabase = createServerClient();
    market = getMarketProvider();
  } catch (err) {
    console.error('Failed to initialize providers:', err);
    return NextResponse.json(
      { error: `Failed to initialize providers: ${(err as Error).message}` },
      { status: 500 }
    );
  }

  const rubricVersion = await getActiveRubricVersion(supabase, orgId);
  const rubricVersionId = rubricVersion?.id ?? null;

  const { data: pollRun, error: pollRunError } = await supabase
    .from('poll_run')
    .insert({ org_id: orgId, status: 'running', rubric_version_id: rubricVersionId })
    .select('id')
    .single();

  if (pollRunError) {
    console.error('Failed to create poll run:', pollRunError);
    return NextResponse.json(
      { error: `Failed to initialize poll: ${pollRunError.message}` },
      { status: 500 }
    );
  }

  const pollRunId = pollRun?.id;

  let tickersPolled = 0;
  let newDetections = 0;
  let suppressedCount = 0;
  let quarantinedCount = 0;
  const errors: string[] = [];

  try {
    const { data: watchlist } = await supabase.from('watchlist_item').select('*').eq('org_id', orgId);
    const items = watchlist ?? [];
    const settings = await loadSettings(supabase, orgId);

    const { data: policyRows } = await supabase
      .from('policy')
      .select('yaml_text')
      .eq('org_id', orgId)
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

          try {
            const edgarHash = computeJsonHash(filings);
            await supabase.from('raw_docs').upsert(
              {
                org_id: orgId,
                source: 'edgar',
                external_id: item.cik,
                content_hash: edgarHash,
                payload_json: filings,
              },
              { onConflict: 'org_id,source,external_id,content_hash', ignoreDuplicates: true }
            );
          } catch (rawDocErr) {
            errors.push(`raw_docs EDGAR ${item.cik}: ${(rawDocErr as Error).message}`);
          }

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
              org_id: orgId,
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
              rubric_version_id: rubricVersionId,
            };

            const { data: inserted, error: insertErr } = await supabase
              .from('detection')
              .upsert(detection, { onConflict: 'org_id,ticker,accession', ignoreDuplicates: true })
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
              .eq('org_id', orgId)
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
        .eq('org_id', orgId)
        .eq('id', item.id);
    }

    const { data: trialMappings } = await supabase.from('trial_mapping').select('*').eq('org_id', orgId);
    for (const mapping of trialMappings ?? []) {
      try {
        const study = await fetchStudy(mapping.nct_id);
        if (!study) continue;

        const newHash = computeStudyHash(study);

        try {
          await supabase.from('raw_docs').upsert(
            {
              org_id: orgId,
              source: 'ctgov',
              external_id: mapping.nct_id,
              content_hash: newHash,
              payload_json: study,
            },
            { onConflict: 'org_id,source,external_id,content_hash', ignoreDuplicates: true }
          );
        } catch (rawDocErr) {
          errors.push(`raw_docs CT.gov ${mapping.nct_id}: ${(rawDocErr as Error).message}`);
        }

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
              org_id: orgId,
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
              rubric_version_id: rubricVersionId,
            };

            const { data: inserted, error: insertErr } = await supabase
              .from('detection')
              .upsert(detection, {
                onConflict: 'org_id,ticker,nct_id,field_path,detected_date',
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
          .eq('org_id', orgId)
          .eq('id', mapping.id);
      } catch (err) {
        errors.push(`CT.gov ${mapping.nct_id}: ${(err as Error).message}`);
      }
    }

    const { data: todayDetections } = await supabase
      .from('detection')
      .select('*')
      .eq('org_id', orgId)
      .gte('detected_at', `${today}T00:00:00`)
      .lt('detected_at', `${today}T23:59:59.999`);

    const detections = (todayDetections ?? []) as Detection[];

    const dailyState = computeDailyState(detections, depMap, settings, items.length, today);

    await supabase
      .from('daily_state')
      .upsert({ ...dailyState, org_id: orgId }, { onConflict: 'org_id,date' });

    if (settings.FEEDBACK_LOOP === 'on') {
      for (const d of detections.filter((d) => d.suppressed)) {
        const move = await market.getDailyMove(d.ticker, today);
        if (move != null && Math.abs(move) > 0.12) {
          await supabase
            .from('miss_log')
            .upsert(
              {
                org_id: orgId,
                ticker: d.ticker,
                detection_id: d.id,
                date: today,
                reason: 'suppressed-but-moved',
                move_1d: move,
              },
              { onConflict: 'org_id,ticker,date', ignoreDuplicates: true }
            );
        }
      }
    }

    let llmInterpCount = 0;
    if (isLLMConfigured()) {
      try {
        const ctgovDetections = detections.filter(
          (d) => d.source_tier === 'primary_registry' && d.nct_id && !d.llm_interp
        );

        const tickerCallCounts: Record<string, number> = {};
        const maxPerRun = getMaxLLMCallsPerRun();
        const candidates = filterCandidates(ctgovDetections, tickerCallCounts, maxPerRun);

        const provider = getDefaultProvider();
        const model = getDefaultModel(provider);

        for (const detection of candidates) {
          try {
            const pack = buildEvidencePack(detection as Detection);
            const inputHash = computeInputHash(pack, provider, model);

            const { data: cached } = await supabase
              .from('llm_cache')
              .select('*')
              .eq('org_id', orgId)
              .eq('provider', provider)
              .eq('model', model)
              .eq('prompt_version', PROMPT_VERSION)
              .eq('input_hash', inputHash)
              .maybeSingle();

            let interpretation: Record<string, unknown>;
            let confidence: number;

            if (cached) {
              interpretation = cached.output_json as Record<string, unknown>;
              confidence = (cached.confidence as number) ?? 0.5;
            } else {
              const result = await interpretTrial(detection as Detection);
              interpretation = result.interpretation as unknown as Record<string, unknown>;
              confidence = result.interpretation.confidence;

              await supabase.from('llm_cache').upsert(
                {
                  org_id: orgId,
                  provider,
                  model,
                  prompt_version: PROMPT_VERSION,
                  input_hash: inputHash,
                  output_json: interpretation,
                  confidence,
                },
                { onConflict: 'org_id,provider,model,prompt_version,input_hash', ignoreDuplicates: true }
              );
            }

            await supabase
              .from('detection')
              .update({
                llm_input_hash: inputHash,
                llm_interp: interpretation,
                llm_confidence: confidence,
                llm_model: `${provider}/${model}`,
                llm_generated_at: new Date().toISOString(),
              })
              .eq('org_id', orgId)
              .eq('id', detection.id);

            llmInterpCount++;
          } catch (llmErr) {
            const fallback = buildFallbackInterpretation(detection.field_path ?? 'unknown');
            await supabase
              .from('detection')
              .update({
                llm_interp: fallback as unknown as Record<string, unknown>,
                llm_confidence: fallback.confidence,
                llm_model: 'fallback',
                llm_generated_at: new Date().toISOString(),
              })
              .eq('org_id', orgId)
              .eq('id', detection.id);
            errors.push(`LLM interp ${detection.nct_id}: ${(llmErr as Error).message}`);
          }
        }
      } catch (llmPassErr) {
        errors.push(`LLM pass error: ${(llmPassErr as Error).message}`);
      }
    }

    const { data: prevState } = await supabase
      .from('daily_state')
      .select('state')
      .eq('org_id', orgId)
      .lt('date', today)
      .order('date', { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data: notifSettings } = await supabase
      .from('notification_settings')
      .select('*')
      .eq('org_id', orgId)
      .eq('user_id', 'default')
      .maybeSingle();

    if (notifSettings) {
      const prevStateVal = (prevState?.state as DailyStateEnum) ?? null;
      let notificationSent = false;

      if (shouldNotify(dailyState.state, prevStateVal, notifSettings)) {
        const topDetection = detections.find((d) => d.id === dailyState.top_detection_id) ?? null;
        const content = buildNotificationContent(dailyState, topDetection);
        const sent = await sendNotification(
          notifSettings.channel as 'email' | 'pwa',
          notifSettings.email,
          content.subject,
          content.body
        );
        if (sent) {
          notificationSent = true;
        }
      }

      if (!notificationSent && shouldNotifyQuietLog(dailyState.quiet_log_count, notifSettings)) {
        const content = buildQuietLogNotificationContent(dailyState.quiet_log_count, today);
        const sent = await sendNotification(
          notifSettings.channel as 'email' | 'pwa',
          notifSettings.email,
          content.subject,
          content.body
        );
        if (sent) {
          notificationSent = true;
        }
      }

      if (notificationSent) {
        await supabase
          .from('notification_settings')
          .update({ last_sent_at: new Date().toISOString() })
          .eq('org_id', orgId)
          .eq('user_id', 'default');
      }
    }

    const summary = {
      org_id: orgId,
      tickers_polled: tickersPolled,
      new_detections: newDetections,
      suppressed_count: suppressedCount,
      quarantined_count: quarantinedCount,
      llm_interp_count: llmInterpCount,
      resulting_state: dailyState.state,
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
          resulting_state: dailyState.state,
        })
        .eq('org_id', orgId)
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
        .eq('org_id', orgId)
        .eq('id', pollRunId);
    }
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authErr = verifyAdmin(req);
    if (authErr) return authErr;
    return await runPoll(req);
  } catch (err) {
    console.error('Poll POST error:', err);
    return NextResponse.json(
      { error: `Poll failed: ${(err as Error).message}` },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const authErr = verifyAdmin(req);
    if (authErr) return authErr;
    return await runPoll(req);
  } catch (err) {
    console.error('Poll GET error:', err);
    return NextResponse.json(
      { error: `Poll failed: ${(err as Error).message}` },
      { status: 500 }
    );
  }
}
