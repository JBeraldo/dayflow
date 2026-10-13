<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import TaskList from "./components/TaskList.vue";
import {
  addDays,
  getCarriedOccurrences,
  getOccurrences,
  localDateString,
  loadTasks,
  monthGridStart,
  parseLocalDate,
  saveTasks,
  startOfWeek,
  type Recurrence,
  type Task,
  type TaskOccurrence,
} from "./task-store";

type View = "day" | "week" | "month";
const viewLabels: Record<View, string> = { day: "Dia", week: "Semana", month: "Mês" };

const today = localDateString(new Date());
const initialData = loadTasks();
const tasks = ref<Task[]>(initialData.tasks);
const completedOccurrences = ref(new Set(initialData.completedOccurrences));
const selectedDate = ref(today);
const view = ref<View>("day");
const isComposerOpen = ref(false);
const newTaskTitle = ref("");
const newTaskDate = ref(today);
const newTaskRecurrence = ref<Recurrence>("none");

function handleShortcut(event: KeyboardEvent): void {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "n") {
    event.preventDefault();
    openComposer();
  }
}

onMounted(() => window.addEventListener("keydown", handleShortcut));
onUnmounted(() => window.removeEventListener("keydown", handleShortcut));

watch(
  [tasks, completedOccurrences],
  () => saveTasks({ tasks: tasks.value, completedOccurrences: [...completedOccurrences.value] }),
  { deep: true },
);

const selected = computed(() => parseLocalDate(selectedDate.value));
const dayLabel = computed(() =>
  selected.value.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" }),
);
const periodLabel = computed(() => {
  if (view.value === "day") {
    return selected.value.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  }

  if (view.value === "week") {
    const start = parseLocalDate(startOfWeek(selectedDate.value));
    const end = addDays(localDateString(start), 6);

    return `${start.toLocaleDateString("pt-BR", { day: "numeric", month: "short" })} – ${parseLocalDate(end).toLocaleDateString("pt-BR", { day: "numeric", month: "short", year: "numeric" })}`;
  }

  return selected.value.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
});

const weekDays = computed(() =>
  Array.from({ length: 7 }, (_, index) => addDays(startOfWeek(selectedDate.value), index)),
);
const monthDays = computed(() => {
  const first = monthGridStart(selectedDate.value);

  return Array.from({ length: 42 }, (_, index) => addDays(first, index));
});
const visibleRange = computed(() => {
  if (view.value === "week") {
    return [weekDays.value[0], weekDays.value[6]] as const;
  }

  if (view.value === "month") {
    return [monthDays.value[0], monthDays.value[41]] as const;
  }

  return [selectedDate.value, selectedDate.value] as const;
});
const visibleOccurrences = computed(() =>
  getOccurrences(tasks.value, completedOccurrences.value, visibleRange.value[0], visibleRange.value[1]),
);
const carriedOccurrences = computed(() =>
  getCarriedOccurrences(tasks.value, completedOccurrences.value, selectedDate.value),
);
const dayOccurrences = computed(() =>
  visibleOccurrences.value.filter((occurrence) => occurrence.date === selectedDate.value),
);
const remainingCount = computed(() =>
  dayOccurrences.value.filter((occurrence) => !occurrence.completed).length + carriedOccurrences.value.length,
);

function occurrencesFor(date: string): TaskOccurrence[] {
  return visibleOccurrences.value.filter((occurrence) => occurrence.date === date);
}

function occurrencesForCalendarDate(date: string): TaskOccurrence[] {
  if (date !== today) {
    return occurrencesFor(date);
  }

  return [...getCarriedOccurrences(tasks.value, completedOccurrences.value, date), ...occurrencesFor(date)];
}

function movePeriod(amount: number): void {
  if (view.value === "day") {
    selectedDate.value = addDays(selectedDate.value, amount);
  } else if (view.value === "week") {
    selectedDate.value = addDays(selectedDate.value, amount * 7);
  } else {
    const date = parseLocalDate(selectedDate.value);
    const dayOfMonth = date.getDate();
    const nextMonth = new Date(date.getFullYear(), date.getMonth() + amount, 1, 12);
    const lastDayOfMonth = new Date(nextMonth.getFullYear(), nextMonth.getMonth() + 1, 0, 12).getDate();
    nextMonth.setDate(Math.min(dayOfMonth, lastDayOfMonth));
    selectedDate.value = localDateString(nextMonth);
  }
}

function setView(nextView: View): void {
  view.value = nextView;
}

function openComposer(): void {
  newTaskTitle.value = "";
  newTaskDate.value = selectedDate.value;
  newTaskRecurrence.value = "none";
  isComposerOpen.value = true;
}

