<script setup lang="ts">
import { useDayflowStore, viewLabels } from "../stores/dayflow";

const store = useDayflowStore();
</script>

<template>
  <header class="topbar">
    <div class="breadcrumbs"><span>Minhas tarefas</span><span class="crumb-divider">/</span><strong>{{ viewLabels[store.view] }}</strong></div>
    <div class="topbar-right">
      <span class="saved-label"><span class="saved-dot"></span> Salvo neste dispositivo</span>
      <button class="icon-button theme-button" :aria-label="store.isDarkMode ? 'Ativar modo claro' : 'Ativar modo escuro'" :title="store.isDarkMode ? 'Modo claro' : 'Modo escuro'" @click="store.isDarkMode = !store.isDarkMode">{{ store.isDarkMode ? '☀' : '☾' }}</button>
      <button class="icon-button" aria-label="Ir para hoje" title="Ir para hoje" @click="store.setSelectedDate(store.today)">⌂</button>
    </div>
  </header>
</template>
