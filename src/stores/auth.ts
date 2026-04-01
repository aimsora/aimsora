import { defineStore } from "pinia";
import { apolloClient } from "../services/apollo";
import type { AuthPayload, SessionUser } from "../services/graphql-types";
import {
  LOGIN_MUTATION,
  LOGOUT_MUTATION,
  ME_QUERY,
  REFRESH_MUTATION
} from "../services/queries";

let initializationTask: Promise<void> | null = null;

export const useAuthStore = defineStore("auth", {
  state: () => ({
    accessToken: localStorage.getItem("aimsora.accessToken") ?? "",
    refreshToken: localStorage.getItem("aimsora.refreshToken") ?? "",
    user: readStoredUser() as SessionUser | null,
    loading: false,
    loggingOut: false,
    initialized: false
  }),
  getters: {
    isAuthenticated: (state) => Boolean(state.accessToken && state.user),
    isAdmin: (state) => state.user?.role === "ADMIN"
  },
  actions: {
    async initialize() {
      if (this.initialized) {
        return;
      }

      if (initializationTask) {
        await initializationTask;
        return;
      }

      initializationTask = (async () => {
        if (!this.accessToken && this.refreshToken) {
          await this.refresh();
        } else if (this.accessToken && !this.user) {
          await this.fetchCurrentUser();
        }

        this.initialized = true;
      })();

      try {
        await initializationTask;
      } finally {
        initializationTask = null;
      }
    },
    async login(email: string, password: string) {
      this.loading = true;
      try {
        const { data } = await apolloClient.mutate<{ login: AuthPayload }>({
          mutation: LOGIN_MUTATION,
          variables: { input: { email, password } }
        });
        if (!data?.login) {
          throw new Error("Authentication failed");
        }
        this.setSession(data.login);
        this.initialized = true;
        await apolloClient.clearStore();
      } finally {
        this.loading = false;
      }
    },
    async fetchCurrentUser() {
      if (!this.accessToken) {
        return false;
      }

      try {
        const { data } = await apolloClient.query<{ me: SessionUser }>({
          query: ME_QUERY,
          fetchPolicy: "network-only"
        });

        this.user = data.me;
        localStorage.setItem("aimsora.user", JSON.stringify(data.me));
        return true;
      } catch {
        this.clearSession();
        return false;
      }
    },
    async refresh() {
      if (!this.refreshToken) {
        return false;
      }
      try {
        const { data } = await apolloClient.mutate<{ refreshSession: AuthPayload }>({
          mutation: REFRESH_MUTATION,
          variables: { input: { refreshToken: this.refreshToken } }
        });
        if (!data?.refreshSession) {
          return false;
        }
        this.setSession(data.refreshSession);
        this.initialized = true;
        return true;
      } catch {
        this.clearSession();
        return false;
      }
    },
    async logout() {
      this.loggingOut = true;
      try {
        if (this.refreshToken) {
          await apolloClient.mutate<{ logout: boolean }>({
            mutation: LOGOUT_MUTATION,
            variables: { input: { refreshToken: this.refreshToken } }
          });
        }
      } catch {
        // Local cleanup still needs to happen even if the session is already expired.
      } finally {
        this.clearSession();
        this.initialized = true;
        this.loggingOut = false;
      }
    },
    setSession(payload: AuthPayload) {
      this.accessToken = payload.accessToken;
      this.refreshToken = payload.refreshToken;
      this.user = payload.user;
      localStorage.setItem("aimsora.accessToken", payload.accessToken);
      localStorage.setItem("aimsora.refreshToken", payload.refreshToken);
      localStorage.setItem("aimsora.user", JSON.stringify(payload.user));
    },
    clearSession() {
      this.accessToken = "";
      this.refreshToken = "";
      this.user = null;
      localStorage.removeItem("aimsora.accessToken");
      localStorage.removeItem("aimsora.refreshToken");
      localStorage.removeItem("aimsora.user");
      apolloClient.clearStore().catch(() => undefined);
    }
  }
});

function readStoredUser() {
  const raw = localStorage.getItem("aimsora.user");
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as SessionUser;
  } catch {
    return null;
  }
}
