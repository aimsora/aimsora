<script setup lang="ts">
definePageMeta({
  title: "Страница не найдена",
  description: "Запрошенный адрес отсутствует в приложении",
  public: true,
  layout: false
});

const auth = useAuthSession();
auth.hydrateFromStorage();
const route = useRoute();
const attemptedPath = computed(() => route.fullPath);

function returnToDashboard() {
  return navigateTo(auth.isAuthenticated.value ? "/dashboard" : "/login");
}

useHead({
  title: "404 · Страница не найдена"
});
</script>

<template>
  <div class="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(214,80,39,0.14),_transparent_26%),linear-gradient(135deg,_hsl(var(--background)),_hsl(var(--muted)/0.55))] px-6 py-10">
    <div class="mx-auto flex min-h-[calc(100vh-5rem)] max-w-5xl items-center justify-center">
      <div class="grid w-full gap-6 rounded-[2rem] border border-border/70 bg-background/95 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.16)] md:grid-cols-[0.96fr_1.04fr] md:p-10">
        <section class="rounded-[1.5rem] border border-border/70 bg-[linear-gradient(160deg,_hsl(var(--muted)/0.6),_hsl(var(--background)))] p-6 md:p-8">
          <div class="space-y-5">
            <div class="inline-flex rounded-full border border-border/70 bg-background px-4 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
              NPPWEB
            </div>
            <div class="inline-flex rounded-full bg-primary/10 px-4 py-1 text-sm font-medium text-primary">
              404 · Страница не найдена
            </div>
            <h1 class="text-3xl font-semibold tracking-tight md:text-4xl">Такой страницы нет</h1>
            <p class="max-w-xl text-sm leading-7 text-muted-foreground md:text-base">
              Похоже, адрес был введён неверно или этот экран больше не используется в текущем контуре приложения. Безопаснее вернуться на дашборд и открыть нужный раздел из бокового меню.
            </p>
          </div>
        </section>

        <section class="flex flex-col justify-between gap-8 rounded-[1.5rem] border border-border/70 bg-background/90 p-6 md:p-8">
          <div class="space-y-4">
            <div class="grid gap-3 sm:grid-cols-3">
              <div class="rounded-2xl border border-border/70 bg-muted/20 p-4">
                <p class="text-xs uppercase tracking-[0.18em] text-muted-foreground">Код</p>
                <p class="mt-2 text-2xl font-semibold">404</p>
              </div>
              <div class="rounded-2xl border border-border/70 bg-muted/20 p-4">
                <p class="text-xs uppercase tracking-[0.18em] text-muted-foreground">Контур</p>
                <p class="mt-2 text-2xl font-semibold">Маршрут</p>
              </div>
              <div class="rounded-2xl border border-border/70 bg-muted/20 p-4">
                <p class="text-xs uppercase tracking-[0.18em] text-muted-foreground">Действие</p>
                <p class="mt-2 text-2xl font-semibold">Назад</p>
              </div>
            </div>

            <div class="rounded-[1.5rem] border border-dashed border-border/70 bg-muted/25 p-5 text-sm text-muted-foreground">
              <p>Запрошенный адрес: <span class="font-medium text-foreground">{{ attemptedPath }}</span></p>
              <p class="mt-3">Если ссылка пришла из интерфейса, её стоит проверить и обновить маршрут в приложении.</p>
            </div>
          </div>

          <div class="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              class="inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-5 text-sm font-medium text-primary-foreground transition hover:opacity-95"
              @click="returnToDashboard()"
            >
              {{ auth.isAuthenticated.value ? "Вернуться на дашборд" : "Перейти ко входу" }}
            </button>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>
