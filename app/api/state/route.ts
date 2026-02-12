import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { getOrgIdFromEnv } from '@/lib/tenancy';

export async function GET() {
  const orgId = getOrgIdFromEnv();
  const today = new Date().toISOString().split('T')[0];
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from('daily_state')
    .select('*')
    .eq('org_id', orgId)
    .eq('date', today)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (!data) {
    return NextResponse.json({
      date: today,
      state: 'Contained',
      summary: 'Contained — no polls run yet today.',
      top_detection_id: null,
      quiet_log_count: 0,
    });
  }

  return NextResponse.json(data);
}
