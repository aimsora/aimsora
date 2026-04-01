<script setup lang="ts">
import { computed } from "vue";
import { RouterLink, useRouter } from "vue-router";
import { useAuthStore } from "../stores/auth";

const authStore = useAuthStore();
const router = useRouter();

const navigation = computed(() =>
  [
    { name: "Dashboard", path: "/dashboard" },
    { name: "Procurements", path: "/procurements" },
    { name: "Sources", path: "/sources" },
    { name: "Jobs", path: "/jobs" },
    { name: "Reports", path: "/reports" },
    authStore.isAdmin ? { name: "Users", path: "/users" } : null
  ].filter(Boolean) as Array<{ name: string; path: string }>
);

async function logout() {
  await authStore.logout();
  await router.push("/");
}
</script>

<template>
  <div class="shell">
    <aside class="sidebar">
      <div class="brand">
        <p class="eyebrow">AIMSORA</p>
        <h1>Control Room</h1>
        <p class="caption">Procurement intelligence workspace</p>
      </div>

      <RouterLink class="landing-link" to="/">Public entry</RouterLink>

      <nav class="nav">
        <RouterLink
          v-for="item in navigation"
          :key="item.path"
          :to="item.path"
          class="nav-link"
        >
          {{ item.name }}
        </RouterLink>
      </nav>
    </aside>

    <main class="content">
      <header class="topbar">
        <div class="topbar-copy">
          <p class="eyebrow">Signed in</p>
          <strong>{{ authStore.user?.fullName }}</strong>
          <span class="role-chip">{{ authStore.user?.role }}</span>
          <p class="caption">{{ authStore.user?.email }}</p>
        </div>
        <button class="secondary-button" :disabled="authStore.loggingOut" @click="logout">
          {{ authStore.loggingOut ? "Logging out..." : "Log out" }}
        </button>
      </header>

      <div class="page-body">
        <slot />
      </div>
    </main>
  </div>
</template>
