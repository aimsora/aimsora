<script setup lang="ts">
import type { ReportNppStationOrderItem } from "~/graphql/types";
import {
  REPORT_SECTION_META,
  REPORT_TYPE_DESCRIPTIONS,
  REPORT_TYPE_LABELS,
  getReportListRouteByType,
  getReportSectionPath,
  type ReportSectionId
} from "~/utils/report-sections";

definePageMeta({
  title: "Карточка отчёта",
  description: "Детальная аналитика по выбранному отчёту",
  roles: ["ANALYST", "DEVELOPER", "ADMIN"]
});

const route = useRoute();
const detail = useReportDetail();

type ReportDetailSectionId =
  | "summary"
  | "portfolio"
  | "suppliers"
  | "niches"
  | "stations"
  | "sources"
  | "operations";

const reportTypeSections: Record<string, ReportDetailSectionId[]> = {
  "daily-overview": ["summary", "portfolio", "sources"],
  "supplier-risk": ["summary", "portfolio", "suppliers", "sources"],
  "supplier-due-diligence": ["summary", "suppliers"],
  "npp-market-niches": ["summary", "niches", "sources"],
  "npp-station-orders": ["summary", "stations", "sources"],
  "pipeline-incident": ["summary", "sources", "operations"]
};

const NPP_CONTRACT_SOURCE_CODES = new Set(["eis_contracts", "eis_contracts_223"]);
const NPP_LAST_MONTH_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

const title = computed(() => detail.item.value?.name || "Карточка отчёта");
const description = computed(() => {
  if (detail.item.value?.description) {
    return detail.item.value.description;
  }

  return REPORT_TYPE_DESCRIPTIONS[detail.item.value?.reportType ?? ""] || "Детальный аналитический отчёт.";
});

