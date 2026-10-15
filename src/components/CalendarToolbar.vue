<script setup lang="ts">
import { useDayflowStore, viewLabels, type CalendarView } from "../stores/dayflow";

const store = useDayflowStore();
const views: CalendarView[] = ["day", "week", "month"];
</script>

<template>
  <div class="calendar-toolbar">
    <div class="period-navigation">
      <button class="arrow-button" aria-label="Período anterior" @click="store.movePeriod(-1)">‹</button>
      <button class="arrow-button" aria-label="Próximo período" @click="store.movePeriod(1)">›</button>
      <span class="period-label">{{ store.periodLabel }}</span>
      <button v-if="store.selectedDate !== store.today" class="today-button" @click="store.setSelectedDate(store.today)">Hoje</button>
    </div>
    <div class="view-switcher" role="tablist" aria-label="Visualização do calendário">
      <button v-for="item in views" :key="item" :class="{ selected: store.view === item }" @click="store.setView(item)">{{ viewLabels[item] }}</button>
    </div>
  </div>
</template>
