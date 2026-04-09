<script setup lang="ts">
import { REPORT_SECTION_META } from "~/utils/report-sections";

definePageMeta({
  title: REPORT_SECTION_META.parsers.pageTitle,
  description: REPORT_SECTION_META.parsers.pageDescription,
  roles: REPORT_SECTION_META.parsers.roles
});

useHead({
  title: REPORT_SECTION_META.parsers.pageTitle
});
</script>

<template>
  <ReportsSectionPage section-id="parsers" />
</template>
