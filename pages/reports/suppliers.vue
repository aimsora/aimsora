<script setup lang="ts">
import { REPORT_SECTION_META } from "~/utils/report-sections";

definePageMeta({
  title: REPORT_SECTION_META.suppliers.pageTitle,
  description: REPORT_SECTION_META.suppliers.pageDescription,
  roles: REPORT_SECTION_META.suppliers.roles
});

useHead({
  title: REPORT_SECTION_META.suppliers.pageTitle
});
</script>

<template>
  <ReportsSectionPage section-id="suppliers" />
</template>
