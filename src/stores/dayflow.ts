import { defineStore } from "pinia";
import {
  addDays,
  getCarriedOccurrences,
  getOccurrences,
  loadTasks,
  localDateString,
  monthGridStart,
  parseLocalDate,
  saveTasks,
  startOfWeek,
  type Recurrence,
  type StoredTasks,
  type Task,
  type TaskOccurrence,
  type TaskWorkspace,
} from "../task-store";

export type CalendarView = "day" | "week" | "month";

export const viewLabels: Record<CalendarView, string> = {
  day: "Dia",
  week: "Semana",
  month: "Mês",
};

const CREATE_WORKSPACE_OPTION = "__create_workspace__";
const THEME_STORAGE_KEY = "dayflow.theme.v1";

function readDarkMode(): boolean {
  try {
    return localStorage.getItem(THEME_STORAGE_KEY) === "dark";
  } catch {
    return false;
  }
}

export const useDayflowStore = defineStore("dayflow", {
  state: () => {
    const today = localDateString(new Date());
    return {
      workspaceStore: loadTasks(),
      isDarkMode: readDarkMode(),
      today,
      selectedDate: today,
      view: "day" as CalendarView,
      isComposerOpen: false,
      isWorkspaceComposerOpen: false,
      newTaskTitle: "",
      quickTaskTitle: "",
      newTaskDate: today,
      newTaskRecurrence: "none" as Recurrence,
      newWorkspaceName: "",
      workspaceError: "",
    };
  },
  getters: {
    workspaces(state): TaskWorkspace[] {
      return state.workspaceStore.workspaces;
    },
    activeWorkspace(state): TaskWorkspace {
      return state.workspaceStore.workspaces.find(
        (workspace) => workspace.id === state.workspaceStore.activeWorkspaceId,
      ) ?? state.workspaceStore.workspaces[0];
    },
    currentWorkspaceData(state) {
      return state.workspaceStore.workspaceData[state.workspaceStore.activeWorkspaceId];
    },
    tasks(): Task[] {
      return this.currentWorkspaceData.tasks;
    },
    completedOccurrences(): Set<string> {
      return new Set(this.currentWorkspaceData.completedOccurrences);
    },
    skippedDates(): Set<string> {
      return new Set(this.currentWorkspaceData.skippedDates);
    },
    weekdaysOnly(): boolean {
      return this.currentWorkspaceData.weekdaysOnly;
    },
    selected(): Date {
      return parseLocalDate(this.selectedDate);
    },
    dayLabel(): string {
      return this.selected.toLocaleDateString("pt-BR", {
        weekday: "long",
        day: "numeric",
        month: "long",
      });
    },
    periodLabel(): string {
      if (this.view === "day") {
        return this.selected.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
      }
      if (this.view === "week") {
        const start = parseLocalDate(startOfWeek(this.selectedDate));
        const end = addDays(localDateString(start), this.weekdaysOnly ? 4 : 6);
        return `${start.toLocaleDateString("pt-BR", { day: "numeric", month: "short" })} – ${parseLocalDate(end).toLocaleDateString("pt-BR", { day: "numeric", month: "short", year: "numeric" })}`;
      }
      return this.selected.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
    },
    weekDays(): string[] {
      return Array.from(
        { length: this.weekdaysOnly ? 5 : 7 },
        (_, index) => addDays(startOfWeek(this.selectedDate), index),
      );
    },
    monthDays(): string[] {
      const first = monthGridStart(this.selectedDate);
      return Array.from({ length: 42 }, (_, index) => addDays(first, index));
    },
    visibleRange(): [string, string] {
      if (this.view === "week") {
        return [this.weekDays[0], this.weekDays[this.weekDays.length - 1]];
      }
      if (this.view === "month") {
        return [this.monthDays[0], this.monthDays[41]];
      }
      return [this.selectedDate, this.selectedDate];
    },
    visibleOccurrences(): TaskOccurrence[] {
      return getOccurrences(
        this.tasks,
        this.completedOccurrences,
        this.visibleRange[0],
        this.visibleRange[1],
        { weekdaysOnly: this.weekdaysOnly, skippedDates: this.skippedDates },
      );
    },
    carriedOccurrences(): TaskOccurrence[] {
      return getCarriedOccurrences(this.tasks, this.completedOccurrences, this.selectedDate, {
        weekdaysOnly: this.weekdaysOnly,
        skippedDates: this.skippedDates,
      });
    },
    dayOccurrences(): TaskOccurrence[] {
      return this.visibleOccurrences.filter((occurrence) => occurrence.date === this.selectedDate);
    },
    remainingCount(): number {
      return this.skippedDates.has(this.selectedDate)
        ? 0
        : this.dayOccurrences.filter((occurrence) => !occurrence.completed).length + this.carriedOccurrences.length;
    },
    nextActiveDate(): string {
      let date = addDays(this.selectedDate, 1);
      while (
        this.skippedDates.has(date) ||
        (this.weekdaysOnly && [0, 6].includes(parseLocalDate(date).getDay()))
      ) {
        date = addDays(date, 1);
      }
      return date;
    },
  },
  actions: {
    persistTasks(): void {
      saveTasks(this.workspaceStore as StoredTasks);
    },
    persistTheme(): void {
      try {
        localStorage.setItem(THEME_STORAGE_KEY, this.isDarkMode ? "dark" : "light");
      } catch {
        // Theme still applies for this session when storage is unavailable.
      }
    },
    setWeekdaysOnly(enabled: boolean): void {
      this.currentWorkspaceData.weekdaysOnly = enabled;
    },
    setView(view: CalendarView): void {
      this.view = view;
    },
    setSelectedDate(date: string): void {
      this.selectedDate = date;
    },
    isDateSkipped(date: string): boolean {
      return this.skippedDates.has(date);
    },
    occurrencesFor(date: string): TaskOccurrence[] {
      return this.visibleOccurrences.filter((occurrence) => occurrence.date === date);
    },
    occurrencesForCalendarDate(date: string): TaskOccurrence[] {
      if (this.isDateSkipped(date)) {
        return [];
      }
      if (date !== this.today) {
        return this.occurrencesFor(date).filter((occurrence) => !occurrence.task.parentId);
      }
      return [
        ...getCarriedOccurrences(this.tasks, this.completedOccurrences, date, {
          weekdaysOnly: this.weekdaysOnly,
          skippedDates: this.skippedDates,
        }),
        ...this.occurrencesFor(date),
      ].filter((occurrence) => !occurrence.task.parentId);
    },
    formatDate(value: string, options: Intl.DateTimeFormatOptions): string {
      return parseLocalDate(value).toLocaleDateString("pt-BR", options);
    },
    isSameMonth(value: string): boolean {
      const date = parseLocalDate(value);
      return date.getMonth() === this.selected.getMonth() && date.getFullYear() === this.selected.getFullYear();
    },
    movePeriod(amount: number): void {
      if (this.view === "day") {
        this.selectedDate = addDays(this.selectedDate, amount);
      } else if (this.view === "week") {
        this.selectedDate = addDays(this.selectedDate, amount * 7);
      } else {
        const date = parseLocalDate(this.selectedDate);
        const dayOfMonth = date.getDate();
        const nextMonth = new Date(date.getFullYear(), date.getMonth() + amount, 1, 12);
        const lastDay = new Date(nextMonth.getFullYear(), nextMonth.getMonth() + 1, 0, 12).getDate();
        nextMonth.setDate(Math.min(dayOfMonth, lastDay));
        this.selectedDate = localDateString(nextMonth);
      }
    },
    openComposer(): void {
      this.newTaskTitle = "";
      this.newTaskDate = this.selectedDate;
      this.newTaskRecurrence = "none";
      this.isComposerOpen = true;
    },
    createTask(): void {
      const title = this.newTaskTitle.trim();
      if (!title) return;
      this.tasks.push({
        id: crypto.randomUUID(),
        title,
        date: this.newTaskDate,
        recurrence: this.newTaskRecurrence,
        createdAt: new Date().toISOString(),
      });
      this.selectedDate = this.newTaskDate;
      this.view = "day";
      this.isComposerOpen = false;
    },
    createQuickTask(): void {
      const title = this.quickTaskTitle.trim();
      if (!title) return;
      this.tasks.push({
        id: crypto.randomUUID(),
        title,
        date: this.selectedDate,
        recurrence: "none",
        createdAt: new Date().toISOString(),
      });
      this.quickTaskTitle = "";
    },
    createSubtask(parent: Task, title: string): void {
      const cleanTitle = title.trim();
      const parentTask = this.tasks.find((task) => task.id === parent.id);
      if (!cleanTitle || !parentTask) return;
      const parentIndex = this.tasks.indexOf(parentTask);
      let insertIndex = parentIndex + 1;
      while (this.tasks[insertIndex]?.parentId === parent.id) insertIndex += 1;
      this.tasks.splice(insertIndex, 0, {
        id: crypto.randomUUID(),
        title: cleanTitle,
        date: parent.date,
        recurrence: parent.recurrence,
        createdAt: new Date().toISOString(),
        parentId: parent.id,
      });
    },
    openWorkspaceComposer(): void {
      this.newWorkspaceName = "";
      this.workspaceError = "";
      this.isWorkspaceComposerOpen = true;
    },
    selectWorkspace(workspaceId: string): void {
      if (!this.workspaces.some((workspace) => workspace.id === workspaceId)) return;
      this.workspaceStore.activeWorkspaceId = workspaceId;
      this.selectedDate = this.today;
      this.view = "day";
    },
    createWorkspace(): boolean {
      const name = this.newWorkspaceName.trim();
      if (!name) return false;
      const duplicate = this.workspaces.some(
        (workspace) => workspace.name.trim().toLocaleLowerCase("pt-BR") === name.toLocaleLowerCase("pt-BR"),
      );
      if (duplicate) {
        this.workspaceError = "Já existe um espaço de trabalho com esse nome.";
        return false;
      }
      const workspace = { id: crypto.randomUUID(), name };
      this.workspaceStore.workspaces.push(workspace);
      this.workspaceStore.workspaceData[workspace.id] = {
        tasks: [],
        completedOccurrences: [],
        skippedDates: [],
        weekdaysOnly: false,
      };
      this.selectWorkspace(workspace.id);
      this.isWorkspaceComposerOpen = false;
      return true;
    },
    toggleSkippedDay(): void {
      const next = new Set(this.skippedDates);
      if (next.has(this.selectedDate)) next.delete(this.selectedDate);
      else next.add(this.selectedDate);
      this.currentWorkspaceData.skippedDates = [...next];
    },
    toggleOccurrence(occurrence: TaskOccurrence): void {
      const next = new Set(this.completedOccurrences);
      if (next.has(occurrence.key)) next.delete(occurrence.key);
      else next.add(occurrence.key);
      this.currentWorkspaceData.completedOccurrences = [...next];
    },
    deleteTask(task: Task): void {
      const deletedIds = new Set([task.id]);
      let foundChild = true;
      while (foundChild) {
        foundChild = false;
        for (const candidate of this.tasks) {
          if (candidate.parentId && deletedIds.has(candidate.parentId) && !deletedIds.has(candidate.id)) {
            deletedIds.add(candidate.id);
            foundChild = true;
          }
        }
      }
      this.currentWorkspaceData.tasks = this.tasks.filter((candidate) => !deletedIds.has(candidate.id));
      this.currentWorkspaceData.completedOccurrences = this.currentWorkspaceData.completedOccurrences.filter(
        (key) => ![...deletedIds].some((id) => key.startsWith(`${id}@`)),
      );
    },
    reorderTasks(fromTaskId: string, toTaskId: string): void {
      if (fromTaskId === toTaskId) return;
      const reordered = [...this.tasks];
      const fromIndex = reordered.findIndex((task) => task.id === fromTaskId);
      if (fromIndex < 0 || !reordered.some((task) => task.id === toTaskId)) return;
      const [movedTask] = reordered.splice(fromIndex, 1);
      const nextIndex = reordered.findIndex((task) => task.id === toTaskId);
      reordered.splice(nextIndex, 0, movedTask);
      this.currentWorkspaceData.tasks = reordered;
    },
    renameTask(task: Task, title: string): void {
      const savedTask = this.tasks.find((candidate) => candidate.id === task.id);
      if (savedTask && title.trim()) savedTask.title = title.trim();
    },
  },
});

export { CREATE_WORKSPACE_OPTION };
