import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { verifyAdmin } from '@/lib/auth';

export async function GET() {
  const supabase = createServerClient();
  const { data, error } = await supabase.from('admin_settings').select('*');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const settings: Record<string, string> = {};
  for (const row of data ?? []) {
    settings[row.key] = row.value;
  }
  return NextResponse.json(settings);
}

export async function PUT(req: NextRequest) {
  const authErr = verifyAdmin(req);
  if (authErr) return authErr;

  const body = await req.json();
  const { key, value } = body;
  if (!key || value === undefined) {
    return NextResponse.json({ error: 'key and value required' }, { status: 400 });
  }

  const supabase = createServerClient();
  const { error } = await supabase
    .from('admin_settings')
    .update({ value: String(value), updated_at: new Date().toISOString() })
    .eq('key', key);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
