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
  Clock,
  Plus,
  Calendar,
  User as UserIcon,
  ExternalLink,
  Trash2,
  Filter,
  Edit2,
  Check,
  X,
  Layers,
  AlertCircle,
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
  const [viewMode, setViewMode] = useState<'grouped' | 'list'>('grouped');

  // New task form state
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newPriority, setNewPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [newAssignee, setNewAssignee] = useState('');
  const [newDueDate, setNewDueDate] = useState('');

  // Inline editing state
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editPriority, setEditPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [editDueDate, setEditDueDate] = useState('');

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

  const handleCycleStatus = async (task: TaskItem) => {
    let nextStatus: TaskItem['status'] = 'todo';
    if (task.status === 'todo') nextStatus = 'in_progress';
    else if (task.status === 'in_progress') nextStatus = 'done';
    else nextStatus = 'todo';

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

  const handleStartEdit = (task: TaskItem) => {
    setEditingTaskId(task.id);
    setEditTitle(task.title);
    setEditPriority(task.priority);
    setEditDueDate(task.dueAt ? new Date(task.dueAt).toISOString().slice(0, 16) : '');
  };

  const handleCancelEdit = () => {
    setEditingTaskId(null);
    setEditTitle('');
    setEditDueDate('');
  };

  const handleSaveEdit = async (taskId: string) => {
    if (!editTitle.trim()) return;

    try {
      const res = await apiFetch<{ task: TaskItem }>(`/api/v1/tasks/${taskId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          title: editTitle.trim(),
          priority: editPriority,
          dueAt: editDueDate ? new Date(editDueDate).toISOString() : null,
        }),
      });
      setTasks((prev) => prev.map((t) => (t.id === taskId ? res.task : t)));
      setEditingTaskId(null);
    } catch (err: any) {
      alert(`Failed to update task: ${err.message}`);
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

  // Grouping helper
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  const overdueTasks: TaskItem[] = [];
  const dueTodayTasks: TaskItem[] = [];
  const upcomingTasks: TaskItem[] = [];
  const noDateTasks: TaskItem[] = [];

  tasks.forEach((t) => {
    if (!t.dueAt) {
      noDateTasks.push(t);
    } else {
      const dueDate = new Date(t.dueAt);
      if (dueDate < startOfToday && t.status !== 'done') {
        overdueTasks.push(t);
      } else if (dueDate >= startOfToday && dueDate <= endOfToday) {
        dueTodayTasks.push(t);
      } else {
        upcomingTasks.push(t);
      }
    }
  });

  const taskSections = [
    {
      id: 'overdue',
      title: 'Overdue',
      icon: AlertCircle,
      badgeColor: 'bg-neutral-900 text-white',
      tasks: overdueTasks,
      showAlways: false,
    },
    {
      id: 'today',
      title: 'Due Today',
      icon: Clock,
      badgeColor: 'bg-neutral-800 text-white',
      tasks: dueTodayTasks,
      showAlways: true,
    },
    {
      id: 'upcoming',
      title: 'Upcoming',
      icon: Calendar,
      badgeColor: 'bg-neutral-200 text-neutral-800',
      tasks: upcomingTasks,
      showAlways: true,
    },
    {
      id: 'no_date',
      title: 'No Due Date',
      icon: Layers,
      badgeColor: 'bg-neutral-100 text-neutral-600',
      tasks: noDateTasks,
      showAlways: true,
    },
  ];

  const renderTaskRow = (task: TaskItem) => {
    const isEditing = editingTaskId === task.id;

    if (isEditing) {
      return (
        <div key={task.id} className="p-3 bg-neutral-50 space-y-2 border-l-2 border-black">
          <input
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            className="w-full text-sm font-medium px-2 py-1 border border-neutral-300 rounded focus:outline-none focus:ring-1 focus:ring-black bg-white"
            autoFocus
          />
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <select
              value={editPriority}
              onChange={(e) => setEditPriority(e.target.value as any)}
              className="px-2 py-1 border border-neutral-300 rounded bg-white text-xs"
            >
              <option value="low">Low Priority</option>
              <option value="medium">Medium Priority</option>
              <option value="high">High Priority</option>
            </select>
            <input
              type="datetime-local"
              value={editDueDate}
              onChange={(e) => setEditDueDate(e.target.value)}
              className="px-2 py-1 border border-neutral-300 rounded bg-white text-xs"
            />
            <div className="ml-auto flex items-center gap-1">
              <button
                onClick={() => handleSaveEdit(task.id)}
                className="flex items-center gap-1 bg-black text-white px-2.5 py-1 rounded text-xs hover:bg-neutral-800 transition"
              >
                <Check className="h-3 w-3" /> Save
              </button>
              <button
                onClick={handleCancelEdit}
                className="flex items-center gap-1 text-neutral-500 hover:text-black px-2 py-1 rounded text-xs transition"
              >
                <X className="h-3 w-3" /> Cancel
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div
        key={task.id}
        className={`p-3.5 flex items-start justify-between gap-3 hover:bg-neutral-50/80 transition ${
          task.status === 'done' ? 'bg-neutral-50/40 opacity-70' : ''
        }`}
      >
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <button
            onClick={() => handleCycleStatus(task)}
            className="mt-0.5 text-neutral-400 hover:text-black transition"
            title={`Status: ${task.status.replace('_', ' ')} (Click to advance)`}
          >
            {task.status === 'done' ? (
              <CheckSquare className="h-4 w-4 text-black" />
            ) : task.status === 'in_progress' ? (
              <div className="h-4 w-4 rounded border border-neutral-900 flex items-center justify-center bg-neutral-900 text-white">
                <span className="h-1.5 w-1.5 bg-white rounded-full animate-pulse" />
              </div>
            ) : (
              <Square className="h-4 w-4 text-neutral-400" />
            )}
          </button>

          <div className="space-y-1 min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span
                className={`text-sm font-medium ${
                  task.status === 'done'
                    ? 'line-through text-neutral-400'
                    : 'text-neutral-900'
                }`}
              >
                {task.title}
              </span>
              {task.status === 'in_progress' && (
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.2 rounded bg-neutral-100 text-neutral-800 border border-neutral-200">
                  In Progress
                </span>
              )}
            </div>

            {task.description && (
              <p className="text-xs text-neutral-500">{task.description}</p>
            )}

            <div className="flex flex-wrap items-center gap-2 text-[11px] text-neutral-500 pt-0.5">
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${
                  task.priority === 'high'
                    ? 'bg-black text-white'
                    : task.priority === 'low'
                    ? 'bg-neutral-100 text-neutral-600 border border-neutral-200'
                    : 'bg-neutral-200 text-neutral-800'
                }`}
              >
                {task.priority}
              </span>

              {task.assigneeName && (
                <span className="flex items-center gap-1 text-neutral-700 bg-neutral-100 px-1.5 py-0.5 rounded border border-neutral-200">
                  <UserIcon className="h-2.5 w-2.5 text-neutral-500" />
                  <span>{task.assigneeName}</span>
                </span>
              )}

              {task.dueAt && (
                <span className="flex items-center gap-1 text-neutral-700 bg-neutral-100 px-1.5 py-0.5 rounded border border-neutral-200">
                  <Calendar className="h-2.5 w-2.5 text-neutral-500" />
                  <span>{new Date(task.dueAt).toLocaleDateString()}</span>
                </span>
              )}

              {task.sourceNote && (
                <Link
                  href={`/notes/${task.sourceNote.id}`}
                  className="flex items-center gap-1 text-neutral-800 hover:underline hover:text-black font-medium"
                >
                  <ExternalLink className="h-2.5 w-2.5" />
                  <span>From: {task.sourceNote.title}</span>
                </Link>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 opacity-70 hover:opacity-100 transition">
          <button
            onClick={() => handleStartEdit(task)}
            className="p-1 text-neutral-400 hover:text-black transition"
            title="Edit task"
          >
            <Edit2 className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => handleDeleteTask(task.id)}
            className="p-1 text-neutral-400 hover:text-black transition"
            title="Delete task"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    );
  };

  if (isLoading || !user) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto px-4 py-8 sm:px-6 space-y-6">
        <div className="flex items-center justify-between border-b border-neutral-200 pb-4">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">Tasks & Action Items</h1>
            <p className="text-xs text-neutral-500 mt-1">
              Review and manage tasks extracted from notes or created manually.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode(viewMode === 'grouped' ? 'list' : 'grouped')}
              className="flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 transition"
              title="Toggle view grouping"
            >
              <Layers className="h-3.5 w-3.5" />
              <span>{viewMode === 'grouped' ? 'Grouped View' : 'Flat List'}</span>
            </button>

            <button
              onClick={() => setIsAdding(!isAdding)}
              className="flex items-center gap-1.5 rounded-lg bg-black px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-neutral-800 transition"
            >
              <Plus className="h-4 w-4" />
              <span>New Task</span>
            </button>
          </div>
        </div>

        {/* Create Manual Task Form */}
        {isAdding && (
          <form
            onSubmit={handleCreateTask}
            className="bg-white rounded-xl border border-neutral-300 p-4 shadow-sm space-y-3"
          >
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-900">
              Create New Task
            </h3>
            <div>
              <input
                type="text"
                autoFocus
                placeholder="What needs to be done?"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:outline-none focus:ring-1 focus:ring-black"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="text-neutral-500 block mb-1">Priority</label>
                <select
                  value={newPriority}
                  onChange={(e) => setNewPriority(e.target.value as any)}
                  className="w-full rounded-lg border border-neutral-300 bg-white px-2 py-1.5 text-xs text-neutral-800 focus:outline-none cursor-pointer"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              <div>
                <label className="text-neutral-500 block mb-1">Assignee</label>
                <input
                  type="text"
                  placeholder="e.g. Priya"
                  value={newAssignee}
                  onChange={(e) => setNewAssignee(e.target.value)}
                  className="w-full rounded-lg border border-neutral-300 px-2 py-1.5 text-xs text-neutral-800 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-neutral-500 block mb-1">Due Date</label>
                <input
                  type="datetime-local"
                  value={newDueDate}
                  onChange={(e) => setNewDueDate(e.target.value)}
                  className="w-full rounded-lg border border-neutral-300 px-2 py-1.5 text-xs text-neutral-800 focus:outline-none"
                />
              </div>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                type="submit"
                className="bg-black text-white px-4 py-1.5 rounded-lg text-xs font-semibold hover:bg-neutral-800 transition"
              >
                Add Task
              </button>
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="text-xs text-neutral-500 hover:text-black px-3 py-1.5 transition"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* Filters */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs bg-white p-3 rounded-xl border border-neutral-200">
          <div className="flex items-center gap-2">
            <span className="text-neutral-500 font-semibold flex items-center gap-1">
              <Filter className="h-3.5 w-3.5" /> Status:
            </span>
            <div className="flex gap-1">
              {(['all', 'todo', 'in_progress', 'done'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-2.5 py-1 rounded capitalize transition ${
                    statusFilter === s
                      ? 'bg-neutral-900 text-white font-semibold'
                      : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
                  }`}
                >
                  {s.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-neutral-500 font-semibold">Priority:</span>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="border-none bg-transparent text-xs font-medium text-neutral-800 focus:outline-none cursor-pointer"
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
          <div className="py-12 text-center text-neutral-400 text-sm">Loading tasks...</div>
        ) : tasks.length === 0 ? (
          <div className="bg-white rounded-xl border border-neutral-200 p-12 text-center text-neutral-400 text-xs space-y-2">
            <CheckSquare className="h-8 w-8 text-neutral-300 mx-auto" />
            <p>No tasks found.</p>
          </div>
        ) : viewMode === 'list' ? (
          <div className="bg-white rounded-xl border border-neutral-200 divide-y divide-neutral-100 shadow-xs overflow-hidden">
            {tasks.map(renderTaskRow)}
          </div>
        ) : (
          <div className="space-y-6">
            {taskSections.map((section) => {
              if (section.tasks.length === 0 && !section.showAlways) return null;
              if (section.tasks.length === 0 && section.id === 'overdue') return null;

              const Icon = section.icon;

              return (
                <div key={section.id} className="space-y-2">
                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-neutral-500" />
                      <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-800">
                        {section.title}
                      </h2>
                      <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${section.badgeColor}`}>
                        {section.tasks.length}
                      </span>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl border border-neutral-200 divide-y divide-neutral-100 shadow-xs overflow-hidden">
                    {section.tasks.length === 0 ? (
                      <div className="py-4 text-center text-xs text-neutral-400 italic">
                        No tasks in this section
                      </div>
                    ) : (
                      section.tasks.map(renderTaskRow)
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
