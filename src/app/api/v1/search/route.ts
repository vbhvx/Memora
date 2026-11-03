import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/server/auth/guard';
import { formatErrorResponse } from '@/server/errors/api-error';
import { searchQuerySchema } from '@/server/validation/schemas';
import { SearchService } from '@/server/services/search-service';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const { searchParams } = new URL(req.url);

    const rawParams = {
      q: searchParams.get('q') || '',
      folderId: searchParams.get('folderId') || undefined,
      tag: searchParams.get('tag') || undefined,
      pinned: searchParams.get('pinned') || undefined,
      archived: searchParams.get('archived') || undefined,
      sort: searchParams.get('sort') || 'rank',
      page: searchParams.get('page') || 1,
      limit: searchParams.get('limit') || 20,
    };

    const parsed = searchQuerySchema.parse(rawParams);

    const searchResults = await SearchService.searchNotes(user.id, {
      q: parsed.q,
      folderId: parsed.folderId,
      tag: parsed.tag,
      pinned: parsed.pinned ? parsed.pinned === 'true' : undefined,
      archived: parsed.archived ? parsed.archived === 'true' : undefined,
      sort: parsed.sort as 'rank' | 'updated' | 'created' | 'title',
      page: parsed.page,
      limit: parsed.limit,
    });

    return NextResponse.json(searchResults);
  } catch (err) {
    return formatErrorResponse(err);
  }
}
