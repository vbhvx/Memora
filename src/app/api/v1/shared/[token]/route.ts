import { NextRequest, NextResponse } from 'next/server';
import { formatErrorResponse } from '@/server/errors/api-error';
import { ShareService } from '@/server/services/share-service';

export async function GET(req: NextRequest, { params }: { params: { token: string } }) {
  try {
    const data = await ShareService.getSharedNote(params.token);
    // Explicit cache-control: no-store to prevent leakage in shared caches
    const res = NextResponse.json(data);
    res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.headers.set('Pragma', 'no-cache');
    res.headers.set('Expires', '0');
    return res;
  } catch (err) {
    return formatErrorResponse(err);
  }
}

