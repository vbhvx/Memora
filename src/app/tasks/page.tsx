'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { AppShell } from '@/components/layout/AppShell';
import { apiFetch } from '@/lib/api-client';
import {
  CheckSquare,
  Square,
  Plus,
  Calendar,
  User as UserIcon,
  ExternalLink,
  Trash2,
  Filter,
} from 'lucide-react';

interface TaskItem {
  id: string;
  title: string;
  description: string | null;
  status: 'todo' | 'in_progress' | 'done';
  priority: 'low' | 'medium' | 'high';
  dueAt: string | null;
  assigneeName: string | null;
  sourceNoteId: string | null;
  createdAt: string;
  sourceNote?: {
    id: string;
    title: string;
  } | null;
}

export default function TasksPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');

  // New task form state
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newPriority, setNewPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [newAssignee, setNewAssignee] = useState('');
  const [newDueDate, setNewDueDate] = useState('');

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  const loadTasks = async () => {
    setLoading(true);
    try {
      const qParams = new URLSearchParams();
      if (statusFilter !== 'all') qParams.set('status', statusFilter);
      if (priorityFilter !== 'all') qParams.set('priority', priorityFilter);

      const res = await apiFetch<{ tasks: TaskItem[] }>(`/api/v1/tasks?${qParams.toString()}`);
      setTasks(res.tasks);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadTasks();
    }
  }, [user, statusFilter, priorityFilter]);

  const handleToggleStatus = async (task: TaskItem) => {
    const nextStatus = task.status === 'done' ? 'todo' : 'done';
    try {
      const res = await apiFetch<{ task: TaskItem }>(`/api/v1/tasks/${task.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: nextStatus }),
      });
      setTasks((prev) => prev.map((t) => (t.id === task.id ? res.task : t)));
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await apiFetch(`/api/v1/tasks/${taskId}`, { method: 'DELETE' });
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    try {
      const res = await apiFetch<{ task: TaskItem }>('/api/v1/tasks', {
        method: 'POST',
        body: JSON.stringify({
          title: newTitle.trim(),
          priority: newPriority,
          assigneeName: newAssignee.trim() || null,
          dueAt: newDueDate ? new Date(newDueDate).toISOString() : null,
        }),
      });

      setTasks([res.task, ...tasks]);
      setNewTitle('');
      setNewAssignee('');
      setNewDueDate('');
      setIsAdding(false);
    } catch (err: any) {
      alert(`Failed to create task: ${err.message}`);
    }
  };

  if (isLoading || !user) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto px-4 py-8 sm:px-6 space-y-6">
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Tasks & Action Items</h1>
            <p className="text-xs text-slate-500 mt-1">
              Review and manage tasks extracted from notes or created manually.
            </p>
          </div>
          <button
            onClick={() => setIsAdding(!isAdding)}
            className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow hover:bg-indigo-700 transition"
          >
            <Plus className="h-4 w-4" />
            <span>New Task</span>
          </button>
        </div>

        {/* Create Manual Task Form */}
        {isAdding && (
          <form
            onSubmit={handleCreateTask}
            className="bg-white rounded-xl border border-indigo-200 p-4 shadow-sm space-y-3"
          >
            <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-900">
              Create New Task
            </h3>
            <div>
              <input
                type="text"
                autoFocus
                placeholder="What needs to be done?"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="text-slate-500 block mb-1">Priority</label>
                <select
                  value={newPriority}
                  onChange={(e) => setNewPriority(e.target.value as any)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 focus:outline-none"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              <div>
                <label className="text-slate-500 block mb-1">Assignee</label>
                <input
                  type="text"
                  placeholder="e.g. Priya"
                  value={newAssignee}
                  onChange={(e) => setNewAssignee(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs text-slate-700 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-slate-500 block mb-1">Due Date</label>
                <input
                  type="datetime-local"
                  value={newDueDate}
                  onChange={(e) => setNewDueDate(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs text-slate-700 focus:outline-none"
                />
              </div>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                type="submit"
                className="bg-indigo-600 text-white px-4 py-1.5 rounded-lg text-xs font-semibold hover:bg-indigo-700"
              >
                Add Task
              </button>
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="text-xs text-slate-500 hover:text-slate-700 px-3 py-1.5"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* Filters */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs bg-white p-3 rounded-xl border border-slate-200">
          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-semibold flex items-center gap-1">
              <Filter className="h-3.5 w-3.5" /> Status:
            </span>
            <div className="flex gap-1">
              {(['all', 'todo', 'in_progress', 'done'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-2.5 py-1 rounded capitalize ${
                    statusFilter === s
                      ? 'bg-indigo-50 text-indigo-700 font-semibold'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {s.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-semibold">Priority:</span>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="border-none bg-transparent text-xs font-medium text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="all">All Priorities</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>

        {/* Tasks List */}
        {loading ? (
          <div className="py-12 text-center text-slate-400 text-sm">Loading tasks...</div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100 shadow-xs overflow-hidden">
            {tasks.map((task) => (
              <div
                key={task.id}
                className={`p-4 flex items-start justify-between gap-3 hover:bg-slate-50/60 transition ${
                  task.status === 'done' ? 'bg-slate-50/40 opacity-75' : ''
                }`}
              >
                <div className="flex items-start gap-3 min-w-0">
                  <button
                    onClick={() => handleToggleStatus(task)}
                    className="mt-0.5 text-slate-400 hover:text-indigo-600 transition"
                  >
                    {task.status === 'done' ? (
                      <CheckSquare className="h-4 w-4 text-emerald-600" />
                    ) : (
                      <Square className="h-4 w-4 text-slate-400" />
                    )}
                  </button>

                  <div className="space-y-1 min-w-0">
                    <span
                      className={`text-sm font-medium ${
                        task.status === 'done'
                          ? 'line-through text-slate-400'
                          : 'text-slate-800'
                      }`}
                    >
                      {task.title}
                    </span>

                    {task.description && (
                      <p className="text-xs text-slate-500">{task.description}</p>
                    )}

                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 pt-0.5">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${
                          task.priority === 'high'
                            ? 'bg-red-50 text-red-700'
                            : task.priority === 'low'
                            ? 'bg-slate-100 text-slate-600'
                            : 'bg-amber-50 text-amber-700'
                        }`}
                      >
                        {task.priority}
                      </span>

                      {task.assigneeName && (
                        <span className="flex items-center gap-1 text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                          <UserIcon className="h-2.5 w-2.5 text-slate-400" />
                          <span>{task.assigneeName}</span>
                        </span>
                      )}

                      {task.dueAt && (
                        <span className="flex items-center gap-1 text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                          <Calendar className="h-2.5 w-2.5 text-slate-400" />
                          <span>{new Date(task.dueAt).toLocaleDateString()}</span>
                        </span>
                      )}

                      {task.sourceNote && (
                        <Link
                          href={`/notes/${task.sourceNote.id}`}
                          className="flex items-center gap-1 text-indigo-600 hover:underline font-medium"
                        >
                          <ExternalLink className="h-2.5 w-2.5" />
                          <span>From: {task.sourceNote.title}</span>
                        </Link>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleDeleteTask(task.id)}
                  className="p-1 text-slate-300 hover:text-red-500 transition"
                  title="Delete task"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}

            {tasks.length === 0 && (
              <div className="p-12 text-center text-slate-400 text-xs space-y-2">
                <CheckSquare className="h-8 w-8 text-slate-300 mx-auto" />
                <p>No tasks found.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}

