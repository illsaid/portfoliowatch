import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { verifyAdmin } from '@/lib/auth';
import yaml from 'js-yaml';

export async function GET() {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('policy')
    .select('*')
    .eq('is_active', true)
    .limit(1)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function PUT(req: NextRequest) {
  const authErr = verifyAdmin(req);
  if (authErr) return authErr;

  const body = await req.json();
  const { yaml_text } = body;
  if (!yaml_text) {
    return NextResponse.json({ error: 'yaml_text required' }, { status: 400 });
  }

  try {
    const parsed = yaml.load(yaml_text) as Record<string, unknown>;
    const allRules = [
      ...((parsed.suppression ?? []) as Array<Record<string, unknown>>),
      ...((parsed.hard_alerts ?? []) as Array<Record<string, unknown>>),
    ];
    for (const rule of allRules) {
      if (!rule.id || !rule.label) {
        return NextResponse.json(
          { error: `Every rule must have an id and label. Missing on: ${JSON.stringify(rule)}` },
          { status: 400 }
        );
      }
    }
  } catch (e) {
    return NextResponse.json({ error: `Invalid YAML: ${(e as Error).message}` }, { status: 400 });
  }

  const supabase = createServerClient();
  const { data: existing } = await supabase
    .from('policy')
    .select('id')
    .eq('is_active', true)
    .limit(1)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from('policy')
      .update({ yaml_text, updated_at: new Date().toISOString() })
      .eq('id', existing.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  } else {
    const { error } = await supabase
      .from('policy')
      .insert({ name: 'default', yaml_text, is_active: true });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
