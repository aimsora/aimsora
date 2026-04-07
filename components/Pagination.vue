<script setup lang="ts">
import { ChevronLeft, ChevronRight } from "lucide-vue-next";

const props = withDefaults(
  defineProps<{
    page: number;
    pageSize: number;
    total: number;
  }>(),
  {
    pageSize: 10
  }
);

const emit = defineEmits<{
  (event: "update:page", value: number): void;
}>();

const pageCount = computed(() => Math.max(1, Math.ceil(props.total / props.pageSize)));
const pages = computed<(number | string)[]>(() => {
  if (pageCount.value <= 7) {
    return Array.from({ length: pageCount.value }, (_, index) => index + 1);
  }

  const windowStart = Math.max(2, props.page - 1);
  const windowEnd = Math.min(pageCount.value - 1, props.page + 1);
  const items: Array<number | string> = [1];

  if (windowStart > 2) {
    items.push("start-ellipsis");
  }

  for (let value = windowStart; value <= windowEnd; value += 1) {
    items.push(value);
  }

  if (windowEnd < pageCount.value - 1) {
    items.push("end-ellipsis");
  }

  items.push(pageCount.value);

  return items;
});
</script>

<template>
  <div class="flex flex-col gap-3 border-t px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
    <p class="min-w-0 text-sm text-muted-foreground">
      Страница {{ page }} из {{ pageCount }}
    </p>
    <div class="flex flex-wrap items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        :disabled="page <= 1"
        @click="emit('update:page', page - 1)"
      >
        <ChevronLeft class="h-4 w-4" />
        Назад
      </Button>
      <div class="hidden max-w-full items-center gap-1 md:flex md:flex-wrap">
        <Button
          v-for="item in pages"
          :key="item"
          :disabled="typeof item !== 'number'"
          :variant="item === page ? 'default' : 'ghost'"
          size="sm"
          @click="typeof item === 'number' ? emit('update:page', item) : undefined"
        >
          {{ typeof item === "number" ? item : "…" }}
        </Button>
      </div>
      <Button
        variant="outline"
        size="sm"
        :disabled="page >= pageCount"
        @click="emit('update:page', page + 1)"
      >
        Вперёд
        <ChevronRight class="h-4 w-4" />
      </Button>
    </div>
  </div>
</template>
