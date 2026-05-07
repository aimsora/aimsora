<script setup lang="ts">
type MetricStackSegment = {
  label: string;
  value: number;
  valueLabel?: string;
  accent?: "primary" | "success" | "warning" | "danger" | "muted";
};

const props = withDefaults(
  defineProps<{
    segments: MetricStackSegment[];
    emptyText?: string;
  }>(),
  {
    emptyText: "Недостаточно данных для распределения."
  }
);

const total = computed(() => props.segments.reduce((sum, item) => sum + item.value, 0));

function widthPercent(value: number) {
  if (total.value <= 0) {
    return "0%";
  }

  return `${(value / total.value) * 100}%`;
}

function accentClass(accent?: MetricStackSegment["accent"]) {
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
  <div v-if="segments.length === 0 || total === 0" class="rounded-lg border border-dashed bg-muted/10 p-3 text-sm text-muted-foreground">
    {{ emptyText }}
  </div>

  <div v-else class="space-y-3">
    <div class="flex h-3 overflow-hidden rounded-full bg-muted/70">
      <div
        v-for="segment in segments"
        :key="segment.label"
        class="h-full transition-[width]"
        :class="accentClass(segment.accent)"
        :style="{ width: widthPercent(segment.value) }"
      />
    </div>

    <div class="grid gap-2 sm:grid-cols-2">
      <div
        v-for="segment in segments"
        :key="`${segment.label}-${segment.value}`"
        class="rounded-lg border bg-muted/15 p-2.5"
      >
        <div class="flex items-center gap-2">
          <span class="h-2.5 w-2.5 rounded-full" :class="accentClass(segment.accent)" />
          <p class="text-sm font-medium">{{ segment.label }}</p>
        </div>
        <p class="mt-1 text-base font-semibold">{{ segment.valueLabel ?? formatNumber(segment.value) }}</p>
        <p class="text-xs text-muted-foreground">
          {{ formatPercent((segment.value / total) * 100) }} от текущего объёма
        </p>
      </div>
    </div>
  </div>
</template>
