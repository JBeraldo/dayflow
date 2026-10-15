<script setup lang="ts">
import { computed, ref } from "vue";
import type { Task, TaskOccurrence } from "../task-store";

const recurrenceLabels: Record<TaskOccurrence["task"]["recurrence"], string> = {
  none: "Não se repete",
  daily: "Diariamente",
  weekly: "Semanalmente",
  monthly: "Mensalmente",
};

const props = defineProps<{
  occurrences: TaskOccurrence[];
  selectedDate: string;
}>();

const emit = defineEmits<{
  toggle: [occurrence: TaskOccurrence];
  delete: [task: TaskOccurrence["task"]];
  subtask: [parent: Task, title: string];
  reorder: [fromTaskId: string, toTaskId: string];
  rename: [task: Task, title: string];
}>();

const occurrenceIds = computed(() => new Set(props.occurrences.map(({ task }) => task.id)));
const rootOccurrences = computed(() =>
  props.occurrences.filter(({ task }) => !task.parentId || !occurrenceIds.value.has(task.parentId)),
);
const openSubtaskParentId = ref("");
const subtaskTitle = ref("");
const draggedTaskId = ref("");
const editingTaskId = ref("");
const editingTitle = ref("");

function subtasksFor(parentId: string): TaskOccurrence[] {
  return props.occurrences.filter(({ task }) => task.parentId === parentId);
}

function carryLabel(date: string): string {
  return new Date(`${date}T12:00:00`).toLocaleDateString("pt-BR", { day: "numeric", month: "short" });
}

function toggleSubtaskInput(parentId: string): void {
  if (openSubtaskParentId.value === parentId) {
    openSubtaskParentId.value = "";
    subtaskTitle.value = "";
    return;
  }

  openSubtaskParentId.value = parentId;
  subtaskTitle.value = "";
}

function createSubtask(parent: Task): void {
  const title = subtaskTitle.value.trim();
  if (!title) {
    return;
  }

  emit("subtask", parent, title);
  subtaskTitle.value = "";
}

function startDrag(event: DragEvent, taskId: string): void {
  draggedTaskId.value = taskId;
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", taskId);
  }
}

function dropOn(event: DragEvent, targetTaskId: string): void {
  const fromTaskId = draggedTaskId.value || event.dataTransfer?.getData("text/plain") || "";
  if (fromTaskId && fromTaskId !== targetTaskId) {
    const target = event.currentTarget as HTMLElement;
    const dropAfterTarget = event.clientY > target.getBoundingClientRect().top + target.offsetHeight / 2;
    emit("reorder", dropAfterTarget ? targetTaskId : fromTaskId, dropAfterTarget ? fromTaskId : targetTaskId);
  }
  draggedTaskId.value = "";
}

function moveOccurrence(index: number, direction: -1 | 1): void {
  const adjacentIndex = index + direction;
  if (adjacentIndex < 0 || adjacentIndex >= rootOccurrences.value.length) {
    return;
  }

  const currentId = rootOccurrences.value[index].task.id;
  const adjacentId = rootOccurrences.value[adjacentIndex].task.id;
  emit("reorder", direction < 0 ? currentId : adjacentId, direction < 0 ? adjacentId : currentId);
}

function startEditing(task: Task): void {
  editingTaskId.value = task.id;
  editingTitle.value = task.title;
}

function cancelEditing(): void {
  editingTaskId.value = "";
  editingTitle.value = "";
}

function saveTitle(task: Task): void {
  const title = editingTitle.value.trim();
  if (title) {
    emit("rename", task, title);
  }
  cancelEditing();
}
</script>

