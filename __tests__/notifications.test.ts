import { describe, it, expect } from 'vitest';
import { shouldNotify } from '../lib/engine/notifications';
import type { NotificationSettings } from '../lib/engine/types';

function makeSettings(overrides: Partial<NotificationSettings> = {}): NotificationSettings {
  return {
    id: '1',
    user_id: 'default',
    channel: 'email',
    email: 'test@example.com',
    daily_push_enabled: true,
    pause_push_enabled: true,
    quiet_push_enabled: false,
    last_sent_at: null,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

describe('notification rate limiting', () => {
  it('does not send when channel is none', () => {
    expect(shouldNotify('Watch', 'Contained', makeSettings({ channel: 'none' }))).toBe(false);
  });

  it('sends on upward state transition', () => {
    expect(shouldNotify('Watch', 'Contained', makeSettings())).toBe(true);
  });

  it('does not send when state stays the same', () => {
    expect(shouldNotify('Watch', 'Watch', makeSettings())).toBe(false);
  });

  it('does not send when state goes down', () => {
    expect(shouldNotify('Contained', 'Watch', makeSettings())).toBe(false);
  });

  it('enforces 24-hour rate limit', () => {
    const recentSend = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    expect(
      shouldNotify('Watch', 'Contained', makeSettings({ last_sent_at: recentSend }))
    ).toBe(false);
  });

  it('allows send after 24 hours', () => {
    const oldSend = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
    expect(
      shouldNotify('Watch', 'Contained', makeSettings({ last_sent_at: oldSend }))
    ).toBe(true);
  });

  it('Pause bypasses rate limit when pause_push_enabled', () => {
    const recentSend = new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString();
    expect(
      shouldNotify('Pause', 'Watch', makeSettings({ last_sent_at: recentSend, pause_push_enabled: true }))
    ).toBe(true);
  });

  it('does not send for non-Pause when daily_push disabled', () => {
    expect(
      shouldNotify('Watch', 'Contained', makeSettings({ daily_push_enabled: false }))
    ).toBe(false);
  });

  it('sends for Pause even when daily_push disabled', () => {
    expect(
      shouldNotify('Pause', 'Contained', makeSettings({ daily_push_enabled: false, pause_push_enabled: true }))
    ).toBe(true);
  });
});
