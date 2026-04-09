<script setup lang="ts">
import type { AnalyticsSummary } from "~/graphql/types";
import { ANALYTICS_SECTION_META, type AnalyticsSectionId } from "~/utils/analytics-sections";
import { getProcurementNppFocus } from "~/utils/procurement-focus";

type MetricAccent = "primary" | "success" | "warning" | "danger" | "muted";

const props = defineProps<{
  sectionId: AnalyticsSectionId;
}>();

const analytics = useAnalyticsData();
const summary = computed(() => analytics.summary.value);
const section = computed(() => ANALYTICS_SECTION_META[props.sectionId]);

const nppPeriodLabel = computed(() =>
  summary.value
    ? new Date(summary.value.nppPeriodStart).toLocaleDateString("ru-RU", {
        day: "2-digit",
        month: "long",
        year: "numeric"
      })
    : ""
);

const deadlinePressureItems = computed(() =>
  (summary.value?.deadlinePressure ?? []).map((bucket) => ({
    label: bucket.label,
    shortLabel: bucket.label,
    value: bucket.count,
    valueLabel: formatNumber(bucket.count),
    accent: bucket.label.toLowerCase().includes("проср")
      ? ("danger" as MetricAccent)
      : bucket.label.toLowerCase().includes("7")
        ? ("warning" as MetricAccent)
        : ("primary" as MetricAccent)
  }))
);

const statusSegments = computed(() => [
  {
    label: "Срочные",
    value: summary.value?.closingSoonCount ?? 0,
    valueLabel: formatNumber(summary.value?.closingSoonCount ?? 0),
    accent: "warning" as MetricAccent
  },
  {
    label: "Просроченные",
    value: summary.value?.overdueCount ?? 0,
    valueLabel: formatNumber(summary.value?.overdueCount ?? 0),
    accent: "danger" as MetricAccent
  },
  {
    label: "Высокий чек",
    value: summary.value?.highValueCount ?? 0,
    valueLabel: formatNumber(summary.value?.highValueCount ?? 0),
    accent: "success" as MetricAccent
  }
]);

const overviewCards = computed(() => {
  if (!summary.value) {
    return [];
  }

  const totalPriority = Math.max(
    summary.value.closingSoonCount + summary.value.overdueCount + summary.value.highValueCount,
    1
  );

  return [
    {
      label: "Срочные закупки",
      value: formatNumber(summary.value.closingSoonCount),
      hint: "Активные закупки с дедлайном в ближайшие 7 дней"
    },
    {
      label: "Просроченные",
      value: formatNumber(summary.value.overdueCount),
      hint: "Активные закупки, где срок уже прошёл"
    },
    {
      label: "Высокий чек",
      value: formatNumber(summary.value.highValueCount),
      hint: `Доля в приоритетах: ${formatPercent((summary.value.highValueCount / totalPriority) * 100)}`
    },
    {
      label: "Средняя сумма",
      value: formatCurrency(summary.value.averageProcurementValue, "RUB"),
      hint: "Средний чек по закупкам с заполненной суммой"
    },
    {
      label: "Риск-сигналы 30д",
      value: formatNumber(summary.value.riskSignalsLast30d),
      hint: "События по поставщикам и контрагентским рискам"
    },
    {
      label: "Эффективность публикации",
      value: formatPercent(summary.value.publicationEfficiency),
      hint: `Успешность запусков: ${formatPercent(summary.value.runSuccessRate)}`
    }
  ];
});

const attentionSegments = computed(() => {
  if (!summary.value) {
    return [];
  }

  const soonWeight = summary.value.closingSoonCount * 3;
  const overdueWeight = summary.value.overdueCount * 4;
  const highValueWeight = summary.value.highValueCount * 2;

  return [
    {
      label: "Давление сроков",
      value: soonWeight + overdueWeight,
      valueLabel: formatNumber(summary.value.closingSoonCount + summary.value.overdueCount),
      accent: "warning" as MetricAccent
    },
    {
      label: "Высокий чек",
      value: highValueWeight,
      valueLabel: formatNumber(summary.value.highValueCount),
      accent: "success" as MetricAccent
    },
    {
      label: "Риск-сигналы",
      value: Math.max(summary.value.riskSignalsLast30d, 0),
      valueLabel: formatNumber(summary.value.riskSignalsLast30d),
      accent: "danger" as MetricAccent
    }
  ];
});

