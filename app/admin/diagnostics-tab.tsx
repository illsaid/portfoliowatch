'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/lib/supabase/client';

interface MissLogEntry {
  id: string;
  ticker: string;
  date: string;
  reason: string;
  move_1d: number;
}

interface DetectionEntry {
  id: string;
  ticker: string;
  title: string;
  score_final: number;
  detected_at: string;
}

export function DiagnosticsTab() {
  const [misses, setMisses] = useState<MissLogEntry[]>([]);
  const [quarantined, setQuarantined] = useState<DetectionEntry[]>([]);

  useEffect(() => {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    supabase
      .from('miss_log')
      .select('*')
      .gte('date', weekAgo)
      .order('date', { ascending: false })
      .limit(20)
      .then(({ data }) => {
        if (data) setMisses(data);
      });

    supabase
      .from('detection')
      .select('id, ticker, title, score_final, detected_at')
      .eq('quarantined', true)
      .gte('detected_at', `${weekAgo}T00:00:00`)
      .order('detected_at', { ascending: false })
      .limit(20)
      .then(({ data }) => {
        if (data) setQuarantined(data);
      });
  }, []);

  return (
    <div className="space-y-6">
      <Card className="border-neutral-200">
        <CardHeader>
          <CardTitle className="text-sm font-medium">
            Misses This Week ({misses.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {misses.length > 0 ? (
            <div className="rounded border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Ticker</TableHead>
                    <TableHead className="text-xs">Date</TableHead>
                    <TableHead className="text-xs">Reason</TableHead>
                    <TableHead className="text-xs">Move</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {misses.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="text-xs font-medium">{m.ticker}</TableCell>
                      <TableCell className="text-xs">{m.date}</TableCell>
                      <TableCell className="text-xs text-neutral-500">{m.reason}</TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={`text-xs ${m.move_1d < 0 ? 'text-red-600' : 'text-teal-600'}`}
                        >
                          {(m.move_1d * 100).toFixed(1)}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="py-4 text-center text-xs text-neutral-400">
              No misses this week.
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="border-neutral-200">
        <CardHeader>
          <CardTitle className="text-sm font-medium">
            Quarantined Items ({quarantined.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {quarantined.length > 0 ? (
            <div className="rounded border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Ticker</TableHead>
                    <TableHead className="text-xs">Title</TableHead>
                    <TableHead className="text-xs">Score</TableHead>
                    <TableHead className="text-xs">Detected</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {quarantined.map((q) => (
                    <TableRow key={q.id}>
                      <TableCell className="text-xs font-medium">{q.ticker}</TableCell>
                      <TableCell className="text-xs text-neutral-600">{q.title}</TableCell>
                      <TableCell className="text-xs">{q.score_final}</TableCell>
                      <TableCell className="text-xs text-neutral-400">
                        {new Date(q.detected_at).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="py-4 text-center text-xs text-neutral-400">
              No quarantined items this week.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
