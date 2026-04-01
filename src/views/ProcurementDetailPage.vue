<script setup lang="ts">
import { onMounted, ref } from "vue";
import { RouterLink, useRoute } from "vue-router";
import {
  formatCurrency,
  formatDateTime,
  formatEnumLabel,
  statusTone
} from "../lib/format";
import { apolloClient } from "../services/apollo";
import type { Procurement } from "../services/graphql-types";
import { PROCUREMENT_QUERY } from "../services/queries";

const route = useRoute();
const loading = ref(true);
const error = ref("");
const item = ref<Procurement | null>(null);

onMounted(async () => {
  try {
    const { data } = await apolloClient.query<{ procurementItem: Procurement | null }>({
      query: PROCUREMENT_QUERY,
      variables: { id: route.params.id },
      fetchPolicy: "network-only"
    });

    item.value = data.procurementItem;
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : "Unable to load procurement";
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <section class="page-header">
    <div>
      <p class="eyebrow">Record</p>
      <h2>Procurement Detail</h2>
    </div>
    <RouterLink class="text-link" to="/procurements">Back to list</RouterLink>
  </section>

  <div v-if="loading" class="card">Loading record...</div>
  <div v-else-if="error" class="card error-text">{{ error }}</div>
  <template v-else-if="item">
    <section class="card detail-grid">
      <div>
        <span class="detail-label">Title</span>
        <strong>{{ item.title }}</strong>
      </div>
      <div>
        <span class="detail-label">Source</span>
        <strong>{{ item.source }}</strong>
      </div>
      <div>
        <span class="detail-label">External ID</span>
        <strong>{{ item.externalId }}</strong>
      </div>
      <div>
        <span class="detail-label">Customer</span>
        <strong>{{ item.customer || "n/a" }}</strong>
      </div>
      <div>
        <span class="detail-label">Supplier</span>
        <strong>{{ item.supplier || "n/a" }}</strong>
      </div>
      <div>
        <span class="detail-label">Amount</span>
        <strong>{{ formatCurrency(item.amount, item.currency) }}</strong>
      </div>
      <div>
        <span class="detail-label">Status</span>
        <span class="status-chip" :class="statusTone(item.status)">
          {{ formatEnumLabel(item.status) }}
        </span>
      </div>
      <div>
        <span class="detail-label">Published</span>
        <strong>{{ formatDateTime(item.publishedAt) }}</strong>
      </div>
      <div>
        <span class="detail-label">Deadline</span>
        <strong>{{ formatDateTime(item.deadlineAt) }}</strong>
      </div>
      <div>
        <span class="detail-label">Source URL</span>
        <a
          v-if="item.sourceUrl"
          class="text-link"
          :href="item.sourceUrl"
          target="_blank"
          rel="noreferrer"
        >
          Open original
        </a>
        <strong v-else>n/a</strong>
      </div>
      <div class="detail-block">
        <span class="detail-label">Description</span>
        <p>{{ item.description || "No description" }}</p>
      </div>
      <div class="detail-block">
        <span class="detail-label">Raw payload</span>
        <pre>{{ JSON.stringify(item.rawPayload, null, 2) }}</pre>
      </div>
    </section>
  </template>
</template>
