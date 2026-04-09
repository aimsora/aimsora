<script setup lang="ts">
import { REPORT_SECTION_META } from "~/utils/report-sections";

definePageMeta({
  title: REPORT_SECTION_META.niches.pageTitle,
  description: REPORT_SECTION_META.niches.pageDescription,
  roles: REPORT_SECTION_META.niches.roles
});

useHead({
  title: REPORT_SECTION_META.niches.pageTitle
});
</script>

<template>
  <ReportsSectionPage section-id="niches" />
</template>
