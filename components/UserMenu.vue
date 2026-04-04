<script setup lang="ts">
import { ChevronsUpDown, LogOut, UserRound } from "lucide-vue-next";
import { formatRoleLabel } from "~/utils/formatters";

const auth = useAuthSession();
const props = withDefaults(
  defineProps<{
    collapsed?: boolean;
  }>(),
  {
    collapsed: false
  }
);

const profileHref = "/profile";

const contentProps = computed(() =>
  props.collapsed
    ? {
        side: "right" as const,
        align: "start" as const
      }
    : {
        side: "top" as const,
        align: "start" as const
      }
);

async function logout() {
  await auth.logout();
  await navigateTo("/login");
}
</script>

<template>
  <DropdownMenu>
    <DropdownMenuTrigger
      class="flex w-full items-center gap-3 rounded-xl border border-sidebar-border bg-background/70 px-3 py-3 text-left transition-colors outline-none hover:bg-accent/60 focus-visible:ring-2 focus-visible:ring-ring"
      :class="props.collapsed ? 'justify-center px-2' : 'justify-between'"
      aria-label="Открыть меню пользователя"
    >
      <span class="flex min-w-0 items-center gap-3">
        <Avatar :fallback="auth.user.value?.fullName || 'AIMSORA'" size="sm" />
        <span v-if="!props.collapsed" class="min-w-0 flex-1">
          <span class="block truncate text-sm font-medium leading-none">
            {{ auth.user.value?.fullName || "Пользователь" }}
          </span>
          <span class="mt-1 block truncate text-xs text-muted-foreground">
            {{ auth.user.value?.email }}
          </span>
        </span>
      </span>
      <ChevronsUpDown
        v-if="!props.collapsed"
        class="h-4 w-4 shrink-0 text-muted-foreground"
      />
    </DropdownMenuTrigger>
    <DropdownMenuContent
      :side="contentProps.side"
      :align="contentProps.align"
      class="w-64"
    >
      <DropdownMenuLabel>
        <div class="space-y-1">
          <p class="text-sm font-medium leading-none">{{ auth.user.value?.fullName }}</p>
          <p class="text-xs font-normal text-muted-foreground">{{ auth.user.value?.email }}</p>
        </div>
      </DropdownMenuLabel>
      <DropdownMenuSeparator />
      <div class="px-2 py-1.5 text-xs text-muted-foreground">
        Роль: {{ formatRoleLabel(auth.user.value?.role) }}
      </div>
      <DropdownMenuSeparator />
      <DropdownMenuItem as-child>
        <NuxtLink :to="profileHref">
          <UserRound class="mr-2 h-4 w-4" />
          Профиль
        </NuxtLink>
      </DropdownMenuItem>
      <DropdownMenuItem destructive @select="logout">
        <LogOut class="mr-2 h-4 w-4" />
        Выйти
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</template>
