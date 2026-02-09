'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { adminHeaders } from './admin-helpers';
import { toast } from '@/hooks/use-toast';

export function PolicyTab() {
  const [yamlText, setYamlText] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/admin/policy')
      .then((r) => r.json())
      .then((data) => {
        if (data?.yaml_text) setYamlText(data.yaml_text);
      });
  }, []);

  async function save() {
    setSaving(true);

    try {
      const res = await fetch('/api/admin/policy', {
        method: 'PUT',
        headers: adminHeaders(),
        body: JSON.stringify({ yaml_text: yamlText }),
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

      const data = await res.json();

      if (!res.ok) {
        toast({ title: data.error || 'Policy save failed', variant: 'destructive' });
      } else {
        toast({ title: 'Policy updated' });
      }
    } catch {
      toast({ title: 'Failed to save policy', variant: 'destructive' });
    }
    setSaving(false);
  }

  return (
    <Card className="border-neutral-200">
      <CardHeader>
        <CardTitle className="text-sm font-medium">Policy Editor (YAML)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Textarea
          value={yamlText}
          onChange={(e) => setYamlText(e.target.value)}
          className="min-h-[400px] font-mono text-xs"
          placeholder="Enter policy YAML..."
        />

        <div className="flex items-center gap-3">
          <Button onClick={save} disabled={saving} size="sm">
            {saving ? 'Validating & Saving...' : 'Save Policy'}
          </Button>
        </div>

        <p className="text-xs text-neutral-400">
          Every rule must have an <code className="font-mono">id</code> and{' '}
          <code className="font-mono">label</code> field.
        </p>
      </CardContent>
    </Card>
  );
}
