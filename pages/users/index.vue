<script setup lang="ts">
definePageMeta({
  title: "Пользователи",
  description: "Каталог учётных записей для перехода в отдельное администрирование пользователя",
  roles: ["ADMIN"]
});

useHead({
  title: "Пользователи"
});

const usersData = useUsersData();
const auth = useAuthSession();

const roleOptions = [
  { label: "Пользователь", value: "USER" },
  { label: "Аналитик", value: "ANALYST" },
  { label: "Разработчик", value: "DEVELOPER" },
  { label: "Администратор", value: "ADMIN" }
] as const;
const searchQuery = ref("");
const selectedRole = ref<"ALL" | (typeof roleOptions)[number]["value"]>("ALL");
const selectedStatus = ref<"ALL" | "ACTIVE" | "INACTIVE">("ALL");

const activeUsersCount = computed(
  () => usersData.users.value.filter((user) => user.isActive).length
);
const filteredUsers = computed(() =>
  usersData.users.value.filter((user) => {
    const normalizedQuery = searchQuery.value.trim().toLowerCase();
    const matchesQuery =
      normalizedQuery.length === 0 ||
      user.fullName.toLowerCase().includes(normalizedQuery) ||
      user.email.toLowerCase().includes(normalizedQuery);
    const matchesRole = selectedRole.value === "ALL" || user.role === selectedRole.value;
    const matchesStatus =
      selectedStatus.value === "ALL" ||
      (selectedStatus.value === "ACTIVE" ? user.isActive : !user.isActive);

    return matchesQuery && matchesRole && matchesStatus;
  })
);

onMounted(() => {
  void usersData.load();
});
</script>

