<script setup lang="ts">
import { computed, onMounted } from "vue";
import { useRoute } from "vue-router";
import AppShell from "./components/AppShell.vue";
import { useAuthStore } from "./stores/auth";

const route = useRoute();
const authStore = useAuthStore();
const isPublicRoute = computed(() => route.meta.public === true);

onMounted(async () => {
  await authStore.initialize();
});
</script>

<template>
  <router-view v-if="isPublicRoute" />
  <AppShell v-else>
    <router-view />
  </AppShell>
</template>
