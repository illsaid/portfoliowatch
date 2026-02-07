'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trash2 } from 'lucide-react';
import { adminHeaders } from './admin-helpers';
import { toast } from '@/hooks/use-toast';

interface TrialMapping {
  id: string;
  ticker: string;
  nct_id: string;
  label: string | null;
  last_hash: string | null;
  last_fetched_at: string | null;
}

export function TrialsTab() {
  const [mappings, setMappings] = useState<TrialMapping[]>([]);
  const [ticker, setTicker] = useState('');
  const [nctId, setNctId] = useState('');
  const [label, setLabel] = useState('');
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/trials');
    const data = await res.json();
    if (Array.isArray(data)) setMappings(data);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function addMapping() {
    if (!ticker || !nctId) return;
    setAdding(true);
    try {
      const res = await fetch('/api/admin/trials', {
        method: 'POST',
        headers: adminHeaders(),
        body: JSON.stringify({ ticker, nct_id: nctId, label: label || null }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast({ title: data.error || 'Failed to add mapping', variant: 'destructive' });
      } else {
        toast({ title: `${ticker} / ${nctId} mapping added` });
        setTicker('');
        setNctId('');
        setLabel('');
      }
    } catch {
      toast({ title: 'Failed to add mapping', variant: 'destructive' });
    }
    setAdding(false);
    load();
  }

  async function remove(id: string, nct: string) {
    try {
      await fetch(`/api/admin/trials?id=${id}`, {
        method: 'DELETE',
        headers: adminHeaders(),
      });
      toast({ title: `${nct} mapping removed` });
    } catch {
      toast({ title: 'Failed to remove mapping', variant: 'destructive' });
    }
    load();
  }

  return (
    <Card className="border-neutral-200">
      <CardHeader>
        <CardTitle className="text-sm font-medium">Trial Mappings (Manual)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <p className="text-xs text-neutral-500">
          Map tickers to ClinicalTrials.gov NCT IDs. Changes are detected via structured field diffs.
        </p>

        <div className="grid gap-3 sm:grid-cols-4">
          <div>
            <Label className="text-xs">Ticker</Label>
            <Input
              value={ticker}
              onChange={(e) => setTicker(e.target.value.toUpperCase())}
              placeholder="MRNA"
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-xs">NCT ID</Label>
            <Input
              value={nctId}
              onChange={(e) => setNctId(e.target.value.toUpperCase())}
              placeholder="NCT01234567"
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-xs">Label (optional)</Label>
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Phase 3 RSV"
              className="mt-1"
            />
          </div>
          <div className="flex items-end">
            <Button
              onClick={addMapping}
              disabled={adding || !ticker || !nctId}
              size="sm"
              className="w-full"
            >
              {adding ? 'Adding...' : 'Add'}
            </Button>
          </div>
        </div>

        <div className="rounded border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Ticker</TableHead>
                <TableHead className="text-xs">NCT ID</TableHead>
                <TableHead className="text-xs">Label</TableHead>
                <TableHead className="text-xs">Last Fetched</TableHead>
                <TableHead className="text-xs">Hash</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mappings.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="text-xs font-medium">{m.ticker}</TableCell>
                  <TableCell className="font-mono text-xs">{m.nct_id}</TableCell>
                  <TableCell className="text-xs text-neutral-500">{m.label || '\u2014'}</TableCell>
                  <TableCell className="text-xs text-neutral-400">
                    {m.last_fetched_at
                      ? new Date(m.last_fetched_at).toLocaleString()
                      : 'never'}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-neutral-400">
                    {m.last_hash ? m.last_hash.slice(0, 8) : '\u2014'}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => remove(m.id, m.nct_id)}
                      className="h-7 w-7 p-0"
                    >
                      <Trash2 className="h-3.5 w-3.5 text-neutral-400" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {mappings.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-xs text-neutral-400">
                    No trial mappings. Add a ticker + NCT ID above.
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
