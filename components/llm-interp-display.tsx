'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Sparkles, ChevronDown, ChevronUp, AlertTriangle, CheckCircle, MinusCircle } from 'lucide-react';
import type { LLMInterpretation } from '@/lib/engine/types';

interface LLMInterpDisplayProps {
  interp: LLMInterpretation | Record<string, unknown> | null;
  confidence?: number | null;
  compact?: boolean;
}

function isValidInterp(obj: unknown): obj is LLMInterpretation {
  if (!obj || typeof obj !== 'object') return false;
  const o = obj as Record<string, unknown>;
  return (
    Array.isArray(o.why_it_matters) &&
    typeof o.benign_explanation === 'string' &&
    typeof o.bear_case === 'string'
  );
}

function NoiseIcon({ level }: { level: string }) {
  if (level === 'low') {
    return <CheckCircle className="h-3 w-3 text-emerald-500" />;
  }
  if (level === 'high') {
    return <AlertTriangle className="h-3 w-3 text-amber-500" />;
  }
  return <MinusCircle className="h-3 w-3 text-neutral-400" />;
}

export function LLMInterpBadge({ confidence }: { confidence: number | null | undefined }) {
  if (confidence === null || confidence === undefined) return null;

  const rounded = Math.round(confidence * 100) / 100;
  const color =
    confidence >= 0.7
      ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
      : confidence >= 0.4
      ? 'bg-amber-100 text-amber-700 border-amber-200'
      : 'bg-neutral-100 text-neutral-600 border-neutral-200';

  return (
    <Badge variant="outline" className={`text-xs ${color} gap-1`}>
      <Sparkles className="h-3 w-3" />
      AI {rounded.toFixed(2)}
    </Badge>
  );
}

export function LLMInterpDisplay({ interp, confidence, compact = false }: LLMInterpDisplayProps) {
  const [open, setOpen] = useState(false);

  if (!interp || !isValidInterp(interp)) {
    return null;
  }

  const i = interp as LLMInterpretation;

  if (compact) {
    return (
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs text-teal-600 hover:text-teal-700"
          >
            <Sparkles className="h-3 w-3 mr-1" />
            AI Analysis
            {open ? (
              <ChevronUp className="h-3 w-3 ml-1" />
            ) : (
              <ChevronDown className="h-3 w-3 ml-1" />
            )}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-2">
          <LLMInterpContent interp={i} confidence={confidence} />
        </CollapsibleContent>
      </Collapsible>
    );
  }

  return <LLMInterpContent interp={i} confidence={confidence} />;
}

function LLMInterpContent({
  interp,
  confidence,
}: {
  interp: LLMInterpretation;
  confidence?: number | null;
}) {
  return (
    <div className="rounded-lg border border-neutral-100 bg-neutral-50 p-3 space-y-3">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-teal-600" />
        <span className="text-xs font-medium text-neutral-700">AI Interpretation</span>
        {confidence !== null && confidence !== undefined && (
          <span className="ml-auto text-xs text-neutral-500">
            Confidence: {(confidence * 100).toFixed(0)}%
          </span>
        )}
        <div className="flex items-center gap-1">
          <NoiseIcon level={interp.noise_flag} />
          <span className="text-xs text-neutral-500 capitalize">{interp.noise_flag} noise</span>
        </div>
      </div>

      <div className="space-y-2">
        <div>
          <p className="text-xs font-medium text-neutral-500 mb-1">Why it matters</p>
          <ul className="list-disc list-inside space-y-0.5">
            {interp.why_it_matters.map((bullet, i) => (
              <li key={i} className="text-sm text-neutral-700">
                {bullet}
              </li>
            ))}
          </ul>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs font-medium text-emerald-600 mb-1">Benign explanation</p>
            <p className="text-xs text-neutral-600">{interp.benign_explanation}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-red-600 mb-1">Bear case</p>
            <p className="text-xs text-neutral-600">{interp.bear_case}</p>
          </div>
        </div>

        {interp.next_checks && interp.next_checks.length > 0 && (
          <div>
            <p className="text-xs font-medium text-neutral-500 mb-1">Next steps</p>
            <ul className="list-disc list-inside space-y-0.5">
              {interp.next_checks.map((check, i) => (
                <li key={i} className="text-xs text-neutral-600">
                  {check}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
