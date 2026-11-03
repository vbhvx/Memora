import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/server/auth/guard';
import { formatErrorResponse } from '@/server/errors/api-error';
import { createTaskSchema } from '@/server/validation/schemas';
import { TaskService } from '@/server/services/task-service';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const { searchParams } = new URL(req.url);

    const status = searchParams.get('status') || undefined;
    const priority = searchParams.get('priority') || undefined;
    const sourceNoteId = searchParams.get('sourceNoteId') || undefined;
    const sort = (searchParams.get('sort') || 'created') as 'due' | 'created' | 'priority';

    const tasksList = await TaskService.listTasks(user.id, {
      status,
      priority,
      sourceNoteId,
      sort,
    });

    return NextResponse.json({ tasks: tasksList });
  } catch (err) {
    return formatErrorResponse(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const body = await req.json();
    const data = createTaskSchema.parse(body);

    const created = await TaskService.createTask(user.id, data);
    return NextResponse.json({ task: created }, { status: 201 });
  } catch (err) {
    return formatErrorResponse(err);
  }
}
