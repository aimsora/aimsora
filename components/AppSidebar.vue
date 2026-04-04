<script setup lang="ts">
import {
  BarChart3,
  FileBarChart2,
  FileSearch,
  LayoutDashboard,
  PlaySquare,
  UserCog
} from "lucide-vue-next";
import type { Component } from "vue";
import { APP_NAVIGATION } from "~/utils/navigation";

const route = useRoute();
const auth = useAuthSession();
const sidebar = useSidebar();

const icons: Record<string, Component> = {
  "/dashboard": LayoutDashboard,
  "/procurements": FileSearch,
  "/sources": BarChart3,
  "/jobs": PlaySquare,
  "/reports": FileBarChart2,
  "/users": UserCog
};

const navigation = computed(() =>
  APP_NAVIGATION.filter((item) => !item.roles || item.roles.includes(auth.user.value?.role ?? "USER"))
);

function isActive(href: string) {
  return route.path === href || (href !== "/dashboard" && route.path.startsWith(`${href}/`));
}
</script>

<template>
  <Sidebar class="border-sidebar-border bg-sidebar/95 backdrop-blur supports-[backdrop-filter]:bg-sidebar/80">
    <SidebarHeader>
      <div
        class="flex items-center gap-3 rounded-xl border border-sidebar-border bg-background/60 px-3 py-3"
        :class="!sidebar.open.value && !sidebar.isMobile.value ? 'justify-center px-2' : ''"
      >
        <div class="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-sidebar-border bg-white p-1.5">
          <img
            src="/nppweb.png"
            alt="AIMSORA"
            class="h-full w-full object-contain"
          />
        </div>
        <div v-if="sidebar.open.value || sidebar.isMobile.value" class="min-w-0">
          <p class="text-xs uppercase tracking-[0.16em] text-muted-foreground">AIMSORA</p>
          <p class="truncate text-sm font-semibold text-foreground">Procurement Monitor</p>
        </div>
      </div>
    </SidebarHeader>

    <SidebarContent>
      <SidebarGroup>
        <SidebarGroupLabel v-if="sidebar.open.value || sidebar.isMobile.value">
          Рабочее пространство
        </SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem v-for="item in navigation" :key="item.href">
              <SidebarMenuButton as-child :is-active="isActive(item.href)">
                <NuxtLink :to="item.href" class="group">
                  <component :is="icons[item.href]" class="h-4 w-4 shrink-0" />
                  <div
                    v-if="sidebar.open.value || sidebar.isMobile.value"
                    class="flex min-w-0 flex-1 flex-col text-left"
                  >
                    <span class="truncate">{{ item.title }}</span>
                    <span class="truncate text-xs font-normal text-muted-foreground">
                      {{ item.description }}
                    </span>
                  </div>
                </NuxtLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </SidebarContent>

    <SidebarFooter>
      <UserMenu :collapsed="!sidebar.open.value && !sidebar.isMobile.value" />
    </SidebarFooter>
  </Sidebar>
</template>
