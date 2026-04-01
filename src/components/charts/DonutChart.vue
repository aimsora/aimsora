<script setup lang="ts">
import { computed } from "vue";

type DonutChartSegment = {
  label: string;
  value: number;
  color: string;
};

const props = withDefaults(
  defineProps<{
    segments: DonutChartSegment[];
    emptyLabel?: string;
  }>(),
  {
    emptyLabel: "Нет данных для графика."
  }
);

const total = computed(() =>
  props.segments.reduce((sum, segment) => sum + segment.value, 0)
);

const radius = 44;
const circumference = 2 * Math.PI * radius;

const normalizedSegments = computed(() => {
  let offset = 0;

  return props.segments.map((segment) => {
    const dash = total.value > 0 ? (segment.value / total.value) * circumference : 0;
    const item = {
      ...segment,
      dash,
      offset
    };

    offset += dash;
    return item;
  });
});
</script>

<template>
  <div v-if="segments.length === 0 || total === 0" class="chart-empty">{{ emptyLabel }}</div>
  <div v-else class="donut-chart">
    <div class="donut-visual">
      <svg viewBox="0 0 120 120" aria-hidden="true">
        <circle class="donut-base" cx="60" cy="60" :r="radius"></circle>
        <circle
          v-for="segment in normalizedSegments"
          :key="segment.label"
          class="donut-segment"
          cx="60"
          cy="60"
          :r="radius"
          :stroke="segment.color"
          :stroke-dasharray="`${segment.dash} ${circumference}`"
          :stroke-dashoffset="`${-segment.offset}`"
        ></circle>
      </svg>
      <div class="donut-center">
        <strong>{{ total }}</strong>
        <span>всего</span>
      </div>
    </div>

    <div class="donut-legend">
      <article v-for="segment in normalizedSegments" :key="segment.label" class="legend-row">
        <div class="legend-label">
          <span class="legend-dot" :style="{ backgroundColor: segment.color }"></span>
          <strong>{{ segment.label }}</strong>
        </div>
        <span>{{ segment.value }}</span>
      </article>
    </div>
  </div>
</template>