const metricCards = computed(() => detail.item.value?.metrics ?? []);
const scoreCards = computed(() => detail.item.value?.scores ?? []);
const hasSupplierDueDiligence = computed(() => (detail.item.value?.supplierDueDiligence?.length ?? 0) > 0);
const hasNppNicheOrders = computed(() => (detail.item.value?.nppNicheOrders?.length ?? 0) > 0);
const filteredNppStationOrders = computed<ReportNppStationOrderItem[]>(() => {
  const sourceItems = detail.item.value?.nppStationOrders ?? [];
  const threshold = Date.now() - NPP_LAST_MONTH_WINDOW_MS;
  const filteredItems: ReportNppStationOrderItem[] = [];

  for (const station of sourceItems) {
    const orders = station.orders.filter((order) => {
      if (!order.publishedAt) {
        return false;
      }

      return new Date(order.publishedAt).getTime() >= threshold;
    });

    if (orders.length === 0) {
      continue;
    }

    const timestamps = orders
      .map((order) => order.publishedAt)
      .filter((value): value is string => Boolean(value))
      .map((value) => new Date(value).getTime());

    filteredItems.push({
        station: station.station,
        procurementCount: orders.length,
        contractCount: orders.filter((order) => NPP_CONTRACT_SOURCE_CODES.has(order.source)).length,
        totalAmount: orders.reduce((sum, order) => sum + (order.amount ?? 0), 0),
        firstPublishedAt: timestamps.length > 0 ? new Date(Math.min(...timestamps)).toISOString() : null,
        lastPublishedAt: timestamps.length > 0 ? new Date(Math.max(...timestamps)).toISOString() : null,
        orders
    });
  }

  return filteredItems.sort(
    (left, right) => right.procurementCount - left.procurementCount || left.station.localeCompare(right.station)
  );
});
const nppStationMonthCards = computed(() => {
  const items = filteredNppStationOrders.value;
  const totalOrders = items.reduce((sum, item) => sum + item.procurementCount, 0);
  const totalContracts = items.reduce((sum, item) => sum + item.contractCount, 0);
  const totalAmount = items.reduce((sum, item) => sum + item.totalAmount, 0);
  const averagePerStation = items.length > 0 ? totalOrders / items.length : 0;
  const leadStation = items[0];

  return [
    {
      label: "Станции с активностью",
      value: formatNumber(items.length),
      hint: "АЭС, по которым за последний месяц есть найденные закупки"
    },
    {
      label: "Закупки за месяц",
      value: formatNumber(totalOrders),
      hint: `Среднее количество записей на станцию: ${formatNumber(averagePerStation)}`
    },
    {
      label: "Договорный слой",
      value: formatNumber(totalContracts),
      hint:
        totalOrders > 0
          ? `Доля договорных записей: ${formatPercent((totalContracts / totalOrders) * 100)}`
          : "За выбранный период договорные записи не найдены"
    },
    {
      label: "Совокупный объём",
      value: formatCurrency(totalAmount, "RUB"),
      hint: leadStation ? `Лидер по активности: ${leadStation.station}` : "За последний месяц объём не сформирован"
    }
  ];
});
const nppStationMonthChartItems = computed(() =>
  filteredNppStationOrders.value.slice(0, 8).map((item) => ({
    label: item.station,
    value: item.procurementCount,
    valueLabel: `${formatNumber(item.procurementCount)} закупок`,
    note: `${formatNumber(item.contractCount)} договоров · ${formatCurrency(item.totalAmount, "RUB")}`,
    accent: "success" as const
  }))
);
const nppStationMonthAmountItems = computed(() =>
  [...filteredNppStationOrders.value]
    .sort((left, right) => right.totalAmount - left.totalAmount)
    .slice(0, 8)
    .map((item) => ({
      label: item.station,
      value: item.totalAmount,
      valueLabel: formatCurrency(item.totalAmount, "RUB"),
      note: `${formatNumber(item.procurementCount)} закупок · ${formatNumber(item.contractCount)} договоров`,
      accent: "primary" as const
    }))
);
const nppStationMonthContractSegments = computed(() => {
  const totalOrders = filteredNppStationOrders.value.reduce((sum, item) => sum + item.procurementCount, 0);
  const totalContracts = filteredNppStationOrders.value.reduce((sum, item) => sum + item.contractCount, 0);
  const nonContractOrders = Math.max(totalOrders - totalContracts, 0);

  return [
    {
      label: "Договорный слой",
      value: totalContracts,
      valueLabel: `${formatNumber(totalContracts)} записей`,
      accent: "warning" as const
    },
    {
      label: "Закупочный слой",
      value: nonContractOrders,
      valueLabel: `${formatNumber(nonContractOrders)} записей`,
      accent: "success" as const
    }
  ];
});
const nppStationMonthSourceItems = computed(() => {
  const totals = new Map<string, { procurementCount: number; totalAmount: number }>();

  for (const station of filteredNppStationOrders.value) {
    for (const order of station.orders) {
      const current = totals.get(order.source) ?? { procurementCount: 0, totalAmount: 0 };
      current.procurementCount += 1;
      current.totalAmount += order.amount ?? 0;
      totals.set(order.source, current);
    }
  }

  return Array.from(totals.entries())
    .sort((left, right) => right[1].procurementCount - left[1].procurementCount || left[0].localeCompare(right[0]))
    .map(([source, stats]) => ({
      label: source,
      value: stats.procurementCount,
      valueLabel: `${formatNumber(stats.procurementCount)} закупок`,
      note: formatCurrency(stats.totalAmount, "RUB"),
      accent: "muted" as const
    }));
});
const nppNicheSummary = computed(() => {
  const items = detail.item.value?.nppNicheOrders ?? [];
  const totalOrders = items.reduce((sum, item) => sum + item.procurementCount, 0);
  const totalAmount = items.reduce((sum, item) => sum + item.totalAmount, 0);
  const totalStations = new Set(items.flatMap((item) => item.stations)).size;
  const leadNiche = [...items].sort(
    (left, right) =>
      right.procurementCount - left.procurementCount ||
      right.totalAmount - left.totalAmount ||
      right.stationCount - left.stationCount ||
      left.niche.localeCompare(right.niche)
  )[0];

  return {
    totalOrders,
    totalAmount,
    totalStations,
    leadNiche
  };
});
const nppNicheDemandSegments = computed(() => {
  const items = [...(detail.item.value?.nppNicheOrders ?? [])].sort(
    (left, right) =>
      right.procurementCount - left.procurementCount ||
      right.totalAmount - left.totalAmount ||
      left.niche.localeCompare(right.niche)
  );
  const topItems = items.slice(0, 4);
  const otherCount = items.slice(4).reduce((sum, item) => sum + item.procurementCount, 0);
  const segments: Array<{
    label: string;
    value: number;
    valueLabel: string;
    accent: "primary" | "success" | "muted";
  }> = topItems.map((item, index) => ({
    label: item.niche,
    value: item.procurementCount,
    valueLabel: `${formatNumber(item.procurementCount)} закупок`,
    accent: index % 2 === 0 ? "primary" : "success"
  }));

  if (otherCount > 0) {
    segments.push({
      label: "Остальные ниши",
      value: otherCount,
      valueLabel: `${formatNumber(otherCount)} закупок`,
      accent: "muted" as const
    });
  }

  return segments;
});
const nppNicheCoverageItems = computed(() =>
  (detail.item.value?.nppNicheOrders ?? [])
    .slice()
    .sort((left, right) => right.stationCount - left.stationCount || right.procurementCount - left.procurementCount)
    .slice(0, 8)
    .map((item) => ({
      label: item.niche,
      value: item.stationCount,
      valueLabel: `${formatNumber(item.stationCount)} АЭС`,
      note: `${formatNumber(item.procurementCount)} закупок · ${formatCurrency(item.totalAmount, "RUB")}`,
      accent: "warning" as const
    }))
);
const nppNicheBudgetSegments = computed(() => {
  const items = [...(detail.item.value?.nppNicheOrders ?? [])].sort(
    (left, right) =>
      right.totalAmount - left.totalAmount ||
      right.procurementCount - left.procurementCount ||
      left.niche.localeCompare(right.niche)
  );
  const totalAmount = items.reduce((sum, item) => sum + item.totalAmount, 0);

  if (totalAmount <= 0) {
    return [];
  }

  return items.slice(0, 4).map((item, index) => {
    const accent: "danger" | "warning" | "primary" =
      index === 0 ? "danger" : index === 1 ? "warning" : "primary";

    return {
      label: item.niche,
      value: item.totalAmount,
      valueLabel: formatCurrency(item.totalAmount, "RUB"),
      accent
    };
  });
});
const nppNicheFreshnessItems = computed(() =>
  (detail.item.value?.nppNicheOrders ?? [])
    .filter((item) => Boolean(item.lastPublishedAt))
    .slice()
    .sort(
      (left, right) =>
        new Date(right.lastPublishedAt ?? 0).getTime() - new Date(left.lastPublishedAt ?? 0).getTime()
    )
    .slice(0, 8)
    .map((item) => ({
      label: item.niche,
      value: item.procurementCount,
      valueLabel: formatDateTime(item.lastPublishedAt),
      note: `${formatNumber(item.stationCount)} АЭС · ${formatCurrency(item.totalAmount, "RUB")}`,
      accent: "success" as const
    }))
);
const supplierIntegritySegments = computed(() => {
  const items = detail.item.value?.supplierDueDiligence ?? [];
  const highRisk = items.filter((item) => (item.integrityScore ?? 0) < 45).length;
  const watch = items.filter((item) => (item.integrityScore ?? 0) >= 45 && (item.integrityScore ?? 0) < 70).length;
  const stable = items.filter((item) => (item.integrityScore ?? 0) >= 70).length;

  return [
    {
      label: "Высокий риск",
      value: highRisk,
      valueLabel: `${formatNumber(highRisk)} поставщиков`,
      accent: "danger" as const
    },
    {
      label: "Нужна проверка",
      value: watch,
      valueLabel: `${formatNumber(watch)} поставщиков`,
      accent: "warning" as const
    },
    {
      label: "Стабильный профиль",
      value: stable,
      valueLabel: `${formatNumber(stable)} поставщиков`,
      accent: "success" as const
    }
  ];
});
const supplierRiskProfileItems = computed(() =>
  (detail.item.value?.supplierDueDiligence ?? [])
    .map((item) => {
      const pressure =
        item.activeRnpEntriesCount * 5 +
        item.activeRiskSignalsCount * 3 +
        (item.liquidationMark ? 4 : 0) +
        (item.flags?.length ?? 0);

      return {
        label: item.supplier,
        value: Math.max(pressure, 1),
        valueLabel: `${formatNumber(item.integrityScore)}/100`,
        note: `${formatNumber(item.activeRiskSignalsCount)} риск-сигналов · ${formatNumber(item.activeRnpEntriesCount)} РНП`,
        accent:
          item.activeRnpEntriesCount > 0 || item.liquidationMark
            ? ("danger" as const)
            : item.activeRiskSignalsCount > 0
              ? ("warning" as const)
              : ("success" as const)
      };
    })
    .sort((left, right) => right.value - left.value || left.label.localeCompare(right.label))
    .slice(0, 8)
);
const supplierRegionItems = computed(() => {
  const counters = new Map<string, { suppliers: number; riskySuppliers: number }>();

  for (const item of detail.item.value?.supplierDueDiligence ?? []) {
    const region = item.region?.trim() || "Регион не указан";
    const current = counters.get(region) ?? { suppliers: 0, riskySuppliers: 0 };
    current.suppliers += 1;

    if ((item.integrityScore ?? 0) < 70 || item.activeRiskSignalsCount > 0 || item.activeRnpEntriesCount > 0) {
      current.riskySuppliers += 1;
    }

    counters.set(region, current);
  }

  return Array.from(counters.entries())
    .sort((left, right) => right[1].suppliers - left[1].suppliers || left[0].localeCompare(right[0]))
    .slice(0, 8)
    .map(([region, stats]) => ({
      label: region,
      value: stats.suppliers,
      valueLabel: `${formatNumber(stats.suppliers)} контрагентов`,
      note: `Под наблюдением: ${formatNumber(stats.riskySuppliers)}`,
      accent: stats.riskySuppliers > 0 ? ("warning" as const) : ("primary" as const)
    }));
});
const supplierFlagItems = computed(() => {
  const counters = new Map<string, number>();

  for (const item of detail.item.value?.supplierDueDiligence ?? []) {
    for (const flag of item.flags ?? []) {
      counters.set(flag, (counters.get(flag) ?? 0) + 1);
    }
  }

  return Array.from(counters.entries())
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, 8)
    .map(([flag, count]) => ({
      label: flag,
      value: count,
      valueLabel: `${formatNumber(count)} поставщиков`,
      note: "Частота появления флага в текущем отчёте",
      accent: "muted" as const
    }));
});
const hasNppStationOrders = computed(() => filteredNppStationOrders.value.length > 0);
const hasMarketConcentration = computed(
  () =>
    (detail.item.value?.supplierExposure?.length ?? 0) > 0 ||
    (detail.item.value?.customerExposure?.length ?? 0) > 0
);
const hasPortfolioStructure = computed(
  () =>
    (detail.item.value?.deadlinePressure?.length ?? 0) > 0 ||
    (detail.item.value?.statusMix?.length ?? 0) > 0 ||
    (detail.item.value?.amountDistribution?.length ?? 0) > 0
);
const hasSourceAnalytics = computed(
  () =>
    (detail.item.value?.sourceContribution?.length ?? 0) > 0 ||
    (detail.item.value?.sourceHealth?.length ?? 0) > 0
);
const hasOperationalAnalytics = computed(
  () =>
    (detail.item.value?.recentSourceRuns?.length ?? 0) > 0 ||
    (detail.item.value?.recentProcurements?.length ?? 0) > 0
);
const enabledSections = computed<ReportDetailSectionId[]>(() => {
  const reportType = detail.item.value?.reportType ?? "daily-overview";
  return reportTypeSections[reportType] ?? ["summary"];
});
const showPortfolioSection = computed(
  () => enabledSections.value.includes("portfolio") && hasPortfolioStructure.value
);
const showSuppliersSection = computed(
  () => enabledSections.value.includes("suppliers") && (hasMarketConcentration.value || hasSupplierDueDiligence.value)
);
const showNichesSection = computed(
  () => enabledSections.value.includes("niches") && hasNppNicheOrders.value
);
const showStationsSection = computed(
  () => enabledSections.value.includes("stations") && hasNppStationOrders.value
);
const showSourcesSection = computed(
  () => enabledSections.value.includes("sources") && hasSourceAnalytics.value
);
const showOperationsSection = computed(
  () => enabledSections.value.includes("operations") && hasOperationalAnalytics.value
);
const reportSections = computed(() => {
  const sections = [
    {
      id: "summary",
      label: "Сводка",
      description: "Метрики, индексы, ключевые сигналы и план действий.",
      visible: enabledSections.value.includes("summary")
    },
    {
      id: "portfolio",
      label: "Портфель",
      description: "Дедлайны, статусы, бюджеты и общая структура выборки.",
      visible: showPortfolioSection.value
    },
    {
      id: "suppliers",
      label: "Поставщики",
      description: "Концентрация и отдельная проверка добросовестности поставщиков.",
      visible: showSuppliersSection.value
    },
    {
      id: "niches",
      label: "Ниши",
      description: "Группировка закупок АЭС по типовым нишам и тематическим направлениям.",
      visible: showNichesSection.value
    },
    {
      id: "stations",
      label: "АЭС",
      description: "Закупочная активность по станциям и список заказов.",
      visible: showStationsSection.value
    },
    {
      id: "sources",
      label: "Источники",
      description: "Вклад каналов, риски и публикационная устойчивость.",
      visible: showSourcesSection.value
    },
    {
      id: "operations",
      label: "Операционный контур",
      description: "Запуски конвейера и закупки, которые стоит проверить вручную.",
      visible: showOperationsSection.value
    }
  ];

  return sections.filter((section) => section.visible);
});
const deadlineMax = computed(() =>
  Math.max(...(detail.item.value?.deadlinePressure?.map((item) => item.count) ?? [1]), 1)
);
const statusMixMax = computed(() =>
  Math.max(...(detail.item.value?.statusMix?.map((item) => item.count) ?? [1]), 1)
);
const backToReportsLink = computed(() => {
  const requestedSection = typeof route.query.section === "string" ? route.query.section : null;
  const reportType = detail.item.value?.reportType;

  if (
    requestedSection &&
    requestedSection in REPORT_SECTION_META &&
    requestedSection !== "analytics"
  ) {
    return getReportSectionPath(requestedSection as ReportSectionId);
  }

  return getReportListRouteByType(reportType);
});

