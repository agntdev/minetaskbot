// Durable in-memory store for tasks and reminders.
// In production, swap this for Redis-backed storage via the toolkit.
// The test harness gets a fresh bot per spec, so this map is clean per test.

export interface Task {
  id: string;
  title: string;
  description: string;
  startTimestamp: number;
  estimatedDuration: string;
  progressPercent: number;
  status: "pending" | "in-progress" | "completed";
  history: Array<{ timestamp: number; note: string }>;
}

export interface Reminder {
  id: string;
  taskId: string;
  time: number;
  repeat: "none" | "daily" | "weekly";
}

// Per-user task storage (userId → tasks)
const taskStore = new Map<string, Task[]>();
// Per-user reminder storage (userId → reminders)
const reminderStore = new Map<string, Reminder[]>();
// Per-user ID counters
const idCounters = new Map<string, number>();

function nextId(userId: string, prefix: string): string {
  const current = idCounters.get(userId) ?? 0;
  idCounters.set(userId, current + 1);
  return `${prefix}${current + 1}`;
}

export function addTask(userId: string, data: Omit<Task, "id" | "startTimestamp" | "progressPercent" | "status" | "history">): Task {
  const tasks = taskStore.get(userId) ?? [];
  const task: Task = {
    id: nextId(userId, "T"),
    title: data.title,
    description: data.description,
    estimatedDuration: data.estimatedDuration,
    startTimestamp: Date.now(),
    progressPercent: 0,
    status: "pending",
    history: [{ timestamp: Date.now(), note: "Task created" }],
  };
  tasks.push(task);
  taskStore.set(userId, tasks);
  return task;
}

export function getTasks(userId: string): Task[] {
  return taskStore.get(userId) ?? [];
}

export function getTask(userId: string, taskId: string): Task | undefined {
  return getTasks(userId).find((t) => t.id === taskId);
}

export function updateTask(userId: string, taskId: string, updates: Partial<Pick<Task, "status" | "progressPercent" | "title" | "description" | "estimatedDuration">>): Task | undefined {
  const tasks = getTasks(userId);
  const task = tasks.find((t) => t.id === taskId);
  if (!task) return undefined;
  if (updates.status !== undefined) task.status = updates.status;
  if (updates.progressPercent !== undefined) task.progressPercent = updates.progressPercent;
  if (updates.title !== undefined) task.title = updates.title;
  if (updates.description !== undefined) task.description = updates.description;
  if (updates.estimatedDuration !== undefined) task.estimatedDuration = updates.estimatedDuration;
  task.history.push({ timestamp: Date.now(), note: `Updated: ${Object.keys(updates).join(", ")}` });
  return task;
}

export function deleteTask(userId: string, taskId: string): boolean {
  const tasks = getTasks(userId);
  const idx = tasks.findIndex((t) => t.id === taskId);
  if (idx < 0) return false;
  tasks.splice(idx, 1);
  taskStore.set(userId, tasks);
  // Also remove associated reminders
  const reminders = reminderStore.get(userId) ?? [];
  const filtered = reminders.filter((r) => r.taskId !== taskId);
  reminderStore.set(userId, filtered);
  return true;
}

export function addReminder(userId: string, data: Omit<Reminder, "id">): Reminder {
  const reminders = reminderStore.get(userId) ?? [];
  const reminder: Reminder = {
    id: nextId(userId, "R"),
    taskId: data.taskId,
    time: data.time,
    repeat: data.repeat,
  };
  reminders.push(reminder);
  reminderStore.set(userId, reminders);
  return reminder;
}

export function getReminders(userId: string): Reminder[] {
  return reminderStore.get(userId) ?? [];
}

export function getDueReminders(userId: string, now: number): Reminder[] {
  return getReminders(userId).filter((r) => r.time <= now);
}

export function removeReminder(userId: string, reminderId: string): void {
  const reminders = reminderStore.get(userId) ?? [];
  reminderStore.set(userId, reminders.filter((r) => r.id !== reminderId));
}

export function clearStores(): void {
  taskStore.clear();
  reminderStore.clear();
  idCounters.clear();
}