function createTask(): void {
  const title = newTaskTitle.value.trim();
  if (!title) {
    return;
  }

  tasks.value.push({
    id: crypto.randomUUID(),
    title,
    date: newTaskDate.value,
    recurrence: newTaskRecurrence.value,
    createdAt: new Date().toISOString(),
  });
  selectedDate.value = newTaskDate.value;
  view.value = "day";
  isComposerOpen.value = false;
}

function toggleOccurrence(occurrence: TaskOccurrence): void {
  const next = new Set(completedOccurrences.value);
  if (next.has(occurrence.key)) {
    next.delete(occurrence.key);
  } else {
    next.add(occurrence.key);
  }
  completedOccurrences.value = next;
}

function deleteTask(task: Task): void {
  tasks.value = tasks.value.filter((candidate) => candidate.id !== task.id);
  completedOccurrences.value = new Set(
    [...completedOccurrences.value].filter((key) => !key.startsWith(`${task.id}@`)),
  );
}

function formatDate(value: string, options: Intl.DateTimeFormatOptions): string {
  return parseLocalDate(value).toLocaleDateString("pt-BR", options);
}

function isSameMonth(value: string): boolean {
  const date = parseLocalDate(value);
  return date.getMonth() === selected.value.getMonth() && date.getFullYear() === selected.value.getFullYear();
}

</script>

