<script setup lang="ts">
import { useDayflowStore } from "../stores/dayflow";

const store = useDayflowStore();
</script>

<template>
  <div class="page-heading">
    <div>
      <div class="eyebrow">{{ store.view === 'day' ? 'HOJE' : store.view === 'week' ? 'ESTA SEMANA' : 'ESTE MÊS' }}</div>
      <h1>{{ store.view === 'day' ? store.dayLabel : store.periodLabel }}</h1>
      <p v-if="store.view === 'day'" class="heading-subtitle">
        {{ store.remainingCount }} {{ store.remainingCount === 1 ? 'tarefa pendente' : 'tarefas pendentes' }}
      </p>
    </div>
    <div class="heading-actions">
      <button v-if="store.view === 'day'" class="secondary-button skip-day-button" :class="{ 'is-skipped': store.isDateSkipped(store.selectedDate) }" @click="store.toggleSkippedDay">
        {{ store.isDateSkipped(store.selectedDate) ? '↶ Retomar dia' : '⇥ Pular dia' }}
      </button>
      <button class="primary-button" @click="store.openComposer"><span>＋</span> Adicionar tarefa</button>
    </div>
  </div>
</template>
