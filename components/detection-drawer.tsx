'use client';

import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScorePill } from '@/components/score-pill';
import { SourceBadge } from '@/components/source-badge';
import { DiffDisplay } from '@/components/diff-display';
import { LLMInterpDisplay, LLMInterpBadge } from '@/components/llm-interp-display';
import { ExternalLink, FileText, EyeOff, Clock, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import type { Detection, SourceTier, LLMInterpretation } from '@/lib/engine/types';

interface DetectionDrawerProps {
  detection: Detection | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DetectionDrawer({ detection, open, onOpenChange }: DetectionDrawerProps) {
  if (!detection) return null;

  const isCtgov = detection.source_tier === 'primary_registry';
  const hasLLMInterp = !!detection.llm_interp;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="pb-4 border-b border-neutral-100">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="text-sm font-semibold">
              {detection.ticker}
            </Badge>
            <SourceBadge source={detection.source_tier as SourceTier} />
            <ScorePill score={detection.score_final} size="md" />
            {hasLLMInterp && (
              <LLMInterpBadge confidence={detection.llm_confidence} />
            )}
          </div>
          <SheetTitle className="text-left text-base font-medium text-neutral-800 mt-2">
            {detection.title}
          </SheetTitle>
          <div className="flex items-center gap-2 text-xs text-neutral-500 mt-1">
            <Clock className="h-3 w-3" />
            {new Date(detection.detected_at).toLocaleString()}
          </div>
        </SheetHeader>

        <div className="py-5 space-y-6">
          {hasLLMInterp && (
            <section>
              <h4 className="text-xs font-medium uppercase tracking-wide text-neutral-500 mb-3">
                Why it matters
              </h4>
              <LLMInterpDisplay
                interp={detection.llm_interp as unknown as LLMInterpretation}
                confidence={detection.llm_confidence}
              />
            </section>
          )}

          {!hasLLMInterp && isCtgov && (
            <section>
              <h4 className="text-xs font-medium uppercase tracking-wide text-neutral-500 mb-2">
                Why it matters
              </h4>
              <p className="text-sm text-neutral-600">
                No AI interpretation available yet. This detection will be analyzed on the next poll run if it meets gating criteria.
              </p>
            </section>
          )}

          <section>
            <h4 className="text-xs font-medium uppercase tracking-wide text-neutral-500 mb-3">
              Evidence
            </h4>
            <div className="space-y-3">
              {isCtgov && detection.field_path && (
                <DiffDisplay
                  fieldPath={detection.field_path}
                  oldValue={detection.old_value ?? null}
                  newValue={detection.new_value ?? null}
                />
              )}

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-neutral-400">Source</p>
                  <p className="text-neutral-700">{detection.source_tier.replace(/_/g, ' ')}</p>
                </div>
                <div>
                  <p className="text-xs text-neutral-400">Change Type</p>
                  <p className="text-neutral-700">{detection.change_type.replace(/_/g, ' ')}</p>
                </div>
                {detection.nct_id && (
                  <div>
                    <p className="text-xs text-neutral-400">NCT ID</p>
                    <p className="text-neutral-700 font-mono text-xs">{detection.nct_id}</p>
                  </div>
                )}
                {detection.accession && (
                  <div>
                    <p className="text-xs text-neutral-400">Accession</p>
                    <p className="text-neutral-700 font-mono text-xs">{detection.accession}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-neutral-400">Score</p>
                  <p className="text-neutral-700">
                    Raw {detection.score_raw} → Final {detection.score_final}
                  </p>
                </div>
                {detection.policy_match_label && (
                  <div>
                    <p className="text-xs text-neutral-400">Policy</p>
                    <p className="text-neutral-700">{detection.policy_match_label}</p>
                  </div>
                )}
              </div>
            </div>
          </section>

          <section>
            <h4 className="text-xs font-medium uppercase tracking-wide text-neutral-500 mb-3">
              Actions
            </h4>
            <div className="flex flex-wrap gap-2">
              {detection.url && (
                <a
                  href={detection.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 transition-colors"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  View Source
                </a>
              )}
              <Link
                href="/brief"
                className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 transition-colors"
                onClick={() => onOpenChange(false)}
              >
                <FileText className="h-3.5 w-3.5" />
                View Brief
              </Link>
              {(detection.suppressed || detection.quarantined) && (
                <Link
                  href="/quiet"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 transition-colors"
                  onClick={() => onOpenChange(false)}
                >
                  <EyeOff className="h-3.5 w-3.5" />
                  Quiet Log
                </Link>
              )}
            </div>
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}
