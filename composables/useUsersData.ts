import {
  CREATE_USER_MUTATION,
  DEACTIVATE_USER_MUTATION,
  UPDATE_USER_ROLE_MUTATION,
  USERS_QUERY
} from "~/graphql/documents";
import type { AppUser, UserRole } from "~/graphql/types";

export function useUsersData() {
  const apollo = useApollo();
  const toast = useToast();
  const { loading, error, begin, fail, finish } = useRequestState(true);
  const users = ref<AppUser[]>([]);
  const pendingRoles = reactive<Record<string, UserRole>>({});
  const createDialogOpen = ref(false);
  const userToDeactivate = ref<AppUser | null>(null);
  const createLoading = ref(false);
  const updateLoadingId = ref("");
  const deactivateLoadingId = ref("");
  const createForm = reactive<{
    email: string;
    fullName: string;
    password: string;
    role: UserRole;
  }>({
    email: "",
    fullName: "",
    password: "",
    role: "ANALYST"
  });

  const createErrors = computed(() => ({
    fullName:
      createForm.fullName.trim().length >= 3 ? "" : "Укажите имя не короче трёх символов.",
    email:
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(createForm.email.trim())
        ? ""
        : "Введите корректную электронную почту.",
    password:
      createForm.password.length >= 4 ? "" : "Пароль должен содержать не менее четырёх символов."
  }));

  const createFormValid = computed(
    () =>
      !createErrors.value.fullName &&
      !createErrors.value.email &&
      !createErrors.value.password
  );

  function syncPendingRoles(nextUsers: AppUser[]) {
    for (const userId of Object.keys(pendingRoles)) {
      delete pendingRoles[userId];
    }

    for (const user of nextUsers) {
      pendingRoles[user.id] = user.role;
    }
  }

  async function load() {
    begin();

    try {
      const result = await apollo.query<{ users: AppUser[] }>({
        query: USERS_QUERY,
        fetchPolicy: "network-only"
      });
      const data = requireRequestData(result.data, "Не удалось загрузить пользователей");
      users.value = data.users;
      syncPendingRoles(data.users);
    } catch (caught) {
      fail(caught, "Не удалось загрузить пользователей");
    } finally {
      finish();
    }
  }

  function resetCreateForm() {
    createForm.email = "";
    createForm.fullName = "";
    createForm.password = "";
    createForm.role = "ANALYST";
  }

  async function createUser() {
    if (!createFormValid.value) {
      toast.warning("Проверьте форму", "Заполните обязательные поля корректно.");
      return;
    }

    createLoading.value = true;

    try {
      await apollo.mutate({
        mutation: CREATE_USER_MUTATION,
        variables: {
          input: {
            email: createForm.email,
            fullName: createForm.fullName,
            password: createForm.password,
            role: createForm.role
          }
        }
      });

      resetCreateForm();
      createDialogOpen.value = false;
      toast.success("Пользователь создан", "Новая учётная запись добавлена в систему.");
      await load();
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Не удалось создать пользователя";
      toast.error("Ошибка создания", message);
    } finally {
      createLoading.value = false;
    }
  }

  async function updateRole(user: AppUser) {
    updateLoadingId.value = user.id;

    try {
      await apollo.mutate({
        mutation: UPDATE_USER_ROLE_MUTATION,
        variables: {
          input: {
            userId: user.id,
            role: pendingRoles[user.id]
          }
        }
      });

      toast.success("Роль обновлена", `Для ${user.email} сохранена новая роль.`);
      await load();
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Не удалось обновить роль";
      toast.error("Ошибка обновления роли", message);
    } finally {
      updateLoadingId.value = "";
    }
  }

  async function deactivate(user: AppUser) {
    deactivateLoadingId.value = user.id;

    try {
      await apollo.mutate({
        mutation: DEACTIVATE_USER_MUTATION,
        variables: {
          userId: user.id
        }
      });
      userToDeactivate.value = null;
      toast.success("Пользователь деактивирован", `${user.email} больше не имеет доступа.`);
      await load();
    } catch (caught) {
      const message =
        caught instanceof Error ? caught.message : "Не удалось деактивировать пользователя";
      toast.error("Ошибка деактивации", message);
    } finally {
      deactivateLoadingId.value = "";
    }
  }

  return {
    loading,
    error,
    users,
    pendingRoles,
    createDialogOpen,
    userToDeactivate,
    createLoading,
    updateLoadingId,
    deactivateLoadingId,
    createForm,
    createErrors,
    createFormValid,
    load,
    createUser,
    updateRole,
    deactivate
  };
}
