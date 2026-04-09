<script setup lang="ts">
import { ANALYTICS_SECTION_META } from "~/utils/analytics-sections";

definePageMeta({
  title: ANALYTICS_SECTION_META.npp.pageTitle,
  description: ANALYTICS_SECTION_META.npp.description,
  roles: ["ANALYST", "ADMIN"]
});

useHead({
  title: ANALYTICS_SECTION_META.npp.pageTitle
});
</script>

<template>
  <AnalyticsSectionPage section-id="npp" />
</template>
