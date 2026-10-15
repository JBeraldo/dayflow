<script setup lang="ts">
import { CREATE_WORKSPACE_OPTION, useDayflowStore } from "../stores/dayflow";

const store = useDayflowStore();

function selectWorkspace(event: Event): void {
  const workspaceId = (event.target as HTMLSelectElement).value;
  if (workspaceId === CREATE_WORKSPACE_OPTION) {
    store.openWorkspaceComposer();
    return;
  }
  store.selectWorkspace(workspaceId);
}
</script>

<template>
  <aside class="sidebar">
    <a class="brand" href="#" @click.prevent="store.setSelectedDate(store.today); store.setView('day')">
      <img class="brand-mark" src="/dayflow-icon.svg" alt="" />
      <span>dayflow</span>
    </a>

    <div class="workspace-picker">
      <label class="workspace-label" for="workspace-select">Espaço de trabalho</label>
      <select id="workspace-select" class="workspace-select" :value="store.workspaceStore.activeWorkspaceId" aria-label="Espaço de trabalho" @change="selectWorkspace">
        <option v-for="workspace in store.workspaces" :key="workspace.id" :value="workspace.id">{{ workspace.name }}</option>
        <optgroup label="Ações">
          <option :value="CREATE_WORKSPACE_OPTION">＋ Criar espaço de trabalho…</option>
        </optgroup>
      </select>
    </div>

    <button class="new-task-button" type="button" @click="store.openComposer">
      <span class="plus">＋</span> Nova tarefa <kbd>Ctrl/⌘ N</kbd>
    </button>

    <nav class="side-nav" aria-label="Navegação principal">
      <button class="nav-item" :class="{ active: store.view === 'day' }" @click="store.setView('day')">
        <span class="nav-icon">◷</span> Hoje <span class="nav-count">{{ store.remainingCount }}</span>
      </button>
      <button class="nav-item" :class="{ active: store.view === 'week' }" @click="store.setView('week')">
        <span class="nav-icon">▦</span> Semana
      </button>
      <button class="nav-item" :class="{ active: store.view === 'month' }" @click="store.setView('month')">
        <span class="nav-icon">▤</span> Mês
      </button>
    </nav>

    <div class="sidebar-bottom">
      <label class="workspace-setting">
        <input
          type="checkbox"
          :checked="store.weekdaysOnly"
          @change="store.setWeekdaysOnly(($event.target as HTMLInputElement).checked)"
        />
        <span class="setting-switch" aria-hidden="true"></span>
        <span>Apenas dias úteis</span>
      </label>
      <div class="profile-row">
        <span class="avatar">{{ store.activeWorkspace.name.charAt(0).toLocaleUpperCase('pt-BR') }}</span>
        <span class="profile-label">{{ store.activeWorkspace.name }}</span>
        <span class="offline-dot" title="Salvo neste dispositivo"></span>
      </div>
    </div>
  </aside>
</template>
