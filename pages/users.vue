<script setup lang="ts">
import { getRolePermissions } from "~/utils/access";
import type { AppUser } from "~/graphql/types";

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
const userDeleteOpen = ref(false);
const avatarInputs = reactive<Record<string, HTMLInputElement | null>>({});

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
    const form = usersData.editForms[user.id];
    const searchableName = (form?.fullName ?? user.fullName).toLowerCase();
    const searchableEmail = (form?.email ?? user.email).toLowerCase();
    const matchesQuery =
      normalizedQuery.length === 0 ||
      searchableName.includes(normalizedQuery) ||
      searchableEmail.includes(normalizedQuery);
    const matchesRole =
      selectedRole.value === "ALL" || (form?.role ?? user.role) === selectedRole.value;
    const matchesStatus =
      selectedStatus.value === "ALL" ||
      (selectedStatus.value === "ACTIVE" ? user.isActive : !user.isActive);

    return matchesQuery && matchesRole && matchesStatus;
  })
);

function userPermissions(userId: string) {
  return getRolePermissions(usersData.editForms[userId]?.role ?? "USER");
}

function isUserDirty(user: AppUser) {
  const form = usersData.editForms[user.id];

  if (!form) {
    return false;
  }

  return (
    form.fullName.trim() !== user.fullName ||
    form.email.trim().toLowerCase() !== user.email.toLowerCase() ||
    form.avatarUrl !== (user.avatarUrl ?? "") ||
    form.role !== user.role ||
    form.newPassword.trim().length > 0
  );
}

function openAvatarPicker(userId: string) {
  avatarInputs[userId]?.click();
}

async function onAvatarSelected(userId: string, event: Event) {
  const target = event.target as HTMLInputElement | null;
  const file = target?.files?.[0];

  if (!file) {
    return;
  }

  await usersData.setEditAvatarFromFile(userId, file);

  if (target) {
    target.value = "";
  }
}

async function saveUserCard(user: AppUser) {
  const updatedUser = await usersData.updateUser(user);

  if (updatedUser && updatedUser.id === auth.user.value?.id) {
    auth.applyUserProfile(updatedUser);
  }
}

async function confirmDeactivate() {
  const targetUser = usersData.userToDeactivate.value;

  if (!targetUser) {
    return;
  }

  userDeactivateOpen.value = false;
  await usersData.deactivate(targetUser);

  if (targetUser.id === auth.user.value?.id) {
    auth.applyUserProfile({
      ...targetUser,
      isActive: false
    });
  }
}

async function confirmDelete() {
  const targetUser = usersData.userToDelete.value;

  if (!targetUser) {
    return;
  }

  userDeleteOpen.value = false;
  await usersData.deleteUser(targetUser);
}

onMounted(() => {
  void usersData.load();
});
</script>

