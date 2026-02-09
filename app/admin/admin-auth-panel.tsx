'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Lock, Unlock } from 'lucide-react';
import { getAdminSecret, setAdminSecret, clearAdminSecret } from './admin-helpers';

export function AdminAuthPanel() {
  const [secret, setSecret] = useState('');
  const [isUnlocked, setIsUnlocked] = useState(false);

  useEffect(() => {
    const stored = getAdminSecret();
    setIsUnlocked(!!stored);
  }, []);

  const handleUnlock = () => {
    if (!secret.trim()) return;
    setAdminSecret(secret);
    setIsUnlocked(true);
    setSecret('');
  };

  const handleLock = () => {
    clearAdminSecret();
    setIsUnlocked(false);
    setSecret('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isUnlocked) {
      handleUnlock();
    }
  };

  return (
    <Card className="border-neutral-200 bg-neutral-50">
      <CardContent className="pt-6">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 flex-1">
            {isUnlocked ? (
              <>
                <Unlock className="h-5 w-5 text-green-600" />
                <span className="text-sm font-medium text-green-700">Admin Access Unlocked</span>
              </>
            ) : (
              <>
                <Lock className="h-5 w-5 text-amber-600" />
                <span className="text-sm font-medium text-amber-700">Admin Access Locked</span>
              </>
            )}
          </div>

          {!isUnlocked ? (
            <div className="flex items-center gap-2">
              <Input
                type="password"
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Enter admin secret"
                className="w-64"
              />
              <Button onClick={handleUnlock} disabled={!secret.trim()} size="sm">
                Unlock
              </Button>
            </div>
          ) : (
            <Button onClick={handleLock} variant="outline" size="sm">
              Lock
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
