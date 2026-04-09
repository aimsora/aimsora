<script setup lang="ts">
definePageMeta({
  layout: "auth",
  public: true,
  title: "Вход",
  description: "Авторизация в NPPWEB"
});

useHead({
  title: "Вход"
});

const route = useRoute();
const auth = useAuthSession();
const email = ref("");
const password = ref("");
const error = ref("");

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
    <div class="hidden rounded-3xl border bg-background p-10 shadow-sm lg:flex lg:items-center lg:justify-center">
      <div class="space-y-6 text-center">
        <Badge variant="outline" class="mx-auto w-fit">NPPWEB</Badge>
        <div class="space-y-3">
          <h1 class="max-w-md text-4xl font-semibold tracking-tight text-balance">
            Платформа мониторинга закупок в едином рабочем контуре.
          </h1>
          <p class="max-w-xl text-base text-muted-foreground">
            Чистый внутренний интерфейс для контроля закупок, источников, запусков, отчётов и прав доступа.
          </p>
        </div>
      </div>
    </div>

    <Card class="border bg-background shadow-sm">
      <CardHeader class="space-y-6">
        <div class="space-y-2">
          <Badge variant="secondary" class="w-fit">NPPWEB</Badge>
          <CardTitle class="text-2xl">Войти в систему</CardTitle>
          <CardDescription>
            Используйте рабочие учётные данные, чтобы открыть защищённый интерфейс.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent class="space-y-6">
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
