'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { adminHeaders } from './admin-helpers';
import { toast } from '@/hooks/use-toast';

export function NotificationsTab() {
  const [channel, setChannel] = useState('none');
  const [email, setEmail] = useState('');
  const [dailyPush, setDailyPush] = useState(false);
  const [pausePush, setPausePush] = useState(true);
  const [quietPush, setQuietPush] = useState(false);
  const [lastSent, setLastSent] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/admin/notifications')
      .then((r) => r.json())
      .then((data) => {
        if (!data) return;
        setChannel(data.channel || 'none');
        setEmail(data.email || '');
        setDailyPush(data.daily_push_enabled ?? false);
        setPausePush(data.pause_push_enabled ?? true);
        setQuietPush(data.quiet_push_enabled ?? false);
        setLastSent(data.last_sent_at);
      });
  }, []);

  async function save() {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/notifications', {
        method: 'PUT',
        headers: adminHeaders(),
        body: JSON.stringify({
          channel,
          email: email || null,
          daily_push_enabled: dailyPush,
          pause_push_enabled: pausePush,
          quiet_push_enabled: quietPush,
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

      toast({ title: 'Notification settings saved' });
    } catch {
      toast({ title: 'Failed to save', variant: 'destructive' });
    }
    setSaving(false);
  }

  return (
    <Card className="border-neutral-200">
      <CardHeader>
        <CardTitle className="text-sm font-medium">Notification Settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label className="text-xs">Channel</Label>
          <Select value={channel} onValueChange={setChannel}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              <SelectItem value="email">Email</SelectItem>
              <SelectItem value="pwa">PWA Push (stub)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {channel === 'email' && (
          <div className="space-y-2">
            <Label className="text-xs">Email Address</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-64"
            />
          </div>
        )}

        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Switch checked={dailyPush} onCheckedChange={setDailyPush} />
            <Label className="text-xs">Daily state change notifications</Label>
          </div>
          <div className="flex items-center gap-3">
            <Switch checked={pausePush} onCheckedChange={setPausePush} />
            <Label className="text-xs">Pause notifications (bypass rate limit)</Label>
          </div>
          <div className="flex items-center gap-3">
            <Switch checked={quietPush} onCheckedChange={setQuietPush} />
            <Label className="text-xs">Quiet log notifications</Label>
          </div>
        </div>

        {lastSent && (
          <p className="text-xs text-neutral-400">
            Last sent: {new Date(lastSent).toLocaleString()}
          </p>
        )}

        <div className="flex items-center gap-3">
          <Button onClick={save} disabled={saving} size="sm">
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>

        <p className="text-xs text-neutral-400">
          Max 1 notification per day unless Pause. If RESEND_API_KEY is not set, email sends are logged but not delivered.
        </p>
      </CardContent>
    </Card>
  );
}
