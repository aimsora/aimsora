<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import {
  formatDateTime,
  formatEnumLabel,
  formatNumber,
  statusTone
} from "../lib/format";
import { apolloClient } from "../services/apollo";
import type { Source, SourceRun } from "../services/graphql-types";
import { SOURCES_QUERY, SOURCE_RUNS_QUERY } from "../services/queries";

const loading = ref(true);
const error = ref("");
const items = ref<Source[]>([]);
const runs = ref<SourceRun[]>([]);

const sourceRows = computed(() =>
  items.value.map((item) => ({
    ...item,
    lastRun: runs.value.find((run) => run.sourceCode === item.code)
  }))
);

onMounted(async () => {
  try {
    const [sourcesResult, runsResult] = await Promise.all([
      apolloClient.query<{ sources: Source[] }>({
        query: SOURCES_QUERY,
        fetchPolicy: "network-only"
      }),
      apolloClient.query<{ sourceRuns: SourceRun[] }>({
        query: SOURCE_RUNS_QUERY,
        variables: { limit: 20 },
        fetchPolicy: "network-only"
      })
    ]);

    items.value = sourcesResult.data.sources;
    runs.value = runsResult.data.sourceRuns;
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : "Unable to load sources";
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <section class="page-header">
    <div>
      <p class="eyebrow">Collection</p>
      <h2>Sources</h2>
    </div>
    <p class="caption">Источники, их активность и последний observed run.</p>
  </section>
  <div v-if="loading" class="card">Loading sources...</div>
  <div v-else-if="error" class="card error-text">{{ error }}</div>
  <template v-else>
    <section class="cards-grid">
      <article v-for="item in sourceRows" :key="item.id" class="source-card">
        <div class="section-title compact">
          <div>
            <p class="eyebrow">{{ formatEnumLabel(item.kind) }}</p>
            <h3>{{ item.name }}</h3>
          </div>
          <span class="status-chip" :class="item.isActive ? 'is-success' : 'is-danger'">
            {{ item.isActive ? "Active" : "Inactive" }}
          </span>
        </div>
        <p>{{ item.description || "No description provided." }}</p>
        <div class="table-subtitle">{{ item.code }}</div>
        <div v-if="item.lastRun" class="source-meta">
          <span class="status-chip" :class="statusTone(item.lastRun.status)">
            {{ formatEnumLabel(item.lastRun.status) }}
          </span>
          <small>Started {{ formatDateTime(item.lastRun.startedAt) }}</small>
        </div>
        <a
          v-if="item.baseUrl"
          class="text-link"
          :href="item.baseUrl"
          target="_blank"
          rel="noreferrer"
        >
          Open source endpoint
        </a>
      </article>
    </section>

    <section class="card">
      <div class="section-title">
        <h3>Latest runs by source</h3>
      </div>
      <table class="table">
        <thead>
          <tr>
            <th>Source</th>
            <th>Last run</th>
            <th>Published</th>
            <th>Failed</th>
            <th>Updated</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in sourceRows" :key="item.id">
            <td>{{ item.name }}</td>
            <td>
              <span v-if="item.lastRun" class="status-chip" :class="statusTone(item.lastRun.status)">
                {{ formatEnumLabel(item.lastRun.status) }}
              </span>
              <span v-else class="caption">No runs yet</span>
            </td>
            <td>{{ formatNumber(item.lastRun?.itemsPublished) }}</td>
            <td>{{ formatNumber(item.lastRun?.itemsFailed) }}</td>
            <td>{{ item.lastRun ? formatDateTime(item.lastRun.startedAt) : "n/a" }}</td>
          </tr>
        </tbody>
      </table>
    </section>
  </template>
</template>
