import type { UserRole } from "~/graphql/types";

export default defineNuxtRouteMiddleware(async (to) => {
  const auth = useAuthSession();
  await auth.initialize();

  if (to.path === "/") {
    return auth.isAuthenticated.value ? navigateTo("/dashboard") : navigateTo("/login");
  }

  if (to.path === "/login" && auth.isAuthenticated.value) {
    return navigateTo("/dashboard");
  }

  if (to.meta.public === true) {
    return;
  }

  if (!auth.isAuthenticated.value) {
    return navigateTo(`/login?redirect=${encodeURIComponent(to.fullPath)}`);
  }

  const roles = Array.isArray(to.meta.roles) ? (to.meta.roles as UserRole[]) : [];

  if (roles.length > 0 && !roles.includes(auth.user.value?.role ?? "USER")) {
    return navigateTo(`/forbidden?from=${encodeURIComponent(to.fullPath)}`);
  }
});
