<script setup lang="ts">
import { computed } from "vue";
import { RouterLink } from "vue-router";
import { useAuthStore } from "../stores/auth";

const authStore = useAuthStore();

const architectureBlocks = [
  {
    title: "Сбор источников",
    text: "Источники и source runs показывают, какие адаптеры активны, где были ошибки и какой поток данных реально поступает."
  },
  {
    title: "GraphQL platform API",
    text: "Единый клиентский слой для dashboard, закупок, отчётов и администрирования пользователей без разрозненных REST-форм."
  },
  {
    title: "Control room",
    text: "Рабочее место аналитика и администратора: summary, последние закупки, статусы джобов, отчёты и действия по пользователям."
  }
];

const previewBlocks = [
  {
    title: "Dashboard",
    route: "/dashboard",
    text: "Операционная сводка платформы: объём закупок, активные источники, runs и последние сигналы."
  },
  {
    title: "Procurements",
    route: "/procurements",
    text: "Список закупок с поиском, фильтрами по источнику и статусу и переходом в детальную карточку записи."
  },
  {
    title: "Reports",
    route: "/reports",
    text: "Реестр отчётов и их состояний, чтобы быстро проверить, какие материалы готовы, а где есть сбои."
  },
  {
    title: "Sources",
    route: "/sources",
    text: "Каталог источников и их операционный статус вместе с последними job runs."
  }
];

const platformRoute = computed(() => (authStore.isAuthenticated ? "/dashboard" : "/login"));
</script>

<template>
  <div class="landing-page">
    <section class="landing-hero card">
      <div class="landing-copy">
        <p class="eyebrow">AIMSORA</p>
        <h1>Рабочая оболочка платформы мониторинга закупок</h1>
        <p class="lead">
          Публичная entry page для входа в систему: сначала обзор платформы, затем
          авторизация и переход в control room с закупками, источниками, отчётами и
          администрированием.
        </p>

        <div class="landing-actions">
          <RouterLink class="primary-button" :to="platformRoute">Открыть платформу</RouterLink>
          <RouterLink class="secondary-button" to="/login">Войти</RouterLink>
        </div>
      </div>

      <aside class="landing-panel">
        <p class="eyebrow">Flow</p>
        <h2>Landing -> Login -> Dashboard</h2>
        <ul class="landing-flow">
          <li>Публичная главная страница доступна без токена.</li>
          <li>Авторизация выполняется через реальный backend GraphQL login.</li>
          <li>Защищённые разделы доступны только после успешного входа.</li>
        </ul>
      </aside>
    </section>

    <section class="landing-section">
      <div class="section-copy">
        <p class="eyebrow">Platform Blocks</p>
        <h2>Что делает эта оболочка полезной в ежедневной работе</h2>
      </div>

      <div class="cards-grid">
        <article v-for="block in architectureBlocks" :key="block.title" class="source-card">
          <h3>{{ block.title }}</h3>
          <p>{{ block.text }}</p>
        </article>
      </div>
    </section>

    <section class="landing-section">
      <div class="section-copy">
        <p class="eyebrow">Workspace Preview</p>
        <h2>Куда пользователь попадёт после логина</h2>
      </div>

      <div class="preview-grid">
        <RouterLink
          v-for="block in previewBlocks"
          :key="block.title"
          :to="block.route"
          class="preview-card"
        >
          <span class="preview-route">{{ block.route }}</span>
          <h3>{{ block.title }}</h3>
          <p>{{ block.text }}</p>
        </RouterLink>
      </div>
    </section>
  </div>
</template>
