<script setup lang="ts">
import { computed } from "vue";

type BarChartItem = {
  label: string;
  value: number;
  hint?: string;
};

const props = withDefaults(
  defineProps<{
    items: BarChartItem[];
    emptyLabel?: string;
  }>(),
  {
    emptyLabel: "Нет данных для графика."
  }
);

const maxValue = computed(() =>
  props.items.reduce((max, item) => Math.max(max, item.value), 1)
);

function width(value: number) {
  if (value <= 0) {
    return "0%";
  }

  return `${Math.max((value / maxValue.value) * 100, 8)}%`;
}
</script>

<template>
  <div v-if="items.length === 0" class="chart-empty">{{ emptyLabel }}</div>
  <div v-else class="chart-list">
    <article v-for="item in items" :key="item.label" class="chart-row">
      <div class="chart-row-head">
        <strong>{{ item.label }}</strong>
        <span>{{ item.value }}</span>
      </div>
      <div class="chart-track">
        <div class="chart-fill" :style="{ width: width(item.value) }"></div>
      </div>
      <small v-if="item.hint">{{ item.hint }}</small>
    </article>
  </div>
</template>
