<script setup lang="ts">
import { useDayflowStore } from "../stores/dayflow";

const store = useDayflowStore();
</script>

<template>
  <div v-if="store.isComposerOpen" class="modal-backdrop" @click.self="store.isComposerOpen = false" @keydown.esc="store.isComposerOpen = false">
    <form class="task-modal" @submit.prevent="store.createTask">
      <div class="modal-header">
        <div><span class="modal-kicker">TAREFA</span><h2>Nova tarefa</h2></div>
        <button type="button" class="close-button" aria-label="Fechar" @click="store.isComposerOpen = false">×</button>
      </div>
      <label class="field-label" for="task-title">O que precisa ser feito?</label>
      <input id="task-title" v-model="store.newTaskTitle" class="text-input" placeholder="Ex.: pagar uma conta" maxlength="120" autofocus required />
      <div class="form-row">
        <label class="form-field"><span class="field-label">Data</span><input v-model="store.newTaskDate" class="text-input" type="date" required /></label>
        <label class="form-field"><span class="field-label">Repetição</span><select v-model="store.newTaskRecurrence" class="text-input"><option value="none">Não se repete</option><option value="daily">Todos os dias</option><option value="weekly">Toda semana</option><option value="monthly">Todo mês</option></select></label>
      </div>
      <div class="modal-note"><span>↗</span> Tarefas não concluídas são transferidas automaticamente para o dia seguinte.</div>
      <div class="modal-actions"><button type="button" class="cancel-button" @click="store.isComposerOpen = false">Cancelar</button><button class="primary-button" type="submit">Criar tarefa <span>→</span></button></div>
    </form>
  </div>
</template>
