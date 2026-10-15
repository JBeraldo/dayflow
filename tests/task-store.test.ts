import assert from "node:assert/strict";
import test from "node:test";
import {
  getCarriedOccurrences,
  getOccurrences,
  isScheduledOn,
  parseStoredTasks,
  type Task,
} from "../src/task-store.ts";

const dailyTask: Task = {
  id: "daily",
  title: "Walk",
  date: "2026-10-12",
  recurrence: "daily",
  createdAt: "2026-10-12T09:00:00.000Z",
};

test("one-time tasks only occur on scheduled date", () => {
  const task: Task = { ...dailyTask, recurrence: "none" };

  assert.equal(isScheduledOn(task, "2026-10-12"), true);
  assert.equal(isScheduledOn(task, "2026-10-13"), false);
});

test("weekly and monthly tasks follow original calendar date", () => {
  assert.equal(isScheduledOn({ ...dailyTask, recurrence: "weekly" }, "2026-10-19"), true);
  assert.equal(isScheduledOn({ ...dailyTask, recurrence: "weekly" }, "2026-10-20"), false);
  assert.equal(isScheduledOn({ ...dailyTask, recurrence: "monthly" }, "2026-11-12"), true);
  assert.equal(isScheduledOn({ ...dailyTask, recurrence: "monthly" }, "2026-11-13"), false);
});

test("weekday-only workspaces omit weekend recurrence and move weekend tasks to Monday", () => {
  assert.equal(isScheduledOn(dailyTask, "2026-10-17", true), false);
  assert.equal(isScheduledOn({ ...dailyTask, recurrence: "none", date: "2026-10-17" }, "2026-10-19", true), true);
  assert.deepEqual(
    getOccurrences([dailyTask], new Set(), "2026-10-16", "2026-10-19", { weekdaysOnly: true })
      .map(({ date }) => date),
    ["2026-10-16", "2026-10-19"],
  );
});

test("skipping a day moves its unfinished tasks to the next active day", () => {
  const task = { ...dailyTask, recurrence: "none" as const };
  const skippedDates = new Set(["2026-10-12"]);

  assert.deepEqual(
    getOccurrences([task], new Set(), "2026-10-13", "2026-10-13", { skippedDates })
      .map(({ date, key }) => [date, key]),
    [["2026-10-13", "daily@2026-10-13"]],
  );
});

test("weekday-only skipped tasks move across the weekend to Monday", () => {
  const task = { ...dailyTask, date: "2026-10-16", recurrence: "none" as const };
  const occurrences = getOccurrences([task], new Set(), "2026-10-19", "2026-10-19", {
    weekdaysOnly: true,
    skippedDates: new Set(["2026-10-16"]),
  });

  assert.deepEqual(occurrences.map(({ date }) => date), ["2026-10-19"]);
});

test("unfinished occurrences carry forward while completed ones stay done", () => {
  const occurrences = getCarriedOccurrences(
    [dailyTask],
    new Set(["daily@2026-10-12"]),
    "2026-10-14",
  );

  assert.deepEqual(occurrences.map(({ date }) => date), ["2026-10-13"]);
});

test("occurrence completion is tracked per scheduled date", () => {
  const occurrences = getOccurrences(
    [dailyTask],
    new Set(["daily@2026-10-13"]),
    "2026-10-13",
    "2026-10-14",
  );

  assert.deepEqual(occurrences.map(({ date, completed }) => [date, completed]), [
    ["2026-10-13", true],
    ["2026-10-14", false],
  ]);
});

test("task occurrence order follows the saved task order", () => {
  const tasks = [
    { ...dailyTask, id: "second", title: "Zebra", recurrence: "none" as const },
    { ...dailyTask, id: "first", title: "Apple", recurrence: "none" as const },
  ];

  assert.deepEqual(
    getOccurrences(tasks, new Set(), "2026-10-12", "2026-10-12").map(({ task }) => task.id),
    ["second", "first"],
  );
});

test("carried tasks can be reordered independently of their original dates", () => {
  const tasks = [
    { ...dailyTask, id: "newer", date: "2026-10-13", recurrence: "none" as const },
    { ...dailyTask, id: "older", date: "2026-10-12", recurrence: "none" as const },
  ];

  assert.deepEqual(
    getCarriedOccurrences(tasks, new Set(), "2026-10-14").map(({ task }) => task.id),
    ["newer", "older"],
  );
});

test("existing tasks migrate into the default workspace", () => {
  const migrated = parseStoredTasks({
    tasks: [dailyTask],
    completedOccurrences: ["daily@2026-10-12"],
  });

  assert.deepEqual(migrated.workspaces, [{ id: "personal", name: "Pessoal" }]);
  assert.equal(migrated.activeWorkspaceId, "personal");
  assert.deepEqual(migrated.workspaceData.personal, {
    tasks: [dailyTask],
    completedOccurrences: ["daily@2026-10-12"],
    skippedDates: [],
    weekdaysOnly: false,
  });
});

test("workspace data stays separated when loading saved spaces", () => {
  const migrated = parseStoredTasks({
    workspaces: [
      { id: "personal", name: "Pessoal" },
      { id: "work", name: "Trabalho" },
    ],
    activeWorkspaceId: "work",
    workspaceData: {
      personal: { tasks: [dailyTask], completedOccurrences: [], skippedDates: [], weekdaysOnly: true },
      work: { tasks: [], completedOccurrences: [] },
    },
  });

  assert.equal(migrated.activeWorkspaceId, "work");
  assert.deepEqual(migrated.workspaceData.personal.tasks, [dailyTask]);
  assert.equal(migrated.workspaceData.personal.weekdaysOnly, true);
  assert.deepEqual(migrated.workspaceData.work.tasks, []);
});
