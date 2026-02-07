import { createServerClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StateBadge } from '@/components/state-badge';
import { PolicyTag } from '@/components/policy-tag';
import { DiffDisplay } from '@/components/diff-display';
import type { DailyStateEnum } from '@/lib/engine/types';
import { FileText, ExternalLink, Target, TrendingUp } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function BriefPage() {
  const supabase = createServerClient();
  const today = new Date().toISOString().split('T')[0];

  const { data: dailyState } = await supabase
    .from('daily_state')
    .select('*')
    .eq('date', today)
    .maybeSingle();

  const state: DailyStateEnum = (dailyState?.state as DailyStateEnum) ?? 'Contained';

  if (state === 'Contained' || !dailyState?.top_detection_id) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center text-center">
        <StateBadge state="Contained" size="lg" />
        <p className="mt-4 text-sm text-neutral-500">
          No brief needed today. All holdings are contained.
        </p>
        <Link
          href="/"
          className="mt-4 text-xs font-medium text-teal-600 hover:text-teal-700"
        >
          &larr; Back to dashboard
        </Link>
      </div>
    );
  }

  const { data: detection } = await supabase
    .from('detection')
    .select('*')
    .eq('id', dailyState.top_detection_id)
    .maybeSingle();

  if (!detection) {
    return (
      <div className="text-center text-sm text-neutral-500">
        Detection not found.
      </div>
    );
  }

  const isCtgov = !!detection.nct_id;
  const sourceLabel = isCtgov ? 'ClinicalTrials.gov' : 'SEC EDGAR';

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <StateBadge state={state} size="md" />
        <h1 className="text-lg font-semibold text-neutral-900">60-Second Brief</h1>
      </div>

      <Card className="border-neutral-200">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Badge variant="outline">{detection.ticker}</Badge>
            <Badge variant="secondary" className="text-xs">
              {sourceLabel}
            </Badge>
            <Badge variant="secondary" className="ml-auto text-xs">
              Score: {detection.score_final}
            </Badge>
          </div>
          <CardTitle className="mt-2 text-base font-medium text-neutral-800">
            {detection.title}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-start gap-2">
              <FileText className="mt-0.5 h-4 w-4 shrink-0 text-neutral-400" />
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-neutral-400">
                  What changed
                </p>
                <p className="mt-0.5 text-sm text-neutral-700">
                  {detection.change_type.replace(/_/g, ' ')} detected on{' '}
                  {new Date(detection.detected_at).toLocaleDateString()}
                </p>
                {isCtgov && detection.field_path && (
                  <div className="mt-2">
                    <DiffDisplay
                      fieldPath={detection.field_path}
                      oldValue={detection.old_value}
                      newValue={detection.new_value}
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-start gap-2">
              <Target className="mt-0.5 h-4 w-4 shrink-0 text-neutral-400" />
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-neutral-400">
                  Score breakdown
                </p>
                <p className="mt-0.5 font-mono text-xs text-neutral-600">
                  Raw {detection.score_raw} &rarr; Final {detection.score_final}
                </p>
                {detection.policy_match_id && (
                  <div className="mt-1">
                    <PolicyTag
                      ruleId={detection.policy_match_id}
                      ruleLabel={detection.policy_match_label}
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-start gap-2">
              <TrendingUp className="mt-0.5 h-4 w-4 shrink-0 text-neutral-400" />
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-neutral-400">
                  What to watch next
                </p>
                <p className="mt-0.5 text-sm text-neutral-700">
                  {state === 'Pause'
                    ? 'Open triage for immediate action steps.'
                    : 'Monitor for follow-up filings or data changes. No immediate action required.'}
                </p>
              </div>
            </div>
          </div>

          {detection.url && (
            <div className="border-t border-neutral-100 pt-3">
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-neutral-400">
                Sources
              </p>
              <a
                href={detection.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-teal-600 hover:text-teal-700"
              >
                <ExternalLink className="h-3 w-3" />
                {isCtgov ? `CT.gov ${detection.nct_id}` : 'EDGAR Filing'}
              </a>
            </div>
          )}
        </CardContent>
      </Card>

      <Link
        href="/"
        className="inline-block text-xs font-medium text-neutral-500 hover:text-neutral-700"
      >
        &larr; Back to dashboard
      </Link>
    </div>
  );
}
