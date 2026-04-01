<script setup lang="ts">
import { onMounted, ref, watch } from "vue";
import {
  formatDateTime,
  formatDuration,
  formatEnumLabel,
  formatNumber,
  statusTone
} from "../lib/format";
import { apolloClient } from "../services/apollo";
import type { Source, SourceRun } from "../services/graphql-types";
import { SOURCES_QUERY, SOURCE_RUNS_QUERY } from "../services/queries";

const loading = ref(true);
const error = ref("");
const sourceFilter = ref("");
const runs = ref<SourceRun[]>([]);
const sources = ref<Source[]>([]);

async function loadRuns() {
  loading.value = true;
  error.value = "";

  try {
    const { data } = await apolloClient.query<{ sourceRuns: SourceRun[] }>({
      query: SOURCE_RUNS_QUERY,
      variables: {
        source: sourceFilter.value || undefined,
        limit: 30
      },
      fetchPolicy: "network-only"
    });

    runs.value = data.sourceRuns;
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : "Unable to load jobs";
  } finally {
    loading.value = false;
  }
}

onMounted(async () => {
  try {
    const { data } = await apolloClient.query<{ sources: Source[] }>({
      query: SOURCES_QUERY,
      fetchPolicy: "network-only"
    });

    sources.value = data.sources;
  } catch {
    sources.value = [];
  }

  await loadRuns();
});

watch(sourceFilter, () => {
  void loadRuns();
});
</script>

<template>
  <section class="page-header">
    <div>
      <p class="eyebrow">Pipeline</p>
      <h2>Collection Jobs</h2>
    </div>
    <div class="toolbar-row">
      <select v-model="sourceFilter">
        <option value="">All sources</option>
        <option v-for="item in sources" :key="item.id" :value="item.code">
          {{ item.name }}
        </option>
      </select>
    </div>
  </section>
  <div v-if="loading" class="card">Loading jobs...</div>
  <div v-else-if="error" class="card error-text">{{ error }}</div>
  <section v-else class="card">
    <table class="table">
      <thead>
        <tr>
          <th>Run key</th>
          <th>Source</th>
          <th>Status</th>
          <th>Started</th>
          <th>Duration</th>
          <th>Discovered</th>
          <th>Published</th>
          <th>Failed</th>
          <th>Error</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="run in runs" :key="run.id">
          <td>{{ run.runKey }}</td>
          <td>{{ run.sourceCode }}</td>
          <td>
            <span class="status-chip" :class="statusTone(run.status)">
              {{ formatEnumLabel(run.status) }}
            </span>
          </td>
          <td>{{ formatDateTime(run.startedAt) }}</td>
          <td>{{ formatDuration(run.startedAt, run.finishedAt) }}</td>
          <td>{{ formatNumber(run.itemsDiscovered) }}</td>
          <td>{{ formatNumber(run.itemsPublished) }}</td>
          <td>{{ formatNumber(run.itemsFailed) }}</td>
          <td>{{ run.errorMessage || "n/a" }}</td>
        </tr>
      </tbody>
    </table>
  </section>
</template>
