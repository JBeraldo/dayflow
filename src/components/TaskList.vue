<script setup lang="ts">
import type { TaskOccurrence } from "../task-store";

defineProps<{
  occurrences: TaskOccurrence[];
  selectedDate: string;
}>();

const emit = defineEmits<{
  toggle: [occurrence: TaskOccurrence];
  delete: [task: TaskOccurrence["task"]];
}>();

function carryLabel(date: string): string {
  return new Date(`${date}T12:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
</script>

<template>
  <div class="task-list">
    <div v-for="occurrence in occurrences" :key="occurrence.key" class="task-row" :class="{ completed: occurrence.completed }">
      <button class="task-checkbox" :aria-label="occurrence.completed ? 'Mark incomplete' : 'Complete task'" @click="emit('toggle', occurrence)">
        {{ occurrence.completed ? "✓" : "" }}
      </button>
      <div class="task-copy">
        <span class="task-title">{{ occurrence.task.title }}</span>
        <span v-if="occurrence.date < selectedDate || occurrence.task.recurrence !== 'none'" class="task-meta">
          <template v-if="occurrence.date < selectedDate">From {{ carryLabel(occurrence.date) }}</template>
          <template v-if="occurrence.task.recurrence !== 'none'">{{ occurrence.date < selectedDate ? ' · ' : '' }}↻ {{ occurrence.task.recurrence }}</template>
        </span>
      </div>
      <button class="delete-task" title="Delete task" aria-label="Delete task" @click="emit('delete', occurrence.task)">×</button>
    </div>
  </div>
</template>
