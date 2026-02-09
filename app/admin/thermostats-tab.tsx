'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { adminHeaders } from './admin-helpers';
import { toast } from '@/hooks/use-toast';

export function ThermostatsTab() {
  const [threshold, setThreshold] = useState(60);
  const [strictness, setStrictness] = useState('high');
  const [sensitivity, setSensitivity] = useState('-20');
  const [feedbackLoop, setFeedbackLoop] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/admin/settings')
      .then((r) => r.json())
      .then((data) => {
        if (data.ALERT_THRESHOLD) setThreshold(parseInt(data.ALERT_THRESHOLD, 10));
        if (data.SUPPRESSION_STRICTNESS) setStrictness(data.SUPPRESSION_STRICTNESS);
        if (data.PANIC_SENSITIVITY) setSensitivity(data.PANIC_SENSITIVITY);
        if (data.FEEDBACK_LOOP) setFeedbackLoop(data.FEEDBACK_LOOP === 'on');
      });
  }, []);

  async function save() {
    setSaving(true);
    const settings = [
      { key: 'ALERT_THRESHOLD', value: String(threshold) },
      { key: 'SUPPRESSION_STRICTNESS', value: strictness },
      { key: 'PANIC_SENSITIVITY', value: sensitivity },
      { key: 'FEEDBACK_LOOP', value: feedbackLoop ? 'on' : 'off' },
    ];

    try {
      for (const s of settings) {
        const res = await fetch('/api/admin/settings', {
          method: 'PUT',
          headers: adminHeaders(),
          body: JSON.stringify(s),
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
      }
      toast({ title: 'Settings saved' });
    } catch {
      toast({ title: 'Failed to save settings', variant: 'destructive' });
    }
    setSaving(false);
  }

  return (
    <Card className="border-neutral-200">
      <CardHeader>
        <CardTitle className="text-sm font-medium">Thermostat Controls</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label className="text-xs">Alert Threshold: {threshold}</Label>
          <Slider
            value={[threshold]}
            onValueChange={(v) => setThreshold(v[0])}
            min={20}
            max={100}
            step={1}
          />
          <p className="text-xs text-neutral-400">
            Detections scoring at or above this trigger Look state.
          </p>
        </div>

        <div className="space-y-2">
          <Label className="text-xs">Suppression Strictness</Label>
          <Select value={strictness} onValueChange={setStrictness}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="med">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-xs">Panic Sensitivity (gap %)</Label>
          <Input
            type="number"
            value={sensitivity}
            onChange={(e) => setSensitivity(e.target.value)}
            className="w-32"
          />
          <p className="text-xs text-neutral-400">
            Market gap at or below this triggers Pause.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Switch checked={feedbackLoop} onCheckedChange={setFeedbackLoop} />
          <Label className="text-xs">Feedback Loop (miss logging)</Label>
        </div>

        <div className="flex items-center gap-3">
          <Button onClick={save} disabled={saving} size="sm">
            {saving ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
