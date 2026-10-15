<script setup lang="ts">
import { onMounted, onUnmounted, watch } from "vue";
import AppSidebar from "./components/AppSidebar.vue";
import AppTopbar from "./components/AppTopbar.vue";
import CalendarToolbar from "./components/CalendarToolbar.vue";
import DayView from "./components/DayView.vue";
import MonthView from "./components/MonthView.vue";
import PageHeading from "./components/PageHeading.vue";
import TaskComposerModal from "./components/TaskComposerModal.vue";
import WeekView from "./components/WeekView.vue";
import WorkspaceComposerModal from "./components/WorkspaceComposerModal.vue";
import { useDayflowStore } from "./stores/dayflow";

const store = useDayflowStore();

function handleShortcut(event: KeyboardEvent): void {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "n") {
    event.preventDefault();
    store.openComposer();
  }
}

onMounted(() => window.addEventListener("keydown", handleShortcut));
onUnmounted(() => window.removeEventListener("keydown", handleShortcut));

watch(() => store.workspaceStore, () => store.persistTasks(), { deep: true });
watch(() => store.isDarkMode, () => store.persistTheme());
</script>

<template>
  <div class="app-shell" :class="{ 'dark-mode': store.isDarkMode }">
    <AppSidebar />

    <main class="main-panel">
      <AppTopbar />
      <section class="content-area">
        <PageHeading />
        <CalendarToolbar />
        <DayView v-if="store.view === 'day'" />
        <WeekView v-else-if="store.view === 'week'" />
        <MonthView v-else />
        <footer class="page-footer"><span>Dayflow <i>·</i> Seus dados ficam neste dispositivo</span></footer>
      </section>
    </main>

    <TaskComposerModal />
    <WorkspaceComposerModal />
  </div>
</template>
