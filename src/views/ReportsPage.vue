<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { formatDateTime, formatEnumLabel, statusTone } from "../lib/format";
import { apolloClient } from "../services/apollo";
import type { Report } from "../services/graphql-types";
import { REPORTS_QUERY } from "../services/queries";

const loading = ref(true);
const error = ref("");
const reports = ref<Report[]>([]);

const summary = computed(() => ({
  total: reports.value.length,
  ready: reports.value.filter((item) => item.status === "READY").length,
  pending: reports.value.filter((item) => item.status === "PENDING").length,
  failed: reports.value.filter((item) => item.status === "FAILED").length
}));

onMounted(async () => {
  try {
    const { data } = await apolloClient.query<{ reports: Report[] }>({
      query: REPORTS_QUERY,
      fetchPolicy: "network-only"
    });

    reports.value = data.reports;
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : "Unable to load reports";
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <section class="page-header">
    <div>
      <p class="eyebrow">Analytics</p>
      <h2>Reports</h2>
    </div>
    <p class="caption">Сводка статусов отчётов и доступных аналитических сущностей.</p>
  </section>
  <div v-if="loading" class="card">Loading reports...</div>
  <div v-else-if="error" class="card error-text">{{ error }}</div>
  <template v-else>
    <div class="stats-grid">
      <article class="stat-card">
        <span>Total reports</span>
        <strong>{{ summary.total }}</strong>
      </article>
      <article class="stat-card">
        <span>Ready</span>
        <strong>{{ summary.ready }}</strong>
      </article>
      <article class="stat-card">
        <span>Pending</span>
        <strong>{{ summary.pending }}</strong>
      </article>
      <article class="stat-card">
        <span>Failed</span>
        <strong>{{ summary.failed }}</strong>
      </article>
    </div>

    <section class="card cards-grid">
      <article v-for="report in reports" :key="report.id" class="source-card">
        <div class="section-title compact">
          <div>
            <p class="eyebrow">Report</p>
            <h3>{{ report.name }}</h3>
          </div>
          <span class="status-chip" :class="statusTone(report.status)">
            {{ formatEnumLabel(report.status) }}
          </span>
        </div>
        <p>{{ report.description || "No description provided." }}</p>
        <small>Updated {{ formatDateTime(report.updatedAt) }}</small>
      </article>
    </section>
  </template>
</template>
