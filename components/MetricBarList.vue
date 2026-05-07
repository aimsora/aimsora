<script setup lang="ts">
type MetricBarItem = {
  label: string;
  value: number;
  valueLabel?: string;
  note?: string;
  accent?: "primary" | "success" | "warning" | "danger" | "muted";
};

const props = withDefaults(
  defineProps<{
    items: MetricBarItem[];
    emptyText?: string;
  }>(),
  {
    emptyText: "Недостаточно данных для диаграммы."
  }
);

const maxValue = computed(() => Math.max(...props.items.map((item) => item.value), 1));

function widthPercent(value: number) {
  return `${Math.max(8, (value / maxValue.value) * 100)}%`;
}

function accentClass(accent?: MetricBarItem["accent"]) {
  if (accent === "success") {
    return "bg-emerald-500";
  }

  if (accent === "warning") {
    return "bg-amber-500";
  }

  if (accent === "danger") {
    return "bg-rose-500";
  }

  if (accent === "muted") {
    return "bg-slate-400";
  }

  return "bg-primary";
}
</script>

<template>
  <div v-if="items.length === 0" class="rounded-lg border border-dashed bg-muted/10 p-3 text-sm text-muted-foreground">
    {{ emptyText }}
  </div>

  <div v-else class="space-y-3">
    <div
      v-for="item in items"
      :key="item.label"
      class="space-y-1.5"
    >
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0">
          <p class="break-words text-sm font-medium leading-5">{{ item.label }}</p>
          <p v-if="item.note" class="break-words text-xs leading-5 text-muted-foreground">{{ item.note }}</p>
        </div>
        <p class="shrink-0 text-sm font-semibold text-foreground">
          {{ item.valueLabel ?? formatNumber(item.value) }}
        </p>
      </div>

      <div class="h-2 rounded-full bg-muted/70">
        <div
          class="h-2 rounded-full transition-[width]"
          :class="accentClass(item.accent)"
          :style="{ width: widthPercent(item.value) }"
        />
      </div>
    </div>
  </div>
</template>
