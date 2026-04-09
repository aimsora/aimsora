import {
  CREATE_USER_MUTATION,
  DELETE_USER_MUTATION,
  SET_USER_ACTIVE_MUTATION,
  UPDATE_USER_MUTATION,
  USERS_QUERY
} from "~/graphql/documents";
import type { AppUser, UserRole } from "~/graphql/types";

type EditableUserForm = {
  email: string;
  fullName: string;
  avatarUrl: string;
  role: UserRole;
  newPassword: string;
};

export function useUsersData() {
  const apollo = useApollo();
  const toast = useToast();
  const { loading, error, begin, fail, finish } = useRequestState(true);
  const users = ref<AppUser[]>([]);
  const editForms = reactive<Record<string, EditableUserForm>>({});
  const createDialogOpen = ref(false);
  const userToDeactivate = ref<AppUser | null>(null);
  const userToDelete = ref<AppUser | null>(null);
  const createLoading = ref(false);
  const updateLoadingId = ref("");
  const deactivateLoadingId = ref("");
  const deleteLoadingId = ref("");
  const activationLoadingId = ref("");
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

  function buildEditForm(user: AppUser): EditableUserForm {
    return {
      email: user.email,
      fullName: user.fullName,
      avatarUrl: user.avatarUrl ?? "",
      role: user.role,
      newPassword: ""
    };
  }

  function syncEditForms(nextUsers: AppUser[]) {
    for (const userId of Object.keys(editForms)) {
      delete editForms[userId];
    }

    for (const user of nextUsers) {
      editForms[user.id] = buildEditForm(user);
    }
  }

  function getEditErrors(userId: string) {
    const form = editForms[userId];

    if (!form) {
      return {
        fullName: "",
        email: "",
        newPassword: ""
      };
    }

    return {
      fullName: form.fullName.trim().length >= 3 ? "" : "Укажите имя не короче трёх символов.",
      email:
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())
          ? ""
          : "Введите корректную электронную почту.",
      newPassword:
        form.newPassword.trim().length === 0 || form.newPassword.length >= 5
          ? ""
          : "Пароль должен содержать не менее пяти символов."
    };
  }

  function isEditFormValid(userId: string) {
    const errors = getEditErrors(userId);
    return !errors.fullName && !errors.email && !errors.newPassword;
  }

  function resetCreateForm() {
    createForm.email = "";
    createForm.fullName = "";
    createForm.password = "";
    createForm.role = "USER";
  }

  function resetEditForm(userId: string) {
    const user = users.value.find((item) => item.id === userId);

    if (!user) {
      return;
    }

    editForms[userId] = buildEditForm(user);
  }

  function upsertUser(nextUser: AppUser) {
    users.value = users.value.map((item) => (item.id === nextUser.id ? nextUser : item));
    if (!users.value.some((item) => item.id === nextUser.id)) {
      users.value = [nextUser, ...users.value];
    }
    syncEditForms(users.value);
  }

  function removeUser(userId: string) {
    users.value = users.value.filter((item) => item.id !== userId);
    syncEditForms(users.value);
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
      syncEditForms(data.users);
    } catch (caught) {
      fail(caught, "Не удалось загрузить пользователей");
    } finally {
      finish();
    }
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
      syncEditForms(users.value);
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

  async function setEditAvatarFromFile(userId: string, file: File) {
    if (!file.type.startsWith("image/")) {
      toast.warning("Нужен файл изображения", "Выберите PNG, JPG, WEBP или другой image-файл.");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.warning("Файл слишком большой", "Максимальный размер аватара — 2 МБ.");
      return;
    }

    const avatarDataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
      reader.onerror = () => reject(new Error("Не удалось прочитать файл"));
      reader.readAsDataURL(file);
    });

    if (editForms[userId]) {
      editForms[userId].avatarUrl = avatarDataUrl;
    }
  }

  function clearEditAvatar(userId: string) {
    if (editForms[userId]) {
      editForms[userId].avatarUrl = "";
    }
  }

  async function updateUser(user: AppUser) {
    const form = editForms[user.id];

    if (!form) {
      return null;
    }

    if (!isEditFormValid(user.id)) {
      toast.warning("Проверьте форму", "Исправьте имя, email и пароль перед сохранением.");
      return null;
    }

    updateLoadingId.value = user.id;

    try {
      const result = await apollo.mutate<{ updateUser: AppUser }>({
        mutation: UPDATE_USER_MUTATION,
        variables: {
          input: {
            userId: user.id,
            email: form.email.trim(),
            fullName: form.fullName.trim(),
            avatarUrl: form.avatarUrl.trim() ? form.avatarUrl.trim() : null,
            role: form.role,
            newPassword: form.newPassword.trim() ? form.newPassword : undefined
          }
        }
      });
      const data = requireRequestData(result.data, "Не удалось обновить пользователя");
      const updatedUser = requireRequestData(
        data.updateUser,
        "Сервер не вернул обновлённого пользователя"
      );

      upsertUser(updatedUser);
      if (editForms[user.id]) {
        editForms[user.id].newPassword = "";
      }
      toast.success("Пользователь обновлён", `Карточка ${updatedUser.email} сохранена.`);
      return updatedUser;
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Не удалось обновить пользователя";
      toast.error("Ошибка обновления", message);
      return null;
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

  async function deleteUser(user: AppUser) {
    deleteLoadingId.value = user.id;

    try {
      const result = await apollo.mutate<{ deleteUser: boolean }>({
        mutation: DELETE_USER_MUTATION,
        variables: {
          userId: user.id
        }
      });
      const data = requireRequestData(result.data, "Не удалось удалить пользователя");

      if (!data.deleteUser) {
        throw new Error("Сервер не подтвердил удаление пользователя");
      }

      removeUser(user.id);
      userToDelete.value = null;
      toast.success("Пользователь удалён", `${user.email} больше не отображается в системе.`);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Не удалось удалить пользователя";
      toast.error("Ошибка удаления", message);
    } finally {
      deleteLoadingId.value = "";
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

  return {
    loading,
    error,
    users,
    editForms,
    createDialogOpen,
    userToDeactivate,
    userToDelete,
    createLoading,
    updateLoadingId,
    deactivateLoadingId,
    deleteLoadingId,
    activationLoadingId,
    createForm,
    createErrors,
    createFormValid,
    load,
    createUser,
    updateUser,
    getEditErrors,
    isEditFormValid,
    resetEditForm,
    setEditAvatarFromFile,
    clearEditAvatar,
    deactivate,
    deleteUser,
    setUserActive
  };
}
