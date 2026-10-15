<script setup lang="ts">
import { useDayflowStore } from "../stores/dayflow";

const store = useDayflowStore();
</script>

<template>
  <section class="week-view" :style="{ gridTemplateColumns: `repeat(${store.weekDays.length}, minmax(0, 1fr))` }">
    <div v-for="date in store.weekDays" :key="date" class="week-column" :class="{ 'is-selected': date === store.selectedDate, 'is-today': date === store.today, 'is-skipped': store.isDateSkipped(date) }" @click.self="store.setSelectedDate(date)">
      <button class="week-day-heading" @click="store.setSelectedDate(date); store.setView('day')">
        <span>{{ store.formatDate(date, { weekday: 'short' }) }}</span>
        <strong>{{ store.formatDate(date, { day: 'numeric' }) }}</strong>
        <i v-if="date === store.today"></i>
        <small v-if="store.isDateSkipped(date)" class="skip-label">Pulado</small>
      </button>
      <div class="week-task-list">
        <button v-for="occurrence in store.occurrencesForCalendarDate(date)" :key="occurrence.key" class="week-task" :class="{ done: occurrence.completed, carried: occurrence.date < date }" @click="store.toggleOccurrence(occurrence)">
          <span class="mini-check">{{ occurrence.completed ? '✓' : '' }}</span>
          <span>{{ occurrence.task.title }}</span>
        </button>
        <button class="week-add" aria-label="Adicionar tarefa" @click="store.setSelectedDate(date); store.openComposer()">＋</button>
      </div>
    </div>
  </section>
</template>
