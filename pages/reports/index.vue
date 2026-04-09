<script setup lang="ts">
import { getReportSectionPath } from "~/utils/report-sections";

definePageMeta({
  title: "Отчёты",
  description: "Маршрутизация по разделам отчётности",
  roles: ["ANALYST", "DEVELOPER", "ADMIN"]
});

const route = useRoute();
const auth = useAuthSession();

const targetPath = computed(() => {
  const requestedSection = typeof route.query.section === "string" ? route.query.section : null;

  if (requestedSection === "suppliers") {
    return getReportSectionPath("suppliers");
  }

  if (requestedSection === "niches") {
    return getReportSectionPath("niches");
  }

  if (requestedSection === "npp") {
    return getReportSectionPath("npp");
  }

  if (requestedSection === "parsers") {
    return getReportSectionPath("parsers");
  }

  if (auth.user.value?.role === "DEVELOPER") {
    return getReportSectionPath("parsers");
  }

  return getReportSectionPath("suppliers");
});

await navigateTo(targetPath.value, { replace: true });
</script>
