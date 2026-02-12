import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { getOrgIdFromEnv } from '@/lib/tenancy';

export async function GET(req: NextRequest) {
  const orgId = getOrgIdFromEnv();
  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get('limit') ?? '10', 10);

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('poll_run')
    .select('*')
    .eq('org_id', orgId)
    .order('started_at', { ascending: false })
    .limit(limit);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
