<script setup lang="ts">
import type { NuxtError } from "#app";

const props = defineProps<{
  error: NuxtError;
}>();

const auth = useAuthSession();
auth.hydrateFromStorage();
const statusCode = computed(() => props.error?.statusCode ?? 500);
const statusTitle = computed(() => {
  if (statusCode.value === 403) {
    return "Доступ запрещён";
  }

  if (statusCode.value === 404) {
    return "Страница не найдена";
  }

  return "Внутренняя ошибка";
});

const statusDescription = computed(() => {
  if (statusCode.value === 403) {
    return "У вашей роли сейчас нет доступа к этому разделу. Вернитесь в рабочее пространство или запросите права у администратора системы.";
  }

  if (statusCode.value === 404) {
    return "Такой страницы больше нет или адрес был введён неверно. Вернитесь в рабочее пространство и откройте доступный раздел.";
  }

  return "Во время открытия страницы произошёл сбой на стороне приложения. Можно вернуться на дашборд и продолжить работу, а затем повторить попытку позже.";
});

const statusLabel = computed(() => {
  if (statusCode.value === 403) {
    return "403 · Ограничение доступа";
  }

  if (statusCode.value === 404) {
    return "404 · Не найдено";
  }

  return "500 · Ошибка приложения";
});

const primaryActionLabel = computed(() => (auth.isAuthenticated.value ? "Вернуться на дашборд" : "Перейти ко входу"));

function goPrimary() {
  clearError({ redirect: auth.isAuthenticated.value ? "/dashboard" : "/login" });
}

function reloadPage() {
  clearError();

  if (import.meta.client) {
    window.location.reload();
  }
}

useHead(() => ({
  title: `${statusCode.value} · ${statusTitle.value}`
}));
</script>

<template>
  <div class="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(214,80,39,0.18),_transparent_28%),linear-gradient(135deg,_hsl(var(--background)),_hsl(var(--muted)/0.6))] px-6 py-10 text-foreground">
    <div class="mx-auto flex min-h-[calc(100vh-5rem)] max-w-5xl items-center justify-center">
      <div class="grid w-full gap-6 rounded-[2rem] border border-border/70 bg-background/95 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.16)] backdrop-blur md:grid-cols-[0.92fr_1.08fr] md:p-10">
        <div class="rounded-[1.5rem] border border-border/70 bg-[linear-gradient(160deg,_hsl(var(--muted)/0.65),_hsl(var(--background)))] p-6 md:p-8">
          <div class="flex h-full flex-col justify-between gap-8">
            <div class="space-y-5">
              <div class="inline-flex rounded-full border border-border/70 bg-background px-4 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                NPPWEB
              </div>
              <div class="space-y-3">
                <div class="inline-flex items-center rounded-full bg-primary/10 px-4 py-1 text-sm font-medium text-primary">
                  {{ statusLabel }}
                </div>
                <h1 class="text-3xl font-semibold tracking-tight text-balance md:text-4xl">
                  {{ statusTitle }}
                </h1>
                <p class="max-w-xl text-sm leading-7 text-muted-foreground md:text-base">
                  {{ statusDescription }}
                </p>
              </div>
            </div>

            <div class="grid gap-3 text-sm text-muted-foreground">
              <div class="rounded-2xl border border-border/70 bg-background/80 px-4 py-3">
                Рабочее пространство доступно через дашборд, где останутся только разрешённые для вашей роли разделы.
              </div>
              <div class="rounded-2xl border border-border/70 bg-background/80 px-4 py-3">
                Если это ожидаемый раздел, администратор может расширить ваш доступ без переустановки приложения.
              </div>
            </div>
          </div>
        </div>

        <div class="flex flex-col justify-between gap-8 rounded-[1.5rem] border border-border/70 bg-[linear-gradient(180deg,_rgba(255,255,255,0.96),_rgba(248,250,252,0.82))] p-6 md:p-8 dark:bg-[linear-gradient(180deg,_rgba(15,23,42,0.96),_rgba(15,23,42,0.86))]">
          <div class="space-y-5">
            <div class="grid gap-3 sm:grid-cols-3">
              <div class="rounded-2xl border border-border/70 bg-background/85 p-4">
                <p class="text-xs uppercase tracking-[0.18em] text-muted-foreground">Код</p>
                <p class="mt-2 text-2xl font-semibold">{{ statusCode }}</p>
              </div>
              <div class="rounded-2xl border border-border/70 bg-background/85 p-4">
                <p class="text-xs uppercase tracking-[0.18em] text-muted-foreground">Статус</p>
                <p class="mt-2 text-2xl font-semibold">
                  {{ statusCode === 500 ? "Нужна проверка" : "Ограничено" }}
                </p>
              </div>
              <div class="rounded-2xl border border-border/70 bg-background/85 p-4">
                <p class="text-xs uppercase tracking-[0.18em] text-muted-foreground">Действие</p>
                <p class="mt-2 text-2xl font-semibold">
                  {{ auth.isAuthenticated.value ? "Вернуться" : "Войти" }}
                </p>
              </div>
            </div>

            <div class="rounded-[1.5rem] border border-dashed border-border/70 bg-muted/25 p-5">
              <p class="text-sm font-medium text-foreground">Что можно сделать сейчас</p>
              <div class="mt-3 grid gap-3 text-sm text-muted-foreground">
                <p>Открыть дашборд и продолжить работу в доступных разделах.</p>
                <p v-if="statusCode === 500">Повторить действие позже или обновить страницу после восстановления сервиса.</p>
                <p v-else>Проверить роль пользователя или корректность адреса страницы.</p>
              </div>
            </div>
          </div>

          <div class="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              class="inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-5 text-sm font-medium text-primary-foreground transition hover:opacity-95"
              @click="goPrimary()"
            >
              {{ primaryActionLabel }}
            </button>
            <button
              v-if="statusCode === 500"
              type="button"
              class="inline-flex min-h-11 items-center justify-center rounded-xl border border-border bg-background px-5 text-sm font-medium text-foreground transition hover:bg-muted/60"
              @click="reloadPage()"
            >
              Перезагрузить страницу
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
