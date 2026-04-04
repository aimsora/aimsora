import type { FetchResult } from "@apollo/client/core";
import {
  LOGIN_MUTATION,
  LOGOUT_MUTATION,
  ME_QUERY,
  REFRESH_MUTATION
} from "~/graphql/documents";
import type { AuthPayload, SessionUser } from "~/graphql/types";
import { getRolePermissions, roleHasPermission, type AppPermission } from "~/utils/access";
import { AUTH_STORAGE_KEYS, LEGACY_AUTH_STORAGE_KEYS } from "~/utils/auth";

let initializationTask: Promise<void> | null = null;

function readStoredUser() {
  if (!import.meta.client) {
    return null;
  }

  const raw =
    window.localStorage.getItem(AUTH_STORAGE_KEYS.user) ??
    window.localStorage.getItem(LEGACY_AUTH_STORAGE_KEYS.user);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as SessionUser;
  } catch {
    return null;
  }
}

export function useAuthSession() {
  const apollo = useApollo();
  const accessToken = useState<string>("auth.accessToken", () => "");
  const refreshToken = useState<string>("auth.refreshToken", () => "");
  const user = useState<SessionUser | null>("auth.user", () => null);
  const loading = useState<boolean>("auth.loading", () => false);
  const loggingOut = useState<boolean>("auth.loggingOut", () => false);
  const initialized = useState<boolean>("auth.initialized", () => false);
  const hydrated = useState<boolean>("auth.hydrated", () => false);

  function readStoredToken(key: keyof typeof AUTH_STORAGE_KEYS) {
    if (!import.meta.client) {
      return "";
    }

    return (
      window.localStorage.getItem(AUTH_STORAGE_KEYS[key]) ??
      window.localStorage.getItem(LEGACY_AUTH_STORAGE_KEYS[key]) ??
      ""
    );
  }

  function migrateLegacyStorage() {
    if (!import.meta.client) {
      return;
    }

    if (accessToken.value) {
      window.localStorage.setItem(AUTH_STORAGE_KEYS.accessToken, accessToken.value);
    }

    if (refreshToken.value) {
      window.localStorage.setItem(AUTH_STORAGE_KEYS.refreshToken, refreshToken.value);
    }

    if (user.value) {
      window.localStorage.setItem(AUTH_STORAGE_KEYS.user, JSON.stringify(user.value));
    }

    window.localStorage.removeItem(LEGACY_AUTH_STORAGE_KEYS.accessToken);
    window.localStorage.removeItem(LEGACY_AUTH_STORAGE_KEYS.refreshToken);
    window.localStorage.removeItem(LEGACY_AUTH_STORAGE_KEYS.user);
  }

  function hydrateFromStorage() {
    if (!import.meta.client || hydrated.value) {
      return;
    }

    accessToken.value = readStoredToken("accessToken");
    refreshToken.value = readStoredToken("refreshToken");
    user.value = readStoredUser();
    migrateLegacyStorage();
    hydrated.value = true;
  }

  function persistSession(payload: AuthPayload) {
    accessToken.value = payload.accessToken;
    refreshToken.value = payload.refreshToken;
    user.value = payload.user;

    if (!import.meta.client) {
      return;
    }

    window.localStorage.setItem(AUTH_STORAGE_KEYS.accessToken, payload.accessToken);
    window.localStorage.setItem(AUTH_STORAGE_KEYS.refreshToken, payload.refreshToken);
    window.localStorage.setItem(AUTH_STORAGE_KEYS.user, JSON.stringify(payload.user));
  }

  function applyUserProfile(nextUser: SessionUser) {
    user.value = {
      ...(user.value ?? {}),
      ...nextUser
    };

    if (!import.meta.client) {
      return;
    }

    window.localStorage.setItem(AUTH_STORAGE_KEYS.user, JSON.stringify(user.value));
  }

  async function clearSession() {
    accessToken.value = "";
    refreshToken.value = "";
    user.value = null;

    if (import.meta.client) {
      window.localStorage.removeItem(AUTH_STORAGE_KEYS.accessToken);
      window.localStorage.removeItem(AUTH_STORAGE_KEYS.refreshToken);
      window.localStorage.removeItem(AUTH_STORAGE_KEYS.user);
      window.localStorage.removeItem(LEGACY_AUTH_STORAGE_KEYS.accessToken);
      window.localStorage.removeItem(LEGACY_AUTH_STORAGE_KEYS.refreshToken);
      window.localStorage.removeItem(LEGACY_AUTH_STORAGE_KEYS.user);
    }

    await apollo.clearStore().catch(() => undefined);
  }

  async function fetchCurrentUser(options?: { clearOnFailure?: boolean }) {
    hydrateFromStorage();

    if (!accessToken.value) {
      return false;
    }

    try {
      const result = await apollo.query<{ me: SessionUser }>({
        query: ME_QUERY,
        fetchPolicy: "network-only"
      });
      const data = result.data;

      if (!data) {
        throw new Error("Не удалось загрузить профиль пользователя");
      }

     user.value = data.me;
      if (import.meta.client) {
        window.localStorage.setItem(AUTH_STORAGE_KEYS.user, JSON.stringify(data.me));
      }
      return true;
    } catch {
      if (options?.clearOnFailure ?? true) {
        await clearSession();
      }
      return false;
    }
  }

  async function refresh() {
    hydrateFromStorage();

    if (!refreshToken.value) {
      return false;
    }

    try {
      const result = await apollo.mutate<{ refreshSession: AuthPayload }>({
        mutation: REFRESH_MUTATION,
        variables: {
          input: {
            refreshToken: refreshToken.value
          }
        }
      });
      const data = result.data;

      if (!data?.refreshSession) {
        return false;
      }

      persistSession(data.refreshSession);
      return true;
    } catch {
      await clearSession();
      return false;
    }
  }

  async function initialize() {
    hydrateFromStorage();

    if (initialized.value) {
      return;
    }

    if (initializationTask) {
      await initializationTask;
      return;
    }

    initializationTask = (async () => {
      if (!accessToken.value && refreshToken.value) {
        const refreshed = await refresh();
        if (refreshed) {
          await fetchCurrentUser();
        }
      } else if (accessToken.value) {
        const currentUserLoaded = await fetchCurrentUser({ clearOnFailure: false });

        if (!currentUserLoaded && refreshToken.value) {
          const refreshed = await refresh();

          if (refreshed) {
            await fetchCurrentUser();
          } else {
            await clearSession();
          }
        } else if (!currentUserLoaded) {
          await clearSession();
        }
      }

      initialized.value = true;
    })();

    try {
      await initializationTask;
    } finally {
      initializationTask = null;
    }
  }

  async function login(email: string, password: string) {
    loading.value = true;

    try {
      const result = await apollo.mutate<{ login: AuthPayload }>({
        mutation: LOGIN_MUTATION,
        variables: {
          input: {
            email,
            password
          }
        }
      });

      if (!result.data?.login) {
        throw new Error("Не удалось выполнить вход");
      }

      persistSession(result.data.login);
      initialized.value = true;
      await apollo.clearStore();
    } finally {
      loading.value = false;
    }
  }

  async function logout() {
    hydrateFromStorage();
    loggingOut.value = true;

    try {
      if (refreshToken.value) {
        await apollo.mutate({
          mutation: LOGOUT_MUTATION,
          variables: {
            input: {
              refreshToken: refreshToken.value
            }
          }
        }) satisfies FetchResult;
      }
    } catch {
      // Local cleanup is still required even if the server session already expired.
    } finally {
      await clearSession();
      initialized.value = true;
      loggingOut.value = false;
    }
  }

  function can(permission: AppPermission) {
    return roleHasPermission(user.value?.role, permission);
  }

  return {
    accessToken,
    refreshToken,
    user,
    loading,
    loggingOut,
    initialized,
    hydrateFromStorage,
    initialize,
    fetchCurrentUser,
    refresh,
    login,
    logout,
    clearSession,
    applyUserProfile,
    can,
    permissions: computed(() => getRolePermissions(user.value?.role)),
    isAuthenticated: computed(() => Boolean(accessToken.value && user.value)),
    isAdmin: computed(() => user.value?.role === "ADMIN"),
    isAnalyst: computed(() => user.value?.role === "ANALYST"),
    isDeveloper: computed(() => user.value?.role === "DEVELOPER"),
    isAnalystOrAdmin: computed(() =>
      user.value?.role === "ANALYST" || user.value?.role === "ADMIN"
    )
  };
}
