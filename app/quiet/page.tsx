import { createServerClient } from '@/lib/supabase/server';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PolicyTag } from '@/components/policy-tag';
import { DiffDisplay } from '@/components/diff-display';
import { LLMInterpDisplay, LLMInterpBadge } from '@/components/llm-interp-display';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EyeOff, ShieldAlert, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import type { LLMInterpretation } from '@/lib/engine/types';

export const dynamic = 'force-dynamic';

export default async function QuietPage() {
  const supabase = createServerClient();

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0];

  const { data: suppressed } = await supabase
    .from('detection')
    .select('*')
    .eq('suppressed', true)
    .gte('detected_at', `${sevenDaysAgo}T00:00:00`)
    .order('detected_at', { ascending: false })
    .limit(50);

  const { data: quarantined } = await supabase
    .from('detection')
    .select('*')
    .eq('quarantined', true)
    .gte('detected_at', `${sevenDaysAgo}T00:00:00`)
    .order('detected_at', { ascending: false })
    .limit(50);

  const suppressedList = suppressed ?? [];
  const quarantinedList = quarantined ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <EyeOff className="h-5 w-5 text-neutral-400" />
        <h1 className="text-lg font-semibold text-neutral-900">Quiet Log</h1>
        <span className="text-sm text-neutral-400">Last 7 days</span>
      </div>

      <Tabs defaultValue="suppressed">
        <TabsList>
          <TabsTrigger value="suppressed" className="text-xs">
            Suppressed ({suppressedList.length})
          </TabsTrigger>
          <TabsTrigger value="quarantined" className="text-xs">
            Quarantined ({quarantinedList.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="suppressed" className="space-y-3">
          {suppressedList.length === 0 ? (
            <p className="py-8 text-center text-sm text-neutral-400">
              No suppressed detections in the last 7 days.
            </p>
          ) : (
            suppressedList.map((d) => (
              <DetectionRow key={d.id} detection={d} />
            ))
          )}
        </TabsContent>

        <TabsContent value="quarantined" className="space-y-3">
          {quarantinedList.length === 0 ? (
            <p className="py-8 text-center text-sm text-neutral-400">
              No quarantined detections in the last 7 days.
            </p>
          ) : (
            quarantinedList.map((d) => (
              <DetectionRow key={d.id} detection={d} type="quarantined" />
            ))
          )}
        </TabsContent>
      </Tabs>

      <Link
        href="/"
        className="inline-block text-xs font-medium text-neutral-500 hover:text-neutral-700"
      >
        &larr; Back to dashboard
      </Link>
    </div>
  );
}

interface DetectionRowData {
  id: string;
  ticker: string;
  title: string;
  source_tier: string;
  change_type: string;
  nct_id: string | null;
  field_path: string | null;
  old_value: string | null;
  new_value: string | null;
  score_raw: number;
  score_final: number;
  policy_match_id: string | null;
  policy_match_label: string | null;
  detected_at: string;
  url: string | null;
  llm_interp?: Record<string, unknown> | null;
  llm_confidence?: number | null;
}

function DetectionRow({
  detection,
  type = 'suppressed',
}: {
  detection: DetectionRowData;
  type?: 'suppressed' | 'quarantined';
}) {
  const d = detection;
  const isCtgov = !!d.nct_id;

  return (
    <Card className="border-neutral-100">
      <CardContent className="py-3">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {d.ticker}
              </Badge>
              <span className="text-sm font-medium text-neutral-700">
                {d.title}
              </span>
              {d.llm_interp && (
                <LLMInterpBadge confidence={d.llm_confidence} />
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {type === 'quarantined' ? (
                <Badge variant="secondary" className="text-xs">
                  <ShieldAlert className="mr-1 h-3 w-3" />
                  Quarantined
                </Badge>
              ) : (
                <Badge variant="secondary" className="text-xs">
                  <EyeOff className="mr-1 h-3 w-3" />
                  Suppressed
                </Badge>
              )}
              <PolicyTag
                ruleId={d.policy_match_id}
                ruleLabel={d.policy_match_label}
              />
            </div>

            <p className="font-mono text-xs text-neutral-400">
              Raw {d.score_raw} &rarr; Final {d.score_final}
            </p>

            {isCtgov && d.field_path ? (
              <DiffDisplay
                fieldPath={d.field_path}
                oldValue={d.old_value}
                newValue={d.new_value}
              />
            ) : null}

            {d.llm_interp && (
              <LLMInterpDisplay
                interp={d.llm_interp as unknown as LLMInterpretation}
                confidence={d.llm_confidence}
                compact
              />
            )}

            <div className="flex items-center gap-3 text-xs text-neutral-400">
              <span>{new Date(d.detected_at).toLocaleString()}</span>
              {d.url ? (
                <a
                  href={d.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-0.5 text-teal-600 hover:text-teal-700"
                >
                  <ExternalLink className="h-3 w-3" />
                  Source
                </a>
              ) : null}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
