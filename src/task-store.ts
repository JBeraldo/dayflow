export type Recurrence = "none" | "daily" | "weekly" | "monthly";

export interface Task {
  id: string;
  title: string;
  date: string;
  recurrence: Recurrence;
  createdAt: string;
}

export interface TaskOccurrence {
  task: Task;
  date: string;
  key: string;
  completed: boolean;
}

interface StoredTasks {
  tasks: Task[];
  completedOccurrences: string[];
}

const STORAGE_KEY = "dayflow.tasks.v1";

export function localDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function parseLocalDate(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);

  return new Date(year, month - 1, day, 12);
}

export function addDays(value: string, amount: number): string {
  const date = parseLocalDate(value);
  date.setDate(date.getDate() + amount);

  return localDateString(date);
}

export function startOfWeek(value: string): string {
  const date = parseLocalDate(value);
  const dayFromMonday = (date.getDay() + 6) % 7;

  return addDays(value, -dayFromMonday);
}

export function monthGridStart(value: string): string {
  const date = parseLocalDate(value);
  const firstDay = localDateString(new Date(date.getFullYear(), date.getMonth(), 1, 12));

  return startOfWeek(firstDay);
}

export function occurrenceKey(taskId: string, date: string): string {
  return `${taskId}@${date}`;
}

export function isScheduledOn(task: Task, date: string): boolean {
  if (date < task.date) {
    return false;
  }

  if (task.recurrence === "none") {
    return date === task.date;
  }

  const taskDate = parseLocalDate(task.date);
  const occurrenceDate = parseLocalDate(date);

  if (task.recurrence === "daily") {
    return true;
  }

  if (task.recurrence === "weekly") {
    return taskDate.getDay() === occurrenceDate.getDay();
  }

  return taskDate.getDate() === occurrenceDate.getDate();
}

export function loadTasks(): StoredTasks {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { tasks: [], completedOccurrences: [] };
    }

    const parsed = JSON.parse(raw) as Partial<StoredTasks>;

    return {
      tasks: Array.isArray(parsed.tasks) ? parsed.tasks : [],
      completedOccurrences: Array.isArray(parsed.completedOccurrences)
        ? parsed.completedOccurrences
        : [],
    };
  } catch {
    return { tasks: [], completedOccurrences: [] };
  }
}

export function saveTasks(value: StoredTasks): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
}

export function getOccurrences(
  tasks: Task[],
  completedOccurrences: Set<string>,
  from: string,
  to: string,
): TaskOccurrence[] {
  const occurrences: TaskOccurrence[] = [];

  for (const task of tasks) {
    const firstDate = task.date > from ? task.date : from;

    for (let date = firstDate; date <= to; date = addDays(date, 1)) {
      if (!isScheduledOn(task, date)) {
        continue;
      }

      const key = occurrenceKey(task.id, date);
      occurrences.push({ task, date, key, completed: completedOccurrences.has(key) });
    }
  }

  return occurrences.sort((left, right) =>
    left.date.localeCompare(right.date) || left.task.title.localeCompare(right.task.title),
  );
}

export function getCarriedOccurrences(
  tasks: Task[],
  completedOccurrences: Set<string>,
  date: string,
): TaskOccurrence[] {
  const lookbackStart = addDays(date, -3650);

  return getOccurrences(tasks, completedOccurrences, lookbackStart, addDays(date, -1))
    .filter((occurrence) => !occurrence.completed)
    .sort((left, right) => left.date.localeCompare(right.date));
}
