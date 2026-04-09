<script setup lang="ts">
import { ANALYTICS_SECTION_META } from "~/utils/analytics-sections";

definePageMeta({
  title: ANALYTICS_SECTION_META.suppliers.pageTitle,
  description: ANALYTICS_SECTION_META.suppliers.description,
  roles: ["ANALYST", "ADMIN"]
});

useHead({
  title: ANALYTICS_SECTION_META.suppliers.pageTitle
});
</script>

<template>
  <AnalyticsSectionPage section-id="suppliers" />
</template>