function reportTypeLabel(reportType?: string | null) {
  return REPORT_TYPE_LABELS[reportType ?? ""] ?? "Оперативный отчёт";
}

function severityBadgeVariant(severity?: string | null) {
  if (severity === "destructive") {
    return "destructive" as const;
  }

  if (severity === "warning") {
    return "warning" as const;
  }

  if (severity === "success") {
    return "success" as const;
  }

  return "secondary" as const;
}

function severityLabel(severity?: string | null) {
  if (severity === "destructive") {
    return "Критично";
  }

  if (severity === "warning") {
    return "Внимание";
  }

  if (severity === "success") {
    return "Стабильно";
  }

  return "Инфо";
}

function priorityBadgeVariant(priority?: string | null) {
  if (priority === "Высокий") {
    return "destructive" as const;
  }

  if (priority === "Средний") {
    return "warning" as const;
  }

  return "secondary" as const;
}

function riskBadgeVariant(level?: string | null) {
  if (level === "CRITICAL") {
    return "destructive" as const;
  }

  if (level === "WATCH") {
    return "warning" as const;
  }

  return "success" as const;
}

function riskLabel(level?: string | null) {
  if (level === "CRITICAL") {
    return "Критично";
  }

  if (level === "WATCH") {
    return "Под наблюдением";
  }

  return "Стабильно";
}

function integrityBadgeVariant(score?: number | null) {
  if ((score ?? 0) < 45) {
    return "destructive" as const;
  }

  if ((score ?? 0) < 70) {
    return "warning" as const;
  }

  return "success" as const;
}

function integrityLabel(score?: number | null) {
  if ((score ?? 0) < 45) {
    return "Высокий риск";
  }

  if ((score ?? 0) < 70) {
    return "Нужна проверка";
  }

  return "Нормально";
}

