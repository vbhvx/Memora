import { pool } from '@/db/client';

export interface SearchOptions {
  q?: string;
  folderId?: string;
  tag?: string;
  pinned?: boolean;
  archived?: boolean;
  sort?: 'rank' | 'updated' | 'created' | 'title';
  page?: number;
  limit?: number;
}

export interface SearchResultItem {
  id: string;
  title: string;
  excerpt: string;
  plainText: string;
  folderId: string | null;
  folderName: string | null;
  isPinned: boolean;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  version: number;
  rank: number;
}

export class SearchService {
  static async searchNotes(userId: string, options: SearchOptions) {
    const q = (options.q || '').trim();
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(100, Math.max(1, options.limit || 20));
    const offset = (page - 1) * limit;

    const conditions: string[] = ['n.owner_id = $1', 'n.deleted_at IS NULL'];
    const params: unknown[] = [userId];
    let paramIdx = 2;

    if (options.folderId) {
      if (options.folderId === 'inbox') {
        conditions.push('n.folder_id IS NULL');
      } else {
        conditions.push(`n.folder_id = $${paramIdx}`);
        params.push(options.folderId);
        paramIdx++;
      }
    }

    if (options.pinned !== undefined) {
      conditions.push(`n.is_pinned = $${paramIdx}`);
      params.push(options.pinned);
      paramIdx++;
    }

    if (options.archived !== undefined) {
      if (options.archived) {
        conditions.push('n.archived_at IS NOT NULL');
      } else {
        conditions.push('n.archived_at IS NULL');
      }
    }

    if (options.tag) {
      conditions.push(`EXISTS (
        SELECT 1 FROM note_tags nt 
        JOIN tags t ON nt.tag_id = t.id 
        WHERE nt.note_id = n.id AND (t.id = $${paramIdx} OR LOWER(t.name) = LOWER($${paramIdx}))
      )`);
      params.push(options.tag);
      paramIdx++;
    }

    let selectRank = '0.0 AS rank';
    let selectExcerpt = 'SUBSTRING(n.plain_text FROM 1 FOR 150) AS excerpt';
    let orderBy = 'n.updated_at DESC';

    if (q) {
      params.push(q);
      const queryParamIdx = paramIdx;
      paramIdx++;

      // Use PostgreSQL plainto_tsquery for natural words, plus ILIKE matching
      conditions.push(`(
        to_tsvector('english', coalesce(n.title, '') || ' ' || coalesce(n.plain_text, '')) @@ plainto_tsquery('english', $${queryParamIdx})
        OR n.title ILIKE '%' || $${queryParamIdx} || '%'
        OR n.plain_text ILIKE '%' || $${queryParamIdx} || '%'
      )`);

      selectRank = `(
        ts_rank_cd(to_tsvector('english', coalesce(n.title, '') || ' ' || coalesce(n.plain_text, '')), plainto_tsquery('english', $${queryParamIdx}))
        + (CASE WHEN n.title ILIKE '%' || $${queryParamIdx} || '%' THEN 1.0 ELSE 0.0 END)
      ) AS rank`;

      selectExcerpt = `ts_headline('english', coalesce(n.plain_text, n.title), plainto_tsquery('english', $${queryParamIdx}), 'StartSel=<mark>, StopSel=</mark>, MaxWords=35, MinWords=15') AS excerpt`;

      if (options.sort === 'rank' || !options.sort) {
        orderBy = 'rank DESC, n.updated_at DESC';
      }
    }

    if (options.sort === 'updated') {
      orderBy = 'n.updated_at DESC';
    } else if (options.sort === 'created') {
      orderBy = 'n.created_at DESC';
    } else if (options.sort === 'title') {
      orderBy = 'n.title ASC';
    }

    const whereClause = conditions.join(' AND ');

    // Count query
    const countQuery = `
      SELECT COUNT(*) as total
      FROM notes n
      WHERE ${whereClause}
    `;
    const countRes = await pool.query(countQuery, params);
    const total = parseInt(countRes.rows[0]?.total || '0', 10);

    // Results query
    const resultsQuery = `
      SELECT 
        n.id,
        n.title,
        n.plain_text as "plainText",
        n.folder_id as "folderId",
        f.name as "folderName",
        n.is_pinned as "isPinned",
        n.archived_at as "archivedAt",
        n.created_at as "createdAt",
        n.updated_at as "updatedAt",
        n.version,
        ${selectExcerpt},
        ${selectRank}
      FROM notes n
      LEFT JOIN folders f ON n.folder_id = f.id
      WHERE ${whereClause}
      ORDER BY ${orderBy}
      LIMIT $${paramIdx} OFFSET $${paramIdx + 1}
    `;

    params.push(limit, offset);
    const resultsRes = await pool.query(resultsQuery, params);

    return {
      results: resultsRes.rows as SearchResultItem[],
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}