const sourceRiskSegments = computed(() => {
  const sourceHealth = summary.value?.sourceHealth ?? [];
  const critical = sourceHealth.filter((item) => item.riskLevel === "CRITICAL").length;
  const watch = sourceHealth.filter((item) => item.riskLevel === "WATCH").length;
  const stable = sourceHealth.filter((item) => item.riskLevel === "STABLE").length;

  return [
    {
      label: "Критичные",
      value: critical,
      valueLabel: formatNumber(critical),
      accent: "danger" as MetricAccent
    },
    {
      label: "Под наблюдением",
      value: watch,
      valueLabel: formatNumber(watch),
      accent: "warning" as MetricAccent
    },
    {
      label: "Стабильные",
      value: stable,
      valueLabel: formatNumber(stable),
      accent: "success" as MetricAccent
    }
  ];
});

const riskSourceItems = computed(() =>
  [...(summary.value?.sourceHealth ?? [])]
    .sort((left, right) => {
      const leftWeight = sourceRiskWeight(left.riskLevel);
      const rightWeight = sourceRiskWeight(right.riskLevel);
      return rightWeight - leftWeight || right.failedRuns - left.failedRuns;
    })
    .slice(0, 6)
    .map((item) => ({
      label: item.name,
      value: Math.max(100 - item.successRate + item.failedRuns * 4, 1),
      valueLabel: `${formatPercent(item.successRate)} успех`,
      note: `${riskLabel(item.riskLevel)} · публикация ${formatPercent(item.publicationRate)}`,
      accent: riskAccent(item.riskLevel)
    }))
);

const supplierExposureItems = computed(() =>
  (summary.value?.supplierExposure ?? []).map((item) => ({
    label: item.supplier,
    value: item.sharePercent,
    valueLabel: formatPercent(item.sharePercent),
    note: `${formatNumber(item.procurementCount)} закупок · ${formatCurrency(item.totalAmount, "RUB")}`,
    accent: "primary" as MetricAccent
  }))
);

const supplierAmountItems = computed(() =>
  [...(summary.value?.supplierExposure ?? [])]
    .sort((left, right) => right.totalAmount - left.totalAmount)
    .map((item) => ({
      label: item.supplier,
      value: item.totalAmount,
      valueLabel: formatCurrency(item.totalAmount, "RUB"),
      note: `${formatNumber(item.procurementCount)} закупок · доля ${formatPercent(item.sharePercent)}`,
      accent: "success" as MetricAccent
    }))
);

const customerExposureItems = computed(() =>
  (summary.value?.customerExposure ?? []).map((item) => ({
    label: item.customer,
    value: item.sharePercent,
    valueLabel: formatPercent(item.sharePercent),
    note: `${formatNumber(item.procurementCount)} закупок · ${formatCurrency(item.totalAmount, "RUB")}`,
    accent: "warning" as MetricAccent
  }))
);

const customerAmountItems = computed(() =>
  [...(summary.value?.customerExposure ?? [])]
    .sort((left, right) => right.totalAmount - left.totalAmount)
    .map((item) => ({
      label: item.customer,
      value: item.totalAmount,
      valueLabel: formatCurrency(item.totalAmount, "RUB"),
      note: `${formatNumber(item.procurementCount)} закупок · доля ${formatPercent(item.sharePercent)}`,
      accent: "primary" as MetricAccent
    }))
);

const supplierRiskWatchItems = computed(() =>
  (summary.value?.supplierRiskWatchlist ?? []).map((item) => ({
    label: item.supplier,
    value: Math.max(item.activeRiskSignalsCount, item.riskSignalsCount, 1),
    valueLabel: `${formatNumber(item.activeRiskSignalsCount)} активных сигналов`,
    note: [
      item.taxId ? `ИНН ${item.taxId}` : null,
      `${formatNumber(item.riskSignalsCount)} сигналов всего`,
      `${formatNumber(item.activeProcurements)} активных закупок`,
      item.latestRiskAt ? `последний сигнал ${formatDateTime(item.latestRiskAt)}` : null
    ]
      .filter(Boolean)
      .join(" · "),
    accent: item.activeRiskSignalsCount > 0 ? ("danger" as MetricAccent) : ("warning" as MetricAccent)
  }))
);

