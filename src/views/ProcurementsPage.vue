<script setup lang="ts">
import { onMounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import {
  formatCurrency,
  formatDate,
  formatEnumLabel,
  statusTone
} from "../lib/format";
import { apolloClient } from "../services/apollo";
import type {
  Procurement,
  ProcurementPage,
  ProcurementStatus,
  Source
} from "../services/graphql-types";
import { PROCUREMENTS_QUERY, SOURCES_QUERY } from "../services/queries";

const router = useRouter();
const loading = ref(false);
const error = ref("");
const search = ref("");
const source = ref("");
const status = ref<ProcurementStatus | "">("");
const items = ref<Procurement[]>([]);
const total = ref(0);
const sources = ref<Source[]>([]);

async function load() {
  loading.value = true;
  error.value = "";

  try {
    const { data } = await apolloClient.query<{ procurementItems: ProcurementPage }>({
      query: PROCUREMENTS_QUERY,
      variables: {
        filter:
          search.value || source.value || status.value
            ? {
                ...(search.value ? { search: search.value } : {}),
                ...(source.value ? { source: source.value } : {}),
                ...(status.value ? { status: status.value } : {})
              }
            : undefined,
        sort: { field: "PUBLISHED_AT", direction: "DESC" },
        limit: 25,
        offset: 0
      },
      fetchPolicy: "network-only"
    });

    items.value = data.procurementItems.items;
    total.value = data.procurementItems.total;
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : "Unable to load procurements";
  } finally {
    loading.value = false;
  }
}

async function loadSources() {
  try {
    const { data } = await apolloClient.query<{ sources: Source[] }>({
      query: SOURCES_QUERY,
      fetchPolicy: "network-only"
    });

    sources.value = data.sources;
  } catch {
    sources.value = [];
  }
}

watch([search, source, status], () => {
  void load();
});

onMounted(() => {
  void loadSources();
  void load();
});
</script>

<template>
  <section class="page-header">
    <div>
      <p class="eyebrow">Catalogue</p>
      <h2>Procurements</h2>
    </div>
    <div class="toolbar-row">
      <input v-model="search" placeholder="Search by title, customer, supplier" />
      <select v-model="source">
        <option value="">All sources</option>
        <option v-for="item in sources" :key="item.id" :value="item.code">
          {{ item.name }}
        </option>
      </select>
      <select v-model="status">
        <option value="">All statuses</option>
        <option value="DRAFT">Draft</option>
        <option value="ACTIVE">Active</option>
        <option value="CLOSED">Closed</option>
        <option value="ARCHIVED">Archived</option>
      </select>
    </div>
  </section>

  <div v-if="loading" class="card">Loading procurements...</div>
  <div v-else-if="error" class="card error-text">{{ error }}</div>
  <section v-else class="card">
    <div class="section-title">
      <h3>{{ total }} results</h3>
    </div>
    <div v-if="items.length === 0" class="empty-state">No procurements matched your filters.</div>
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
        <tr
          v-for="item in items"
          :key="item.id"
          class="clickable-row"
          @click="router.push(`/procurements/${item.id}`)"
        >
          <td>
            <strong>{{ item.title }}</strong>
            <div class="table-subtitle">{{ item.externalId }}</div>
          </td>
          <td>{{ item.source }}</td>
          <td>{{ item.customer || "n/a" }}</td>
          <td>{{ formatCurrency(item.amount, item.currency) }}</td>
          <td>
            <span class="status-chip" :class="statusTone(item.status)">
              {{ formatEnumLabel(item.status) }}
            </span>
          </td>
          <td>{{ formatDate(item.publishedAt) }}</td>
        </tr>
      </tbody>
    </table>
  </section>
</template>
