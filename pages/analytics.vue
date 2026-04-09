<script setup lang="ts">
import { getAnalyticsSectionPath } from "~/utils/analytics-sections";

definePageMeta({
  title: "Аналитика",
  description: "Маршрутизация по аналитическим разделам",
  roles: ["ANALYST", "ADMIN"]
});

await navigateTo(getAnalyticsSectionPath("overview"), { replace: true });
</script>
