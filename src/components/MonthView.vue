<script setup lang="ts">
import { useDayflowStore } from "../stores/dayflow";

const store = useDayflowStore();
const weekdays = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
</script>

<template>
  <section class="month-view">
    <div class="month-weekdays">
      <span v-for="weekday in weekdays" :key="weekday">{{ weekday }}</span>
    </div>
    <div class="month-grid">
      <button v-for="date in store.monthDays" :key="date" class="month-cell" :class="{ 'outside-month': !store.isSameMonth(date), 'is-selected': date === store.selectedDate, 'is-today': date === store.today, 'is-skipped': store.isDateSkipped(date) }" @click="store.setSelectedDate(date); store.setView('day')">
        <span class="month-date">{{ store.formatDate(date, { day: 'numeric' }) }}</span>
        <span v-if="store.isDateSkipped(date)" class="month-skip-label">Pulado</span>
        <span v-for="occurrence in store.occurrencesForCalendarDate(date).slice(0, 3)" :key="occurrence.key" class="month-task" :class="{ done: occurrence.completed, carried: occurrence.date < date }">
          <i></i>{{ occurrence.task.title }}
        </span>
        <span v-if="store.occurrencesForCalendarDate(date).length > 3" class="more-tasks">+{{ store.occurrencesForCalendarDate(date).length - 3 }} mais</span>
      </button>
    </div>
  </section>
</template>
