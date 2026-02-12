'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { ScorePill } from '@/components/score-pill';
import { SourceBadge } from '@/components/source-badge';
import { LLMInterpBadge } from '@/components/llm-interp-display';
import { DetectionDrawer } from '@/components/detection-drawer';
import { Clock, ChevronRight } from 'lucide-react';
import type { Detection, SourceTier } from '@/lib/engine/types';

interface DetectionListProps {
  detections: Detection[];
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return date.toLocaleDateString();
}

function getHumanLabel(changeType: string, fieldPath?: string | null): string {
  const labels: Record<string, string> = {
    filing_new: 'New SEC filing',
    filing_amended: 'Amended filing',
    pdufa_changed: 'PDUFA date changed',
    trial_termination: 'Trial terminated',
    halt: 'Trading halt',
    price_gap: 'Gap move',
    misc: 'Update detected',
    trial_status_change: 'Trial status changed',
    trial_endpoint_change: 'Endpoint changed',
    trial_date_change: 'Date changed',
    enrollment_change: 'Enrollment changed',
  };

  if (fieldPath) {
    const field = fieldPath.toLowerCase();
    if (field.includes('overall_status')) return 'Trial status changed';
    if (field.includes('why_stopped')) return 'Trial stopped';
    if (field.includes('completion_date')) return 'Completion date moved';
    if (field.includes('primary_completion')) return 'Primary completion date moved';
    if (field.includes('enrollment')) return 'Enrollment updated';
    if (field.includes('phase')) return 'Phase changed';
    if (field.includes('has_results')) return 'Results posted';
  }

  return labels[changeType] || 'Change detected';
}

export function DetectionList({ detections }: DetectionListProps) {
  const [selectedDetection, setSelectedDetection] = useState<Detection | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleClick = (detection: Detection) => {
    setSelectedDetection(detection);
    setDrawerOpen(true);
  };

  if (detections.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-sm text-neutral-500">No material changes detected today.</p>
        <a href="/quiet" className="text-xs text-teal-600 hover:text-teal-700 mt-1 inline-block">
          View Quiet Log for suppressed updates →
        </a>
      </div>
    );
  }

  return (
    <>
      <div className="divide-y divide-neutral-100">
        {detections.map((detection) => (
          <button
            key={detection.id}
            onClick={() => handleClick(detection)}
            className="w-full flex items-center gap-3 py-3 px-1 text-left hover:bg-neutral-50 transition-colors rounded-lg -mx-1"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="text-xs font-semibold shrink-0">
                  {detection.ticker}
                </Badge>
                <SourceBadge
                  source={detection.source_tier as SourceTier}
                  showLabel={false}
                  size="sm"
                />
                <span className="text-sm text-neutral-700 truncate">
                  {getHumanLabel(detection.change_type, detection.field_path)}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1.5">
                <ScorePill score={detection.score_final} />
                {detection.llm_interp && (
                  <LLMInterpBadge confidence={detection.llm_confidence} />
                )}
                <span className="text-xs text-neutral-400 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatRelativeTime(detection.detected_at)}
                </span>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-neutral-400 shrink-0" />
          </button>
        ))}
      </div>

      <DetectionDrawer
        detection={selectedDetection}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
      />
    </>
  );
}
