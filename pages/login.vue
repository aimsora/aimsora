<script setup lang="ts">
definePageMeta({
  layout: "auth",
  public: true,
  title: "Вход",
  description: "Авторизация в AIMSORA"
});

useHead({
  title: "Вход"
});

const route = useRoute();
const auth = useAuthSession();
const email = ref("");
const password = ref("");
const error = ref("");

const isDevMode = computed(
  () => import.meta.dev || ["localhost", "127.0.0.1"].includes(window.location.hostname)
);

function fillDemoCredentials() {
  email.value = "admin@admin.ru";
  password.value = "12345678";
}

function normalizeLoginError(message: string) {
  const normalized = message.toLowerCase();

  if (normalized.includes("invalid email or password") || normalized.includes("unauthorized")) {
    return "Неверная электронная почта или пароль. Проверьте данные и попробуйте снова.";
  }

  if (normalized.includes("network")) {
    return "Не удалось связаться с сервером. Проверьте доступность API и повторите попытку.";
  }

  return message;
}

async function submit() {
  error.value = "";

  try {
    await auth.login(email.value, password.value);
    const redirect =
      typeof route.query.redirect === "string" && route.query.redirect.length > 0
        ? route.query.redirect
        : "/dashboard";

    await navigateTo(redirect);
  } catch (caught) {
    error.value = normalizeLoginError(
      caught instanceof Error ? caught.message : "Не удалось выполнить вход"
    );
  }
}
</script>

<template>
  <div class="grid w-full max-w-5xl gap-8 lg:grid-cols-[1.1fr_0.9fr]">
    <div class="hidden rounded-3xl border bg-background p-10 shadow-sm lg:flex lg:flex-col lg:justify-between">
      <div class="space-y-6">
        <Badge variant="outline" class="w-fit">AIMSORA</Badge>
        <div class="space-y-3">
          <h1 class="max-w-md text-4xl font-semibold tracking-tight text-balance">
            Платформа мониторинга закупок в едином рабочем контуре.
          </h1>
          <p class="max-w-xl text-base text-muted-foreground">
            Чистый внутренний интерфейс для контроля закупок, источников, запусков, отчётов и прав доступа.
          </p>
        </div>
      </div>
      <div class="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle class="text-base">Сразу в продукт</CardTitle>
            <CardDescription>После входа система ведёт прямо в dashboard без маркетингового слоя.</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle class="text-base">Защищённый доступ</CardTitle>
            <CardDescription>Все разделы, кроме логина, доступны только после авторизации.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    </div>

    <Card class="border bg-background shadow-sm">
      <CardHeader class="space-y-6">
        <div class="space-y-2">
          <Badge variant="secondary" class="w-fit">AIMSORA</Badge>
          <CardTitle class="text-2xl">Войти в систему</CardTitle>
          <CardDescription>
            Используйте рабочие учётные данные, чтобы открыть защищённый интерфейс.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent class="space-y-6">
        <div v-if="isDevMode" class="flex items-start justify-between rounded-xl border bg-muted/50 p-4">
          <div>
            <p class="text-sm font-medium">Тестовый доступ для dev-среды</p>
            <p class="text-sm text-muted-foreground">admin@admin.ru / 12345678</p>
          </div>
          <Button variant="secondary" size="sm" @click="fillDemoCredentials">Подставить</Button>
        </div>

        <form class="space-y-5" @submit.prevent="submit">
          <div class="space-y-2">
            <Label for="email">Электронная почта</Label>
            <Input
              id="email"
              v-model="email"
              type="email"
              placeholder="name@company.ru"
              autocomplete="username"
              :invalid="Boolean(error)"
              required
            />
          </div>

          <div class="space-y-2">
            <Label for="password">Пароль</Label>
            <Input
              id="password"
              v-model="password"
              type="password"
              placeholder="Введите пароль"
              autocomplete="current-password"
              :invalid="Boolean(error)"
              required
            />
          </div>

          <div v-if="error" class="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            {{ error }}
          </div>

          <Button type="submit" block :disabled="auth.loading.value">
            {{ auth.loading.value ? "Выполняется вход..." : "Войти" }}
          </Button>
        </form>
      </CardContent>
    </Card>
  </div>
</template>
