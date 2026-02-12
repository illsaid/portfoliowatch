import { createServerClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StateBadge } from '@/components/state-badge';
import { PolicyTag } from '@/components/policy-tag';
import { DiffDisplay } from '@/components/diff-display';
import { LLMInterpDisplay, LLMInterpBadge } from '@/components/llm-interp-display';
import { EmptyState } from '@/components/empty-state';
import type { DailyStateEnum, LLMInterpretation } from '@/lib/engine/types';
import { FileText, ExternalLink, Target, TrendingUp, CheckCircle, AlertCircle } from 'lucide-react';
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
      <EmptyState
        icon={CheckCircle}
        title="All clear today"
        description="No brief needed — your holdings are contained with no high-signal changes detected. Check back after the next poll run."
        actionLabel="Back to Dashboard"
        actionHref="/"
        hint="Briefs are generated when the state escalates above Contained."
      />
    );
  }

  const { data: detection } = await supabase
    .from('detection')
    .select('*')
    .eq('id', dailyState.top_detection_id)
    .maybeSingle();

  if (!detection) {
    return (
      <EmptyState
        icon={AlertCircle}
        title="Detection not found"
        description="The referenced detection could not be loaded. It may have been removed or there was a data issue."
        actionLabel="Back to Dashboard"
        actionHref="/"
      />
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
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline">{detection.ticker}</Badge>
            <Badge variant="secondary" className="text-xs">
              {sourceLabel}
            </Badge>
            {detection.llm_interp && (
              <LLMInterpBadge confidence={detection.llm_confidence} />
            )}
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
                {detection.llm_interp && (
                  <div className="mt-3">
                    <LLMInterpDisplay
                      interp={detection.llm_interp as unknown as LLMInterpretation}
                      confidence={detection.llm_confidence}
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
