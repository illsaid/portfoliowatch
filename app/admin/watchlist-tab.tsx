'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trash2, Pencil, Check, X } from 'lucide-react';
import { adminHeaders } from './admin-helpers';
import { toast } from '@/hooks/use-toast';

interface WatchlistItem {
  id: string;
  ticker: string;
  cik: string | null;
  dependency: number;
  poll_interval_hours: number;
  last_poll_at: string | null;
  next_check_in_at: string | null;
}

export function WatchlistTab() {
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [ticker, setTicker] = useState('');
  const [cik, setCik] = useState('');
  const [dep, setDep] = useState('0.6');
  const [interval, setInterval_] = useState('24');
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editCik, setEditCik] = useState('');
  const [editDep, setEditDep] = useState('');
  const [editInterval, setEditInterval] = useState('');
  const [saving, setSaving] = useState(false);

  const loadItems = useCallback(async () => {
    const res = await fetch('/api/admin/watchlist');
    const data = await res.json();
    if (Array.isArray(data)) setItems(data);
  }, []);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  async function addTicker() {
    if (!ticker) return;
    setAdding(true);
    try {
      const res = await fetch('/api/admin/watchlist', {
        method: 'POST',
        headers: adminHeaders(),
        body: JSON.stringify({
          ticker,
          cik: cik || null,
          dependency: parseFloat(dep),
          poll_interval_hours: parseInt(interval, 10),
        }),
      });

      if (res.status === 401) {
        toast({
          title: 'Authentication failed',
          description: 'Please unlock admin access above',
          variant: 'destructive'
        });
        setAdding(false);
        return;
      }

      if (!res.ok) {
        throw new Error('Request failed');
      }

      toast({ title: `${ticker} added to watchlist` });
      setTicker('');
      setCik('');
    } catch {
      toast({ title: 'Failed to add ticker', variant: 'destructive' });
    }
    setAdding(false);
    loadItems();
  }

  async function removeTicker(id: string, tickerName: string) {
    try {
      const res = await fetch(`/api/admin/watchlist?id=${id}`, {
        method: 'DELETE',
        headers: adminHeaders(),
      });

      if (res.status === 401) {
        toast({
          title: 'Authentication failed',
          description: 'Please unlock admin access above',
          variant: 'destructive'
        });
        return;
      }

      if (!res.ok) {
        throw new Error('Request failed');
      }

      toast({ title: `${tickerName} removed` });
    } catch {
      toast({ title: 'Failed to remove ticker', variant: 'destructive' });
    }
    loadItems();
  }

  function startEdit(item: WatchlistItem) {
    setEditingId(item.id);
    setEditCik(item.cik || '');
    setEditDep(item.dependency.toString());
    setEditInterval(item.poll_interval_hours.toString());
  }

  function cancelEdit() {
    setEditingId(null);
    setEditCik('');
    setEditDep('');
    setEditInterval('');
  }

  async function saveEdit(id: string, ticker: string) {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/watchlist?id=${id}`, {
        method: 'PATCH',
        headers: adminHeaders(),
        body: JSON.stringify({
          cik: editCik || null,
          dependency: parseFloat(editDep),
          poll_interval_hours: parseInt(editInterval, 10),
        }),
      });

      if (res.status === 401) {
        toast({
          title: 'Authentication failed',
          description: 'Please unlock admin access above',
          variant: 'destructive'
        });
        setSaving(false);
        return;
      }

      if (!res.ok) {
        throw new Error('Request failed');
      }

      toast({ title: `${ticker} updated` });
      cancelEdit();
      loadItems();
    } catch {
      toast({ title: 'Failed to update ticker', variant: 'destructive' });
    }
    setSaving(false);
  }

  return (
    <Card className="border-neutral-200">
      <CardHeader>
        <CardTitle className="text-sm font-medium">Watchlist Management</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-3 sm:grid-cols-5">
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
            <Label className="text-xs">CIK</Label>
            <Input
              value={cik}
              onChange={(e) => setCik(e.target.value)}
              placeholder="1682852"
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-xs">Dependency</Label>
            <Select value={dep} onValueChange={setDep}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0.3">0.3 (Small)</SelectItem>
                <SelectItem value="0.6">0.6 (Normal)</SelectItem>
                <SelectItem value="1.0">1.0 (Core)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Poll Interval (h)</Label>
            <Input
              type="number"
              value={interval}
              onChange={(e) => setInterval_(e.target.value)}
              className="mt-1"
            />
          </div>
          <div className="flex items-end">
            <Button onClick={addTicker} disabled={adding || !ticker} size="sm" className="w-full">
              {adding ? 'Adding...' : 'Add'}
            </Button>
          </div>
        </div>

        <div className="rounded border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Ticker</TableHead>
                <TableHead className="text-xs">CIK</TableHead>
                <TableHead className="text-xs">Dep</TableHead>
                <TableHead className="text-xs">Interval</TableHead>
                <TableHead className="text-xs">Last Poll</TableHead>
                <TableHead className="text-xs">Next Check</TableHead>
                <TableHead className="w-20"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => {
                const isEditing = editingId === item.id;
                return (
                  <TableRow key={item.id}>
                    <TableCell className="text-xs font-medium">{item.ticker}</TableCell>
                    <TableCell className="font-mono text-xs">
                      {isEditing ? (
                        <Input
                          value={editCik}
                          onChange={(e) => setEditCik(e.target.value)}
                          placeholder="CIK"
                          className="h-7 text-xs"
                        />
                      ) : (
                        <span className="text-neutral-500">{item.cik || '\u2014'}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs">
                      {isEditing ? (
                        <Select value={editDep} onValueChange={setEditDep}>
                          <SelectTrigger className="h-7 w-20 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="0.3">0.3</SelectItem>
                            <SelectItem value="0.6">0.6</SelectItem>
                            <SelectItem value="1.0">1.0</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        item.dependency
                      )}
                    </TableCell>
                    <TableCell className="text-xs">
                      {isEditing ? (
                        <Input
                          type="number"
                          value={editInterval}
                          onChange={(e) => setEditInterval(e.target.value)}
                          className="h-7 w-16 text-xs"
                        />
                      ) : (
                        `${item.poll_interval_hours}h`
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-neutral-400">
                      {item.last_poll_at
                        ? new Date(item.last_poll_at).toLocaleString()
                        : 'never'}
                    </TableCell>
                    <TableCell className="text-xs text-neutral-400">
                      {item.next_check_in_at
                        ? new Date(item.next_check_in_at).toLocaleString()
                        : '\u2014'}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {isEditing ? (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => saveEdit(item.id, item.ticker)}
                              disabled={saving}
                              className="h-7 w-7 p-0"
                            >
                              <Check className="h-3.5 w-3.5 text-green-600" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={cancelEdit}
                              disabled={saving}
                              className="h-7 w-7 p-0"
                            >
                              <X className="h-3.5 w-3.5 text-neutral-400" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => startEdit(item)}
                              className="h-7 w-7 p-0"
                            >
                              <Pencil className="h-3.5 w-3.5 text-neutral-400" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeTicker(item.id, item.ticker)}
                              className="h-7 w-7 p-0"
                            >
                              <Trash2 className="h-3.5 w-3.5 text-neutral-400" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-xs text-neutral-400">
                    No tickers in watchlist.
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
