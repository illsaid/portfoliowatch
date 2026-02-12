import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { verifyAdmin } from '@/lib/auth';

export async function GET() {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('rubric_versions')
    .select('*')
    .order('effective_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const authErr = verifyAdmin(req);
  if (authErr) return authErr;

  const body = await req.json();
  const { version_name, weights_json, threshold_alert, panic_sensitivity, suppression_strictness, reason } = body;

  if (!version_name) {
    return NextResponse.json({ error: 'version_name required' }, { status: 400 });
  }

  const supabase = createServerClient();

  const { data: existing } = await supabase
    .from('rubric_versions')
    .select('id')
    .eq('version_name', version_name)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: 'Version name already exists' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('rubric_versions')
    .insert({
      version_name,
      weights_json: weights_json ?? {},
      threshold_alert: threshold_alert ?? 60,
      panic_sensitivity: panic_sensitivity ?? -20,
      suppression_strictness: suppression_strictness ?? 'high',
      reason: reason ?? null,
      is_active: false,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const authErr = verifyAdmin(req);
  if (authErr) return authErr;

  const body = await req.json();
  const { id, action } = body;

  if (!id) {
    return NextResponse.json({ error: 'id required' }, { status: 400 });
  }

  const supabase = createServerClient();

  if (action === 'activate') {
    const { error: deactivateError } = await supabase
      .from('rubric_versions')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .neq('id', id);

    if (deactivateError) {
      return NextResponse.json({ error: deactivateError.message }, { status: 500 });
    }

    const { error: activateError } = await supabase
      .from('rubric_versions')
      .update({
        is_active: true,
        effective_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (activateError) {
      return NextResponse.json({ error: activateError.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
