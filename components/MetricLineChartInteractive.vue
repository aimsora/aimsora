<script setup lang="ts">
type MetricLineItem = {
  label: string;
  shortLabel?: string;
  value: number;
  valueLabel?: string;
  note?: string;
};

const props = withDefaults(
  defineProps<{
    items: MetricLineItem[];
    emptyText?: string;
  }>(),
  {
    emptyText: "Недостаточно данных для графика."
  }
);

const chartWidth = 640;
const chartHeight = 260;
const paddingX = 28;
const paddingY = 24;
const innerWidth = chartWidth - paddingX * 2;
const innerHeight = chartHeight - paddingY * 2;

const selectedIndex = ref(0);
const selectedItem = computed(() => props.items[selectedIndex.value] ?? null);
const maxValue = computed(() => Math.max(...props.items.map((item) => item.value), 1));
const minValue = computed(() => Math.min(...props.items.map((item) => item.value), 0));
const valueRange = computed(() => Math.max(maxValue.value - minValue.value, 1));

const chartPoints = computed(() =>
  props.items.map((item, index) => {
    const x =
      props.items.length === 1
        ? chartWidth / 2
        : paddingX + (index / Math.max(props.items.length - 1, 1)) * innerWidth;
    const normalizedY = (item.value - minValue.value) / valueRange.value;
    const y = chartHeight - paddingY - normalizedY * innerHeight;

    return {
      ...item,
      x,
      y
    };
  })
);

const linePath = computed(() =>
  chartPoints.value
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(" ")
);

const areaPath = computed(() => {
  if (chartPoints.value.length === 0) {
    return "";
  }

  const first = chartPoints.value[0];
  const last = chartPoints.value[chartPoints.value.length - 1];

  return [
    `M ${first.x.toFixed(2)} ${(chartHeight - paddingY).toFixed(2)}`,
    ...chartPoints.value.map((point) => `L ${point.x.toFixed(2)} ${point.y.toFixed(2)}`),
    `L ${last.x.toFixed(2)} ${(chartHeight - paddingY).toFixed(2)}`,
    "Z"
  ].join(" ");
});

const gridLines = computed(() =>
  Array.from({ length: 4 }, (_value, index) => {
    const ratio = index / 3;
    const y = paddingY + ratio * innerHeight;
    const value = maxValue.value - ratio * valueRange.value;

    return {
      y,
      label: formatNumber(Math.max(0, Math.round(value)))
    };
  })
);

const selectedDelta = computed(() => {
  if (!selectedItem.value || selectedIndex.value === 0) {
    return null;
  }

  const previous = props.items[selectedIndex.value - 1];
  const current = selectedItem.value;
  const delta = current.value - previous.value;

  return {
    raw: delta,
    label: `${delta > 0 ? "+" : ""}${formatNumber(delta)}`,
    direction: delta > 0 ? ("up" as const) : delta < 0 ? ("down" as const) : ("flat" as const)
  };
});

watch(
  () => props.items.length,
  (length) => {
    selectedIndex.value = length > 0 ? length - 1 : 0;
  },
  { immediate: true }
);

function selectPoint(index: number) {
  selectedIndex.value = index;
}

function deltaClass(direction?: "up" | "down" | "flat") {
  if (direction === "up") {
    return "text-emerald-600";
  }

  if (direction === "down") {
    return "text-rose-600";
  }

  return "text-muted-foreground";
}
</script>

<template>
  <div v-if="items.length === 0" class="rounded-2xl border border-dashed bg-muted/10 p-4 text-sm text-muted-foreground">
    {{ emptyText }}
  </div>

  <div v-else class="space-y-5">
    <div class="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
      <div class="rounded-3xl border bg-muted/10 p-4">
        <svg
          :viewBox="`0 0 ${chartWidth} ${chartHeight}`"
          class="h-64 w-full"
          fill="none"
          role="img"
          aria-label="Интерактивный график динамики обновления"
        >
          <defs>
            <linearGradient id="timeline-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="hsl(var(--primary))" stop-opacity="0.28" />
              <stop offset="100%" stop-color="hsl(var(--primary))" stop-opacity="0.03" />
            </linearGradient>
          </defs>

          <g>
            <line
              v-for="line in gridLines"
              :key="line.y"
              :x1="paddingX"
              :x2="chartWidth - paddingX"
              :y1="line.y"
              :y2="line.y"
              stroke="hsl(var(--border))"
              stroke-dasharray="5 7"
            />
            <text
              v-for="line in gridLines"
              :key="line.label"
              :x="paddingX"
              :y="line.y - 6"
              fill="hsl(var(--muted-foreground))"
              font-size="11"
            >
              {{ line.label }}
            </text>
          </g>

          <path :d="areaPath" fill="url(#timeline-fill)" />
          <path
            :d="linePath"
            stroke="hsl(var(--primary))"
            stroke-width="3"
            stroke-linecap="round"
            stroke-linejoin="round"
          />

          <g v-for="(point, index) in chartPoints" :key="`${point.label}-${point.value}`">
            <line
              v-if="selectedIndex === index"
              :x1="point.x"
              :x2="point.x"
              :y1="paddingY"
              :y2="chartHeight - paddingY"
              stroke="hsl(var(--primary))"
              stroke-opacity="0.2"
              stroke-dasharray="4 6"
            />
            <circle
              :cx="point.x"
              :cy="point.y"
              :r="selectedIndex === index ? 7 : 5"
              fill="hsl(var(--background))"
              stroke="hsl(var(--primary))"
              :stroke-width="selectedIndex === index ? 4 : 3"
              class="cursor-pointer transition-all"
              @mouseenter="selectPoint(index)"
              @click="selectPoint(index)"
            />
            <text
              :x="point.x"
              :y="chartHeight - 6"
              text-anchor="middle"
              fill="hsl(var(--muted-foreground))"
              font-size="11"
            >
              {{ point.shortLabel ?? point.label }}
            </text>
          </g>
        </svg>
      </div>

      <div class="rounded-3xl border bg-muted/15 p-4">
        <div v-if="selectedItem" class="space-y-4">
          <div class="space-y-1">
            <p class="text-sm font-medium text-muted-foreground">Выбранная точка</p>
            <p class="text-lg font-semibold">{{ selectedItem.label }}</p>
          </div>

          <div class="space-y-1">
            <p class="text-4xl font-semibold">{{ selectedItem.valueLabel ?? formatNumber(selectedItem.value) }}</p>
            <p v-if="selectedDelta" class="text-sm font-medium" :class="deltaClass(selectedDelta.direction)">
              К предыдущей точке: {{ selectedDelta.label }}
            </p>
            <p v-else class="text-sm text-muted-foreground">Это первая точка временного ряда.</p>
          </div>

          <div class="rounded-2xl border bg-background/80 p-3 text-sm text-muted-foreground">
            {{ selectedItem.note || "Объём обновлённых закупок в выбранной точке временного ряда." }}
          </div>
        </div>
      </div>
    </div>

    <div class="flex flex-wrap gap-2">
      <button
        v-for="(item, index) in items"
        :key="`${item.label}-${item.value}-chip`"
        type="button"
        class="rounded-full border px-3 py-1.5 text-xs transition"
        :class="
          selectedIndex === index
            ? 'border-primary bg-primary text-primary-foreground'
            : 'border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground'
        "
        @mouseenter="selectPoint(index)"
        @focus="selectPoint(index)"
        @click="selectPoint(index)"
      >
        {{ item.shortLabel ?? item.label }} · {{ item.valueLabel ?? formatNumber(item.value) }}
      </button>
    </div>
  </div>
</template>
