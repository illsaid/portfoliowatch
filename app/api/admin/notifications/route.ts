import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { verifyAdmin } from '@/lib/auth';
import { getOrgIdFromEnv } from '@/lib/tenancy';

export async function GET(req: NextRequest) {
  const authErr = verifyAdmin(req);
  if (authErr) return authErr;

  const orgId = getOrgIdFromEnv();
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('notification_settings')
    .select('*')
    .eq('org_id', orgId)
    .eq('user_id', 'default')
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function PUT(req: NextRequest) {
  const authErr = verifyAdmin(req);
  if (authErr) return authErr;

  const orgId = getOrgIdFromEnv();
  const body = await req.json();
  const { channel, email, daily_push_enabled, pause_push_enabled, quiet_push_enabled } = body;

  const supabase = createServiceClient();
  const { error } = await supabase
    .from('notification_settings')
    .update({
      channel: channel ?? 'none',
      email: email || null,
      daily_push_enabled: daily_push_enabled ?? false,
      pause_push_enabled: pause_push_enabled ?? true,
      quiet_push_enabled: quiet_push_enabled ?? false,
    })
    .eq('org_id', orgId)
    .eq('user_id', 'default');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
