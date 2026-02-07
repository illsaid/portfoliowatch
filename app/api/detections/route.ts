import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const date = searchParams.get('date');
  const suppressed = searchParams.get('suppressed');
  const quarantined = searchParams.get('quarantined');
  const ticker = searchParams.get('ticker');
  const nctId = searchParams.get('nct_id');
  const limit = parseInt(searchParams.get('limit') ?? '50', 10);

  const supabase = createServerClient();
  let query = supabase
    .from('detection')
    .select('*')
    .order('detected_at', { ascending: false })
    .limit(limit);

  if (date) {
    query = query.gte('detected_at', `${date}T00:00:00`).lt('detected_at', `${date}T23:59:59.999`);
  }
  if (suppressed === 'true') query = query.eq('suppressed', true);
  if (suppressed === 'false') query = query.eq('suppressed', false);
  if (quarantined === 'true') query = query.eq('quarantined', true);
  if (quarantined === 'false') query = query.eq('quarantined', false);
  if (ticker) query = query.eq('ticker', ticker.toUpperCase());
  if (nctId) query = query.eq('nct_id', nctId.toUpperCase());

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
