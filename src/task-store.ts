export type Recurrence = "none" | "daily" | "weekly" | "monthly";

export interface Task {
  id: string;
  title: string;
  date: string;
  recurrence: Recurrence;
  createdAt: string;
  parentId?: string;
}

export interface TaskOccurrence {
  task: Task;
  date: string;
  key: string;
  completed: boolean;
}

export interface TaskWorkspace {
  id: string;
  name: string;
}

export interface WorkspaceTaskData {
  tasks: Task[];
  completedOccurrences: string[];
  skippedDates: string[];
  weekdaysOnly: boolean;
}

export interface StoredTasks {
  workspaces: TaskWorkspace[];
  activeWorkspaceId: string;
  workspaceData: Record<string, WorkspaceTaskData>;
}

const STORAGE_KEY = "dayflow.tasks.v1";
const DEFAULT_WORKSPACE: TaskWorkspace = { id: "personal", name: "Pessoal" };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readWorkspaceTaskData(value: unknown): WorkspaceTaskData {
  const data = isRecord(value) ? value : {};

  return {
    tasks: Array.isArray(data.tasks) ? data.tasks as Task[] : [],
    completedOccurrences: Array.isArray(data.completedOccurrences)
      ? data.completedOccurrences.filter((key): key is string => typeof key === "string")
      : [],
    skippedDates: Array.isArray(data.skippedDates)
      ? data.skippedDates.filter((date): date is string => typeof date === "string")
      : [],
    weekdaysOnly: data.weekdaysOnly === true,
  };
}

export function parseStoredTasks(value: unknown): StoredTasks {
  const parsed = isRecord(value) ? value : {};

  if (Array.isArray(parsed.workspaces) && isRecord(parsed.workspaceData)) {
    const workspaces = parsed.workspaces.filter(
      (workspace): workspace is TaskWorkspace =>
        isRecord(workspace) && typeof workspace.id === "string" && typeof workspace.name === "string",
    );

    if (workspaces.length > 0) {
      const activeWorkspaceId = workspaces.some((workspace) => workspace.id === parsed.activeWorkspaceId)
        ? parsed.activeWorkspaceId as string
        : workspaces[0].id;
      const workspaceData = parsed.workspaceData;

      return {
        workspaces,
        activeWorkspaceId,
        workspaceData: Object.fromEntries(
          workspaces.map((workspace) => [workspace.id, readWorkspaceTaskData(workspaceData[workspace.id])]),
        ),
      };
    }
  }

  return {
    workspaces: [DEFAULT_WORKSPACE],
    activeWorkspaceId: DEFAULT_WORKSPACE.id,
    workspaceData: {
      [DEFAULT_WORKSPACE.id]: readWorkspaceTaskData(parsed),
    },
  };
}

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

function isWeekend(date: string): boolean {
  const day = parseLocalDate(date).getDay();
  return day === 0 || day === 6;
}

function nextWeekday(date: string): string {
  let nextDate = date;
  while (isWeekend(nextDate)) {
    nextDate = addDays(nextDate, 1);
  }
  return nextDate;
}

function monthlyDate(taskDate: Date, year: number, month: number): string | null {
  const date = new Date(year, month, taskDate.getDate(), 12);
  if (date.getMonth() !== month) {
    return null;
  }
  return localDateString(date);
}

export function isScheduledOn(task: Task, date: string, weekdaysOnly = false): boolean {
  if (date < task.date) {
    return false;
  }

  if (task.recurrence === "none") {
    return date === (weekdaysOnly ? nextWeekday(task.date) : task.date);
  }

  const taskDate = parseLocalDate(task.date);
  const occurrenceDate = parseLocalDate(date);

  if (task.recurrence === "daily") {
    return !weekdaysOnly || !isWeekend(date);
  }

  if (task.recurrence === "weekly") {
    if (!weekdaysOnly) {
      return taskDate.getDay() === occurrenceDate.getDay();
    }

    for (let scheduledDate = task.date; scheduledDate <= date; scheduledDate = addDays(scheduledDate, 7)) {
      if (nextWeekday(scheduledDate) === date) {
        return true;
      }
    }
    return false;
  }

  if (!weekdaysOnly) {
    return taskDate.getDate() === occurrenceDate.getDate();
  }

  for (let year = taskDate.getFullYear(), month = taskDate.getMonth(); year <= occurrenceDate.getFullYear();) {
    const scheduledDate = monthlyDate(taskDate, year, month);
    if (scheduledDate && nextWeekday(scheduledDate) === date) {
      return true;
    }
    month += 1;
    if (month > 11) {
      month = 0;
      year += 1;
    }
    if (year === occurrenceDate.getFullYear() && month > occurrenceDate.getMonth()) {
      break;
    }
  }
  return false;
}

export function loadTasks(): StoredTasks {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return parseStoredTasks(null);
    }

    return parseStoredTasks(JSON.parse(raw));
  } catch {
    return parseStoredTasks(null);
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
  options: { weekdaysOnly?: boolean; skippedDates?: ReadonlySet<string> } = {},
): TaskOccurrence[] {
  const occurrenceByKey = new Map<string, TaskOccurrence>();
  let adjustedFrom = from;
  while (
    options.skippedDates?.has(addDays(adjustedFrom, -1)) ||
    (options.weekdaysOnly && isWeekend(addDays(adjustedFrom, -1)))
  ) {
    adjustedFrom = addDays(adjustedFrom, -1);
  }

  for (const task of tasks) {
    const firstDate = task.date > adjustedFrom ? task.date : adjustedFrom;

    for (let date = firstDate; date <= to; date = addDays(date, 1)) {
      if (!isScheduledOn(task, date, options.weekdaysOnly)) {
        continue;
      }

      const sourceKey = occurrenceKey(task.id, date);
      if (completedOccurrences.has(sourceKey) && options.skippedDates?.has(date)) {
        continue;
      }
      let occurrenceDate = date;
      if (!completedOccurrences.has(sourceKey)) {
        while (
          options.skippedDates?.has(occurrenceDate) ||
          (options.weekdaysOnly && isWeekend(occurrenceDate))
        ) {
          occurrenceDate = addDays(occurrenceDate, 1);
        }
      }

      if (occurrenceDate < from || occurrenceDate > to) {
        continue;
      }

      const key = occurrenceKey(task.id, occurrenceDate);
      occurrenceByKey.set(key, {
        task,
        date: occurrenceDate,
        key,
        completed: completedOccurrences.has(key),
      });
    }
  }

  const taskOrder = new Map(tasks.map((task, index) => [task.id, index]));
  const occurrences = [...occurrenceByKey.values()];

  return occurrences.sort((left, right) =>
    left.date.localeCompare(right.date) ||
    (taskOrder.get(left.task.id) ?? 0) - (taskOrder.get(right.task.id) ?? 0),
  );
}

export function getCarriedOccurrences(
  tasks: Task[],
  completedOccurrences: Set<string>,
  date: string,
  options: { weekdaysOnly?: boolean; skippedDates?: ReadonlySet<string> } = {},
): TaskOccurrence[] {
  const lookbackStart = addDays(date, -3650);

  const taskOrder = new Map(tasks.map((task, index) => [task.id, index]));

  return getOccurrences(tasks, completedOccurrences, lookbackStart, addDays(date, -1), options)
    .filter((occurrence) => !occurrence.completed)
    .sort((left, right) =>
      (taskOrder.get(left.task.id) ?? 0) - (taskOrder.get(right.task.id) ?? 0),
    );
}
