<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import BarChart from "../components/charts/BarChart.vue";
import DonutChart from "../components/charts/DonutChart.vue";
import LineChart from "../components/charts/LineChart.vue";
import { formatCompactNumber, formatCurrency, formatDateTime, formatEnumLabel, formatNumber, statusTone } from "../lib/format";
import { apolloClient } from "../services/apollo";
import type { DashboardSummary, Procurement, ProcurementPage, Report, Source, SourceRun } from "../services/graphql-types";
import {
  DASHBOARD_QUERY,
  PROCUREMENTS_QUERY,
  REPORTS_QUERY,
  SOURCES_QUERY,
  SOURCE_RUNS_QUERY
} from "../services/queries";

const loading = ref(true);
const error = ref("");
const summary = ref<DashboardSummary | null>(null);
const procurements = ref<Procurement[]>([]);
const sources = ref<Source[]>([]);
const runs = ref<SourceRun[]>([]);
const reports = ref<Report[]>([]);

async function loadDashboard() {
  loading.value = true;
  error.value = "";

  try {
    const [
      summaryResult,
      procurementsResult,
      sourcesResult,
      runsResult,
      reportsResult
    ] = await Promise.all([
      apolloClient.query<{ dashboardSummary: DashboardSummary }>({
        query: DASHBOARD_QUERY,
        fetchPolicy: "network-only"
      }),
      apolloClient.query<{ procurementItems: ProcurementPage }>({
        query: PROCUREMENTS_QUERY,
        variables: {
          sort: { field: "PUBLISHED_AT", direction: "DESC" },
          limit: 40,
          offset: 0
        },
        fetchPolicy: "network-only"
      }),
      apolloClient.query<{ sources: Source[] }>({
        query: SOURCES_QUERY,
        fetchPolicy: "network-only"
      }),
      apolloClient.query<{ sourceRuns: SourceRun[] }>({
        query: SOURCE_RUNS_QUERY,
        variables: { limit: 20 },
        fetchPolicy: "network-only"
      }),
      apolloClient.query<{ reports: Report[] }>({
        query: REPORTS_QUERY,
        fetchPolicy: "network-only"
      })
    ]);

    summary.value = summaryResult.data.dashboardSummary;
    procurements.value = procurementsResult.data.procurementItems.items;
    sources.value = sourcesResult.data.sources;
    runs.value = runsResult.data.sourceRuns;
    reports.value = reportsResult.data.reports;
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : "Unable to load dashboard";
  } finally {
    loading.value = false;
  }
}

const sourceCoverage = computed(() =>
  (summary.value?.bySource ?? []).slice(0, 6).map((item) => ({
    label: item.source,
    value: item.count,
    hint: `${formatCompactNumber(item.count)} procurement records`
  }))
);

const runStatusSegments = computed(() => {
  const colors: Record<string, string> = {
    SUCCESS: "#3ccf91",
    RUNNING: "#f5a623",
    PARTIAL: "#ffcf66",
    FAILED: "#ff7f66",
    PENDING: "#8aa0ae"
  };

  const counts = new Map<string, number>();

  for (const run of runs.value) {
    counts.set(run.status, (counts.get(run.status) ?? 0) + 1);
  }

  return Array.from(counts.entries()).map(([status, value]) => ({
    label: formatEnumLabel(status),
    value,
    color: colors[status] ?? "#8aa0ae"
  }));
});

const procurementTrend = computed(() => {
  const buckets = new Map<string, number>();
  const today = new Date();

  for (let offset = 6; offset >= 0; offset -= 1) {
    const date = new Date(today);
    date.setDate(today.getDate() - offset);
    const key = date.toISOString().slice(0, 10);
    buckets.set(key, 0);
  }

  for (const item of procurements.value) {
    if (!item.publishedAt) {
      continue;
    }

    const key = item.publishedAt.slice(0, 10);
    if (buckets.has(key)) {
      buckets.set(key, (buckets.get(key) ?? 0) + 1);
    }
  }

  return Array.from(buckets.entries()).map(([key, value]) => ({
    label: key.slice(5),
    value
  }));
});

const readyReports = computed(
  () => reports.value.filter((report) => report.status === "READY").length
);

const recentProcurements = computed(() => procurements.value.slice(0, 8));

const recentAlerts = computed(() => {
  const runAlerts = runs.value
    .filter((run) => run.status === "FAILED" || run.status === "PARTIAL")
    .slice(0, 3)
    .map((run) => ({
      id: run.id,
      title: `${run.sourceCode} · ${formatEnumLabel(run.status)}`,
      text: run.errorMessage || `Published ${formatNumber(run.itemsPublished)}, failed ${formatNumber(run.itemsFailed)}`
    }));

  const reportAlerts = reports.value
    .filter((report) => report.status !== "READY")
    .slice(0, 2)
    .map((report) => ({
      id: report.id,
      title: `${report.name} · ${formatEnumLabel(report.status)}`,
      text: `Updated ${formatDateTime(report.updatedAt)}`
    }));

  return [...runAlerts, ...reportAlerts];
});

const sourceHealth = computed(() => {
  const latestRuns = new Map<string, SourceRun>();

  for (const run of runs.value) {
    if (!latestRuns.has(run.sourceCode)) {
      latestRuns.set(run.sourceCode, run);
    }
  }

  return sources.value.map((source) => {
    const latestRun = latestRuns.get(source.code);
    const totalProcurements =
      summary.value?.bySource.find((item) => item.source === source.code)?.count ?? 0;

    return {
      source,
      latestRun,
      totalProcurements
    };
  });
});

