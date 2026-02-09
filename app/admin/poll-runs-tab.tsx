'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StateBadge } from '@/components/state-badge';
import { adminHeaders } from './admin-helpers';
import { toast } from '@/hooks/use-toast';
import type { DailyStateEnum } from '@/lib/engine/types';

interface PollRun {
  id: string;
  started_at: string;
  finished_at: string | null;
  status: 'running' | 'ok' | 'error';
  tickers_polled: number;
  new_detections: number;
  suppressed_count: number;
  quarantined_count: number;
  resulting_state: string | null;
  summary_json: Record<string, unknown> | null;
  error_json: Record<string, unknown> | null;
}

export function PollRunsTab() {
  const [runs, setRuns] = useState<PollRun[]>([]);
  const [polling, setPolling] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [pollResult, setPollResult] = useState('');

  const load = useCallback(async () => {
    const res = await fetch('/api/poll-runs?limit=10');
    const data = await res.json();
    if (Array.isArray(data)) setRuns(data);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function triggerPoll() {
    setPolling(true);
    setPollResult('');
    toast({ title: 'Poll started' });
    try {
      const res = await fetch('/api/poll', {
        method: 'POST',
        headers: adminHeaders(),
      });

      if (res.status === 401) {
        toast({
          title: 'Authentication failed',
          description: 'Please unlock admin access above',
          variant: 'destructive'
        });
        setPolling(false);
        return;
      }

      const data = await res.json();
      setPollResult(JSON.stringify(data, null, 2));
      if (res.ok) {
        toast({ title: `Poll finished — ${data.resulting_state ?? 'Contained'}` });
      } else {
        toast({ title: 'Poll completed with errors', variant: 'destructive' });
      }
      load();
    } catch (e) {
      setPollResult(`Error: ${(e as Error).message}`);
      toast({ title: 'Poll failed', variant: 'destructive' });
    }
    setPolling(false);
  }

  const statusColors: Record<string, string> = {
    running: 'bg-blue-100 text-blue-700',
    ok: 'bg-teal-100 text-teal-700',
    error: 'bg-red-100 text-red-700',
  };

  return (
    <Card className="border-neutral-200">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-medium">Poll Runs</CardTitle>
        <Button onClick={triggerPoll} disabled={polling} size="sm">
          {polling ? 'Polling...' : 'Poll Now'}
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {pollResult && (
          <pre className="max-h-40 overflow-auto rounded border bg-neutral-50 p-2 font-mono text-xs text-neutral-600">
            {pollResult}
          </pre>
        )}

        <div className="rounded border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs">Started</TableHead>
                <TableHead className="text-xs">Tickers</TableHead>
                <TableHead className="text-xs">New</TableHead>
                <TableHead className="text-xs">Supp.</TableHead>
                <TableHead className="text-xs">Quar.</TableHead>
                <TableHead className="text-xs">State</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {runs.map((run) => (
                <>
                  <TableRow
                    key={run.id}
                    className="cursor-pointer hover:bg-neutral-50"
                    onClick={() => setExpanded(expanded === run.id ? null : run.id)}
                  >
                    <TableCell>
                      <Badge className={`text-xs ${statusColors[run.status] || ''}`}>
                        {run.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-neutral-500">
                      {new Date(run.started_at).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-xs">{run.tickers_polled}</TableCell>
                    <TableCell className="text-xs">{run.new_detections}</TableCell>
                    <TableCell className="text-xs">{run.suppressed_count}</TableCell>
                    <TableCell className="text-xs">{run.quarantined_count}</TableCell>
                    <TableCell>
                      {run.resulting_state && (
                        <StateBadge state={run.resulting_state as DailyStateEnum} size="sm" />
                      )}
                    </TableCell>
                  </TableRow>
                  {expanded === run.id && (
                    <TableRow key={`${run.id}-detail`}>
                      <TableCell colSpan={7}>
                        <pre className="max-h-48 overflow-auto rounded bg-neutral-50 p-2 font-mono text-xs text-neutral-600">
                          {run.error_json
                            ? JSON.stringify(run.error_json, null, 2)
                            : run.summary_json
                              ? JSON.stringify(run.summary_json, null, 2)
                              : 'No details available.'}
                        </pre>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              ))}
              {runs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-xs text-neutral-400">
                    No poll runs yet. Click "Poll Now" to start.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