watch(
  () => route.params.id,
  (value) => {
    if (typeof value === "string" && value.length > 0) {
      void detail.load(value);
    }
  },
  { immediate: true }
);

watchEffect(() => {
  useHead({
    title: detail.item.value?.name || "Карточка отчёта"
  });
});
</script>

<template>
  <div id="report-top" />

  <PageHeader :title="title" :description="description">
    <template #actions>
      <Badge v-if="detail.item.value" variant="secondary">
        {{ reportTypeLabel(detail.item.value.reportType) }}
      </Badge>
      <Badge v-if="detail.item.value" :variant="badgeVariant(detail.item.value.status)">
        {{ formatEnumLabel(detail.item.value.status) }}
      </Badge>
      <Button as-child variant="secondary">
        <NuxtLink :to="backToReportsLink">К списку</NuxtLink>
      </Button>
    </template>
  </PageHeader>

  <div v-if="detail.loading.value" class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
    <Skeleton v-for="item in 4" :key="item" class="h-32 rounded-xl" />
  </div>

  <ErrorState
    v-else-if="detail.error.value"
    :description="detail.error.value"
    action-label="Повторить"
    @action="detail.load(String(route.params.id))"
  />

  <template v-else-if="detail.item.value">
    <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <StatCard
        v-for="metric in metricCards"
        :key="metric.label"
        :label="metric.label"
        :value="metric.value"
        :hint="metric.hint"
      />
    </div>

    <Card class="border-border/70">
      <CardHeader>
        <CardTitle>Навигация по отчёту</CardTitle>
        <CardDescription>
          Отчёт разложен по разделам, чтобы можно было быстро перейти к нужной странице аналитики.
        </CardDescription>
      </CardHeader>
      <CardContent class="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <a
          v-for="section in reportSections"
          :key="section.id"
          :href="`#${section.id}`"
          class="rounded-2xl border bg-muted/20 p-4 transition hover:border-primary/40 hover:bg-muted/30"
        >
          <div class="space-y-2">
            <p class="font-medium">{{ section.label }}</p>
            <p class="text-sm text-muted-foreground">{{ section.description }}</p>
          </div>
        </a>
      </CardContent>
    </Card>

    <section id="summary" class="space-y-4 scroll-mt-24">
      <Card class="border-border/70 bg-gradient-to-br from-sky-500/10 via-background to-background">
        <CardHeader class="space-y-2">
          <div class="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">Сводка</Badge>
            <Badge variant="outline">{{ reportTypeLabel(detail.item.value.reportType) }}</Badge>
          </div>
          <div class="space-y-1">
            <CardTitle>Общая картина по отчёту</CardTitle>
            <CardDescription>
              Здесь собраны индексы, ключевые сигналы и конкретные действия без лишнего шума.
            </CardDescription>
          </div>
        </CardHeader>
      </Card>

      <div class="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <Card>
          <CardHeader>
            <CardTitle>Scorecards</CardTitle>
            <CardDescription>
              Четыре сводных индекса, чтобы быстро понять здоровье потока, риски и операционную устойчивость.
            </CardDescription>
          </CardHeader>
          <CardContent class="grid gap-4 md:grid-cols-2">
            <div
              v-for="score in scoreCards"
              :key="score.label"
              class="rounded-xl border bg-muted/20 p-4"
            >
              <div class="flex items-start justify-between gap-3">
                <div class="space-y-1">
                  <p class="font-medium">{{ score.label }}</p>
                  <p class="text-3xl font-semibold">{{ formatNumber(score.value) }}/100</p>
                </div>
                <Badge :variant="severityBadgeVariant(score.severity)">
                  {{ severityLabel(score.severity) }}
                </Badge>
              </div>
              <p class="mt-3 text-sm text-muted-foreground">{{ score.detail }}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>План действий</CardTitle>
            <CardDescription>
              Конкретные шаги для текущей роли на основе состояния данных, пайплайна и рисков.
            </CardDescription>
          </CardHeader>
          <CardContent class="space-y-3">
            <div
              v-for="action in detail.item.value.actions"
              :key="action.title"
              class="rounded-xl border bg-muted/20 p-4"
            >
              <div class="flex items-start justify-between gap-3">
                <div class="space-y-1">
                  <p class="font-medium">{{ action.title }}</p>
                  <p class="text-sm text-muted-foreground">{{ action.description }}</p>
                </div>
                <Badge :variant="priorityBadgeVariant(action.priority)">{{ action.priority }}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div class="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <Card>
          <CardHeader>
            <CardTitle>Ключевые сигналы</CardTitle>
            <CardDescription>
              Быстрый разбор того, что сейчас важнее всего в этом сценарии отчётности.
            </CardDescription>
          </CardHeader>
          <CardContent class="space-y-3">
            <div
              v-for="highlight in detail.item.value.highlights"
              :key="highlight.title"
              class="rounded-xl border bg-muted/20 p-4"
            >
              <div class="flex items-start justify-between gap-3">
                <div class="space-y-1">
                  <p class="font-medium">{{ highlight.title }}</p>
                  <p class="text-sm text-muted-foreground">{{ highlight.description }}</p>
                </div>
                <Badge :variant="severityBadgeVariant(highlight.severity)">
                  {{ severityLabel(highlight.severity) }}
                </Badge>
              </div>
            </div>

            <div class="rounded-xl border bg-muted/20 p-4 text-sm text-muted-foreground">
              Сформирован: {{ formatDateTime(detail.item.value.generatedAt) }}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Контекст отчёта</CardTitle>
            <CardDescription>
              Короткая карточка, чтобы сразу понять, какой именно сценарий открыт.
            </CardDescription>
          </CardHeader>
          <CardContent class="space-y-3 text-sm text-muted-foreground">
            <div class="rounded-xl border bg-muted/20 p-4">
              <p class="font-medium text-foreground">Тип отчёта</p>
              <p class="mt-1">{{ reportTypeLabel(detail.item.value.reportType) }}</p>
            </div>
            <div class="rounded-xl border bg-muted/20 p-4">
              <p class="font-medium text-foreground">Описание сценария</p>
              <p class="mt-1">{{ description }}</p>
            </div>
            <div class="rounded-xl border bg-muted/20 p-4">
              <p class="font-medium text-foreground">Статус</p>
              <div class="mt-2">
                <Badge :variant="badgeVariant(detail.item.value.status)">
                  {{ formatEnumLabel(detail.item.value.status) }}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>

    <section
      v-if="showPortfolioSection"
      id="portfolio"
      class="space-y-4 scroll-mt-24"
    >
      <Card class="border-border/70 bg-gradient-to-br from-indigo-500/10 via-background to-background">
        <CardHeader class="space-y-1">
          <div class="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">Портфель</Badge>
          </div>
          <CardTitle>Структура выборки</CardTitle>
          <CardDescription>
            Отдельная страница для дедлайнов, бюджетных корзин и статусной структуры закупок.
          </CardDescription>
        </CardHeader>
      </Card>

      <div class="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <Card>
          <CardHeader>
            <CardTitle>Давление по дедлайнам</CardTitle>
            <CardDescription>Показывает, где срокам уже тесно и где нужна быстрая реакция.</CardDescription>
          </CardHeader>
          <CardContent class="space-y-4">
            <div
              v-for="bucket in detail.item.value.deadlinePressure"
              :key="bucket.label"
              class="space-y-2"
            >
              <div class="flex items-center justify-between text-sm">
                <span>{{ bucket.label }}</span>
                <span class="text-muted-foreground">{{ formatNumber(bucket.count) }}</span>
              </div>
              <div class="h-2 rounded-full bg-muted">
                <div
                  class="h-2 rounded-full bg-primary"
                  :style="{ width: `${Math.max(8, (bucket.count / deadlineMax) * 100)}%` }"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Статусный микс закупок</CardTitle>
            <CardDescription>Как сейчас распределён портфель по стадиям жизненного цикла.</CardDescription>
          </CardHeader>
          <CardContent class="space-y-4">
            <div
              v-for="item in detail.item.value.statusMix"
              :key="item.label"
              class="space-y-2"
            >
              <div class="flex items-center justify-between text-sm">
                <span>{{ formatEnumLabel(item.label) }}</span>
                <span class="text-muted-foreground">
                  {{ formatNumber(item.count) }} · {{ formatPercent(item.sharePercent) }}
                </span>
              </div>
              <div class="h-2 rounded-full bg-muted">
                <div
                  class="h-2 rounded-full bg-primary"
                  :style="{ width: `${Math.max(8, (item.count / statusMixMax) * 100)}%` }"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Бюджетные корзины</CardTitle>
          <CardDescription>Где концентрируется денежный объём и какой чек доминирует в портфеле.</CardDescription>
        </CardHeader>
        <CardContent class="space-y-4">
          <div
            v-for="item in detail.item.value.amountDistribution"
            :key="item.label"
            class="space-y-2"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <p class="text-sm font-medium leading-5 break-words">{{ item.label }}</p>
                <p class="mt-1 text-sm text-muted-foreground">
                  {{ formatNumber(item.procurementCount) }} закупок · {{ formatCurrency(item.totalAmount, "RUB") }}
                </p>
              </div>
              <Badge variant="secondary" class="shrink-0 self-start">{{ formatPercent(item.sharePercent) }}</Badge>
            </div>
            <div class="h-2 rounded-full bg-muted">
              <div
                class="h-2 rounded-full bg-primary"
                :style="{ width: `${Math.max(8, item.sharePercent)}%` }"
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </section>

    <section
      v-if="showSuppliersSection"
      id="suppliers"
      class="space-y-4 scroll-mt-24"
    >
      <Card class="border-border/70 bg-gradient-to-br from-amber-500/10 via-background to-background">
        <CardHeader class="space-y-1">
          <div class="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">Поставщики</Badge>
          </div>
          <CardTitle>Поставщики и контрагенты</CardTitle>
          <CardDescription>
            Отдельная страница для концентрации, рисков и оценки добросовестности поставщиков.
          </CardDescription>
        </CardHeader>
      </Card>

      <div v-if="hasMarketConcentration" class="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Концентрация по поставщикам</CardTitle>
            <CardDescription>Кто доминирует в потоке и насколько это заметно по выборке.</CardDescription>
          </CardHeader>
          <CardContent>
            <EmptyState
              v-if="detail.item.value.supplierExposure.length === 0"
              title="Пока нет данных"
              description="Когда появятся закупки с привязкой к поставщикам, здесь появится аналитика концентрации."
            />
            <div v-else class="space-y-4">
              <div
                v-for="item in detail.item.value.supplierExposure"
                :key="item.supplier"
                class="space-y-2"
              >
                <div class="flex items-start justify-between gap-3">
                  <div class="min-w-0">
                    <p class="text-sm font-medium leading-5 break-words">{{ item.supplier }}</p>
                    <p class="mt-1 text-sm text-muted-foreground">
                      {{ formatNumber(item.procurementCount) }} закупок · {{ formatCurrency(item.totalAmount, "RUB") }}
                    </p>
                  </div>
                  <Badge variant="secondary" class="shrink-0 self-start">{{ formatPercent(item.sharePercent) }}</Badge>
                </div>
                <div class="h-2 rounded-full bg-muted">
                  <div class="h-2 rounded-full bg-primary" :style="{ width: `${Math.max(8, item.sharePercent)}%` }" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Клиентская концентрация</CardTitle>
            <CardDescription>Какие заказчики формируют основной входящий поток в продукте.</CardDescription>
          </CardHeader>
          <CardContent>
            <EmptyState
              v-if="detail.item.value.customerExposure.length === 0"
              title="Нет данных по заказчикам"
              description="После загрузки customerName в закупки здесь появится клиентский слой аналитики."
            />
            <div v-else class="space-y-4">
              <div
                v-for="item in detail.item.value.customerExposure"
                :key="item.customer"
                class="space-y-2"
              >
                <div class="flex items-start justify-between gap-3">
                  <div class="min-w-0">
                    <p class="text-sm font-medium leading-5 break-words">{{ item.customer }}</p>
                    <p class="mt-1 text-sm text-muted-foreground">
                      {{ formatNumber(item.procurementCount) }} закупок · {{ formatCurrency(item.totalAmount, "RUB") }}
                    </p>
                  </div>
                  <Badge variant="secondary" class="shrink-0 self-start">{{ formatPercent(item.sharePercent) }}</Badge>
                </div>
                <div class="h-2 rounded-full bg-muted">
                  <div class="h-2 rounded-full bg-primary" :style="{ width: `${Math.max(8, item.sharePercent)}%` }" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div v-if="hasSupplierDueDiligence" class="grid gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Профиль добросовестности</CardTitle>
            <CardDescription>
              Сводка по качеству контрагентского профиля: где у поставщиков стабильный контур, а где уже нужна ручная проверка.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <MetricStackBar
              :segments="supplierIntegritySegments"
              empty-text="Когда появятся карточки контрагентов, здесь отобразится профиль добросовестности."
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Карта риск-напряжения</CardTitle>
            <CardDescription>
              Приоритизация поставщиков по совокупному давлению: риск-сигналы, РНП, признаки ликвидации и накопленные флаги.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <MetricBarList
              :items="supplierRiskProfileItems"
              empty-text="После накопления сигналов здесь появится карта риск-напряжения по поставщикам."
            />
          </CardContent>
        </Card>
      </div>

      <div v-if="hasSupplierDueDiligence" class="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>География контрагентов</CardTitle>
            <CardDescription>
              Показывает, в каких регионах сейчас сосредоточен поставщикский контур и где копится больше контрагентов под наблюдением.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <MetricBarList
              :items="supplierRegionItems"
              empty-text="После загрузки регионального профиля здесь появится география контрагентов."
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Повторяющиеся флаги проверки</CardTitle>
            <CardDescription>
              Частота риск-флагов помогает быстро понять, какие проблемы чаще всего повторяются в текущем контрагентском пуле.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <MetricBarList
              :items="supplierFlagItems"
              empty-text="Когда у поставщиков появятся диагностические флаги, здесь отобразится их распределение."
            />
          </CardContent>
        </Card>
      </div>

      <Card v-if="hasSupplierDueDiligence">
        <CardHeader>
          <CardTitle>Проверка поставщиков</CardTitle>
          <CardDescription>
            Отдельная витрина по благонадёжности: закупочная активность, реквизиты, риск-сигналы и РНП.
          </CardDescription>
        </CardHeader>
        <CardContent class="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Поставщик</TableHead>
                <TableHead>Оценка</TableHead>
                <TableHead>Закупки</TableHead>
                <TableHead>Риски</TableHead>
                <TableHead>Профиль</TableHead>
                <TableHead>Флаги</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-for="item in detail.item.value.supplierDueDiligence" :key="`${item.supplier}-${item.taxId || item.ogrn || 'none'}`">
                <TableCell>
                  <div class="space-y-1">
                    <p class="font-medium">{{ item.supplier }}</p>
                    <p class="text-sm text-muted-foreground">
                      ИНН: {{ item.taxId || "нет" }} · ОГРН: {{ item.ogrn || "нет" }}
                    </p>
                  </div>
                </TableCell>
                <TableCell>
                  <div class="space-y-1">
                    <p class="font-medium">{{ formatNumber(item.integrityScore) }}/100</p>
                    <Badge :variant="integrityBadgeVariant(item.integrityScore)">
                      {{ integrityLabel(item.integrityScore) }}
                    </Badge>
                  </div>
                </TableCell>
                <TableCell>
                  <div class="space-y-1 text-sm">
                    <p>{{ formatNumber(item.procurementCount) }} всего · {{ formatNumber(item.activeProcurements) }} активных</p>
                    <p class="text-muted-foreground">
                      {{ formatCurrency(item.totalAmount, "RUB") }} · {{ formatDateTime(item.lastProcurementAt) }}
                    </p>
                  </div>
                </TableCell>
                <TableCell>
                  <div class="space-y-1 text-sm">
                    <p>Федресурс: {{ formatNumber(item.activeRiskSignalsCount) }}/{{ formatNumber(item.riskSignalsCount) }}</p>
                    <p>РНП: {{ formatNumber(item.activeRnpEntriesCount) }}/{{ formatNumber(item.rnpEntriesCount) }}</p>
                  </div>
                </TableCell>
                <TableCell>
                  <div class="space-y-1 text-sm">
                    <p>{{ item.companyStatus || "Профиль не найден" }}</p>
                    <p class="text-muted-foreground">
                      {{ item.region || "Регион не указан" }}
                      <span v-if="item.registrationDate"> · {{ formatDateTime(item.registrationDate) }}</span>
                    </p>
                  </div>
                </TableCell>
                <TableCell>
                  <div class="flex flex-wrap gap-2">
                    <Badge
                      v-for="flag in item.flags"
                      :key="flag"
                      variant="outline"
                    >
                      {{ flag }}
                    </Badge>
                    <span v-if="item.flags.length === 0" class="text-sm text-muted-foreground">Явных флагов нет</span>
                  </div>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </section>

    <section
      v-if="showStationsSection"
      id="stations"
      class="space-y-4 scroll-mt-24"
    >
      <Card class="border-border/70 bg-gradient-to-br from-emerald-500/10 via-background to-background">
        <CardHeader class="space-y-1">
          <div class="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">АЭС</Badge>
          </div>
          <CardTitle>Закупки по станциям</CardTitle>
          <CardDescription>
            Выделенная страница для разбора каждой АЭС отдельно, без смешивания с общей аналитикой.
          </CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Что заказывали АЭС</CardTitle>
          <CardDescription>
            По каждой станции видно количество заказов, договорный слой и список найденных закупок с датами только за последний месяц.
          </CardDescription>
        </CardHeader>
        <CardContent class="space-y-6">
          <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard
              v-for="metric in nppStationMonthCards"
              :key="metric.label"
              :label="metric.label"
              :value="metric.value"
              :hint="metric.hint"
            />
          </div>

          <div class="grid gap-4 xl:grid-cols-2">
            <Card class="min-w-0 overflow-hidden">
              <CardHeader>
                <CardTitle>Активность по станциям</CardTitle>
                <CardDescription>
                  Столбчатая диаграмма показывает, какие АЭС дали наибольший объём закупок за последний месяц.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <MetricColumnChart
                  :items="nppStationMonthChartItems"
                  empty-text="После появления закупок за последний месяц здесь появится распределение по станциям."
                />
              </CardContent>
            </Card>

            <Card class="min-w-0 overflow-hidden">
              <CardHeader>
                <CardTitle>Бюджет по станциям</CardTitle>
                <CardDescription>
                  Денежный срез показывает, какие станции формируют основной объём атомного контура в текущем месяце.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <MetricBarList
                  :items="nppStationMonthAmountItems"
                  empty-text="После появления сумм в месячном срезе здесь появится распределение бюджета по станциям."
                />
              </CardContent>
            </Card>
          </div>

          <div class="grid gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
            <Card class="min-w-0 overflow-hidden">
              <CardHeader>
                <CardTitle>Структура атомного слоя</CardTitle>
                <CardDescription>
                  Соотношение договорного и закупочного слоя за последний месяц помогает понять, какой тип записей доминирует в отчёте.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <MetricStackBar
                  :segments="nppStationMonthContractSegments"
                  empty-text="После накопления месячных данных здесь появится структура атомного слоя."
                />
              </CardContent>
            </Card>

            <Card class="min-w-0 overflow-hidden">
              <CardHeader>
                <CardTitle>Источники атомного потока</CardTitle>
                <CardDescription>
                  Показано, какие каналы сейчас формируют месячный срез по АЭС и откуда приходит основной объём записей.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <MetricBarList
                  :items="nppStationMonthSourceItems"
                  empty-text="После появления закупок за последний месяц здесь появится распределение по источникам."
                />
              </CardContent>
            </Card>
          </div>

          <div
            v-for="station in filteredNppStationOrders"
            :key="station.station"
            class="rounded-2xl border bg-muted/10 p-4"
          >
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div class="space-y-1">
                <p class="text-base font-semibold">{{ station.station }}</p>
                <p class="text-sm text-muted-foreground">
                  {{ formatNumber(station.procurementCount) }} записей ·
                  {{ formatNumber(station.contractCount) }} договоров ·
                  {{ formatCurrency(station.totalAmount, "RUB") }}
                </p>
              </div>
              <div class="text-sm text-muted-foreground">
                {{ formatDateTime(station.firstPublishedAt) }} - {{ formatDateTime(station.lastPublishedAt) }}
              </div>
            </div>

            <div class="mt-4 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Что заказывали</TableHead>
                    <TableHead>Заказчик</TableHead>
                    <TableHead>Источник</TableHead>
                    <TableHead>Сумма</TableHead>
                    <TableHead>Когда</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow v-for="order in station.orders" :key="order.procurementId">
                    <TableCell>
                      <div class="space-y-1">
                        <NuxtLink :to="`/procurements/${order.procurementId}`" class="font-medium text-primary hover:underline">
                          {{ order.title }}
                        </NuxtLink>
                        <p class="text-sm text-muted-foreground">{{ order.externalId }}</p>
                      </div>
                    </TableCell>
                    <TableCell>{{ order.customer || "Не указан" }}</TableCell>
                    <TableCell>{{ order.source }}</TableCell>
                    <TableCell>{{ formatCurrency(order.amount, order.currency) }}</TableCell>
                    <TableCell>{{ formatDateTime(order.publishedAt) }}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>
    </section>

    <section
      v-if="showNichesSection"
      id="niches"
      class="space-y-4 scroll-mt-24"
    >
      <Card class="border-border/70 bg-gradient-to-br from-cyan-500/10 via-background to-background">
        <CardHeader class="space-y-1">
          <div class="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">Ниши</Badge>
          </div>
          <CardTitle>Ниши закупок АЭС</CardTitle>
          <CardDescription>
            Закупки атомных станций разложены по нишам, чтобы было видно, где концентрируется спрос.
          </CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardContent class="space-y-6">
          <div class="grid gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <Card class="min-w-0 overflow-hidden">
              <CardHeader>
                <CardTitle>Концентрация спроса по нишам</CardTitle>
                <CardDescription>
                  Видно, какие категории держат основной поток закупок АЭС и насколько рынок ниш сейчас сконцентрирован.
                </CardDescription>
              </CardHeader>
              <CardContent class="space-y-5">
                <div class="grid gap-3 sm:grid-cols-2">
                  <div class="rounded-2xl border bg-muted/15 p-4">
                    <p class="text-xs uppercase tracking-[0.18em] text-muted-foreground">Всего закупок</p>
                    <p class="mt-2 text-2xl font-semibold">{{ formatNumber(nppNicheSummary.totalOrders) }}</p>
                    <p class="mt-1 text-sm text-muted-foreground">Во всех нишах текущего отчёта</p>
                  </div>
                  <div class="rounded-2xl border bg-muted/15 p-4">
                    <p class="text-xs uppercase tracking-[0.18em] text-muted-foreground">Охват станций</p>
                    <p class="mt-2 text-2xl font-semibold">{{ formatNumber(nppNicheSummary.totalStations) }}</p>
                    <p class="mt-1 text-sm text-muted-foreground">Количество АЭС в нишевом срезе</p>
                  </div>
                  <div class="rounded-2xl border bg-muted/15 p-4">
                    <p class="text-xs uppercase tracking-[0.18em] text-muted-foreground">Совокупный объём</p>
                    <p class="mt-2 text-2xl font-semibold">{{ formatCurrency(nppNicheSummary.totalAmount, "RUB") }}</p>
                    <p class="mt-1 text-sm text-muted-foreground">Бюджет по всем нишам отчёта</p>
                  </div>
                  <div class="rounded-2xl border bg-muted/15 p-4">
                    <p class="text-xs uppercase tracking-[0.18em] text-muted-foreground">Ведущая ниша</p>
                    <p class="mt-2 text-base font-semibold">{{ nppNicheSummary.leadNiche?.niche || "Нет данных" }}</p>
                    <p class="mt-1 text-sm text-muted-foreground">
                      {{ nppNicheSummary.leadNiche ? `${formatNumber(nppNicheSummary.leadNiche.procurementCount)} закупок` : "После накопления данных здесь появится лидер" }}
                    </p>
                  </div>
                </div>

                <MetricStackBar
                  :segments="nppNicheDemandSegments"
                  empty-text="После накопления ниш здесь появится распределение спроса."
                />
              </CardContent>
            </Card>

            <Card class="min-w-0 overflow-hidden">
              <CardHeader>
                <CardTitle>Ширина охвата по нишам</CardTitle>
                <CardDescription>
                  Показывает, какие ниши распределены по большему числу АЭС и где спрос носит более системный характер.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <MetricBarList
                  :items="nppNicheCoverageItems"
                  empty-text="После накопления данных здесь появится карта охвата по станциям."
                />
              </CardContent>
            </Card>
          </div>

          <div class="grid gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
            <Card class="min-w-0 overflow-hidden">
              <CardHeader>
                <CardTitle>Бюджетная структура ниш</CardTitle>
                <CardDescription>
                  Здесь акцент на стоимости: какие направления тянут на себя основной бюджет атомных закупок.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <MetricStackBar
                  :segments="nppNicheBudgetSegments"
                  empty-text="После появления сумм по нишам здесь появится бюджетная структура."
                />
              </CardContent>
            </Card>

            <Card class="min-w-0 overflow-hidden">
              <CardHeader>
                <CardTitle>Ниши с самой свежей активностью</CardTitle>
                <CardDescription>
                  Позволяет быстро увидеть, в каких категориях спрос обновлялся последним и где сейчас живой контур закупок.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <MetricBarList
                  :items="nppNicheFreshnessItems"
                  empty-text="После появления актуальных публикаций здесь появится свежая активность по нишам."
                />
              </CardContent>
            </Card>
          </div>

          <div
            v-for="niche in detail.item.value.nppNicheOrders"
            :key="niche.niche"
            class="rounded-2xl border bg-muted/10 p-4"
          >
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div class="space-y-2">
                <div class="flex flex-wrap items-center gap-2">
                  <p class="text-base font-semibold">{{ niche.niche }}</p>
                  <Badge variant="outline">{{ formatNumber(niche.procurementCount) }} закупок</Badge>
                  <Badge variant="secondary">{{ formatNumber(niche.stationCount) }} АЭС</Badge>
                </div>
                <p class="text-sm text-muted-foreground">
                  {{ formatCurrency(niche.totalAmount, "RUB") }} ·
                  Последняя активность: {{ formatDateTime(niche.lastPublishedAt) }}
                </p>
                <div class="flex flex-wrap gap-2">
                  <Badge
                    v-for="station in niche.stations"
                    :key="`${niche.niche}-${station}`"
                    variant="outline"
                  >
                    {{ station }}
                  </Badge>
                </div>
              </div>
            </div>

            <div class="mt-4 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Закупка</TableHead>
                    <TableHead>АЭС</TableHead>
                    <TableHead>Заказчик</TableHead>
                    <TableHead>Источник</TableHead>
                    <TableHead>Сумма</TableHead>
                    <TableHead>Когда</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow v-for="order in niche.orders" :key="order.procurementId">
                    <TableCell>
                      <div class="space-y-1">
                        <NuxtLink :to="`/procurements/${order.procurementId}`" class="font-medium text-primary hover:underline">
                          {{ order.title }}
                        </NuxtLink>
                        <p class="text-sm text-muted-foreground">{{ order.externalId }}</p>
                      </div>
                    </TableCell>
                    <TableCell>{{ order.station }}</TableCell>
                    <TableCell>{{ order.customer || "Не указан" }}</TableCell>
                    <TableCell>{{ order.source }}</TableCell>
                    <TableCell>{{ formatCurrency(order.amount, order.currency) }}</TableCell>
                    <TableCell>{{ formatDateTime(order.publishedAt) }}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>
    </section>

    <section
      v-if="showSourcesSection"
      id="sources"
      class="space-y-4 scroll-mt-24"
    >
      <Card class="border-border/70 bg-gradient-to-br from-violet-500/10 via-background to-background">
        <CardHeader class="space-y-1">
          <div class="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">Источники</Badge>
          </div>
          <CardTitle>Вклад и здоровье источников</CardTitle>
          <CardDescription>
            Здесь разнесены по отдельной странице каналы данных, риски запуска и качество публикации.
          </CardDescription>
        </CardHeader>
      </Card>

      <div class="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <Card>
          <CardHeader>
            <CardTitle>Вклад источников</CardTitle>
            <CardDescription>Из каких каналов приходит основной объём закупок и бюджета.</CardDescription>
          </CardHeader>
          <CardContent class="space-y-4">
            <div
              v-for="item in detail.item.value.sourceContribution"
              :key="item.sourceCode"
              class="space-y-2"
            >
              <div class="flex items-center justify-between gap-3">
                <div class="min-w-0">
                  <p class="truncate text-sm font-medium">{{ item.sourceName }}</p>
                  <p class="text-sm text-muted-foreground">
                    {{ item.sourceCode }} · {{ formatNumber(item.procurementCount) }} закупок ·
                    {{ formatCurrency(item.totalAmount, "RUB") }}
                  </p>
                </div>
                <Badge variant="secondary">{{ formatPercent(item.sharePercent) }}</Badge>
              </div>
              <div class="h-2 rounded-full bg-muted">
                <div class="h-2 rounded-full bg-primary" :style="{ width: `${Math.max(8, item.sharePercent)}%` }" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Здоровье источников</CardTitle>
            <CardDescription>Сводка по риску, свежести запусков и качеству публикации.</CardDescription>
          </CardHeader>
          <CardContent class="px-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Источник</TableHead>
                  <TableHead>Риск</TableHead>
                  <TableHead>Успех</TableHead>
                  <TableHead>Публикация</TableHead>
                  <TableHead>Ошибки</TableHead>
                  <TableHead>Последний запуск</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow v-for="item in detail.item.value.sourceHealth" :key="item.source">
                  <TableCell>
                    <div class="space-y-1">
                      <p class="font-medium">{{ item.name }}</p>
                      <p class="text-sm text-muted-foreground">{{ item.source }}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge :variant="riskBadgeVariant(item.riskLevel)">{{ riskLabel(item.riskLevel) }}</Badge>
                  </TableCell>
                  <TableCell>{{ formatPercent(item.successRate) }}</TableCell>
                  <TableCell>{{ formatPercent(item.publicationRate) }}</TableCell>
                  <TableCell>{{ formatNumber(item.failedRuns) }}</TableCell>
                  <TableCell>{{ formatDateTime(item.lastRunAt) }}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </section>

    <section
      v-if="showOperationsSection"
      id="operations"
      class="space-y-4 scroll-mt-24"
    >
      <Card class="border-border/70 bg-gradient-to-br from-rose-500/10 via-background to-background">
        <CardHeader class="space-y-1">
          <div class="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">Операционный контур</Badge>
          </div>
          <CardTitle>Запуски и записи в работе</CardTitle>
          <CardDescription>
            Последняя страница отчёта для запуска пайплайна, инцидентов и закупок, которые стоит открыть отдельно.
          </CardDescription>
        </CardHeader>
      </Card>

      <div class="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Последние проблемные и важные запуски</CardTitle>
            <CardDescription>Здесь видно, где конвейер шумит и что именно пошло не так.</CardDescription>
          </CardHeader>
          <CardContent class="px-0">
            <EmptyState
              v-if="detail.item.value.recentSourceRuns.length === 0"
              title="Нет запусков"
              description="После первых выполнений здесь появится история запусков."
            />
            <Table v-else>
              <TableHeader>
                <TableRow>
                  <TableHead>Источник</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead>Опубликовано</TableHead>
                  <TableHead>Ошибки</TableHead>
                  <TableHead>Старт</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow v-for="run in detail.item.value.recentSourceRuns" :key="run.id">
                  <TableCell>
                    <div class="space-y-1">
                      <p class="font-medium">{{ run.sourceCode }}</p>
                      <p class="text-sm text-muted-foreground">{{ run.runKey }}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge :variant="badgeVariant(run.status)">{{ formatEnumLabel(run.status) }}</Badge>
                  </TableCell>
                  <TableCell>{{ formatNumber(run.itemsPublished) }}</TableCell>
                  <TableCell>{{ formatNumber(run.itemsFailed) }}</TableCell>
                  <TableCell>{{ formatDateTime(run.startedAt) }}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Закупки в фокусе</CardTitle>
            <CardDescription>Подборка записей, которые логично разбирать прямо из отчёта.</CardDescription>
          </CardHeader>
          <CardContent class="px-0">
            <EmptyState
              v-if="detail.item.value.recentProcurements.length === 0"
              title="Нет записей"
              description="Когда в системе накопятся подходящие закупки, они появятся здесь."
            />
            <Table v-else>
              <TableHeader>
                <TableRow>
                  <TableHead>Закупка</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead>Сумма</TableHead>
                  <TableHead>Дедлайн</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow v-for="item in detail.item.value.recentProcurements" :key="item.id">
                  <TableCell>
                    <div class="space-y-1">
                      <NuxtLink :to="`/procurements/${item.id}`" class="font-medium text-primary hover:underline">
                        {{ item.title }}
                      </NuxtLink>
                      <p class="text-sm text-muted-foreground">{{ item.source }} · {{ item.externalId }}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge :variant="badgeVariant(item.status)">{{ formatEnumLabel(item.status) }}</Badge>
                  </TableCell>
                  <TableCell>{{ formatCurrency(item.amount, item.currency) }}</TableCell>
                  <TableCell>{{ formatDateTime(item.deadlineAt) }}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </section>
  </template>

  <EmptyState
    v-else
    title="Отчёт не найден"
    description="Возможно, он был удалён или идентификатор больше не актуален."
  />
</template>
