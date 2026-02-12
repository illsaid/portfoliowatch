'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings } from 'lucide-react';
import { ThermostatsTab } from './thermostats-tab';
import { PolicyTab } from './policy-tab';
import { WatchlistTab } from './watchlist-tab';
import { TrialsTab } from './trials-tab';
import { NotificationsTab } from './notifications-tab';
import { PollRunsTab } from './poll-runs-tab';
import { DiagnosticsTab } from './diagnostics-tab';
import { RubricVersionsTab } from './rubric-versions-tab';
import { SourceHealthTab } from './source-health-tab';
import { AdminAuthPanel } from './admin-auth-panel';

export default function AdminPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Settings className="h-5 w-5 text-neutral-400" />
        <h1 className="text-lg font-semibold text-neutral-900">Admin Panel</h1>
      </div>

      <AdminAuthPanel />

      <Tabs defaultValue="thermostats" className="w-full">
        <TabsList className="flex flex-wrap">
          <TabsTrigger value="thermostats" className="text-xs">Controls</TabsTrigger>
          <TabsTrigger value="policy" className="text-xs">Policy</TabsTrigger>
          <TabsTrigger value="rubric" className="text-xs">Rubric</TabsTrigger>
          <TabsTrigger value="watchlist" className="text-xs">Watchlist</TabsTrigger>
          <TabsTrigger value="trials" className="text-xs">Trials</TabsTrigger>
          <TabsTrigger value="notifications" className="text-xs">Notify</TabsTrigger>
          <TabsTrigger value="pollruns" className="text-xs">Poll Runs</TabsTrigger>
          <TabsTrigger value="sourcehealth" className="text-xs">Sources</TabsTrigger>
          <TabsTrigger value="diagnostics" className="text-xs">Diagnostics</TabsTrigger>
        </TabsList>

        <TabsContent value="thermostats">
          <ThermostatsTab />
        </TabsContent>
        <TabsContent value="policy">
          <PolicyTab />
        </TabsContent>
        <TabsContent value="rubric">
          <RubricVersionsTab />
        </TabsContent>
        <TabsContent value="watchlist">
          <WatchlistTab />
        </TabsContent>
        <TabsContent value="trials">
          <TrialsTab />
        </TabsContent>
        <TabsContent value="notifications">
          <NotificationsTab />
        </TabsContent>
        <TabsContent value="pollruns">
          <PollRunsTab />
        </TabsContent>
        <TabsContent value="sourcehealth">
          <SourceHealthTab />
        </TabsContent>
        <TabsContent value="diagnostics">
          <DiagnosticsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
