<script setup lang="ts">
import { computed, ref } from "vue";
import { RouterLink, useRoute, useRouter } from "vue-router";
import { useAuthStore } from "../stores/auth";

const email = ref("");
const password = ref("");
const error = ref("");
const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const isDemoMode = computed(
  () =>
    import.meta.env.DEV ||
    ["localhost", "127.0.0.1"].includes(window.location.hostname)
);

function fillDemoCredentials() {
  email.value = "admin@admin.ru";
  password.value = "admin";
}

async function submit() {
  error.value = "";
  try {
    await authStore.login(email.value, password.value);
    const redirect =
      typeof route.query.redirect === "string" && route.query.redirect.length > 0
        ? route.query.redirect
        : "/dashboard";
    await router.push(redirect);
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : "Unable to authenticate";
  }
}
</script>

<template>
  <div class="login-page">
    <div class="login-panel">
      <p class="eyebrow">AIMSORA</p>
      <h1>Вход в платформу</h1>
      <p class="lead">
        Используйте реальную backend-аутентификацию, чтобы перейти в control room,
        проверить закупки, статусы источников и административные разделы.
      </p>

      <div v-if="isDemoMode" class="demo-hint">
        <div>
          <strong>Demo credentials</strong>
          <p>admin@admin.ru / admin</p>
        </div>
        <button type="button" class="secondary-button" @click="fillDemoCredentials">
          Подставить
        </button>
      </div>

      <form class="login-form" @submit.prevent="submit">
        <label>
          Email
          <input v-model="email" type="email" autocomplete="username" />
        </label>
        <label>
          Password
          <input v-model="password" type="password" autocomplete="current-password" />
        </label>
        <p v-if="error" class="error-text">{{ error }}</p>
        <button class="primary-button" :disabled="authStore.loading">
          {{ authStore.loading ? "Signing in..." : "Sign in" }}
        </button>
      </form>

      <p class="login-footer">
        <RouterLink to="/">Вернуться на главную</RouterLink>
      </p>
    </div>
  </div>
</template>
