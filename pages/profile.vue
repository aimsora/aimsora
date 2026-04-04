<script setup lang="ts">
import { Camera, PencilLine, Trash2 } from "lucide-vue-next";
import { UPDATE_PROFILE_MUTATION } from "~/graphql/documents";
import type { AppUser } from "~/graphql/types";

definePageMeta({
  title: "Профиль",
  description: "Профиль текущего пользователя и управление сессией"
});

useHead({
  title: "Профиль"
});

const auth = useAuthSession();
const apollo = useApollo();
const toast = useToast();
const permissions = computed(() => auth.permissions.value);
const avatarInput = ref<HTMLInputElement | null>(null);
const saveLoading = ref(false);
const form = reactive({
  fullName: "",
  email: "",
  avatarUrl: ""
});

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

const profileErrors = computed(() => ({
  fullName: form.fullName.trim().length >= 3 ? "" : "Укажите имя не короче трёх символов.",
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())
    ? ""
    : "Введите корректную электронную почту."
}));

const profileValid = computed(() => !profileErrors.value.fullName && !profileErrors.value.email);

watch(
  () => auth.user.value,
  (user) => {
    form.fullName = user?.fullName ?? "";
    form.email = user?.email ?? "";
    form.avatarUrl = user?.avatarUrl ?? "";
  },
  { immediate: true }
);

function openAvatarPicker() {
  avatarInput.value?.click();
}

function removeAvatar() {
  form.avatarUrl = "";
}

async function onAvatarSelected(event: Event) {
  const target = event.target as HTMLInputElement | null;
  const file = target?.files?.[0];

  if (!file) {
    return;
  }

  if (!file.type.startsWith("image/")) {
    toast.warning("Нужен файл изображения", "Выберите PNG, JPG, WEBP или другой image-файл.");
    target.value = "";
    return;
  }

  if (file.size > 2 * 1024 * 1024) {
    toast.warning("Файл слишком большой", "Максимальный размер аватара — 2 МБ.");
    target.value = "";
    return;
  }

  const avatarDataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => reject(new Error("Не удалось прочитать файл"));
    reader.readAsDataURL(file);
  });

  form.avatarUrl = avatarDataUrl;
  target.value = "";
}

async function saveProfile() {
  if (!profileValid.value) {
    toast.warning("Проверьте форму", "Исправьте имя и email перед сохранением.");
    return;
  }

  saveLoading.value = true;

  try {
    const result = await apollo.mutate<{ updateProfile: AppUser }>({
      mutation: UPDATE_PROFILE_MUTATION,
      variables: {
        input: {
          fullName: form.fullName.trim(),
          email: form.email.trim(),
          avatarUrl: form.avatarUrl || null
        }
      }
    });

    const updatedUser = requireRequestData(result.data?.updateProfile, "Не удалось обновить профиль");
    auth.applyUserProfile(updatedUser);
    toast.success("Профиль обновлён", "Изменения имени, email и аватара сохранены.");
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : "Не удалось обновить профиль";
    toast.error("Ошибка обновления профиля", message);
  } finally {
    saveLoading.value = false;
  }
}

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
      <Button v-if="auth.can('users.view')" variant="outline" @click="navigateTo('/users')">
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
          Здесь можно обновить имя, email и загрузить персональный аватар.
        </CardDescription>
      </CardHeader>
      <CardContent class="space-y-6">
        <div class="flex flex-col gap-4 rounded-xl border bg-muted/20 p-4 sm:flex-row sm:items-center">
          <Avatar
            :src="form.avatarUrl"
            :fallback="form.fullName || auth.user.value?.fullName || 'NPPWEB'"
            size="lg"
            class="h-16 w-16"
          />
          <div class="min-w-0 flex-1 space-y-1">
            <p class="truncate text-lg font-semibold">
              {{ form.fullName || "Пользователь" }}
            </p>
            <p class="truncate text-sm text-muted-foreground">
              {{ form.email || "Email не указан" }}
            </p>
          </div>
          <div class="flex flex-wrap gap-2">
            <input
              ref="avatarInput"
              type="file"
              accept="image/*"
              class="hidden"
              @change="onAvatarSelected"
            >
            <Button type="button" variant="outline" @click="openAvatarPicker()">
              <Camera class="mr-2 h-4 w-4" />
              Загрузить аватар
            </Button>
            <Button
              v-if="form.avatarUrl"
              type="button"
              variant="ghost"
              @click="removeAvatar()"
            >
              <Trash2 class="mr-2 h-4 w-4" />
              Убрать
            </Button>
          </div>
        </div>

        <form class="grid gap-4" @submit.prevent="saveProfile()">
          <div class="space-y-2">
            <Label for="profile-full-name">Имя</Label>
            <Input
              id="profile-full-name"
              v-model="form.fullName"
              :invalid="Boolean(profileErrors.fullName)"
              placeholder="Ваше имя"
            />
            <p v-if="profileErrors.fullName" class="text-sm text-destructive">
              {{ profileErrors.fullName }}
            </p>
          </div>

          <div class="space-y-2">
            <Label for="profile-email">Email</Label>
            <Input
              id="profile-email"
              v-model="form.email"
              type="email"
              :invalid="Boolean(profileErrors.email)"
              placeholder="you@example.com"
            />
            <p v-if="profileErrors.email" class="text-sm text-destructive">
              {{ profileErrors.email }}
            </p>
          </div>

          <div class="flex justify-end">
            <Button type="submit" :disabled="saveLoading || !profileValid">
              <PencilLine class="mr-2 h-4 w-4" />
              {{ saveLoading ? "Сохранение..." : "Сохранить профиль" }}
            </Button>
          </div>
        </form>

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
        <div class="rounded-xl border bg-background p-4">
          <p class="text-xs uppercase tracking-[0.16em] text-muted-foreground">Ваш доступ</p>
          <div class="mt-3 flex flex-wrap gap-2">
            <Badge v-for="permission in permissions" :key="permission.key" variant="outline">
              {{ permission.label }}
            </Badge>
          </div>
        </div>
        <Button block variant="destructive" :disabled="auth.loggingOut.value" @click="logout()">
          {{ auth.loggingOut.value ? "Выходим..." : "Выйти из аккаунта" }}
        </Button>
      </CardContent>
    </Card>
  </div>
</template>