const sourcePublicationItems = computed(() =>
  [...(summary.value?.sourceHealth ?? [])]
    .sort((left, right) => right.publicationRate - left.publicationRate)
    .map((item) => ({
      label: item.name,
      shortLabel: item.source.toUpperCase(),
      value: item.publicationRate,
      valueLabel: formatPercent(item.publicationRate),
      note: `Успех ${formatPercent(item.successRate)} · ошибок ${formatNumber(item.failedRuns)}`,
      accent: riskAccent(item.riskLevel)
    }))
);

const supplierCards = computed(() => {
  if (!summary.value) {
    return [];
  }

  const topSupplier = summary.value.supplierExposure[0];
  const topCustomer = summary.value.customerExposure[0];
  const trackedSuppliers = summary.value.supplierExposure.reduce(
    (sum, item) => sum + item.procurementCount,
    0
  );
  const trackedCustomers = summary.value.customerExposure.reduce(
    (sum, item) => sum + item.procurementCount,
    0
  );

  return [
    {
      label: "Лидирующий поставщик",
      value: topSupplier ? formatPercent(topSupplier.sharePercent) : "0%",
      hint: topSupplier ? topSupplier.supplier : "Пока нет связанных поставщиков"
    },
    {
      label: "Ключевой заказчик",
      value: topCustomer ? formatPercent(topCustomer.sharePercent) : "0%",
      hint: topCustomer ? topCustomer.customer : "Пока нет связок с заказчиками"
    },
    {
      label: "Поставщиков в срезе",
      value: formatNumber(summary.value.supplierExposure.length),
      hint: `Покрыто закупок: ${formatNumber(trackedSuppliers)}`
    },
    {
      label: "Заказчиков в срезе",
      value: formatNumber(summary.value.customerExposure.length),
      hint: `Покрыто закупок: ${formatNumber(trackedCustomers)}`
    },
    {
      label: "Поставщики под наблюдением",
      value: formatNumber(summary.value.supplierRiskWatchlist.length),
      hint: "В watchlist попадают компании с накопленными риск-сигналами"
    },
    {
      label: "Риск-сигналы 30д",
      value: formatNumber(summary.value.riskSignalsLast30d),
      hint: "Контур проверки добросовестности по контрагентам"
    }
  ];
});

const nppSummaryCards = computed(() => {
  if (!summary.value) {
    return [];
  }

  const contractShare =
    summary.value.nppProcurementCount > 0
      ? (summary.value.nppContractCount / summary.value.nppProcurementCount) * 100
      : 0;
  const averagePerStation =
    summary.value.nppStationsCovered > 0
      ? summary.value.nppProcurementCount / summary.value.nppStationsCovered
      : 0;

  return [
    {
      label: "Закупки атомного контура",
      value: formatNumber(summary.value.nppProcurementCount),
      hint: `Накопленный реестр АЭС начиная с ${nppPeriodLabel.value}`
    },
    {
      label: "Контрактный контур",
      value: formatNumber(summary.value.nppContractCount),
      hint: `Доля контрактных записей: ${formatPercent(contractShare)}`
    },
    {
      label: "Охват атомных станций",
      value: formatNumber(summary.value.nppStationsCovered),
      hint: `Среднее количество записей на станцию: ${formatNumber(averagePerStation)}`
    },
    {
      label: "Совокупный объём",
      value: formatCurrency(summary.value.nppTotalAmount, "RUB"),
      hint: "Суммарная стоимость закупок и договоров с заполненной ценой"
    },
    {
      label: "Подключённые источники",
      value: formatNumber(summary.value.nppSourceCoverage.length),
      hint: "Количество источников данных, формирующих атомный контур"
    },
    {
      label: "Ключевые заказчики",
      value: formatNumber(summary.value.nppCustomerCoverage.length),
      hint: "Число заказчиков в верхнем срезе атомного контура"
    }
  ];
});

