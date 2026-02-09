import type { DailyStateEnum, NotificationSettings, DailyState, Detection } from './types';

const STATE_ORDER: Record<DailyStateEnum, number> = {
  Contained: 0,
  Watch: 1,
  Look: 2,
  Pause: 3,
};

export function shouldNotify(
  currentState: DailyStateEnum,
  previousState: DailyStateEnum | null,
  settings: NotificationSettings
): boolean {
  if (settings.channel === 'none') return false;

  const currentOrder = STATE_ORDER[currentState];
  const previousOrder = previousState ? STATE_ORDER[previousState] : 0;

  if (currentOrder <= previousOrder) return false;

  if (currentState === 'Pause' && settings.pause_push_enabled) {
    return true;
  }

  if (settings.last_sent_at) {
    const lastSent = new Date(settings.last_sent_at);
    const hoursSince = (Date.now() - lastSent.getTime()) / (1000 * 60 * 60);
    if (hoursSince < 24) return false;
  }

  if (!settings.daily_push_enabled && currentState !== 'Pause') return false;

  return true;
}

export function shouldNotifyQuietLog(
  quietLogCount: number,
  settings: NotificationSettings,
  threshold = 3
): boolean {
  if (settings.channel === 'none') return false;
  if (!settings.quiet_push_enabled) return false;
  if (quietLogCount <= threshold) return false;

  if (settings.last_sent_at) {
    const lastSent = new Date(settings.last_sent_at);
    const hoursSince = (Date.now() - lastSent.getTime()) / (1000 * 60 * 60);
    if (hoursSince < 24) return false;
  }

  return true;
}

export function buildNotificationContent(
  dailyState: DailyState,
  topDetection: Detection | null
): { subject: string; body: string } {
  const stateLabel = dailyState.state;
  let subject = `Portfolio Watchman: ${stateLabel}`;
  let body = dailyState.summary;

  if (topDetection) {
    subject = `Portfolio Watchman: ${stateLabel} — ${topDetection.ticker}`;
    body = `${dailyState.summary}\n\nTop item: ${topDetection.title}`;
    if (topDetection.url) {
      body += `\nSource: ${topDetection.url}`;
    }
  }

  return { subject, body };
}

export function buildQuietLogNotificationContent(
  quietLogCount: number,
  date: string
): { subject: string; body: string } {
  const subject = `Portfolio Watchman: Quiet Log Alert`;
  const body = `${quietLogCount} items were automatically suppressed or quarantined on ${date}. Review the quiet log to ensure no important signals were missed.`;
  return { subject, body };
}

export async function sendNotification(
  channel: 'email' | 'pwa',
  email: string | null,
  subject: string,
  body: string
): Promise<boolean> {
  if (channel === 'email') {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey || !email) {
      console.log(`[notification] would send email to ${email}: ${subject}`);
      return false;
    }

    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Portfolio Watchman <onboarding@resend.dev>',
          to: [email],
          subject,
          text: body,
        }),
      });
      if (!res.ok) {
        console.error('[notification] email send failed:', await res.text());
        return false;
      }
      return true;
    } catch (err) {
      console.error('[notification] email send failed:', err);
      return false;
    }
  }

  console.log(`[notification] PWA push stub: ${subject}`);
  return false;
}
