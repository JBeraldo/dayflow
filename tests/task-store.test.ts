import assert from "node:assert/strict";
import test from "node:test";
import {
  getCarriedOccurrences,
  getOccurrences,
  isScheduledOn,
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