onMounted(() => {
  void loadDashboard();
});
</script>

<template>
  <section class="page-header">
    <div>
      <p class="eyebrow">Operations</p>
      <h2>Dashboard</h2>
      <p class="caption">Единая оперативная сводка по данным, источникам и job runs.</p>
    </div>
    <button class="secondary-button" @click="loadDashboard">Обновить</button>
  </section>

  <div v-if="loading" class="card">Loading dashboard...</div>
  <div v-else-if="error" class="card error-text">{{ error }}</div>
  <template v-else-if="summary">
    <div class="stats-grid dashboard-stats">
      <article class="stat-card">
        <span>Total procurements</span>
        <strong>{{ formatCompactNumber(summary.totalProcurements) }}</strong>
        <small>Published records in platform storage</small>
      </article>
      <article class="stat-card">
        <span>Active sources</span>
        <strong>{{ formatNumber(summary.activeSources) }}</strong>
        <small>Sources currently available for ingest</small>
      </article>
      <article class="stat-card">
        <span>Runs in last 24h</span>
        <strong>{{ formatNumber(summary.runsLast24h) }}</strong>
        <small>Observed recent collector activity</small>
      </article>
      <article class="stat-card">
        <span>Ready reports</span>
        <strong>{{ formatNumber(readyReports) }}</strong>
        <small>Last publication: {{ formatDateTime(summary.lastPublishedAt) }}</small>
      </article>
    </div>

    <div class="dashboard-grid">
      <section class="card dashboard-panel">
        <div class="section-title">
          <h3>Coverage by source</h3>
        </div>
        <BarChart :items="sourceCoverage" empty-label="По источникам пока нет данных." />
      </section>

      <section class="card dashboard-panel">
        <div class="section-title">
          <h3>Run status mix</h3>
        </div>
        <DonutChart :segments="runStatusSegments" empty-label="Source runs ещё не запускались." />
      </section>

      <section class="card dashboard-panel dashboard-panel-wide">
        <div class="section-title">
          <h3>Recent procurement activity</h3>
        </div>
        <LineChart :points="procurementTrend" empty-label="Недостаточно публикаций для тренда." />
      </section>

      <section class="card dashboard-panel">
        <div class="section-title">
          <h3>Recent alerts</h3>
        </div>
        <div v-if="recentAlerts.length === 0" class="empty-state">
          Активных alert-событий нет. Последние runs и reports выглядят стабильно.
        </div>
        <div v-else class="alert-list">
          <article v-for="alert in recentAlerts" :key="alert.id" class="alert-card">
            <strong>{{ alert.title }}</strong>
            <p>{{ alert.text }}</p>
          </article>
        </div>
      </section>
    </div>

    <section class="card">
      <div class="section-title">
        <h3>Recent procurements</h3>
      </div>
      <div v-if="procurements.length === 0" class="empty-state">
        В backend пока нет закупок для отображения.
      </div>
      <table v-else class="table">
        <thead>
          <tr>
            <th>Title</th>
            <th>Source</th>
            <th>Customer</th>
            <th>Amount</th>
            <th>Status</th>
            <th>Published</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in recentProcurements" :key="item.id">
            <td>{{ item.title }}</td>
            <td>{{ item.source }}</td>
            <td>{{ item.customer || "n/a" }}</td>
            <td>{{ formatCurrency(item.amount, item.currency) }}</td>
            <td>
              <span class="status-chip" :class="statusTone(item.status)">
                {{ formatEnumLabel(item.status) }}
              </span>
            </td>
            <td>{{ formatDateTime(item.publishedAt) }}</td>
          </tr>
        </tbody>
      </table>
    </section>

    <div class="dashboard-split">
      <section class="card">
        <div class="section-title">
          <h3>Source and jobs status</h3>
        </div>
        <div v-if="sourceHealth.length === 0" class="empty-state">
          Источники ещё не зарегистрированы.
        </div>
        <table v-else class="table">
          <thead>
            <tr>
              <th>Source</th>
              <th>State</th>
              <th>Latest run</th>
              <th>Published</th>
              <th>Records</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in sourceHealth" :key="item.source.id">
              <td>
                <strong>{{ item.source.name }}</strong>
                <div class="table-subtitle">{{ item.source.code }}</div>
              </td>
              <td>
                <span class="status-chip" :class="item.source.isActive ? 'is-success' : 'is-danger'">
                  {{ item.source.isActive ? "Active" : "Inactive" }}
                </span>
              </td>
              <td>
                <span
                  v-if="item.latestRun"
                  class="status-chip"
                  :class="statusTone(item.latestRun.status)"
                >
                  {{ formatEnumLabel(item.latestRun.status) }}
                </span>
                <span v-else class="caption">No runs yet</span>
              </td>
              <td>{{ formatNumber(item.latestRun?.itemsPublished) }}</td>
              <td>{{ formatCompactNumber(item.totalProcurements) }}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section class="card">
        <div class="section-title">
          <h3>Recent reports</h3>
        </div>
        <div v-if="reports.length === 0" class="empty-state">Отчёты пока не созданы.</div>
        <div v-else class="report-list">
          <article v-for="report in reports.slice(0, 6)" :key="report.id" class="report-card">
            <div class="report-card-head">
              <strong>{{ report.name }}</strong>
              <span class="status-chip" :class="statusTone(report.status)">
                {{ formatEnumLabel(report.status) }}
              </span>
            </div>
            <p>{{ report.description || "No description provided." }}</p>
            <small>Updated {{ formatDateTime(report.updatedAt) }}</small>
          </article>
        </div>
      </section>
    </div>
  </template>
</template>
