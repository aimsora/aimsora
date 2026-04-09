<script setup lang="ts">
import { ANALYTICS_SECTION_META } from "~/utils/analytics-sections";

definePageMeta({
  title: ANALYTICS_SECTION_META.overview.pageTitle,
  description: ANALYTICS_SECTION_META.overview.description,
  roles: ["ANALYST", "ADMIN"]
});

useHead({
  title: ANALYTICS_SECTION_META.overview.pageTitle
});
</script>

<template>
  <AnalyticsSectionPage section-id="overview" />
</template>
