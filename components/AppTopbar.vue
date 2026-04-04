<script setup lang="ts">
const route = useRoute();

const title = computed(() => (typeof route.meta.title === "string" ? route.meta.title : "AIMSORA"));
const description = computed(() =>
  typeof route.meta.description === "string" ? route.meta.description : "Внутреннее рабочее пространство"
);
</script>

<template>
  <header class="sticky top-0 z-30 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/70">
    <div class="container flex h-16 items-center justify-between gap-4">
      <div class="min-w-0">
        <p class="truncate text-sm font-semibold">{{ title }}</p>
        <p class="hidden truncate text-sm text-muted-foreground md:block">
          {{ description }}
        </p>
      </div>
      <div class="flex items-center gap-2 lg:hidden">
        <SidebarTrigger />
      </div>
    </div>
  </header>
</template>
