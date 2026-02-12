'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { RefreshCw } from 'lucide-react';

interface SourceHealth {
  id: string;
  source: string;
  run_date: string;
  fetched_count: number;
  emitted_detections: number;
  errors_count: number;
  lag_seconds_p95: number | null;
  notes: string | null;
}

interface SourceCursor {
  source: string;
  cursor_json: Record<string, unknown>;
  last_run_at: string | null;
  last_ok_at: string | null;
}

export function SourceHealthTab() {
  const [health, setHealth] = useState<SourceHealth[]>([]);
  const [cursors, setCursors] = useState<SourceCursor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/source-health');
      const data = await res.json();
      if (data.health) setHealth(data.health);
      if (data.cursors) setCursors(data.cursors);
    } catch {
      toast({ title: 'Failed to load source health', variant: 'destructive' });
    }
    setLoading(false);
  }

  function formatDate(iso: string | null) {
    if (!iso) return '-';
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  function formatRunDate(dateStr: string) {
    const d = new Date(dateStr + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diff = Math.round((today.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Yesterday';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  const sources = Array.from(new Set([
    ...health.map(h => h.source),
    ...cursors.map(c => c.source)
  ])).sort();

  const healthBySourceDate: Record<string, Record<string, SourceHealth>> = {};
  health.forEach(h => {
    if (!healthBySourceDate[h.source]) healthBySourceDate[h.source] = {};
    healthBySourceDate[h.source][h.run_date] = h;
  });

  const dates = Array.from(new Set(health.map(h => h.run_date))).sort().reverse();

  return (
    <Card className="border-neutral-200">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-medium">Source Health (Last 7 Days)</CardTitle>
        <Button size="sm" variant="outline" onClick={loadData} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h3 className="text-xs font-medium text-neutral-500 mb-2">Cursor Status</h3>
          {cursors.length === 0 ? (
            <p className="text-sm text-neutral-400">No cursor data.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Source</TableHead>
                  <TableHead className="text-xs">Last Run</TableHead>
                  <TableHead className="text-xs">Last OK</TableHead>
                  <TableHead className="text-xs">Cursor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cursors.map(c => (
                  <TableRow key={c.source}>
                    <TableCell className="text-sm font-medium">{c.source}</TableCell>
                    <TableCell className="text-xs text-neutral-500">{formatDate(c.last_run_at)}</TableCell>
                    <TableCell className="text-xs text-neutral-500">{formatDate(c.last_ok_at)}</TableCell>
                    <TableCell className="text-xs font-mono text-neutral-400 max-w-[200px] truncate">
                      {JSON.stringify(c.cursor_json)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        <div>
          <h3 className="text-xs font-medium text-neutral-500 mb-2">Daily Health</h3>
          {health.length === 0 ? (
            <p className="text-sm text-neutral-400">No health data recorded yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Source</TableHead>
                  <TableHead className="text-xs">Date</TableHead>
                  <TableHead className="text-xs text-right">Fetched</TableHead>
                  <TableHead className="text-xs text-right">Detections</TableHead>
                  <TableHead className="text-xs text-right">Errors</TableHead>
                  <TableHead className="text-xs text-right">P95 Lag</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sources.flatMap(source =>
                  dates.map(date => {
                    const h = healthBySourceDate[source]?.[date];
                    if (!h) return null;
                    return (
                      <TableRow key={`${source}-${date}`}>
                        <TableCell className="text-sm font-medium">{h.source}</TableCell>
                        <TableCell className="text-xs text-neutral-500">{formatRunDate(h.run_date)}</TableCell>
                        <TableCell className="text-sm text-right">{h.fetched_count}</TableCell>
                        <TableCell className="text-sm text-right">{h.emitted_detections}</TableCell>
                        <TableCell className="text-right">
                          {h.errors_count > 0 ? (
                            <Badge variant="destructive" className="text-xs">{h.errors_count}</Badge>
                          ) : (
                            <span className="text-sm text-neutral-400">0</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-right text-neutral-500">
                          {h.lag_seconds_p95 !== null ? `${h.lag_seconds_p95}s` : '-'}
                        </TableCell>
                      </TableRow>
                    );
                  }).filter(Boolean)
                )}
              </TableBody>
            </Table>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
