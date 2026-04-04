import {
  CREATE_USER_MUTATION,
  RESET_USER_PASSWORD_MUTATION,
  SET_USER_ACTIVE_MUTATION,
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
  const userToResetPassword = ref<AppUser | null>(null);
  const createLoading = ref(false);
  const updateLoadingId = ref("");
  const deactivateLoadingId = ref("");
  const activationLoadingId = ref("");
  const resetPasswordLoadingId = ref("");
  const createForm = reactive<{
    email: string;
    fullName: string;
    password: string;
    role: UserRole;
  }>({
    email: "",
    fullName: "",
    password: "",
    role: "USER"
  });
  const resetPasswordForm = reactive<{
    newPassword: string;
  }>({
    newPassword: ""
  });

  const createErrors = computed(() => ({
    fullName:
      createForm.fullName.trim().length >= 3 ? "" : "Укажите имя не короче трёх символов.",
    email:
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(createForm.email.trim())
        ? ""
        : "Введите корректную электронную почту.",
    password:
      createForm.password.length >= 5 ? "" : "Пароль должен содержать не менее пяти символов."
  }));

  const createFormValid = computed(
    () =>
      !createErrors.value.fullName &&
      !createErrors.value.email &&
      !createErrors.value.password
  );
  const resetPasswordError = computed(() =>
    resetPasswordForm.newPassword.length >= 5
      ? ""
      : "Пароль должен содержать не менее пяти символов."
  );
  const resetPasswordValid = computed(() => !resetPasswordError.value);

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
    createForm.role = "USER";
  }

  function upsertUser(nextUser: AppUser) {
    users.value = users.value.map((item) => (item.id === nextUser.id ? nextUser : item));
    if (!users.value.some((item) => item.id === nextUser.id)) {
      users.value = [nextUser, ...users.value];
    }
    syncPendingRoles(users.value);
  }

  function resetResetPasswordForm() {
    resetPasswordForm.newPassword = "";
  }

  async function createUser() {
    if (!createFormValid.value) {
      toast.warning("Проверьте форму", "Заполните обязательные поля корректно.");
      return;
    }

    createLoading.value = true;

    try {
      const result = await apollo.mutate<{ createUser: AppUser }>({
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
      const data = requireRequestData(result.data, "Не удалось создать пользователя");
      const createdUser = requireRequestData(
        data.createUser,
        "Сервер не вернул созданного пользователя"
      );

      users.value = [createdUser, ...users.value.filter((user) => user.id !== createdUser.id)];
      syncPendingRoles(users.value);
      resetCreateForm();
      createDialogOpen.value = false;
      toast.success("Пользователь создан", "Новая учётная запись добавлена в систему.");
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
      const result = await apollo.mutate<{ updateUserRole: AppUser }>({
        mutation: UPDATE_USER_ROLE_MUTATION,
        variables: {
          input: {
            userId: user.id,
            role: pendingRoles[user.id]
          }
        }
      });
      const data = requireRequestData(result.data, "Не удалось обновить роль");
      const updatedUser = requireRequestData(
        data.updateUserRole,
        "Сервер не вернул обновлённого пользователя"
      );

      upsertUser(updatedUser);
      toast.success("Роль обновлена", `Для ${user.email} сохранена новая роль.`);
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
      await setUserActive(user, false);
      userToDeactivate.value = null;
    } finally {
      deactivateLoadingId.value = "";
    }
  }

  async function setUserActive(user: AppUser, isActive: boolean) {
    activationLoadingId.value = user.id;

    try {
      const result = await apollo.mutate<{ setUserActive: AppUser }>({
        mutation: SET_USER_ACTIVE_MUTATION,
        variables: {
          input: {
            userId: user.id,
            isActive
          }
        }
      });
      const data = requireRequestData(result.data, "Не удалось обновить статус пользователя");
      const updatedUser = requireRequestData(
        data.setUserActive,
        "Сервер не вернул обновлённый статус пользователя"
      );

      upsertUser(updatedUser);
      toast.success(
        isActive ? "Пользователь активирован" : "Пользователь деактивирован",
        isActive
          ? `${user.email} снова может входить в систему.`
          : `${user.email} больше не имеет доступа.`
      );
    } catch (caught) {
      const message =
        caught instanceof Error ? caught.message : "Не удалось обновить статус пользователя";
      toast.error("Ошибка обновления статуса", message);
    } finally {
      activationLoadingId.value = "";
    }
  }

  async function resetUserPassword() {
    const targetUser = userToResetPassword.value;

    if (!targetUser) {
      return;
    }

    if (!resetPasswordValid.value) {
      toast.warning("Проверьте пароль", "Новый пароль должен содержать не менее пяти символов.");
      return;
    }

    resetPasswordLoadingId.value = targetUser.id;

    try {
      const result = await apollo.mutate<{ resetUserPassword: AppUser }>({
        mutation: RESET_USER_PASSWORD_MUTATION,
        variables: {
          input: {
            userId: targetUser.id,
            newPassword: resetPasswordForm.newPassword
          }
        }
      });
      const data = requireRequestData(result.data, "Не удалось сбросить пароль");
      const updatedUser = requireRequestData(
        data.resetUserPassword,
        "Сервер не вернул пользователя после сброса пароля"
      );

      upsertUser(updatedUser);
      userToResetPassword.value = null;
      resetResetPasswordForm();
      toast.success(
        "Пароль обновлён",
        `Для ${targetUser.email} назначен новый пароль, старые сессии завершены.`
      );
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Не удалось сбросить пароль";
      toast.error("Ошибка сброса пароля", message);
    } finally {
      resetPasswordLoadingId.value = "";
    }
  }

  return {
    loading,
    error,
    users,
    pendingRoles,
    createDialogOpen,
    userToDeactivate,
    userToResetPassword,
    createLoading,
    updateLoadingId,
    deactivateLoadingId,
    activationLoadingId,
    resetPasswordLoadingId,
    createForm,
    createErrors,
    createFormValid,
    resetPasswordForm,
    resetPasswordError,
    resetPasswordValid,
    load,
    createUser,
    updateRole,
    deactivate,
    setUserActive,
    resetUserPassword,
    resetResetPasswordForm
  };
}
