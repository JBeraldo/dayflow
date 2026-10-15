<script setup lang="ts">
import TaskList from "./TaskList.vue";
import { useDayflowStore } from "../stores/dayflow";

const store = useDayflowStore();
</script>

<template>
  <section class="day-view">
    <div v-if="store.isDateSkipped(store.selectedDate)" class="skipped-day-state">
      <span class="skipped-day-icon">⇥</span>
      <strong>Dia pulado</strong>
      <p>As tarefas deste dia foram movidas para {{ store.formatDate(store.nextActiveDate, { weekday: 'long', day: 'numeric', month: 'long' }) }}.</p>
      <button class="secondary-button" @click="store.toggleSkippedDay">Retomar este dia</button>
    </div>
    <template v-else>
      <div v-if="store.carriedOccurrences.length" class="carry-section">
        <div class="section-title">
          <div><span class="carry-indicator">↗</span><strong>Pendentes de dias anteriores</strong><span class="section-count">{{ store.carriedOccurrences.length }}</span></div>
          <span class="muted-label">Em aberto</span>
        </div>
        <TaskList
          :occurrences="store.carriedOccurrences"
          :selected-date="store.selectedDate"
          @toggle="store.toggleOccurrence"
          @delete="store.deleteTask"
          @subtask="store.createSubtask"
          @reorder="store.reorderTasks"
          @rename="store.renameTask"
        />
      </div>

      <div class="section-title today-section-title">
        <div><span class="today-indicator"></span><strong>Tarefas do dia</strong><span class="section-count">{{ store.dayOccurrences.length }}</span></div>
        <span class="muted-label">{{ store.formatDate(store.selectedDate, { weekday: 'long' }) }}</span>
      </div>
      <TaskList
        v-if="store.dayOccurrences.length"
        :occurrences="store.dayOccurrences"
        :selected-date="store.selectedDate"
        @toggle="store.toggleOccurrence"
        @delete="store.deleteTask"
        @subtask="store.createSubtask"
        @reorder="store.reorderTasks"
        @rename="store.renameTask"
      />
      <div v-else-if="!store.carriedOccurrences.length" class="empty-state">
        <div class="empty-art"><span>✓</span></div>
        <strong>Nenhuma tarefa para esta data.</strong>
        <p>Digite abaixo para criar uma tarefa simples ou use “Adicionar tarefa” para escolher data e repetição.</p>
      </div>
      <form class="quick-task-form" @submit.prevent="store.createQuickTask">
        <span aria-hidden="true">＋</span>
        <input v-model="store.quickTaskTitle" aria-label="Criar tarefa simples" placeholder="Digite uma tarefa e pressione Enter…" maxlength="120" />
        <button type="submit" :disabled="!store.quickTaskTitle.trim()">Adicionar</button>
      </form>
    </template>
  </section>
</template>
