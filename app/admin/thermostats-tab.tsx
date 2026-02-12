'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { adminHeaders } from './admin-helpers';
import { toast } from '@/hooks/use-toast';
import { Zap, Scale, Shield } from 'lucide-react';

const presets = {
  calm: { threshold: 70, strictness: 'high', sensitivity: '-25' },
  balanced: { threshold: 55, strictness: 'med', sensitivity: '-20' },
  paranoid: { threshold: 40, strictness: 'low', sensitivity: '-15' },
};

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

  function applyPreset(name: keyof typeof presets) {
    const preset = presets[name];
    setThreshold(preset.threshold);
    setStrictness(preset.strictness);
    setSensitivity(preset.sensitivity);
  }

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
        <CardTitle className="text-sm font-medium">Risk Controls</CardTitle>
        <CardDescription className="text-xs">
          Adjust how aggressively Portfolio Watchman alerts you. Higher thresholds and stricter
          suppression mean fewer alerts. Lower thresholds and looser suppression mean more
          sensitivity to changes.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          <Label className="text-xs font-medium">Quick Presets</Label>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => applyPreset('calm')}
              className="text-xs"
            >
              <Shield className="h-3 w-3 mr-1.5" />
              Calm
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => applyPreset('balanced')}
              className="text-xs"
            >
              <Scale className="h-3 w-3 mr-1.5" />
              Balanced
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => applyPreset('paranoid')}
              className="text-xs"
            >
              <Zap className="h-3 w-3 mr-1.5" />
              Paranoid
            </Button>
          </div>
          <p className="text-xs text-neutral-400">
            Calm: Fewer alerts, high noise filter. Balanced: Default settings. Paranoid: More
            alerts, lower thresholds.
          </p>
        </div>

        <div className="border-t border-neutral-100 pt-6 space-y-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium">Alert Threshold</Label>
              <span className="text-xs font-mono text-neutral-600">{threshold}</span>
            </div>
            <Slider
              value={[threshold]}
              onValueChange={(v) => setThreshold(v[0])}
              min={20}
              max={100}
              step={1}
            />
            <p className="text-xs text-neutral-400">
              Score required to trigger Look state. Higher = fewer alerts.
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-medium">Suppression Strictness</Label>
            <Select value={strictness} onValueChange={setStrictness}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low (show more)</SelectItem>
                <SelectItem value="med">Medium (balanced)</SelectItem>
                <SelectItem value="high">High (hide more)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-neutral-400">
              How aggressively to hide low-value noise. High = quieter experience.
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-medium">Panic Sensitivity</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={sensitivity}
                onChange={(e) => setSensitivity(e.target.value)}
                className="w-24"
              />
              <span className="text-xs text-neutral-500">% gap</span>
            </div>
            <p className="text-xs text-neutral-400">
              Market gap that triggers immediate Pause. Example: -20 means a 20% drop.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Switch checked={feedbackLoop} onCheckedChange={setFeedbackLoop} />
            <div>
              <Label className="text-xs font-medium">Feedback Loop</Label>
              <p className="text-xs text-neutral-400">
                Log when suppressed items have significant price moves (miss detection).
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <Button onClick={save} disabled={saving} size="sm">
            {saving ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
