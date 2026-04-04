<script setup lang="ts">
import { getRolePermissions } from "~/utils/access";

definePageMeta({
  title: "Пользователи",
  description: "Управление ролями, доступом и жизненным циклом учётных записей",
  roles: ["ADMIN"]
});

useHead({
  title: "Пользователи"
});

const usersData = useUsersData();
const auth = useAuthSession();
const userDeactivateOpen = ref(false);
const userResetPasswordOpen = computed({
  get: () => Boolean(usersData.userToResetPassword.value),
  set: (value: boolean) => {
    if (!value) {
      usersData.userToResetPassword.value = null;
      usersData.resetResetPasswordForm();
    }
  }
});

const roleOptions = [
  { label: "Пользователь", value: "USER" },
  { label: "Аналитик", value: "ANALYST" },
  { label: "Разработчик", value: "DEVELOPER" },
  { label: "Администратор", value: "ADMIN" }
] as const;
const roleCards = roleOptions.map((role) => ({
  ...role,
  permissions: getRolePermissions(role.value)
}));
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

async function confirmDeactivate() {
  const targetUser = usersData.userToDeactivate.value;

  if (!targetUser) {
    return;
  }

  userDeactivateOpen.value = false;
  await usersData.deactivate(targetUser);
}

onMounted(() => {
  void usersData.load();
});
</script>

