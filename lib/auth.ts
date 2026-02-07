import { NextRequest, NextResponse } from 'next/server';

export function verifyAdmin(req: NextRequest): NextResponse | null {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) return null;

  const headerSecret = req.headers.get('x-admin-secret');
  const urlSecret = new URL(req.url).searchParams.get('secret');

  if (headerSecret === secret || urlSecret === secret) {
    return null;
  }

  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
