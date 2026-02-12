import { NextRequest, NextResponse } from 'next/server';

export function verifyAdmin(req: NextRequest): NextResponse | null {
  const adminSecret = process.env.ADMIN_SECRET;
  const cronSecret = process.env.CRON_SECRET;

  const headerAdminSecret = req.headers.get('x-admin-secret');
  const headerCronSecret = req.headers.get('x-cron-secret');
  const urlSecret = new URL(req.url).searchParams.get('secret');

  if (
    (adminSecret && headerAdminSecret === adminSecret) ||
    (cronSecret && headerCronSecret === cronSecret) ||
    (adminSecret && urlSecret === adminSecret)
  ) {
    return null;
  }

  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
