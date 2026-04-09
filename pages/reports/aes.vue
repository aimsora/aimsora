<script setup lang="ts">
import { REPORT_SECTION_META } from "~/utils/report-sections";

definePageMeta({
  title: REPORT_SECTION_META.npp.pageTitle,
  description: REPORT_SECTION_META.npp.pageDescription,
  roles: REPORT_SECTION_META.npp.roles
});

useHead({
  title: REPORT_SECTION_META.npp.pageTitle
});
</script>

<template>
  <ReportsSectionPage section-id="npp" />
</template>
