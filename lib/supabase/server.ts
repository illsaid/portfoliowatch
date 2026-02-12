import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { RubricVersion } from '@/lib/engine/types';

export function createServerClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

const DEFAULT_RUBRIC_VERSION_NAME = 'v1';

export async function getActiveRubricVersion(
  supabase: SupabaseClient,
  orgId: string
): Promise<RubricVersion | null> {
  const { data: activeVersion } = await supabase
    .from('rubric_versions')
    .select('*')
    .eq('org_id', orgId)
    .eq('is_active', true)
    .order('effective_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (activeVersion) {
    return activeVersion as RubricVersion;
  }

  const { data: fallback } = await supabase
    .from('rubric_versions')
    .select('*')
    .eq('org_id', orgId)
    .eq('version_name', DEFAULT_RUBRIC_VERSION_NAME)
    .maybeSingle();

  return fallback as RubricVersion | null;
}
