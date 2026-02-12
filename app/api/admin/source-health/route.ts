import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { verifyAdmin } from '@/lib/auth';
import { getOrgIdFromEnv } from '@/lib/tenancy';

export async function GET(req: NextRequest) {
  const authErr = verifyAdmin(req);
  if (authErr) return authErr;

  const orgId = getOrgIdFromEnv();
  const supabase = createServerClient();

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const dateStr = sevenDaysAgo.toISOString().split('T')[0];

  const { data: healthData, error: healthError } = await supabase
    .from('source_health')
    .select('*')
    .eq('org_id', orgId)
    .gte('run_date', dateStr)
    .order('run_date', { ascending: false })
    .order('source', { ascending: true });

  if (healthError) {
    return NextResponse.json({ error: healthError.message }, { status: 500 });
  }

  const { data: cursorData, error: cursorError } = await supabase
    .from('source_cursor')
    .select('*')
    .eq('org_id', orgId);

  if (cursorError) {
    return NextResponse.json({ error: cursorError.message }, { status: 500 });
  }

  return NextResponse.json({
    health: healthData ?? [],
    cursors: cursorData ?? [],
  });
}
