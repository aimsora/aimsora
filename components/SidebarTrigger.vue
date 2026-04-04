<script setup lang="ts">
import { PanelLeftClose, PanelLeftOpen } from "lucide-vue-next";

const sidebar = useSidebar();
</script>

<template>
  <Button variant="ghost" size="icon" v-bind="$attrs" @click="sidebar.toggleSidebar()">
    <PanelLeftOpen v-if="!sidebar.open.value || sidebar.isMobile.value" class="h-4 w-4" />
    <PanelLeftClose v-else class="h-4 w-4" />
    <span class="sr-only">Переключить сайдбар</span>
  </Button>
</template>
