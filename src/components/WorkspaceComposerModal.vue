<script setup lang="ts">
import { useDayflowStore } from "../stores/dayflow";

const store = useDayflowStore();
</script>

<template>
  <div v-if="store.isWorkspaceComposerOpen" class="modal-backdrop" @click.self="store.isWorkspaceComposerOpen = false" @keydown.esc="store.isWorkspaceComposerOpen = false">
    <form class="task-modal workspace-modal" @submit.prevent="store.createWorkspace">
      <div class="modal-header">
        <div><span class="modal-kicker">ESPAÇOS</span><h2>Novo espaço de trabalho</h2></div>
        <button type="button" class="close-button" aria-label="Fechar" @click="store.isWorkspaceComposerOpen = false">×</button>
      </div>
      <label class="field-label" for="workspace-name">Nome do espaço</label>
      <input id="workspace-name" v-model="store.newWorkspaceName" class="text-input" placeholder="Ex.: Trabalho" maxlength="40" autofocus required />
      <p v-if="store.workspaceError" class="workspace-error" role="alert">{{ store.workspaceError }}</p>
      <div class="modal-actions">
        <button type="button" class="cancel-button" @click="store.isWorkspaceComposerOpen = false">Cancelar</button>
        <button class="primary-button" type="submit">Criar espaço</button>
      </div>
    </form>
  </div>
</template>