<template>
  <PageHeader
    title="Пользователи"
    description="На этой странице только краткие карточки. Полное администрирование пользователя открывается на отдельной странице."
  >
    <template #actions>
      <Button type="button" @click="usersData.createDialogOpen.value = true">
        Добавить пользователя
      </Button>
    </template>
  </PageHeader>

  <Card>
    <CardHeader class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div class="space-y-1">
        <CardTitle class="text-base">Контур доступа</CardTitle>
        <CardDescription>
          Активных пользователей: {{ activeUsersCount }} из {{ usersData.users.value.length }}.
        </CardDescription>
      </div>
      <Badge variant="secondary">Текущий администратор: {{ auth.user.value?.email }}</Badge>
    </CardHeader>
  </Card>

  <Card v-if="usersData.loading.value">
    <CardContent class="grid gap-4 pt-6 md:grid-cols-2 xl:grid-cols-3">
      <Skeleton v-for="item in 6" :key="item" class="h-40 rounded-3xl" />
    </CardContent>
  </Card>

  <ErrorState
    v-else-if="usersData.error.value"
    :description="usersData.error.value"
    action-label="Повторить"
    @action="usersData.load()"
  />

  <template v-else>
    <Card>
      <CardHeader>
        <CardTitle>Фильтры и поиск</CardTitle>
        <CardDescription>
          Найдите нужного пользователя и откройте его отдельную административную карточку.
        </CardDescription>
      </CardHeader>
      <CardContent class="grid gap-4">
        <div class="grid gap-3 xl:grid-cols-[1.2fr_0.6fr_0.6fr]">
          <div class="space-y-2">
            <Label for="users-search">Поиск</Label>
            <Input
              id="users-search"
              v-model="searchQuery"
              type="search"
              placeholder="Имя или email"
            />
          </div>
          <div class="space-y-2">
            <Label for="users-role-filter">Роль</Label>
            <Select v-model="selectedRole">
              <SelectTrigger id="users-role-filter">
                <SelectValue placeholder="Все роли" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Все роли</SelectItem>
                <SelectItem v-for="role in roleOptions" :key="role.value" :value="role.value">
                  {{ role.label }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div class="space-y-2">
            <Label for="users-status-filter">Статус</Label>
            <Select v-model="selectedStatus">
              <SelectTrigger id="users-status-filter">
                <SelectValue placeholder="Все статусы" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Все статусы</SelectItem>
                <SelectItem value="ACTIVE">Активные</SelectItem>
                <SelectItem value="INACTIVE">Отключённые</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div class="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <Badge variant="outline">Показано: {{ filteredUsers.length }}</Badge>
          <Badge variant="outline">Всего: {{ usersData.users.value.length }}</Badge>
        </div>
      </CardContent>
    </Card>

    <Card v-if="usersData.users.value.length === 0">
      <CardContent>
        <EmptyState
          title="Пользователи не найдены"
          description="Создайте первую учётную запись администратора, аналитика или разработчика."
        />
      </CardContent>
    </Card>

    <Card v-else-if="filteredUsers.length === 0">
      <CardContent>
        <EmptyState
          title="Ничего не найдено"
          description="Попробуйте изменить фильтры или очистить поисковый запрос."
        />
      </CardContent>
    </Card>

    <div v-else class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <NuxtLink
        v-for="user in filteredUsers"
        :key="user.id"
        :to="`/users/${user.id}`"
        class="block"
      >
        <Card class="h-full border-border/70 transition hover:-translate-y-0.5 hover:border-primary/40 hover:bg-muted/10">
          <CardContent class="flex h-full flex-col gap-5 p-6">
            <div class="flex items-start gap-4">
              <Avatar
                :src="user.avatarUrl || ''"
                :fallback="user.fullName"
                size="lg"
                class="h-14 w-14"
              />
              <div class="min-w-0 space-y-1">
                <p class="truncate text-lg font-semibold">{{ user.fullName }}</p>
                <p class="truncate text-sm text-muted-foreground">{{ user.email }}</p>
              </div>
            </div>

            <div class="flex flex-wrap gap-2">
              <Badge variant="secondary">{{ formatRoleLabel(user.role) }}</Badge>
              <Badge :variant="user.isActive ? 'success' : 'destructive'">
                {{ user.isActive ? "Активен" : "Отключён" }}
              </Badge>
              <Badge v-if="user.id === auth.user.value?.id" variant="outline">Это вы</Badge>
            </div>

            <div class="grid gap-3 rounded-3xl border bg-muted/10 p-4 text-sm text-muted-foreground">
              <div class="flex items-center justify-between gap-3">
                <span>Последний вход</span>
                <span class="font-medium text-foreground">{{ formatDateTime(user.lastLoginAt) }}</span>
              </div>
              <div class="flex items-center justify-between gap-3">
                <span>Карточка обновлена</span>
                <span class="font-medium text-foreground">{{ formatDateTime(user.updatedAt) }}</span>
              </div>
            </div>

            <p class="text-sm text-muted-foreground">
              Открыть административную страницу пользователя
            </p>
          </CardContent>
        </Card>
      </NuxtLink>
    </div>
  </template>

  <Dialog v-model:open="usersData.createDialogOpen.value">
    <DialogContent class="sm:max-w-[520px]">
      <DialogHeader>
        <DialogTitle>Новый пользователь</DialogTitle>
        <DialogDescription>
          Создайте учётную запись и сразу назначьте роль в системе.
        </DialogDescription>
      </DialogHeader>
      <form class="grid gap-4" @submit.prevent="usersData.createUser()">
        <div class="space-y-2">
          <Label for="user-full-name">ФИО</Label>
          <Input
            id="user-full-name"
            v-model="usersData.createForm.fullName"
            :invalid="Boolean(usersData.createErrors.value.fullName)"
            required
          />
          <p v-if="usersData.createErrors.value.fullName" class="text-sm text-destructive">
            {{ usersData.createErrors.value.fullName }}
          </p>
        </div>

        <div class="space-y-2">
          <Label for="user-email">Электронная почта</Label>
          <Input
            id="user-email"
            v-model="usersData.createForm.email"
            type="email"
            :invalid="Boolean(usersData.createErrors.value.email)"
            required
          />
          <p v-if="usersData.createErrors.value.email" class="text-sm text-destructive">
            {{ usersData.createErrors.value.email }}
          </p>
        </div>

        <div class="space-y-2">
          <Label for="user-password">Пароль</Label>
          <Input
            id="user-password"
            v-model="usersData.createForm.password"
            type="password"
            :invalid="Boolean(usersData.createErrors.value.password)"
            required
          />
          <p v-if="usersData.createErrors.value.password" class="text-sm text-destructive">
            {{ usersData.createErrors.value.password }}
          </p>
        </div>

        <div class="space-y-2">
          <Label for="user-role">Роль</Label>
          <Select v-model="usersData.createForm.role">
            <SelectTrigger id="user-role">
              <SelectValue placeholder="Выберите роль" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem v-for="role in roleOptions" :key="role.value" :value="role.value">
                {{ role.label }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            @click="usersData.createDialogOpen.value = false"
          >
            Отмена
          </Button>
          <Button type="submit" :disabled="usersData.createLoading.value || !usersData.createFormValid.value">
            {{ usersData.createLoading.value ? "Создание..." : "Создать" }}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>
