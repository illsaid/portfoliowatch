'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertTriangle, Clock, Search, Timer } from 'lucide-react';
import Link from 'next/link';

interface DailyStateData {
  state: string;
  summary: string;
  top_detection_id: string | null;
}

interface DetectionData {
  id: string;
  ticker: string;
  title: string;
  change_type: string;
  source_tier: string;
  url: string | null;
  score_final: number;
  detected_at: string;
}

interface CheckInData {
  last_poll_at: string | null;
  next_check_in_at: string | null;
}

export default function PausePage() {
  const [state, setState] = useState<DailyStateData | null>(null);
  const [topDetection, setTopDetection] = useState<DetectionData | null>(null);
  const [checkIn, setCheckIn] = useState<CheckInData | null>(null);
  const [cooldownEnd, setCooldownEnd] = useState<number | null>(null);
  const [remaining, setRemaining] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const stateRes = await fetch('/api/state');
        const stateData = await stateRes.json();
        setState(stateData);

        if (stateData.top_detection_id) {
          const today = new Date().toISOString().split('T')[0];
          const detRes = await fetch(`/api/detections?date=${today}&limit=50`);
          const detections = await detRes.json();
          const top = detections.find((d: DetectionData) => d.id === stateData.top_detection_id);
          if (top) setTopDetection(top);
        }

        const wlRes = await fetch('/api/admin/watchlist');
        const wl = await wlRes.json();
        if (wl.length > 0) {
          setCheckIn({
            last_poll_at: wl[0].last_poll_at,
            next_check_in_at: wl[0].next_check_in_at,
          });
        }
      } catch {
        // ignore
      }
      setLoading(false);
    }
    load();
  }, []);

  useEffect(() => {
    if (!cooldownEnd) return;
    const interval = setInterval(() => {
      const diff = cooldownEnd - Date.now();
      if (diff <= 0) {
        setRemaining('0:00');
        clearInterval(interval);
        return;
      }
      const mins = Math.floor(diff / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      setRemaining(`${mins}:${secs.toString().padStart(2, '0')}`);
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldownEnd]);

  const startCooldown = useCallback(() => {
    setCooldownEnd(Date.now() + 20 * 60 * 1000);
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-neutral-400">
        Loading...
      </div>
    );
  }

  if (!state || state.state !== 'Pause') {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center text-center">
        <div className="rounded-full bg-teal-50 p-3">
          <Clock className="h-6 w-6 text-teal-600" />
        </div>
        <p className="mt-4 text-sm text-neutral-600">
          No active triage — your portfolio is contained.
        </p>
        <Link
          href="/"
          className="mt-3 text-xs font-medium text-teal-600 hover:text-teal-700"
        >
          &larr; Back to dashboard
        </Link>
      </div>
    );
  }

  const lastCheckStr = checkIn?.last_poll_at
    ? new Date(checkIn.last_poll_at).toLocaleString()
    : 'never';
  const nextCheckStr = checkIn?.next_check_in_at
    ? new Date(checkIn.next_check_in_at).toLocaleString()
    : 'not scheduled';

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-2">
        <div className="rounded-full bg-red-100 p-1.5">
          <AlertTriangle className="h-4 w-4 text-red-600" />
        </div>
        <h1 className="text-lg font-semibold text-neutral-900">Pause — Triage Mode</h1>
      </div>

      <Tabs defaultValue="step1" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="step1" className="text-xs">1. Event</TabsTrigger>
          <TabsTrigger value="step2" className="text-xs">2. Cause</TabsTrigger>
          <TabsTrigger value="step3" className="text-xs">3. Next</TabsTrigger>
          <TabsTrigger value="step4" className="text-xs">4. Cooldown</TabsTrigger>
        </TabsList>

        <TabsContent value="step1">
          <Card className="border-red-100">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-neutral-700">
                What triggered this
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {topDetection ? (
                <>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{topDetection.ticker}</Badge>
                    <span className="text-sm text-neutral-700">{topDetection.title}</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-neutral-500">
                    <span>Type: {topDetection.change_type.replace(/_/g, ' ')}</span>
                    <span>Score: {topDetection.score_final}</span>
                  </div>
                  {topDetection.url && (
                    <a
                      href={topDetection.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-teal-600 hover:text-teal-700"
                    >
                      View source &rarr;
                    </a>
                  )}
                </>
              ) : (
                <p className="text-sm text-neutral-500">
                  Market shock or hard alert triggered — detection details unavailable.
                </p>
              )}
              <div className="rounded bg-neutral-50 p-2 text-xs text-neutral-500">
                <p>We last checked at: {lastCheckStr}</p>
                <p>Next check at: {nextCheckStr}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="step2">
          <Card className="border-neutral-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-1.5 text-sm font-medium text-neutral-700">
                <Search className="h-4 w-4" />
                Likely cause
              </CardTitle>
            </CardHeader>
            <CardContent>
              {topDetection ? (
                <div className="space-y-2">
                  <div className="rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                    <p className="font-medium">Most likely: {topDetection.change_type.replace(/_/g, ' ')}</p>
                    <p className="mt-1 text-xs">{topDetection.title}</p>
                  </div>
                  <p className="text-xs text-neutral-500">
                    This is a deterministic assessment based on detected filings and data changes.
                    No interpretation of outcomes is provided.
                  </p>
                </div>
              ) : (
                <div className="rounded border border-neutral-200 bg-neutral-50 p-3 text-sm text-neutral-600">
                  Cause unknown — awaiting data. The next poll may clarify.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="step3">
          <Card className="border-neutral-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-1.5 text-sm font-medium text-neutral-700">
                <Clock className="h-4 w-4" />
                Next signal
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-neutral-600">
                The next data point is expected at the next scheduled check-in.
              </p>
              <div className="rounded bg-neutral-50 p-3 text-sm">
                <p className="font-medium text-neutral-700">Next check: {nextCheckStr}</p>
                <p className="mt-1 text-xs text-neutral-500">
                  You can also trigger a manual poll from the Admin panel.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="step4">
          <Card className="border-neutral-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-1.5 text-sm font-medium text-neutral-700">
                <Timer className="h-4 w-4" />
                20-minute cooldown
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-center">
              {cooldownEnd ? (
                <>
                  <p className="text-4xl font-bold tabular-nums text-neutral-800">{remaining}</p>
                  <p className="text-sm text-neutral-500">
                    Step away. The next data point arrives at the scheduled check-in.
                  </p>
                  {remaining === '0:00' && (
                    <p className="text-sm font-medium text-teal-600">
                      Cooldown complete. You can check back now.
                    </p>
                  )}
                </>
              ) : (
                <>
                  <p className="text-sm text-neutral-600">
                    Take a 20-minute break before making any decisions.
                    No new data will appear faster by watching.
                  </p>
                  <Button
                    onClick={startCooldown}
                    className="bg-neutral-900 text-white hover:bg-neutral-800"
                  >
                    Start 20-minute cooldown
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Link
        href="/"
        className="inline-block text-xs font-medium text-neutral-500 hover:text-neutral-700"
      >
        &larr; Back to dashboard
      </Link>
    </div>
  );
}
