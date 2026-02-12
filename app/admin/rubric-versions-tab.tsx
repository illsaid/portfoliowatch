'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { adminHeaders } from './admin-helpers';
import { toast } from '@/hooks/use-toast';
import { Plus, Check } from 'lucide-react';

interface RubricVersion {
  id: string;
  version_name: string;
  effective_at: string;
  weights_json: Record<string, unknown>;
  threshold_alert: number;
  panic_sensitivity: number;
  suppression_strictness: string;
  reason: string | null;
  is_active: boolean;
  created_at: string;
}

export function RubricVersionsTab() {
  const [versions, setVersions] = useState<RubricVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [activating, setActivating] = useState<string | null>(null);

  const [newName, setNewName] = useState('');
  const [newThreshold, setNewThreshold] = useState(60);
  const [newPanic, setNewPanic] = useState(-20);
  const [newStrictness, setNewStrictness] = useState('high');
  const [newWeights, setNewWeights] = useState('{}');
  const [newReason, setNewReason] = useState('');

  useEffect(() => {
    loadVersions();
  }, []);

  async function loadVersions() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/rubric-versions');
      const data = await res.json();
      if (Array.isArray(data)) {
        setVersions(data);
      }
    } catch {
      toast({ title: 'Failed to load rubric versions', variant: 'destructive' });
    }
    setLoading(false);
  }

  function copyFromActive() {
    const active = versions.find(v => v.is_active);
    if (active) {
      setNewThreshold(active.threshold_alert);
      setNewPanic(active.panic_sensitivity);
      setNewStrictness(active.suppression_strictness);
      setNewWeights(JSON.stringify(active.weights_json, null, 2));
    }
  }

  async function createVersion() {
    if (!newName.trim()) {
      toast({ title: 'Version name required', variant: 'destructive' });
      return;
    }

    let parsedWeights: Record<string, unknown>;
    try {
      parsedWeights = JSON.parse(newWeights);
    } catch {
      toast({ title: 'Invalid JSON in weights', variant: 'destructive' });
      return;
    }

    setCreating(true);
    try {
      const res = await fetch('/api/admin/rubric-versions', {
        method: 'POST',
        headers: adminHeaders(),
        body: JSON.stringify({
          version_name: newName.trim(),
          weights_json: parsedWeights,
          threshold_alert: newThreshold,
          panic_sensitivity: newPanic,
          suppression_strictness: newStrictness,
          reason: newReason || null,
        }),
      });

      if (res.status === 401) {
        toast({ title: 'Authentication failed', description: 'Unlock admin access above', variant: 'destructive' });
        setCreating(false);
        return;
      }

      const data = await res.json();
      if (!res.ok) {
        toast({ title: data.error || 'Create failed', variant: 'destructive' });
      } else {
        toast({ title: 'Rubric version created' });
        setShowCreate(false);
        setNewName('');
        setNewReason('');
        loadVersions();
      }
    } catch {
      toast({ title: 'Failed to create version', variant: 'destructive' });
    }
    setCreating(false);
  }

  async function activateVersion(id: string) {
    setActivating(id);
    try {
      const res = await fetch('/api/admin/rubric-versions', {
        method: 'PATCH',
        headers: adminHeaders(),
        body: JSON.stringify({ id, action: 'activate' }),
      });

      if (res.status === 401) {
        toast({ title: 'Authentication failed', description: 'Unlock admin access above', variant: 'destructive' });
        setActivating(null);
        return;
      }

      const data = await res.json();
      if (!res.ok) {
        toast({ title: data.error || 'Activation failed', variant: 'destructive' });
      } else {
        toast({ title: 'Rubric version activated' });
        loadVersions();
      }
    } catch {
      toast({ title: 'Failed to activate version', variant: 'destructive' });
    }
    setActivating(null);
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  return (
    <Card className="border-neutral-200">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-medium">Rubric Versions</CardTitle>
        <Button size="sm" variant="outline" onClick={() => setShowCreate(!showCreate)}>
          <Plus className="h-4 w-4 mr-1" />
          New Version
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {showCreate && (
          <div className="border border-neutral-200 rounded-lg p-4 space-y-4 bg-neutral-50">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">Create New Version</h3>
              <Button size="sm" variant="ghost" onClick={copyFromActive}>
                Copy from Active
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs">Version Name</Label>
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g., v2"
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Reason</Label>
                <Input
                  value={newReason}
                  onChange={(e) => setNewReason(e.target.value)}
                  placeholder="Why this change?"
                  className="h-8 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-xs">Alert Threshold</Label>
                <Input
                  type="number"
                  value={newThreshold}
                  onChange={(e) => setNewThreshold(parseInt(e.target.value) || 0)}
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Panic Sensitivity</Label>
                <Input
                  type="number"
                  value={newPanic}
                  onChange={(e) => setNewPanic(parseInt(e.target.value) || 0)}
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Suppression Strictness</Label>
                <Select value={newStrictness} onValueChange={setNewStrictness}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="med">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Weights JSON</Label>
              <Textarea
                value={newWeights}
                onChange={(e) => setNewWeights(e.target.value)}
                className="min-h-[100px] font-mono text-xs"
                placeholder="{}"
              />
            </div>

            <div className="flex gap-2">
              <Button size="sm" onClick={createVersion} disabled={creating}>
                {creating ? 'Creating...' : 'Create Version'}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowCreate(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {loading ? (
          <p className="text-sm text-neutral-500">Loading...</p>
        ) : versions.length === 0 ? (
          <p className="text-sm text-neutral-500">No rubric versions found.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Name</TableHead>
                <TableHead className="text-xs">Effective</TableHead>
                <TableHead className="text-xs">Threshold</TableHead>
                <TableHead className="text-xs">Panic</TableHead>
                <TableHead className="text-xs">Strictness</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {versions.map((v) => (
                <TableRow key={v.id}>
                  <TableCell className="text-sm font-medium">{v.version_name}</TableCell>
                  <TableCell className="text-xs text-neutral-500">{formatDate(v.effective_at)}</TableCell>
                  <TableCell className="text-sm">{v.threshold_alert}</TableCell>
                  <TableCell className="text-sm">{v.panic_sensitivity}</TableCell>
                  <TableCell className="text-sm">{v.suppression_strictness}</TableCell>
                  <TableCell>
                    {v.is_active ? (
                      <Badge variant="default" className="bg-emerald-600 text-xs">Active</Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs">Inactive</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {!v.is_active && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => activateVersion(v.id)}
                        disabled={activating === v.id}
                        className="h-7 text-xs"
                      >
                        <Check className="h-3 w-3 mr-1" />
                        {activating === v.id ? 'Activating...' : 'Activate'}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
