<script setup lang="ts">
import {
  Activity,
  Atom,
  Database,
  FileBarChart2,
  FileSearch,
  Handshake,
  History,
  LayoutDashboard,
  PlaySquare,
  Settings2,
  UserCog
} from "lucide-vue-next";
import type { Component } from "vue";
import { APP_NAVIGATION_GROUPS, type AppNavigationItem } from "~/utils/navigation";
import type { AnalyticsSectionId } from "~/utils/analytics-sections";
import { resolveReportSectionFromRoute } from "~/utils/report-sections";
import brandLogo from "~/assets/images/nppweb.png";

const route = useRoute();
const auth = useAuthSession();
const sidebar = useSidebar();

const icons: Record<string, Component> = {
  "/analytics/overview": Activity,
  "/analytics/suppliers": Handshake,
  "/analytics/npp": Atom,
  "/dashboard": LayoutDashboard,
  "/jobs": PlaySquare,
  "/parser-runs": History,
  "/procurements": FileSearch,
  "/reports/suppliers": FileBarChart2,
  "/reports/niches": FileBarChart2,
  "/reports/aes": FileBarChart2,
  "/reports/parsers": FileBarChart2,
  "/sources": Database,
  "/admin/parsers": Settings2,
  "/users": UserCog
};

const navigationGroups = computed(() =>
  APP_NAVIGATION_GROUPS
    .map((group) => ({
      ...group,
      items: group.items.filter(
        (item) => !item.roles || item.roles.includes(auth.user.value?.role ?? "USER")
      )
    }))
    .filter((group) => group.items.length > 0)
);

const activeReportSection = computed(() =>
  resolveReportSectionFromRoute(
    route.path,
    typeof route.query.section === "string" ? route.query.section : undefined
  )
);

const activeAnalyticsSection = computed<AnalyticsSectionId | null>(() => {
  if (route.path === "/analytics" || route.path.startsWith("/analytics/overview")) {
    return "overview";
  }

  if (route.path.startsWith("/analytics/suppliers")) {
    return "suppliers";
  }

  if (route.path.startsWith("/analytics/npp")) {
    return "npp";
  }

  return null;
});

function isActive(item: AppNavigationItem) {
  if (item.analyticsSection) {
    return activeAnalyticsSection.value === item.analyticsSection;
  }

  if (item.reportSection) {
    return activeReportSection.value === item.reportSection;
  }

  return route.path === item.href || (item.href !== "/dashboard" && route.path.startsWith(`${item.href}/`));
}
</script>

<template>
  <Sidebar class="border-sidebar-border bg-sidebar/95 backdrop-blur supports-[backdrop-filter]:bg-sidebar/80">
    <SidebarHeader>
      <NuxtLink
        to="/dashboard"
        class="flex items-center gap-3 rounded-2xl bg-background/55 px-3 py-3 shadow-sm ring-1 ring-sidebar-border/50 transition hover:bg-background/75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        :class="!sidebar.open.value && !sidebar.isMobile.value ? 'justify-center px-2' : ''"
      >
        <div class="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white/95 shadow-sm ring-1 ring-sidebar-border/40">
          <img
            :src="brandLogo"
            alt="NPPWEB"
            class="h-full w-full rounded-[inherit] object-cover"
          />
        </div>
        <div v-if="sidebar.open.value || sidebar.isMobile.value" class="min-w-0">
          <p class="text-xs uppercase tracking-[0.16em] text-muted-foreground">NPPWEB</p>
          <p class="truncate text-sm font-semibold text-foreground">Procurement Monitor</p>
        </div>
      </NuxtLink>
    </SidebarHeader>

    <SidebarContent>
      <SidebarGroup v-for="group in navigationGroups" :key="group.title">
        <SidebarGroupLabel v-if="sidebar.open.value || sidebar.isMobile.value">
          {{ group.title }}
        </SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem v-for="item in group.items" :key="item.href">
              <SidebarMenuButton as-child :is-active="isActive(item)">
                <NuxtLink :to="item.href" class="group">
                  <component :is="icons[item.href] ?? PlaySquare" class="h-4 w-4 shrink-0" />
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
