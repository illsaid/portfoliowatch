import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { getOrgIdFromEnv } from '@/lib/tenancy';
import { isLLMConfigured } from '@/lib/llm/provider';

function getMarketProviderType(): 'stub' | 'real' {
  const useRealProvider = process.env.USE_REAL_MARKET_PROVIDER !== 'false';
  const hasFinnhubKey = !!process.env.FINNHUB_API_KEY;
  return useRealProvider && hasFinnhubKey ? 'real' : 'stub';
}

export async function GET() {
  const orgId = getOrgIdFromEnv();
  let dbConnected = false;
  let lastPollRun: {
    timestamp: string;
    status: string;
    tickers_polled?: number;
    new_detections?: number;
    resulting_state?: string;
    error_summary?: string;
  } | null = null;

  try {
    const supabase = createServiceClient();

    const { data: healthCheck, error: dbError } = await supabase
      .from('poll_run')
      .select('id')
      .limit(1);

    dbConnected = !dbError;

    if (dbConnected) {
      const { data: lastRun } = await supabase
        .from('poll_run')
        .select('started_at, finished_at, status, tickers_polled, new_detections, resulting_state, error_json')
        .eq('org_id', orgId)
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (lastRun) {
        lastPollRun = {
          timestamp: lastRun.started_at,
          status: lastRun.status,
          tickers_polled: lastRun.tickers_polled,
          new_detections: lastRun.new_detections,
          resulting_state: lastRun.resulting_state ?? undefined,
          error_summary: lastRun.error_json
            ? `${Object.keys(lastRun.error_json).length} error(s)`
            : undefined,
        };
      }
    }
  } catch (err) {
    dbConnected = false;
  }

  return NextResponse.json({
    ok: true,
    org_id: orgId,
    db_connected: dbConnected,
    last_poll_run: lastPollRun,
    llm_enabled: isLLMConfigured(),
    market_provider: getMarketProviderType(),
  });
}
