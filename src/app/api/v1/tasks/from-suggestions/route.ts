import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/server/auth/guard';
import { formatErrorResponse } from '@/server/errors/api-error';
import { tasksFromSuggestionsSchema } from '@/server/validation/schemas';
import { TaskService } from '@/server/services/task-service';

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const body = await req.json();
    const data = tasksFromSuggestionsSchema.parse(body);

    const result = await TaskService.createTasksFromSuggestions(
      user.id,
      data.sourceNoteId,
      data.sourceRevisionId,
      data.items
    );

    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    return formatErrorResponse(err);
  }
}