<template>
  <div class="task-list">
    <div v-for="(occurrence, index) in rootOccurrences" :key="occurrence.key" class="task-group">
      <div
        class="task-row"
        :class="{ completed: occurrence.completed, dragging: draggedTaskId === occurrence.task.id }"
        draggable="true"
        @dragstart="startDrag($event, occurrence.task.id)"
        @dragover.prevent
        @drop.prevent.stop="dropOn($event, occurrence.task.id)"
        @dragend="draggedTaskId = ''"
      >
        <span class="drag-handle" aria-hidden="true" title="Arraste para reordenar">⠿</span>
        <button class="task-checkbox" :aria-label="occurrence.completed ? 'Marcar como pendente' : 'Concluir tarefa'" @click="emit('toggle', occurrence)">
          {{ occurrence.completed ? "✓" : "" }}
        </button>
        <div class="task-copy">
          <input
            v-if="editingTaskId === occurrence.task.id"
            v-model="editingTitle"
            class="task-title-input"
            :aria-label="`Editar tarefa ${occurrence.task.title}`"
            maxlength="120"
            autofocus
            @keydown.esc.stop="cancelEditing"
            @keydown.enter.prevent="saveTitle(occurrence.task)"
            @blur="saveTitle(occurrence.task)"
          />
          <span v-else class="task-title">{{ occurrence.task.title }}</span>
          <span v-if="occurrence.date < selectedDate || occurrence.task.recurrence !== 'none'" class="task-meta">
            <template v-if="occurrence.date < selectedDate">Desde {{ carryLabel(occurrence.date) }}</template>
            <template v-if="occurrence.task.recurrence !== 'none'">{{ occurrence.date < selectedDate ? ' · ' : '' }}↻ {{ recurrenceLabels[occurrence.task.recurrence] }}</template>
          </span>
        </div>
        <div class="task-move-controls" aria-label="Reordenar tarefa">
          <button type="button" :disabled="index === 0" :aria-label="`Mover ${occurrence.task.title} para cima`" @click.stop="moveOccurrence(index, -1)">↑</button>
          <button type="button" :disabled="index === rootOccurrences.length - 1" :aria-label="`Mover ${occurrence.task.title} para baixo`" @click.stop="moveOccurrence(index, 1)">↓</button>
        </div>
        <button class="edit-task" :aria-label="`Editar ${occurrence.task.title}`" title="Editar nome" @click.stop="startEditing(occurrence.task)">✎</button>
        <button class="add-subtask" :aria-label="`Adicionar subtarefa para ${occurrence.task.title}`" title="Adicionar subtarefa" @click="toggleSubtaskInput(occurrence.task.id)">＋</button>
        <button class="delete-task" title="Excluir tarefa" aria-label="Excluir tarefa" @click="emit('delete', occurrence.task)">×</button>
      </div>

      <div v-if="subtasksFor(occurrence.task.id).length || openSubtaskParentId === occurrence.task.id" class="subtask-list">
        <div v-for="subtask in subtasksFor(occurrence.task.id)" :key="subtask.key" class="subtask-row" :class="{ completed: subtask.completed }">
          <button class="task-checkbox" :aria-label="subtask.completed ? 'Marcar como pendente' : 'Concluir subtarefa'" @click="emit('toggle', subtask)">
            {{ subtask.completed ? "✓" : "" }}
          </button>
          <input
            v-if="editingTaskId === subtask.task.id"
            v-model="editingTitle"
            class="task-title-input"
            :aria-label="`Editar subtarefa ${subtask.task.title}`"
            maxlength="120"
            autofocus
            @keydown.esc.stop="cancelEditing"
            @keydown.enter.prevent="saveTitle(subtask.task)"
            @blur="saveTitle(subtask.task)"
          />
          <span v-else class="task-title">{{ subtask.task.title }}</span>
          <button class="edit-task" :aria-label="`Editar ${subtask.task.title}`" title="Editar nome" @click="startEditing(subtask.task)">✎</button>
          <button class="delete-task" title="Excluir subtarefa" aria-label="Excluir subtarefa" @click="emit('delete', subtask.task)">×</button>
        </div>
        <form v-if="openSubtaskParentId === occurrence.task.id" class="subtask-input" @submit.prevent="createSubtask(occurrence.task)">
          <span aria-hidden="true">↳</span>
          <input v-model="subtaskTitle" :aria-label="`Nova subtarefa para ${occurrence.task.title}`" placeholder="Escreva uma subtarefa e pressione Enter" maxlength="120" autofocus />
          <button type="submit" :disabled="!subtaskTitle.trim()" aria-label="Criar subtarefa">＋</button>
        </form>
      </div>
    </div>
  </div>
</template>
