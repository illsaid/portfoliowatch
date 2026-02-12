import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { verifyAdmin } from '@/lib/auth';
import { getOrgIdFromEnv } from '@/lib/tenancy';

export async function GET() {
  const orgId = getOrgIdFromEnv();
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('trial_mapping')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const authErr = verifyAdmin(req);
  if (authErr) return authErr;

  const orgId = getOrgIdFromEnv();
  const body = await req.json();
  const { ticker, nct_id, label } = body;
  if (!ticker || !nct_id) {
    return NextResponse.json({ error: 'ticker and nct_id required' }, { status: 400 });
  }

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('trial_mapping')
    .insert({
      org_id: orgId,
      ticker: ticker.toUpperCase(),
      nct_id: nct_id.toUpperCase(),
      label: label || null,
    })
    .select('*')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const authErr = verifyAdmin(req);
  if (authErr) return authErr;

  const orgId = getOrgIdFromEnv();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'id required' }, { status: 400 });
  }

  const supabase = createServerClient();
  const { error } = await supabase.from('trial_mapping').delete().eq('org_id', orgId).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