<template>
  <PageHeader
    title="Пользователи"
    description="Карточки учётных записей с редактированием данных, роли, пароля и аватара прямо на месте."
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
    <CardContent class="grid gap-4 pt-6 md:grid-cols-2">
      <Skeleton v-for="item in 4" :key="item" class="h-80 rounded-3xl" />
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
          Карточки можно быстро сузить по имени, email, роли и статусу доступа.
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

    <div v-else class="grid gap-4 xl:grid-cols-2">
      <Card v-for="user in filteredUsers" :key="user.id" class="overflow-hidden">
        <CardHeader class="gap-4 border-b border-border/60 bg-muted/10">
          <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div class="flex min-w-0 items-center gap-4">
              <Avatar
                :src="usersData.editForms[user.id]?.avatarUrl || ''"
                :fallback="usersData.editForms[user.id]?.fullName || user.fullName"
                size="lg"
                class="h-16 w-16"
              />
              <div class="min-w-0 space-y-1">
                <CardTitle class="truncate text-lg">
                  {{ usersData.editForms[user.id]?.fullName || user.fullName }}
                </CardTitle>
                <CardDescription class="truncate">
                  {{ usersData.editForms[user.id]?.email || user.email }}
                </CardDescription>
                <div class="flex flex-wrap gap-2 pt-1">
                  <Badge variant="secondary">
                    {{ formatRoleLabel(usersData.editForms[user.id]?.role || user.role) }}
                  </Badge>
                  <Badge :variant="user.isActive ? 'success' : 'destructive'">
                    {{ user.isActive ? "Активен" : "Отключён" }}
                  </Badge>
                  <Badge v-if="user.id === auth.user.value?.id" variant="outline">Это вы</Badge>
                </div>
              </div>
            </div>

            <div class="flex flex-wrap gap-2">
              <input
                :ref="(element) => { avatarInputs[user.id] = element as HTMLInputElement | null; }"
                type="file"
                accept="image/*"
                class="hidden"
                @change="onAvatarSelected(user.id, $event)"
              >
              <Button type="button" variant="outline" size="sm" @click="openAvatarPicker(user.id)">
                Аватар
              </Button>
              <Button
                v-if="usersData.editForms[user.id]?.avatarUrl"
                type="button"
                variant="ghost"
                size="sm"
                @click="usersData.clearEditAvatar(user.id)"
              >
                Убрать фото
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent class="grid gap-6 p-6">
          <div class="grid gap-4 md:grid-cols-2">
            <div class="space-y-2">
              <Label :for="`user-name-${user.id}`">Имя</Label>
              <Input
                :id="`user-name-${user.id}`"
                v-model="usersData.editForms[user.id].fullName"
                :invalid="Boolean(usersData.getEditErrors(user.id).fullName)"
                placeholder="Имя пользователя"
              />
              <p v-if="usersData.getEditErrors(user.id).fullName" class="text-sm text-destructive">
                {{ usersData.getEditErrors(user.id).fullName }}
              </p>
            </div>

            <div class="space-y-2">
              <Label :for="`user-email-${user.id}`">Email / логин</Label>
              <Input
                :id="`user-email-${user.id}`"
                v-model="usersData.editForms[user.id].email"
                type="email"
                :invalid="Boolean(usersData.getEditErrors(user.id).email)"
                placeholder="mail@example.com"
              />
              <p v-if="usersData.getEditErrors(user.id).email" class="text-sm text-destructive">
                {{ usersData.getEditErrors(user.id).email }}
              </p>
            </div>

            <div class="space-y-2">
              <Label :for="`user-role-${user.id}`">Роль</Label>
              <Select v-model="usersData.editForms[user.id].role">
                <SelectTrigger :id="`user-role-${user.id}`">
                  <SelectValue placeholder="Выберите роль" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem v-for="role in roleOptions" :key="role.value" :value="role.value">
                    {{ role.label }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div class="space-y-2">
              <Label :for="`user-password-${user.id}`">Новый пароль</Label>
              <Input
                :id="`user-password-${user.id}`"
                v-model="usersData.editForms[user.id].newPassword"
                type="password"
                :invalid="Boolean(usersData.getEditErrors(user.id).newPassword)"
                placeholder="Оставьте пустым, если не меняете"
              />
              <p v-if="usersData.getEditErrors(user.id).newPassword" class="text-sm text-destructive">
                {{ usersData.getEditErrors(user.id).newPassword }}
              </p>
              <p v-else class="text-xs text-muted-foreground">
                Если пароль изменить, активные сессии пользователя будут завершены.
              </p>
            </div>
          </div>

          <div class="grid gap-3 rounded-3xl border bg-muted/10 p-4 text-sm text-muted-foreground sm:grid-cols-2">
            <div class="space-y-1">
              <p class="font-medium text-foreground">Последний вход</p>
              <p>{{ formatDateTime(user.lastLoginAt) }}</p>
            </div>
            <div class="space-y-1">
              <p class="font-medium text-foreground">Обновлена карточка</p>
              <p>{{ formatDateTime(user.updatedAt) }}</p>
            </div>
          </div>

          <div class="space-y-3">
            <div class="flex items-center justify-between gap-3">
              <div>
                <p class="text-sm font-medium">Что сможет делать пользователь</p>
                <p class="text-sm text-muted-foreground">
                  Возможности пересчитываются прямо по выбранной роли в карточке.
                </p>
              </div>
              <Badge variant="outline">
                {{ userPermissions(user.id).length }} прав
              </Badge>
            </div>

            <div class="grid gap-3">
              <div
                v-for="permission in userPermissions(user.id)"
                :key="`${user.id}-${permission.key}`"
                class="rounded-2xl border bg-muted/15 p-3"
              >
                <div class="flex flex-wrap items-center justify-between gap-2">
                  <p class="text-sm font-medium">{{ permission.label }}</p>
                  <Badge variant="outline">{{ permission.category }}</Badge>
                </div>
                <p class="mt-1 text-sm text-muted-foreground">{{ permission.description }}</p>
              </div>
            </div>
          </div>

          <div class="flex flex-wrap items-center gap-2 border-t border-border/60 pt-4">
            <Button
              type="button"
              :disabled="!isUserDirty(user) || !usersData.isEditFormValid(user.id) || usersData.updateLoadingId.value === user.id"
              @click="saveUserCard(user)"
            >
              {{ usersData.updateLoadingId.value === user.id ? "Сохранение..." : "Сохранить изменения" }}
            </Button>
            <Button
              type="button"
              variant="ghost"
              :disabled="!isUserDirty(user)"
              @click="usersData.resetEditForm(user.id)"
            >
              Отменить изменения
            </Button>
            <Button
              v-if="!user.isActive"
              type="button"
              variant="secondary"
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
              :disabled="user.id === auth.user.value?.id || usersData.deactivateLoadingId.value === user.id"
              @click="
                usersData.userToDeactivate.value = user;
                userDeactivateOpen = true;
              "
            >
              {{
                usersData.deactivateLoadingId.value === user.id
                  ? 'Деактивация...'
                  : 'Деактивировать'
              }}
            </Button>
            <Button
              type="button"
              variant="outline"
              :disabled="user.id === auth.user.value?.id || usersData.deleteLoadingId.value === user.id"
              @click="
                usersData.userToDelete.value = user;
                userDeleteOpen = true;
              "
            >
              {{
                usersData.deleteLoadingId.value === user.id
                  ? "Удаление..."
                  : "Удалить"
              }}
            </Button>
          </div>
        </CardContent>
      </Card>
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

  <AlertDialog v-model:open="userDeleteOpen">
    <AlertDialogContent
      title="Удалить пользователя?"
      :description="
        usersData.userToDelete.value
          ? `Учётная запись ${usersData.userToDelete.value.email} будет удалена из списка пользователей, вход будет заблокирован, а активные сессии завершены.`
          : 'Подтвердите действие.'
      "
      action-label="Удалить"
      cancel-label="Отмена"
      @action="confirmDelete()"
    />
  </AlertDialog>
</template>
