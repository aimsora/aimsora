<script setup lang="ts">
import { ChevronsUpDown, LogOut, UserRound } from "lucide-vue-next";

const auth = useAuthSession();
const route = useRoute();
const props = withDefaults(
  defineProps<{
    collapsed?: boolean;
  }>(),
  {
    collapsed: false
  }
);

const profileHref = "/profile";
const menuRef = ref<HTMLElement | null>(null);
const isOpen = ref(false);

const menuPositionClass = computed(() =>
  props.collapsed ? "bottom-0 left-full ml-3 w-56" : "bottom-full left-0 mb-3 w-full min-w-64"
);

function closeMenu() {
  isOpen.value = false;
}

function toggleMenu() {
  isOpen.value = !isOpen.value;
}

function handleDocumentClick(event: MouseEvent) {
  if (!(event.target instanceof Node)) {
    return;
  }

  if (!menuRef.value?.contains(event.target)) {
    closeMenu();
  }
}

function handleDocumentKeydown(event: KeyboardEvent) {
  if (event.key === "Escape") {
    closeMenu();
  }
}

watch(
  () => route.fullPath,
  () => closeMenu()
);

onMounted(() => {
  document.addEventListener("click", handleDocumentClick);
  document.addEventListener("keydown", handleDocumentKeydown);
});

onBeforeUnmount(() => {
  document.removeEventListener("click", handleDocumentClick);
  document.removeEventListener("keydown", handleDocumentKeydown);
});

async function logout() {
  closeMenu();
  await auth.logout();
  await navigateTo("/login");
}
</script>

<template>
  <div ref="menuRef" class="relative">
    <button
      type="button"
      class="flex w-full items-center gap-3 rounded-xl border border-sidebar-border bg-background/70 px-3 py-3 text-left transition-colors outline-none hover:bg-accent/60 focus-visible:ring-2 focus-visible:ring-ring"
      :class="props.collapsed ? 'justify-center px-2' : 'justify-between'"
      aria-label="Открыть меню пользователя"
      :aria-expanded="isOpen"
      aria-haspopup="menu"
      @click="toggleMenu"
    >
      <span class="flex min-w-0 items-center gap-3">
        <Avatar
          :src="auth.user.value?.avatarUrl || ''"
          :fallback="auth.user.value?.fullName || 'NPPWEB'"
          size="sm"
        />
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
    </button>

    <div
      v-if="isOpen"
      :class="menuPositionClass"
      class="absolute z-50 overflow-hidden rounded-xl border border-sidebar-border bg-popover p-1 text-popover-foreground shadow-lg"
      role="menu"
      aria-label="Меню пользователя"
    >
      <NuxtLink
        :to="profileHref"
        class="flex w-full items-center rounded-lg px-3 py-2 text-sm transition-colors hover:bg-accent/60 focus-visible:bg-accent/60 focus-visible:outline-none"
        role="menuitem"
        @click="closeMenu"
      >
        <UserRound class="mr-2 h-4 w-4" />
        Профиль
      </NuxtLink>
      <button
        type="button"
        class="flex w-full items-center rounded-lg px-3 py-2 text-sm text-destructive transition-colors hover:bg-accent/60 focus-visible:bg-accent/60 focus-visible:outline-none"
        role="menuitem"
        @click="logout"
      >
        <LogOut class="mr-2 h-4 w-4" />
        Выйти
      </button>
    </div>
  </div>
</template>