const nppTimelineItems = computed(() =>
  (summary.value?.nppMonthlyDynamics ?? []).map((item) => ({
    label: item.label,
    shortLabel: compactMonthLabel(item.label),
    value: item.procurementCount,
    valueLabel: formatCountLabel(item.procurementCount, ["карточка", "карточки", "карточек"]),
    note: `Сумма за месяц: ${formatCurrency(item.totalAmount, "RUB")}`
  }))
);

const nppStationItems = computed(() =>
  (summary.value?.nppStationCoverage ?? []).map((item) => ({
    label: item.station,
    value: item.procurementCount,
    valueLabel: formatNumber(item.procurementCount),
    note: formatCurrency(item.totalAmount, "RUB"),
    accent: "primary" as MetricAccent
  }))
);

const nppStationAmountItems = computed(() =>
  [...(summary.value?.nppStationCoverage ?? [])]
    .sort((left, right) => right.totalAmount - left.totalAmount)
    .map((item) => ({
      label: item.station,
      value: item.totalAmount,
      valueLabel: formatCurrency(item.totalAmount, "RUB"),
      note: `${formatNumber(item.procurementCount)} карточек`,
      accent: "success" as MetricAccent
    }))
);

const nppSourceItems = computed(() =>
  (summary.value?.nppSourceCoverage ?? []).map((item) => ({
    label: item.name,
    value: item.procurementCount,
    valueLabel: formatNumber(item.procurementCount),
    note: `${item.source} · ${formatCurrency(item.totalAmount, "RUB")}`,
    accent: item.source.includes("contracts") ? ("warning" as MetricAccent) : ("success" as MetricAccent)
  }))
);

const nppCustomerItems = computed(() =>
  (summary.value?.nppCustomerCoverage ?? []).map((item) => ({
    label: item.customer,
    value: item.procurementCount,
    valueLabel: formatNumber(item.procurementCount),
    note: formatCurrency(item.totalAmount, "RUB"),
    accent: item.customer.toUpperCase().includes("РОСАТОМ") ? ("success" as MetricAccent) : ("primary" as MetricAccent)
  }))
);

function riskAccent(level?: string | null) {
  if (level === "CRITICAL") {
    return "danger" as const;
  }

  if (level === "WATCH") {
    return "warning" as const;
  }

  return "success" as const;
}

function sourceRiskWeight(level?: string | null) {
  if (level === "CRITICAL") {
    return 3;
  }

  if (level === "WATCH") {
    return 2;
  }

  return 1;
}

function compactMonthLabel(label: string) {
  const parts = label
    .replace(/\s*г\.?$/i, "")
    .trim()
    .split(/\s+/);

  if (parts.length < 2) {
    return label;
  }

  const month = parts[0] ?? label;
  const year = parts[1]?.slice(-2);

  return year ? `${month} ${year}` : month;
}