<template>
  <div class="app-shell">
    <aside class="sidebar">
      <a class="brand" href="#" @click.prevent="selectedDate = today; setView('day')">
        <span class="brand-mark">d</span>
        <span>dayflow</span>
      </a>

      <button class="new-task-button" type="button" @click="openComposer">
        <span class="plus">＋</span> Nova tarefa <kbd>Ctrl/⌘ N</kbd>
      </button>

      <nav class="side-nav" aria-label="Navegação principal">
        <button class="nav-item" :class="{ active: view === 'day' }" @click="setView('day')">
          <span class="nav-icon">◷</span> Hoje <span class="nav-count">{{ remainingCount }}</span>
        </button>
        <button class="nav-item" :class="{ active: view === 'week' }" @click="setView('week')">
          <span class="nav-icon">▦</span> Semana
        </button>
        <button class="nav-item" :class="{ active: view === 'month' }" @click="setView('month')">
          <span class="nav-icon">▤</span> Mês
        </button>
      </nav>

      <div class="sidebar-bottom">
        <div class="profile-row">
          <span class="avatar">D</span>
          <span class="profile-label">Seu espaço</span>
          <span class="offline-dot" title="Salvo neste dispositivo"></span>
        </div>
      </div>
    </aside>

    <main class="main-panel">
      <header class="topbar">
        <div class="breadcrumbs"><span>Minhas tarefas</span><span class="crumb-divider">/</span><strong>{{ viewLabels[view] }}</strong></div>
        <div class="topbar-right">
          <span class="saved-label"><span class="saved-dot"></span> Salvo neste dispositivo</span>
          <button class="icon-button" aria-label="Ir para hoje" title="Ir para hoje" @click="selectedDate = today">⌂</button>
        </div>
      </header>

      <section class="content-area">
        <div class="page-heading">
          <div>
            <div class="eyebrow">{{ view === 'day' ? 'HOJE' : view === 'week' ? 'ESTA SEMANA' : 'ESTE MÊS' }}</div>
            <h1>{{ view === 'day' ? dayLabel : periodLabel }}</h1>
            <p v-if="view === 'day'" class="heading-subtitle">
              {{ remainingCount }} {{ remainingCount === 1 ? 'tarefa pendente' : 'tarefas pendentes' }}
            </p>
          </div>
          <button class="primary-button" @click="openComposer"><span>＋</span> Adicionar tarefa</button>
        </div>

        <div class="calendar-toolbar">
          <div class="period-navigation">
            <button class="arrow-button" aria-label="Período anterior" @click="movePeriod(-1)">‹</button>
            <button class="arrow-button" aria-label="Próximo período" @click="movePeriod(1)">›</button>
            <span class="period-label">{{ periodLabel }}</span>
            <button v-if="selectedDate !== today" class="today-button" @click="selectedDate = today">Hoje</button>
          </div>
          <div class="view-switcher" role="tablist" aria-label="Visualização do calendário">
            <button v-for="item in (['day', 'week', 'month'] as const)" :key="item" :class="{ selected: view === item }" @click="setView(item)">{{ viewLabels[item] }}</button>
          </div>
        </div>

        <section v-if="view === 'day'" class="day-view">
          <div v-if="carriedOccurrences.length" class="carry-section">
            <div class="section-title">
              <div><span class="carry-indicator">↗</span><strong>Pendentes de dias anteriores</strong><span class="section-count">{{ carriedOccurrences.length }}</span></div>
              <span class="muted-label">Em aberto</span>
            </div>
            <TaskList :occurrences="carriedOccurrences" :selected-date="selectedDate" @toggle="toggleOccurrence" @delete="deleteTask" />
          </div>

          <div class="section-title today-section-title">
            <div><span class="today-indicator"></span><strong>Tarefas do dia</strong><span class="section-count">{{ dayOccurrences.length }}</span></div>
            <span class="muted-label">{{ formatDate(selectedDate, { weekday: 'long' }) }}</span>
          </div>
          <TaskList v-if="dayOccurrences.length" :occurrences="dayOccurrences" :selected-date="selectedDate" @toggle="toggleOccurrence" @delete="deleteTask" />
          <div v-else-if="!carriedOccurrences.length" class="empty-state">
            <div class="empty-art"><span>✓</span></div>
            <strong>Nenhuma tarefa para esta data.</strong>
            <p>Adicione uma tarefa para incluí-la na lista.</p>
            <button class="secondary-button" @click="openComposer">＋ Adicionar tarefa</button>
          </div>
          <button v-else class="add-inline" @click="openComposer"><span>＋</span> Adicionar tarefa para este dia</button>
        </section>

        <section v-else-if="view === 'week'" class="week-view">
          <div v-for="date in weekDays" :key="date" class="week-column" :class="{ 'is-selected': date === selectedDate, 'is-today': date === today }" @click.self="selectedDate = date">
            <button class="week-day-heading" @click="selectedDate = date; setView('day')">
              <span>{{ formatDate(date, { weekday: 'short' }) }}</span>
              <strong>{{ formatDate(date, { day: 'numeric' }) }}</strong>
              <i v-if="date === today"></i>
            </button>
            <div class="week-task-list">
              <button v-for="occurrence in occurrencesForCalendarDate(date)" :key="occurrence.key" class="week-task" :class="{ done: occurrence.completed, carried: occurrence.date < date }" @click="toggleOccurrence(occurrence)">
                <span class="mini-check">{{ occurrence.completed ? '✓' : '' }}</span>
                <span>{{ occurrence.task.title }}</span>
              </button>
              <button class="week-add" aria-label="Adicionar tarefa" @click="selectedDate = date; openComposer">＋</button>
            </div>
          </div>
        </section>

        <section v-else class="month-view">
          <div class="month-weekdays">
            <span v-for="weekday in ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']" :key="weekday">{{ weekday }}</span>
          </div>
          <div class="month-grid">
            <button v-for="date in monthDays" :key="date" class="month-cell" :class="{ 'outside-month': !isSameMonth(date), 'is-selected': date === selectedDate, 'is-today': date === today }" @click="selectedDate = date; setView('day')">
              <span class="month-date">{{ formatDate(date, { day: 'numeric' }) }}</span>
              <span v-for="occurrence in occurrencesForCalendarDate(date).slice(0, 3)" :key="occurrence.key" class="month-task" :class="{ done: occurrence.completed, carried: occurrence.date < date }">
                <i></i>{{ occurrence.task.title }}
              </span>
              <span v-if="occurrencesForCalendarDate(date).length > 3" class="more-tasks">+{{ occurrencesForCalendarDate(date).length - 3 }} mais</span>
            </button>
          </div>
        </section>

        <footer class="page-footer"><span>Dayflow <i>·</i> Seus dados ficam neste dispositivo</span></footer>
      </section>
    </main>

    <div v-if="isComposerOpen" class="modal-backdrop" @click.self="isComposerOpen = false" @keydown.esc="isComposerOpen = false">
      <form class="task-modal" @submit.prevent="createTask">
        <div class="modal-header">
          <div><span class="modal-kicker">TAREFA</span><h2>Nova tarefa</h2></div>
          <button type="button" class="close-button" aria-label="Fechar" @click="isComposerOpen = false">×</button>
        </div>
        <label class="field-label" for="task-title">O que precisa ser feito?</label>
        <input id="task-title" v-model="newTaskTitle" class="text-input" placeholder="Ex.: pagar uma conta" maxlength="120" autofocus required />
        <div class="form-row">
          <label class="form-field"><span class="field-label">Data</span><input v-model="newTaskDate" class="text-input" type="date" required /></label>
          <label class="form-field"><span class="field-label">Repetição</span><select v-model="newTaskRecurrence" class="text-input"><option value="none">Não se repete</option><option value="daily">Todos os dias</option><option value="weekly">Toda semana</option><option value="monthly">Todo mês</option></select></label>
        </div>
        <div class="modal-note"><span>↗</span> Tarefas não concluídas são transferidas automaticamente para o dia seguinte.</div>
        <div class="modal-actions"><button type="button" class="cancel-button" @click="isComposerOpen = false">Cancelar</button><button class="primary-button" type="submit">Criar tarefa <span>→</span></button></div>
      </form>
    </div>
  </div>
</template>
