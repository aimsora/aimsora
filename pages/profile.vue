<script setup lang="ts">
definePageMeta({
  title: "Профиль",
  description: "Профиль текущего пользователя и управление сессией"
});

useHead({
  title: "Профиль"
});

const auth = useAuthSession();

const profileRows = computed(() => [
  {
    label: "Имя",
    value: auth.user.value?.fullName || "Не указано"
  },
  {
    label: "Email",
    value: auth.user.value?.email || "Не указано"
  },
  {
    label: "Роль",
    value: formatRoleLabel(auth.user.value?.role)
  }
]);

async function logout() {
  await auth.logout();
  await navigateTo("/login");
}
</script>

<template>
  <PageHeader
    title="Профиль"
    description="Быстрый доступ к данным текущей учётной записи и управлению сессией."
  >
    <template #actions>
      <Button v-if="auth.isAdmin.value" variant="outline" @click="navigateTo('/users')">
        Пользователи
      </Button>
      <Button variant="destructive" :disabled="auth.loggingOut.value" @click="logout()">
        {{ auth.loggingOut.value ? "Выходим..." : "Выйти" }}
      </Button>
    </template>
  </PageHeader>

  <div class="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
    <Card>
      <CardHeader>
        <CardTitle>Учётная запись</CardTitle>
        <CardDescription>
          Данные текущего пользователя из активной авторизованной сессии.
        </CardDescription>
      </CardHeader>
      <CardContent class="space-y-4">
        <div class="flex items-center gap-4 rounded-xl border bg-muted/20 p-4">
          <Avatar :fallback="auth.user.value?.fullName || 'AIMSORA'" size="lg" />
          <div class="min-w-0 space-y-1">
            <p class="truncate text-lg font-semibold">
              {{ auth.user.value?.fullName || "Пользователь" }}
            </p>
            <p class="truncate text-sm text-muted-foreground">
              {{ auth.user.value?.email }}
            </p>
          </div>
        </div>

        <div class="grid gap-3 sm:grid-cols-2">
          <div
            v-for="row in profileRows"
            :key="row.label"
            class="rounded-xl border bg-background p-4"
          >
            <p class="text-xs uppercase tracking-[0.16em] text-muted-foreground">
              {{ row.label }}
            </p>
            <p class="mt-2 text-sm font-medium">
              {{ row.value }}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle>Сессия</CardTitle>
        <CardDescription>
          Если нужно заново авторизоваться, можно завершить текущую сессию отсюда.
        </CardDescription>
      </CardHeader>
      <CardContent class="space-y-3">
        <div class="rounded-xl border bg-muted/20 p-4 text-sm text-muted-foreground">
          Авторизация защищает доступ к dashboard, источникам, закупкам и внутренним данным.
        </div>
        <Button block variant="destructive" :disabled="auth.loggingOut.value" @click="logout()">
          {{ auth.loggingOut.value ? "Выходим..." : "Выйти из аккаунта" }}
        </Button>
      </CardContent>
    </Card>
  </div>
</template>
