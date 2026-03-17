import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/server/auth/guard';
import { formatErrorResponse } from '@/server/errors/api-error';
import { updateTaskSchema } from '@/server/validation/schemas';
import { TaskService } from '@/server/services/task-service';

export async function PATCH(req: NextRequest, { params }: { params: { taskId: string } }) {
  try {
    const user = await requireAuth(req);
    const body = await req.json();
    const data = updateTaskSchema.parse(body);

    const updated = await TaskService.updateTask(user.id, params.taskId, data);
    return NextResponse.json({ task: updated });
  } catch (err) {
    return formatErrorResponse(err);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { taskId: string } }) {
  try {
    const user = await requireAuth(req);
    const res = await TaskService.deleteTask(user.id, params.taskId);
    return NextResponse.json(res);
  } catch (err) {
    return formatErrorResponse(err);
  }
}