function formatCountLabel(value: number, forms: [string, string, string]) {
  const absValue = Math.abs(value) % 100;
  const lastDigit = absValue % 10;

  if (absValue > 10 && absValue < 20) {
    return `${formatNumber(value)} ${forms[2]}`;
  }

  if (lastDigit === 1) {
    return `${formatNumber(value)} ${forms[0]}`;
  }

  if (lastDigit >= 2 && lastDigit <= 4) {
    return `${formatNumber(value)} ${forms[1]}`;
  }

  return `${formatNumber(value)} ${forms[2]}`;
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

function procurementFocusLabel(rawPayload?: Record<string, unknown> | null) {
  return getProcurementNppFocus(rawPayload);
}

function summaryValue(currentSummary: AnalyticsSummary | null, getter: (item: AnalyticsSummary) => number) {
  return currentSummary ? getter(currentSummary) : 0;
}

async function reload() {
  await analytics.load();
}

onMounted(() => {
  void reload();
});
</script>

<template>
  <PageHeader :title="section.pageTitle" :description="section.description">
    <template #actions>
      <Button variant="secondary" :disabled="analytics.loading.value" @click="reload()">
        {{ analytics.loading.value ? "Обновление..." : "Обновить" }}
      </Button>
    </template>
  </PageHeader>

  <div v-if="analytics.loading.value" class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
    <Skeleton v-for="item in 6" :key="item" class="h-32 rounded-xl" />
  </div>

  <ErrorState
    v-else-if="analytics.error.value"
    :description="analytics.error.value"
    action-label="Повторить"
    @action="reload()"
  />

  <template v-else-if="summary">
    <template v-if="props.sectionId === 'overview'">
      <Card class="overflow-hidden border-border/70 bg-gradient-to-br from-background via-background to-muted/25">
        <CardContent class="grid gap-6 p-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          <div class="min-w-0 space-y-4">
            <p class="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">Общий поток</p>
            <div class="space-y-2">
              <h2 class="text-2xl font-semibold tracking-tight">Операционный обзор дедлайнов, приоритетов и закупок под вниманием</h2>
              <p class="max-w-3xl text-sm leading-6 text-muted-foreground">
                Этот экран собран как главная панель для ежедневного мониторинга: где горят сроки, какой объём идёт в high-value и какие закупки надо открыть прямо сейчас.
              </p>
            </div>
          </div>

          <div class="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            <div class="rounded-3xl border border-border/70 bg-background/80 p-4">
              <p class="text-sm font-semibold">Сначала смотри сроки</p>
              <p class="mt-2 text-sm leading-6 text-muted-foreground">
                Вверху видно, где поток уже проседает по дедлайнам и сколько закупок попадает в быструю реакцию.
              </p>
            </div>
            <div class="rounded-3xl border border-border/70 bg-background/80 p-4">
              <p class="text-sm font-semibold">Потом сверяй объём</p>
              <p class="mt-2 text-sm leading-6 text-muted-foreground">
                Отдельно вынесены high-value записи и средний чек, чтобы отличать массовый шум от реально дорогих лотов.
              </p>
            </div>
            <div class="rounded-3xl border border-border/70 bg-background/80 p-4">
              <p class="text-sm font-semibold">И только потом открывай карточки</p>
              <p class="mt-2 text-sm leading-6 text-muted-foreground">
                Таблица внизу уже про конкретные закупки, которые логично разбирать после общей картинки.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <StatCard
          v-for="card in overviewCards"
          :key="card.label"
          :label="card.label"
          :value="card.value"
          :hint="card.hint"
        />
      </div>

      <div class="grid gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <Card class="min-w-0 overflow-hidden">
          <CardHeader>
            <CardTitle>Давление по дедлайнам</CardTitle>
            <CardDescription>
              Диаграмма показывает, где скапливаются активные закупки: в безопасной зоне, на подходе к дедлайну или уже после срока.
            </CardDescription>
          </CardHeader>
          <CardContent class="space-y-5">
            <MetricColumnChart :items="deadlinePressureItems" />
            <div class="rounded-3xl border bg-muted/15 p-4">
              <div class="flex items-center justify-between gap-3">
                <p class="text-sm font-medium">Риск-фон потока</p>
                <Badge variant="secondary">{{ formatNumber(summary.riskSignalsLast30d) }} сигналов</Badge>
              </div>
              <p class="mt-2 text-sm leading-6 text-muted-foreground">
                Контрагентские сигналы за 30 дней помогают понять, насколько срочные дедлайны пересекаются с проблемными поставщиками.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card class="min-w-0 overflow-hidden">
          <CardHeader>
            <CardTitle>Приоритеты потока</CardTitle>
            <CardDescription>
              Укрупнённое распределение показывает, что именно сейчас формирует основное давление на команду.
            </CardDescription>
          </CardHeader>
          <CardContent class="space-y-6">
            <MetricStackBar :segments="attentionSegments" />
            <MetricStackBar :segments="statusSegments" />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Закупки под вниманием</CardTitle>
          <CardDescription>
            Список для быстрого перехода в карточки после того, как понятна общая структура риска и дедлайнов.
          </CardDescription>
        </CardHeader>
        <CardContent v-if="summary.attentionProcurements.length === 0">
          <EmptyState
            title="Срочных закупок нет"
            description="На текущий момент среди активных закупок нет критичных сроков."
          />
        </CardContent>
        <CardContent v-else class="px-0">
          <Table class="min-w-[720px]">
            <TableHeader>
              <TableRow>
                <TableHead>Закупка</TableHead>
                <TableHead>Источник</TableHead>
                <TableHead>Сумма</TableHead>
                <TableHead>Дедлайн</TableHead>
                <TableHead>Статус</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-for="item in summary.attentionProcurements" :key="item.id">
                <TableCell class="max-w-[28rem]">
                  <NuxtLink :to="`/procurements/${item.id}`" class="block break-words font-medium text-primary hover:underline">
                    {{ item.title }}
                  </NuxtLink>
                </TableCell>
                <TableCell>{{ item.source }}</TableCell>
                <TableCell>{{ formatCurrency(item.amount, item.currency) }}</TableCell>
                <TableCell>{{ formatDateTime(item.deadlineAt) }}</TableCell>
                <TableCell>
                  <Badge :variant="badgeVariant(item.status)">{{ formatEnumLabel(item.status) }}</Badge>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </template>

    <template v-else-if="props.sectionId === 'suppliers'">
      <Card class="overflow-hidden border-border/70 bg-gradient-to-br from-background via-background to-muted/25">
        <CardContent class="grid gap-6 p-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
          <div class="min-w-0 space-y-4">
            <p class="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">Поставщики и заказчики</p>
            <div class="space-y-2">
              <h2 class="text-2xl font-semibold tracking-tight">Здесь собраны концентрация поставщиков, ключевые заказчики и сигналы добросовестности</h2>
              <p class="max-w-3xl text-sm leading-6 text-muted-foreground">
                Здесь удобно смотреть, кто держит поток закупок со стороны поставщиков, какие заказчики формируют основную нагрузку и по каким компаниям уже накопились риск-сигналы.
              </p>
            </div>
          </div>

          <div class="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            <div class="rounded-3xl border border-border/70 bg-background/80 p-4">
              <p class="text-sm font-semibold">Смотри на концентрацию</p>
              <p class="mt-2 text-sm leading-6 text-muted-foreground">
                Верхние поставщики сразу показывают, где появляется опасная концентрация по числу закупок и по деньгам.
              </p>
            </div>
            <div class="rounded-3xl border border-border/70 bg-background/80 p-4">
              <p class="text-sm font-semibold">Держи заказчика рядом</p>
              <p class="mt-2 text-sm leading-6 text-muted-foreground">
                Заказчики помогают понять, кто реально формирует спрос и где у нас самые нагруженные контуры закупок.
              </p>
            </div>
            <div class="rounded-3xl border border-border/70 bg-background/80 p-4">
              <p class="text-sm font-semibold">Проверяй добросовестность</p>
              <p class="mt-2 text-sm leading-6 text-muted-foreground">
                Watchlist по контрагентам помогает быстро увидеть поставщиков, которых уже стоит поднимать на ручную проверку.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <StatCard
          v-for="card in supplierCards"
          :key="card.label"
          :label="card.label"
          :value="card.value"
          :hint="card.hint"
        />
      </div>

      <div class="grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        <Card class="min-w-0 overflow-hidden">
          <CardHeader>
            <CardTitle>Концентрация по поставщикам</CardTitle>
            <CardDescription>
              Основной бар-чарт по доле потока: сколько закупок и какой денежный объём держит каждый заметный поставщик.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <MetricBarList
              :items="supplierExposureItems"
              empty-text="После появления связок с поставщиками здесь появится аналитика концентрации."
            />
          </CardContent>
        </Card>

        <Card class="min-w-0 overflow-hidden">
          <CardHeader>
            <CardTitle>Ключевые заказчики</CardTitle>
            <CardDescription>
              Видно, какие заказчики формируют основную долю потока и на чьих закупках строится текущая картина.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <MetricBarList
              :items="customerExposureItems"
              empty-text="После накопления карточек с заказчиками здесь появится карта клиентского контура."
            />
          </CardContent>
        </Card>
      </div>

      <div class="grid gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <Card class="min-w-0 overflow-hidden">
          <CardHeader>
            <CardTitle>Бюджетная концентрация поставщиков</CardTitle>
            <CardDescription>
              Отдельный срез по суммам показывает лидеров не только по количеству карточек, но и по бюджету.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <MetricBarList
              :items="supplierAmountItems"
              empty-text="Когда в закупках появятся суммы и связки с поставщиками, здесь появится денежная карта."
            />
          </CardContent>
        </Card>

        <Card class="min-w-0 overflow-hidden">
          <CardHeader>
            <CardTitle>Заказчики по бюджету</CardTitle>
            <CardDescription>
              Денежный разрез помогает увидеть, кто выступает крупнейшим заказчиком не по частоте, а по объёму.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <MetricBarList
              :items="customerAmountItems"
              empty-text="После накопления сумм по заказчикам здесь появится бюджетный срез."
            />
          </CardContent>
        </Card>
      </div>

      <Card class="min-w-0 overflow-hidden">
        <CardHeader>
          <CardTitle>Недобросовестные и проблемные поставщики</CardTitle>
          <CardDescription>
            Список поставщиков, по которым уже накопились риск-сигналы и которые стоит проверять при работе с текущим потоком закупок.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MetricBarList
            :items="supplierRiskWatchItems"
            empty-text="Когда по поставщикам накопятся риск-сигналы, здесь появится watchlist для ручной проверки."
          />
        </CardContent>
      </Card>
    </template>

    <template v-else>
      <Card class="overflow-hidden border-border/70 bg-gradient-to-br from-background via-background to-muted/25">
        <CardContent class="grid gap-6 p-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          <div class="min-w-0 space-y-4">
            <p class="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">Атомный контур</p>
            <div class="space-y-2">
              <h2 class="text-2xl font-semibold tracking-tight">Отдельная витрина по АЭС с фиксированным атомным периодом</h2>
              <p class="max-w-3xl text-sm leading-6 text-muted-foreground">
                Здесь атомные закупки и договоры не смешиваются с общим потоком. Видно, где уже собран плотный контур АЭС, какие источники его питают и какие карточки пришли последними.
              </p>
            </div>
          </div>

          <div class="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            <div class="rounded-3xl border border-border/70 bg-background/80 p-4">
              <p class="text-sm font-semibold">Период фиксирован</p>
              <p class="mt-2 text-sm leading-6 text-muted-foreground">
                Все атомные расчёты считаются от {{ nppPeriodLabel || "01.01.2025" }}, чтобы динамика не прыгала вместе с окном просмотра.
              </p>
            </div>
            <div class="rounded-3xl border border-border/70 bg-background/80 p-4">
              <p class="text-sm font-semibold">Сначала смотри покрытие</p>
              <p class="mt-2 text-sm leading-6 text-muted-foreground">
                По станциям и источникам сразу видно, где атомный слой уже плотный, а где ещё есть пробелы.
              </p>
            </div>
            <div class="rounded-3xl border border-border/70 bg-background/80 p-4">
              <p class="text-sm font-semibold">Потом переходи к карточкам</p>
              <p class="mt-2 text-sm leading-6 text-muted-foreground">
                Свежие закупки внизу нужны как быстрая проверка качества отбора и целевой станции в raw payload.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <StatCard
          v-for="card in nppSummaryCards"
          :key="card.label"
          :label="card.label"
          :value="card.value"
          :hint="card.hint"
        />
      </div>

      <Card class="min-w-0 overflow-hidden">
        <CardHeader>
          <CardTitle>Динамика атомного контура</CardTitle>
          <CardDescription>
            Столбчатая диаграмма показывает, как атомный слой наполняется по месяцам и где меняется интенсивность потока.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MetricColumnChart
            :items="nppTimelineItems"
            notes-layout="hidden"
            empty-text="После следующего цикла сбора здесь появится помесячная динамика по атомному контуру."
          />
        </CardContent>
      </Card>

      <Card class="min-w-0 overflow-hidden">
        <CardHeader>
          <CardTitle>Покрытие по станциям</CardTitle>
          <CardDescription>
            Базовая карта покрытия показывает, по каким АЭС уже собрано заметное число карточек.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MetricBarList
            :items="nppStationItems"
            empty-text="Пока ни одна карточка не привязана к конкретной станции."
          />
        </CardContent>
      </Card>

      <div class="grid gap-4 xl:grid-cols-2">
        <Card class="min-w-0 overflow-hidden">
          <CardHeader>
            <CardTitle>Сумма по станциям</CardTitle>
            <CardDescription>
              Здесь акцент уже не на количестве карточек, а на деньгах: где атомный контур видит самый большой бюджет.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <MetricBarList
              :items="nppStationAmountItems"
              empty-text="После появления заполненных сумм здесь появится денежная карта по АЭС."
            />
          </CardContent>
        </Card>

        <Card class="min-w-0 overflow-hidden">
          <CardHeader>
            <CardTitle>Вклад источников в атомный поток</CardTitle>
            <CardDescription>
              Сравнение позволяет увидеть, какой именно атомный источник сейчас даёт объём: notices или договорные слои.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <MetricBarList
              :items="nppSourceItems"
              empty-text="После первого успешного прогона атомные источники появятся здесь."
            />
          </CardContent>
        </Card>
      </div>

      <div class="grid gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <Card class="min-w-0 overflow-hidden">
          <CardHeader>
            <CardTitle>Ключевые заказчики атомного контура</CardTitle>
            <CardDescription>
              Этот блок показывает, кто формирует основной объём атомных закупок и где уже проявляются станции и сервисные общества.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <MetricBarList
              :items="nppCustomerItems"
              empty-text="После накопления карточек с заказчиками здесь появится customer-карта атомного контура."
            />
          </CardContent>
        </Card>

        <Card class="min-w-0 overflow-hidden">
          <CardHeader>
            <CardTitle>Операционный фон атомного контура</CardTitle>
            <CardDescription>
              Даже атомную витрину полезно сверять с качеством источников, которые питают этот контур.
            </CardDescription>
          </CardHeader>
          <CardContent class="space-y-6">
            <MetricStackBar :segments="sourceRiskSegments" />
            <MetricBarList :items="riskSourceItems" />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Свежие закупки и договоры АЭС</CardTitle>
          <CardDescription>
            Последние атомные карточки показываются отдельно, чтобы можно было проверить качество отбора и увидеть целевую станцию.
          </CardDescription>
        </CardHeader>
        <CardContent v-if="summary.nppRecentProcurements.length === 0">
          <EmptyState
            title="Атомный контур ещё пуст"
            description="После прогона новых источников здесь появятся свежие закупки и договоры по АЭС."
          />
        </CardContent>
        <CardContent v-else class="px-0">
          <Table class="min-w-[720px]">
            <TableHeader>
              <TableRow>
                <TableHead>Карточка</TableHead>
                <TableHead>Источник</TableHead>
                <TableHead>Заказчик / Цель</TableHead>
                <TableHead>Сумма</TableHead>
                <TableHead>Дата</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-for="item in summary.nppRecentProcurements" :key="item.id">
                <TableCell class="max-w-[28rem]">
                  <NuxtLink :to="`/procurements/${item.id}`" class="block break-words font-medium text-primary hover:underline">
                    {{ item.title }}
                  </NuxtLink>
                </TableCell>
                <TableCell class="max-w-[12rem] break-words">{{ item.source }}</TableCell>
                <TableCell class="max-w-[20rem]">
                  <div class="min-w-0 space-y-1">
                    <p class="break-words">{{ item.customer || "Заказчик не указан" }}</p>
                    <p class="break-words text-sm text-muted-foreground">
                      {{
                        procurementFocusLabel(item.rawPayload)
                          ? `Цель АЭС: ${procurementFocusLabel(item.rawPayload)}`
                          : "Целевая станция пока не выделена"
                      }}
                    </p>
                  </div>
                </TableCell>
                <TableCell>{{ formatCurrency(item.amount, item.currency) }}</TableCell>
                <TableCell>{{ formatDateTime(item.publishedAt ?? item.updatedAt) }}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </template>
  </template>
</template>