<template>
  <PageHeader
    title="Пользователи"
    description="Управление ролями, доступом и жизненным циклом учётных записей."
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
      <Badge variant="secondary">Текущий пользователь: {{ auth.user.value?.email }}</Badge>
    </CardHeader>
  </Card>

  <Card v-if="usersData.loading.value">
    <CardContent class="space-y-3 pt-6">
      <Skeleton class="h-10 rounded-md" />
      <Skeleton class="h-10 rounded-md" />
      <Skeleton class="h-10 rounded-md" />
    </CardContent>
  </Card>

  <ErrorState
    v-else-if="usersData.error.value"
    :description="usersData.error.value"
    action-label="Повторить"
    @action="usersData.load()"
  />

  <Card v-else>
    <CardHeader>
      <CardTitle>Список пользователей</CardTitle>
      <CardDescription>Роли и доступ можно обслуживать прямо в таблице.</CardDescription>
    </CardHeader>
    <CardContent class="grid gap-4 border-b border-border/60 pb-6">
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
    <CardContent v-if="usersData.users.value.length === 0">
      <EmptyState
        title="Пользователи не найдены"
        description="Создайте первую учётную запись администратора или аналитика."
      />
    </CardContent>
    <CardContent v-else-if="filteredUsers.length === 0">
      <EmptyState
        title="Ничего не найдено"
        description="Попробуйте изменить фильтры или очистить поисковый запрос."
      />
    </CardContent>
    <CardContent v-else class="px-0">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Пользователь</TableHead>
            <TableHead>Роль</TableHead>
            <TableHead>Статус</TableHead>
            <TableHead>Последний вход</TableHead>
            <TableHead>Действия</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-for="user in filteredUsers" :key="user.id">
            <TableCell>
              <div class="flex items-center gap-3">
                <Avatar :src="user.avatarUrl || ''" :fallback="user.fullName" size="sm" />
                <div class="space-y-1">
                  <p class="font-medium">{{ user.fullName }}</p>
                  <p class="text-sm text-muted-foreground">{{ user.email }}</p>
                </div>
              </div>
            </TableCell>
            <TableCell>
              <div class="flex min-w-[220px] items-center gap-2">
                <Select v-model="usersData.pendingRoles[user.id]">
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите роль" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem v-for="role in roleOptions" :key="role.value" :value="role.value">
                      {{ role.label }}
                    </SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  :disabled="
                    usersData.pendingRoles[user.id] === user.role ||
                    usersData.updateLoadingId.value === user.id
                  "
                  @click="usersData.updateRole(user)"
                >
                  {{ usersData.updateLoadingId.value === user.id ? "Сохранение..." : "Сохранить" }}
                </Button>
              </div>
            </TableCell>
            <TableCell>
              <div class="flex flex-col gap-1">
                <Badge :variant="user.isActive ? 'success' : 'destructive'">
                  {{ user.isActive ? "Активен" : "Отключён" }}
                </Badge>
                <span class="text-sm text-muted-foreground">{{ formatEnumLabel(user.role) }}</span>
              </div>
            </TableCell>
            <TableCell>{{ formatDateTime(user.lastLoginAt) }}</TableCell>
            <TableCell>
              <div class="flex min-w-[240px] flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  :disabled="usersData.resetPasswordLoadingId.value === user.id"
                  @click="
                    usersData.resetResetPasswordForm();
                    usersData.userToResetPassword.value = user;
                  "
                >
                  {{
                    usersData.resetPasswordLoadingId.value === user.id
                      ? "Сброс..."
                      : "Сбросить пароль"
                  }}
                </Button>
                <Button
                  v-if="!user.isActive"
                  type="button"
                  variant="secondary"
                  size="sm"
                  :disabled="usersData.activationLoadingId.value === user.id"
                  @click="usersData.setUserActive(user, true)"
                >
                  {{
                    usersData.activationLoadingId.value === user.id
                      ? "Активация..."
                      : "Активировать"
                  }}
                </Button>
                <Button
                  v-else
                  type="button"
                  variant="destructive"
                  size="sm"
                  :disabled="
                    user.id === auth.user.value?.id ||
                    usersData.deactivateLoadingId.value === user.id
                  "
                  @click="
                    usersData.userToDeactivate.value = user;
                    userDeactivateOpen = true;
                  "
                >
                  {{
                    usersData.deactivateLoadingId.value === user.id
                      ? "Деактивация..."
                      : "Деактивировать"
                  }}
                </Button>
              </div>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </CardContent>
  </Card>

  <div class="grid gap-4 xl:grid-cols-4">
    <Card v-for="roleCard in roleCards" :key="roleCard.value">
      <CardHeader>
        <CardTitle class="text-base">{{ roleCard.label }}</CardTitle>
        <CardDescription>
          {{ roleCard.permissions.length }} возможностей в текущей ролевой модели.
        </CardDescription>
      </CardHeader>
      <CardContent class="space-y-3">
        <div
          v-for="permission in roleCard.permissions"
          :key="permission.key"
          class="rounded-xl border bg-muted/20 p-3"
        >
          <p class="text-sm font-medium">{{ permission.label }}</p>
          <p class="mt-1 text-xs text-muted-foreground">{{ permission.description }}</p>
          <Badge variant="outline" class="mt-2">{{ permission.category }}</Badge>
        </div>
      </CardContent>
    </Card>
  </div>

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

  <Dialog v-model:open="userResetPasswordOpen">
    <DialogContent class="sm:max-w-[520px]">
      <DialogHeader>
        <DialogTitle>Сброс пароля</DialogTitle>
        <DialogDescription>
          {{
            usersData.userToResetPassword.value
              ? `Назначьте новый пароль для ${usersData.userToResetPassword.value.email}. Все активные сессии будут завершены.`
              : "Назначьте новый пароль пользователю."
          }}
        </DialogDescription>
      </DialogHeader>
      <form class="grid gap-4" @submit.prevent="usersData.resetUserPassword()">
        <div class="space-y-2">
          <Label for="reset-password">Новый пароль</Label>
          <Input
            id="reset-password"
            v-model="usersData.resetPasswordForm.newPassword"
            type="password"
            :invalid="Boolean(usersData.resetPasswordError.value)"
            required
          />
          <p v-if="usersData.resetPasswordError.value" class="text-sm text-destructive">
            {{ usersData.resetPasswordError.value }}
          </p>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            @click="
              usersData.userToResetPassword.value = null;
              usersData.resetResetPasswordForm();
            "
          >
            Отмена
          </Button>
          <Button
            type="submit"
            :disabled="
              !usersData.resetPasswordValid.value ||
              usersData.resetPasswordLoadingId.value === usersData.userToResetPassword.value?.id
            "
          >
            {{
              usersData.resetPasswordLoadingId.value === usersData.userToResetPassword.value?.id
                ? "Сохраняем..."
                : "Назначить пароль"
            }}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>

  <AlertDialog v-model:open="userDeactivateOpen">
    <AlertDialogContent
      title="Деактивировать пользователя?"
      :description="
        usersData.userToDeactivate.value
          ? `Пользователь ${usersData.userToDeactivate.value.email} потеряет доступ к системе.`
          : 'Подтвердите действие.'
      "
      action-label="Деактивировать"
      cancel-label="Отмена"
      @action="confirmDeactivate()"
    />
  </AlertDialog>
</template>
