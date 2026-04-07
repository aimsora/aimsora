<script setup lang="ts">
import { NPP_FOCUS_OPTIONS, getProcurementNppFocus } from "~/utils/procurement-focus";

definePageMeta({
  title: "Дашборд",
  description: "Ролевой dashboard по закупкам, аналитике и контуру сбора"
});

useHead({
  title: "Дашборд"
});

const shortDateFormatter = new Intl.DateTimeFormat("ru-RU", {
  day: "2-digit",
  month: "short"
});

const allRecentSourcesValue = "__ALL_RECENT_SOURCES__";
const allRecentStatusesValue = "__ALL_RECENT_STATUSES__";
const allRecentNppFocusValue = "__ALL_RECENT_NPP_FOCUS__";
const maxNppStationItems = 10;

const auth = useAuthSession();
const dashboard = useDashboardData();
const analyticsData = useAnalyticsData();
const reportsData = useReportsData();
const scraperAdmin = useScraperAdmin();

const role = computed(() => auth.user.value?.role ?? null);
const summary = computed(() => dashboard.summary.value);
const analytics = computed(() => analyticsData.summary.value);
const scraperOverview = computed(() => scraperAdmin.overview.value);

const isPlainUser = computed(() => role.value === "USER");
const canViewAnalytics = computed(() => auth.can("analytics.view"));
const canViewReports = computed(() => auth.can("reports.view"));
const canGenerateReports = computed(() => auth.can("reports.generate"));
const canViewScraperOverview = computed(
  () => auth.can("scraper-admin.view") || auth.can("scraper-admin.manage")
);

const recentProcurementSearch = ref("");
const selectedRecentSource = ref(allRecentSourcesValue);
const selectedRecentStatus = ref(allRecentStatusesValue);
const selectedRecentNppFocus = ref(allRecentNppFocusValue);

const loading = computed(
  () =>
    dashboard.loading.value ||
    (canViewAnalytics.value && analyticsData.loading.value) ||
    (canViewReports.value && reportsData.loading.value) ||
    (canViewScraperOverview.value && scraperAdmin.loading.value)
);
const error = computed(
  () =>
    dashboard.error.value ||
    (canViewAnalytics.value ? analyticsData.error.value : "") ||
    (canViewReports.value ? reportsData.error.value : "") ||
    (canViewScraperOverview.value ? scraperAdmin.error.value : "")
);

const readyReportsCount = computed(() =>
  reportsData.reports.value.filter((item) => item.status === "READY").length
);

const overviewCards = computed(() => {
  if (!summary.value) {
    return [];
  }

  return [
    {
      label: "Записи в системе",
      value: formatCompactNumber(summary.value.totalRecords),
      hint: `Закупок в рабочем реестре: ${formatCompactNumber(summary.value.totalProcurements)}`
    },
    {
      label: "Активные источники",
      value: formatNumber(summary.value.activeSources),
      hint: "Контуры, которые участвуют в регулярном сборе"
    },
    {
      label: "Запуски за 24 часа",
      value: formatNumber(summary.value.runsLast24h),
      hint: "Свежая активность парсеров и фоновых процессов"
    },
    {
      label: "Готовые отчёты",
      value: formatNumber(readyReportsCount.value),
      hint: `Последнее обновление данных: ${formatDateTime(summary.value.lastUpdatedAt)}`
    }
  ];
});

const analyticsCards = computed(() => {
  if (!analytics.value) {
    return [];
  }

  return [
    {
      label: "Срочные закупки",
      value: formatNumber(analytics.value.closingSoonCount),
      hint: "Активные закупки с дедлайном в ближайшие 7 дней"
    },
    {
      label: "Просроченные закупки",
      value: formatNumber(analytics.value.overdueCount),
      hint: "Позиции, где срок уже прошёл и нужен разбор"
    },
    {
      label: "Источники под риском",
      value: formatNumber(analytics.value.atRiskSources),
      hint: "Есть просадка по свежести, качеству или стабильности"
    },
    {
      label: "Эффективность публикации",
      value: formatPercent(analytics.value.publicationEfficiency),
      hint: `Успешность запусков: ${formatPercent(analytics.value.runSuccessRate)}`
    }
  ];
});

const roleSummary = computed(() => {
  if (role.value === "ANALYST") {
    return "Экран собран для аналитика: сначала общая картина потока, затем расшифровка по источникам и оперативный список закупок.";
  }

  if (role.value === "DEVELOPER") {
    return "Экран разделён на бизнес-слой и инженерный слой, чтобы метрики и технические инциденты не смешивались между собой.";
  }

  if (role.value === "ADMIN") {
    return "Сначала видна понятная картина закупочного потока, ниже вынесен технический контур для контроля парсеров и runtime.";
  }

  return "Главный рабочий экран с понятной структурой потока, свежестью данных и быстрыми переходами.";
});

const roleBadges = computed(() => {
  const items = ["Закупочный поток"];

  if (canViewAnalytics.value) {
    items.push("Аналитика");
  }

  if (canViewReports.value) {
    items.push("Отчёты");
  }

  if (canViewScraperOverview.value) {
    items.push("Инженерный контур");
  }

  return items;
});

const dashboardGuide = computed(() => {
  const recentRuns = summary.value?.recentSourceRuns ?? [];
  const degradedRuns = recentRuns.filter((item) => item.status === "FAILED" || item.status === "PARTIAL").length;
  const runningRuns = recentRuns.filter((item) => item.status === "RUNNING").length;

  return [
    {
      title: "Сначала смотри на верхние карточки",
      text: "Они показывают общий объём базы, активность контуров и свежесть данных, без ухода в технические детали."
    },
    {
      title: "Диаграммы ниже отвечают на два вопроса",
      text: "Где сосредоточен поток по источникам и как он распределён по статусам и времени."
    },
    {
      title: "Состояние контура сейчас",
      text:
        runningRuns > 0
          ? `Сейчас выполняются ${formatNumber(runningRuns)} запуска, поток продолжает обновляться.`
          : degradedRuns > 0
            ? `Есть ${formatNumber(degradedRuns)} проблемных запуска в недавнем окне, это уже вынесено в инженерный слой ниже.`
            : "Критичных отклонений в последних прогонах не видно."
    }
  ];
});

const sourceDistributionItems = computed(() =>
  [...(summary.value?.bySource ?? [])]
    .sort((left, right) => right.count - left.count)
    .slice(0, 6)
    .map((item) => ({
      label: item.source,
      value: item.count,
      valueLabel: formatCompactNumber(item.count),
      note: "Записей в текущем контуре",
      accent: "primary" as const
    }))
);

const statusDistributionSegments = computed(() =>
  (summary.value?.procurementsByStatus ?? []).map((item) => ({
    label: formatEnumLabel(item.status),
    value: item.count,
    valueLabel: formatNumber(item.count),
    accent: statusAccent(item.status)
  }))
);

const runStatusSegments = computed(() => {
  const counters = new Map<string, number>();

  for (const item of summary.value?.recentSourceRuns ?? []) {
    counters.set(item.status, (counters.get(item.status) ?? 0) + 1);
  }

  return Array.from(counters.entries()).map(([status, count]) => ({
    label: formatEnumLabel(status),
    value: count,
    valueLabel: formatNumber(count),
    accent: runAccent(status)
  }));
});

const timelineItems = computed(() =>
  (summary.value?.procurementsOverTime ?? []).slice(-8).map((item) => ({
    label: formatDate(item.date),
    shortLabel: shortDateFormatter.format(new Date(item.date)),
    value: item.count,
    valueLabel: formatNumber(item.count),
    note: "Обновлённые закупки в этой точке временного ряда."
  }))
);

const recentProcurements = computed(() => summary.value?.recentProcurements ?? []);

const nppRecentProcurements = computed(() => summary.value?.recentNppProcurements ?? []);

const recentProcurementSourceOptions = computed(() =>
  Array.from(new Set(recentProcurements.value.map((item) => item.source)))
    .sort((left, right) => left.localeCompare(right, "ru"))
    .map((source) => ({
      label: source,
      value: source
    }))
);

const recentProcurementStatusOptions = [
  { label: "Все статусы", value: allRecentStatusesValue },
  { label: "Черновик", value: "DRAFT" },
  { label: "Активна", value: "ACTIVE" },
  { label: "Завершена", value: "CLOSED" },
  { label: "В архиве", value: "ARCHIVED" }
];

const filteredRecentProcurements = computed(() => {
  const query = recentProcurementSearch.value.trim().toLowerCase();

  return recentProcurements.value.filter((item) => {
    const station = procurementFocusLabel(item.rawPayload);

    if (selectedRecentSource.value !== allRecentSourcesValue && item.source !== selectedRecentSource.value) {
      return false;
    }

    if (selectedRecentStatus.value !== allRecentStatusesValue && item.status !== selectedRecentStatus.value) {
      return false;
    }

    if (selectedRecentNppFocus.value !== allRecentNppFocusValue && station !== selectedRecentNppFocus.value) {
      return false;
    }

    if (!query) {
      return true;
    }

    const haystack = [
      item.title,
      item.externalId,
      item.customer,
      item.source,
      station
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return haystack.includes(query);
  });
});

const nppFocusCards = computed(() => {
  const items = nppRecentProcurements.value;
  const totalAmount = items.reduce((sum, item) => sum + (item.amount ?? 0), 0);
  const stations = new Set(
    items.map((item) => procurementFocusLabel(item.rawPayload)).filter(Boolean)
  );

  return [
    {
      label: "Свежие закупки для АЭС",
      value: formatNumber(items.length),
      hint: "Собраны из последних обновлённых записей дашборда"
    },
    {
      label: "Станции в фокусе",
      value: formatNumber(stations.size),
      hint: "Сколько разных АЭС уже видно в свежем окне"
    },
    {
      label: "Сумма по атомному окну",
      value: formatCurrency(totalAmount, "RUB"),
      hint: "Только по свежим атомным закупкам из верхнего списка"
    }
  ];
});

const nppStationGroups = computed(() => {
  const groups = new Map<string, typeof nppRecentProcurements.value>();

  for (const station of NPP_FOCUS_OPTIONS) {
    groups.set(station, []);
  }

  for (const item of nppRecentProcurements.value) {
    const station = procurementFocusLabel(item.rawPayload);
    if (!station) {
      continue;
    }

    const stationItems = groups.get(station) ?? [];
    stationItems.push(item);
    groups.set(station, stationItems);
  }

  return Array.from(groups.entries())
    .map(([station, items]) => ({
      station,
      count: items.length,
      items: [...items]
        .sort(
          (left, right) =>
            new Date(right.updatedAt ?? 0).getTime() - new Date(left.updatedAt ?? 0).getTime()
        )
        .slice(0, maxNppStationItems)
    }))
    .sort(
      (left, right) =>
        right.count - left.count || left.station.localeCompare(right.station, "ru")
    );
});

const recentReports = computed(() => reportsData.reports.value.slice(0, 4));

const sourceFocusItems = computed(() =>
  (summary.value?.sourcesSummary ?? []).slice(0, 4).map((item) => ({
    title: item.name,
    eyebrow: item.source,
    status: item.isActive ? "Активен" : "Отключён",
    accent: item.isActive ? ("success" as const) : ("destructive" as const),
    lines: [
      `Записей: ${formatNumber(item.recordCount)}`,
      `Закупок: ${formatNumber(item.procurementCount)}`,
      `Запусков: ${formatNumber(item.runCount)}`,
      `Последний запуск: ${formatDateTime(item.lastRunAt)}`
    ]
  }))
);

const reportSignals = computed(() => {
  if (!canViewReports.value) {
    return [];
  }

  if (recentReports.value.length === 0) {
    return [
      {
        title: "Отчёты пока не сформированы",
        text: "После первой генерации здесь появятся сценарии с быстрым переходом в детальную аналитику."
      }
    ];
  }

  return recentReports.value.map((report) => ({
    id: report.id,
    title: report.name,
    text: report.description || "Описание отчёта пока не задано.",
    status: report.status
  }));
});

const runtimeCards = computed(() => {
  const overview = scraperOverview.value;
  const sources = overview?.sources ?? [];

  return [
    {
      label: "Автозапуск",
      value: overview?.runtime.autoRunEnabled ? "Включён" : "Отключён",
      hint: `Расписание: ${overview?.runtime.schedule ?? "нет данных"}`
    },
    {
      label: "Проблемные источники",
      value: formatNumber(sources.filter((item) => item.attentionRequired).length),
      hint: "Источники, которым уже нужно инженерное внимание"
    },
    {
      label: "Сейчас выполняются",
      value: formatNumber(sources.filter((item) => item.isRunning).length),
      hint: "Активные прогоны в runtime-контуре"
    },
    {
      label: "Circuit breaker",
      value: formatNumber(overview?.runtime.circuitStates.length ?? 0),
      hint: overview?.runtime.reachable ? "Контуры защиты от повторных сбоев" : "Control API недоступен"
    }
  ];
});

const technicalWatchItems = computed(() =>
  [...(scraperOverview.value?.sources ?? [])]
    .filter((item) => item.attentionRequired)
    .sort((left, right) => right.failedRuns - left.failedRuns || left.successRate - right.successRate)
    .slice(0, 6)
    .map((item) => ({
      label: item.sourceName,
      value: Math.max(item.failedRuns, 1),
      valueLabel: `${formatPercent(item.successRate)} успех`,
      note: item.attentionReason,
      accent: item.riskLevel === "CRITICAL" ? ("danger" as const) : ("warning" as const)
    }))
);

const technicalIncidents = computed(() =>
  (summary.value?.recentSourceRuns ?? [])
    .filter((item) => item.status === "FAILED" || item.status === "PARTIAL")
    .slice(0, 6)
    .map((item) => ({
      title: `${item.sourceCode} · ${formatEnumLabel(item.status)}`,
      text:
        item.errorMessage ||
        `Опубликовано ${formatNumber(item.itemsPublished)}, ошибок ${formatNumber(item.itemsFailed)}`
    }))
);

function shortDate(value: string) {
  return shortDateFormatter.format(new Date(value));
}

function statusAccent(value?: string | null) {
  const normalized = (value ?? "").toUpperCase();

  if (normalized === "ACTIVE") {
    return "success" as const;
  }

  if (normalized === "DRAFT" || normalized === "CLOSED") {
    return "warning" as const;
  }

  if (normalized === "ARCHIVED") {
    return "danger" as const;
  }

  return "primary" as const;
}

function runAccent(value?: string | null) {
  const normalized = (value ?? "").toUpperCase();

  if (normalized === "SUCCESS") {
    return "success" as const;
  }

  if (normalized === "RUNNING" || normalized === "PENDING" || normalized === "PARTIAL") {
    return "warning" as const;
  }

  if (normalized === "FAILED") {
    return "danger" as const;
  }

  return "muted" as const;
}

function procurementFocusLabel(rawPayload?: Record<string, unknown> | null) {
  return getProcurementNppFocus(rawPayload);
}

async function reload() {
  if (isPlainUser.value) {
    return;
  }

  const tasks: Promise<unknown>[] = [dashboard.load()];

  if (canViewAnalytics.value) {
    tasks.push(analyticsData.load());
  }

  if (canViewReports.value) {
    tasks.push(reportsData.load());
  }

  if (canViewScraperOverview.value) {
    tasks.push(scraperAdmin.load());
  }

  await Promise.all(tasks);
}

onMounted(async () => {
  await reload();
});
</script>

<template>
  <PageHeader
    title="Дашборд"
    :description="roleSummary"
  >
    <template #actions>
      <div class="flex gap-2">
        <Button
          v-if="canGenerateReports"
          :disabled="reportsData.refreshLoading.value"
          @click="reportsData.refreshReports()"
        >
          {{ reportsData.refreshLoading.value ? "Формирование..." : "Сформировать отчёты" }}
        </Button>
        <Button v-if="!isPlainUser" variant="secondary" :disabled="loading" @click="reload()">
          {{ loading ? "Обновление..." : "Обновить" }}
        </Button>
      </div>
    </template>
  </PageHeader>

  <Card v-if="isPlainUser">
    <CardHeader>
      <CardTitle>Доступ ограничен</CardTitle>
      <CardDescription>
        Для вашей учётной записи пока не назначены рабочие права аналитика, разработчика или администратора.
      </CardDescription>
    </CardHeader>
    <CardContent class="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
      <div class="rounded-2xl border bg-muted/20 p-6">
        <p class="text-lg font-semibold">Нужно запросить права у администратора системы</p>
        <p class="mt-3 text-sm text-muted-foreground">
          Обратитесь к администратору NPPWEB, чтобы вам назначили роль в зависимости от вашей задачи:
          аналитик, разработчик или администратор.
        </p>
      </div>
      <div class="rounded-2xl border bg-background p-6">
        <p class="text-sm font-medium">Что доступно сейчас</p>
        <div class="mt-4 flex flex-wrap gap-2">
          <Badge variant="outline">Дашборд</Badge>
          <Badge variant="outline">Профиль</Badge>
        </div>
      </div>
    </CardContent>
  </Card>

  <div v-else-if="loading" class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
    <Skeleton v-for="item in 4" :key="item" class="h-32 rounded-xl" />
  </div>

  <ErrorState v-else-if="error" :description="error" action-label="Повторить" @action="reload()" />

  <template v-else-if="summary">
    <Card class="overflow-hidden border-border/70 bg-gradient-to-br from-background via-background to-muted/30">
      <CardContent class="grid gap-6 p-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div class="space-y-4">
          <div class="flex flex-wrap gap-2">
            <Badge v-for="item in roleBadges" :key="item" variant="secondary">{{ item }}</Badge>
          </div>
          <div class="space-y-2">
            <p class="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">Общая картина</p>
            <h2 class="text-2xl font-semibold tracking-tight">Поток закупок и сбор данных разложены по темам</h2>
            <p class="max-w-3xl text-sm leading-6 text-muted-foreground">
              Верхний блок отвечает на вопрос “что происходит сейчас”, диаграммы ниже показывают
              структуру и динамику, а операционные и инженерные секции уже вынесены отдельно.
            </p>
          </div>
        </div>

        <div class="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
          <div
            v-for="item in dashboardGuide"
            :key="item.title"
            class="rounded-3xl border border-border/70 bg-background/70 p-4 backdrop-blur"
          >
            <p class="text-sm font-semibold">{{ item.title }}</p>
            <p class="mt-2 text-sm leading-6 text-muted-foreground">{{ item.text }}</p>
          </div>
        </div>
      </CardContent>
    </Card>

    <template v-if="canViewAnalytics">
      <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          v-for="card in overviewCards"
          :key="card.label"
          :label="card.label"
          :value="card.value"
          :hint="card.hint"
        />
      </div>

      <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          v-for="card in analyticsCards"
          :key="card.label"
          :label="card.label"
          :value="card.value"
          :hint="card.hint"
        />
      </div>

      <div class="grid gap-4 xl:grid-cols-[0.92fr_1.08fr]">
        <Card>
          <CardHeader>
            <CardTitle>Статусы потока</CardTitle>
            <CardDescription>
              Слева видно распределение закупок по жизненному циклу, справа — в каком состоянии были последние прогоны.
            </CardDescription>
          </CardHeader>
          <CardContent class="space-y-6">
            <div class="space-y-3">
              <div class="flex items-center justify-between">
                <p class="text-sm font-medium">Закупки в базе</p>
                <p class="text-sm text-muted-foreground">{{ formatNumber(summary.totalProcurements) }}</p>
              </div>
              <MetricStackBar :segments="statusDistributionSegments" />
            </div>

            <div class="space-y-3">
              <div class="flex items-center justify-between">
                <p class="text-sm font-medium">Последние source runs</p>
                <p class="text-sm text-muted-foreground">{{ formatNumber(summary.recentSourceRuns.length) }}</p>
              </div>
              <MetricStackBar :segments="runStatusSegments" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Где сосредоточен поток</CardTitle>
            <CardDescription>
              Быстрая диаграмма по источникам помогает увидеть, кто формирует основной объём и где смещение становится заметным.
            </CardDescription>
          </CardHeader>
          <CardContent class="space-y-5">
            <MetricBarList :items="sourceDistributionItems" />

            <div class="rounded-3xl border bg-muted/15 p-4">
              <p class="text-sm font-medium">Как читать эту диаграмму</p>
              <p class="mt-2 text-sm leading-6 text-muted-foreground">
                Если один источник начинает резко доминировать или, наоборот, исчезает из верхней части списка,
                это обычно первый сигнал для проверки свежести данных и контуров публикации.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Динамика обновления</CardTitle>
          <CardDescription>
            Интерактивный line chart показывает, как менялся объём обновлённых закупок за последние точки временного ряда.
          </CardDescription>
        </CardHeader>
        <CardContent class="space-y-4">
          <MetricLineChartInteractive :items="timelineItems" />
          <p class="text-sm leading-6 text-muted-foreground">
            График помогает быстро отличить ровный поток от провалов. Если линия заметно уходит вниз подряд,
            это уже повод проверить конкретные источники и последние прогоны.
          </p>
        </CardContent>
      </Card>

      <Card v-if="nppRecentProcurements.length > 0">
        <CardHeader>
          <CardTitle>Закупки для АЭС России</CardTitle>
          <CardDescription>
            Отдельный атомный слой теперь считается по собственному окну атомных закупок, чтобы активность АЭС не терялась на фоне общего потока.
          </CardDescription>
        </CardHeader>
        <CardContent class="space-y-6">
          <div class="grid gap-4 md:grid-cols-3">
            <StatCard
              v-for="card in nppFocusCards"
              :key="card.label"
              :label="card.label"
              :value="card.value"
              :hint="card.hint"
            />
          </div>

          <div class="grid gap-4 xl:grid-cols-2">
            <Card
              v-for="station in nppStationGroups"
              :key="station.station"
              class="border-dashed"
            >
              <CardHeader class="gap-3">
                <div class="flex items-start justify-between gap-3">
                  <div class="space-y-1">
                    <CardTitle class="text-base">{{ station.station }}</CardTitle>
                    <CardDescription>
                      Поток закупок по станции в выделенном атомном окне дашборда.
                    </CardDescription>
                  </div>
                  <Badge variant="secondary">
                    {{ formatNumber(station.count) }}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent class="space-y-3">
                <div
                  v-if="station.items.length === 0"
                  class="rounded-2xl border border-dashed border-border/70 bg-muted/10 p-4 text-sm text-muted-foreground"
                >
                  В текущем окне свежих закупок по этой станции пока нет.
                </div>
                <div
                  v-for="item in station.items"
                  :key="item.id"
                  class="rounded-2xl border border-border/70 bg-muted/15 p-4"
                >
                  <div class="flex items-start justify-between gap-3">
                    <div class="space-y-1">
                      <p class="text-sm font-semibold">{{ item.title }}</p>
                      <p class="text-sm text-muted-foreground">
                        Заказчик: {{ item.customer || "Не указан" }}
                      </p>
                    </div>
                    <Badge :variant="badgeVariant(item.status)">{{ formatEnumLabel(item.status) }}</Badge>
                  </div>
                  <div class="mt-3 flex flex-wrap gap-3 text-sm text-muted-foreground">
                    <span>{{ item.externalId }}</span>
                    <span>{{ formatCurrency(item.amount, item.currency) }}</span>
                    <span>{{ formatDateTime(item.updatedAt) }}</span>
                  </div>
                </div>
                <div
                  v-if="station.count > station.items.length"
                  class="rounded-2xl border border-dashed border-border/70 bg-muted/10 p-4 text-sm text-muted-foreground"
                >
                  Показаны последние {{ formatNumber(station.items.length) }} из {{ formatNumber(station.count) }} записей по станции.
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      <div class="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
        <Card>
          <CardHeader>
            <CardTitle>Оперативный список закупок</CardTitle>
            <CardDescription>
              Здесь только свежие записи, чтобы не смешивать “общую картину” и “что открыть прямо сейчас”.
              Для атомной темы отдельно выводится станция назначения, если она распознана в данных ЕИС.
            </CardDescription>
          </CardHeader>
          <CardContent class="space-y-4">
            <div class="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">
                Найдено: {{ formatNumber(filteredRecentProcurements.length) }}
              </Badge>
              <Badge variant="outline">
                Всего в окне: {{ formatNumber(recentProcurements.length) }}
              </Badge>
            </div>

            <div class="grid gap-4 lg:grid-cols-[1.4fr_1fr_1fr_1fr_auto]">
              <div class="space-y-2">
                <Label for="dashboard-procurement-search">Поиск</Label>
                <Input
                  id="dashboard-procurement-search"
                  v-model="recentProcurementSearch"
                  placeholder="Название, ID, заказчик или станция"
                />
              </div>

              <div class="space-y-2">
                <Label for="dashboard-procurement-source">Источник</Label>
                <Select v-model="selectedRecentSource">
                  <SelectTrigger id="dashboard-procurement-source">
                    <SelectValue placeholder="Все источники" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem :value="allRecentSourcesValue">Все источники</SelectItem>
                    <SelectItem
                      v-for="source in recentProcurementSourceOptions"
                      :key="source.value"
                      :value="source.value"
                    >
                      {{ source.label }}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div class="space-y-2">
                <Label for="dashboard-procurement-status">Статус</Label>
                <Select v-model="selectedRecentStatus">
                  <SelectTrigger id="dashboard-procurement-status">
                    <SelectValue placeholder="Все статусы" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem
                      v-for="status in recentProcurementStatusOptions"
                      :key="status.value"
                      :value="status.value"
                    >
                      {{ status.label }}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div class="space-y-2">
                <Label for="dashboard-procurement-npp-focus">Цель АЭС</Label>
                <Select v-model="selectedRecentNppFocus">
                  <SelectTrigger id="dashboard-procurement-npp-focus">
                    <SelectValue placeholder="Все станции" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem :value="allRecentNppFocusValue">Все станции</SelectItem>
                    <SelectItem
                      v-for="station in NPP_FOCUS_OPTIONS"
                      :key="station"
                      :value="station"
                    >
                      {{ station }}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div class="flex items-end">
                <Button
                  type="button"
                  variant="ghost"
                  @click="
                    recentProcurementSearch = '';
                    selectedRecentSource = allRecentSourcesValue;
                    selectedRecentStatus = allRecentStatusesValue;
                    selectedRecentNppFocus = allRecentNppFocusValue;
                  "
                >
                  Сбросить
                </Button>
              </div>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Закупка</TableHead>
                  <TableHead>Источник</TableHead>
                  <TableHead>Сумма</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead>Обновлена</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow
                  v-for="item in filteredRecentProcurements"
                  :key="item.id"
                  class="cursor-pointer"
                  @click="navigateTo(`/procurements/${item.id}`)"
                >
                  <TableCell>
                    <div class="space-y-1">
                      <p class="font-medium">{{ item.title }}</p>
                      <p class="text-sm text-muted-foreground">{{ item.externalId }}</p>
                      <p
                        v-if="procurementFocusLabel(item.rawPayload)"
                        class="text-xs font-medium text-primary"
                      >
                        Цель АЭС: {{ procurementFocusLabel(item.rawPayload) }}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>{{ item.source }}</TableCell>
                  <TableCell>{{ formatCurrency(item.amount, item.currency) }}</TableCell>
                  <TableCell>
                    <Badge :variant="badgeVariant(item.status)">{{ formatEnumLabel(item.status) }}</Badge>
                  </TableCell>
                  <TableCell>{{ formatDateTime(item.updatedAt) }}</TableCell>
                </TableRow>
                <TableRow v-if="filteredRecentProcurements.length === 0">
                  <TableCell colspan="5" class="py-10 text-center text-sm text-muted-foreground">
                    По текущим фильтрам свежих закупок не найдено.
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Фокус по источникам</CardTitle>
            <CardDescription>
              Небольшой блок для чтения свежести и активности без перехода в отдельный раздел источников.
            </CardDescription>
          </CardHeader>
          <CardContent class="space-y-3">
            <div
              v-for="item in sourceFocusItems"
              :key="item.eyebrow"
              class="rounded-3xl border bg-muted/15 p-4"
            >
              <div class="flex items-start justify-between gap-3">
                <div>
                  <p class="text-sm font-semibold">{{ item.title }}</p>
                  <p class="text-xs text-muted-foreground">{{ item.eyebrow }}</p>
                </div>
                <Badge :variant="item.accent">{{ item.status }}</Badge>
              </div>
              <div class="mt-3 space-y-1 text-sm text-muted-foreground">
                <p v-for="line in item.lines" :key="line">{{ line }}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card v-if="canViewReports">
        <CardHeader>
          <CardTitle>Отчётный слой</CardTitle>
          <CardDescription>
            Отчёты вынесены в отдельный тематический блок, чтобы не перемешивать их с закупками и техническими метриками.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div class="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
            <div
              v-for="report in reportSignals"
              :key="'id' in report ? report.id : report.title"
              class="rounded-3xl border bg-muted/15 p-4"
            >
              <div class="flex items-start justify-between gap-3">
                <div class="space-y-2">
                  <NuxtLink
                    v-if="'id' in report"
                    :to="`/reports/${report.id}`"
                    class="text-sm font-semibold text-primary hover:underline"
                  >
                    {{ report.title }}
                  </NuxtLink>
                  <p v-else class="text-sm font-semibold">{{ report.title }}</p>
                  <p class="text-sm leading-6 text-muted-foreground">{{ report.text }}</p>
                </div>
                <Badge v-if="'status' in report" :variant="badgeVariant(report.status)">
                  {{ formatEnumLabel(report.status) }}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </template>

    <template v-if="canViewScraperOverview && scraperOverview">
      <Card class="border-border/70 bg-gradient-to-br from-background via-background to-muted/20">
        <CardHeader>
          <CardTitle>Инженерный контур</CardTitle>
          <CardDescription>
            Технический слой вынесен отдельно: сначала runtime и зоны внимания, затем инциденты и детальная таблица источников.
          </CardDescription>
        </CardHeader>
      </Card>

      <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          v-for="card in runtimeCards"
          :key="card.label"
          :label="card.label"
          :value="card.value"
          :hint="card.hint"
        />
      </div>

      <div class="grid gap-4 xl:grid-cols-[0.88fr_1.12fr]">
        <Card>
          <CardHeader>
            <CardTitle>Runtime и ограничения</CardTitle>
            <CardDescription>
              Здесь виден текущий статус control API, применённое расписание и активные контуры защиты от сбоев.
            </CardDescription>
          </CardHeader>
          <CardContent class="space-y-4">
            <div class="flex flex-wrap items-center gap-2">
              <Badge :variant="scraperOverview.runtime.reachable ? 'success' : 'destructive'">
                {{ scraperOverview.runtime.reachable ? "Control API доступен" : "Control API недоступен" }}
              </Badge>
              <Badge variant="secondary">
                {{ scraperOverview.runtime.autoRunEnabled ? "Автозапуск включён" : "Автозапуск выключен" }}
              </Badge>
              <Badge v-if="scraperOverview.runtime.running" variant="warning">Есть активный прогон</Badge>
            </div>

            <div class="grid gap-3 text-sm text-muted-foreground">
              <div class="flex items-center justify-between">
                <span>Применённое расписание</span>
                <span class="font-medium text-foreground">{{ scraperOverview.runtime.schedule }}</span>
              </div>
              <div class="flex items-center justify-between">
                <span>Загруженные источники</span>
                <span class="font-medium text-foreground">
                  {{ formatNumber(scraperOverview.runtime.loadedSources.length) }}
                </span>
              </div>
              <div class="flex items-center justify-between">
                <span>Запущены сейчас</span>
                <span class="font-medium text-foreground">
                  {{
                    scraperOverview.runtime.runningSources.length > 0
                      ? scraperOverview.runtime.runningSources.join(", ")
                      : "Нет"
                  }}
                </span>
              </div>
            </div>

            <div
              v-if="scraperOverview.runtime.circuitStates.length > 0"
              class="space-y-3 rounded-3xl border bg-muted/15 p-4"
            >
              <p class="font-medium">Источники в circuit breaker</p>
              <div
                v-for="item in scraperOverview.runtime.circuitStates"
                :key="item.sourceCode"
                class="flex items-center justify-between gap-3 text-sm"
              >
                <span>{{ item.sourceCode }}</span>
                <span class="text-muted-foreground">
                  {{ formatNumber(item.failures) }} ошибок · до {{ formatDateTime(item.openUntil) }}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Где требуется реакция</CardTitle>
            <CardDescription>
              Быстрый визуальный список проблемных источников. Сначала видны причины внимания, без чтения длинной таблицы.
            </CardDescription>
          </CardHeader>
          <CardContent class="space-y-5">
            <MetricBarList
              :items="technicalWatchItems"
              empty-text="Сейчас нет источников, которые требуют отдельного инженерного внимания."
            />

            <div class="rounded-3xl border bg-muted/15 p-4">
              <p class="text-sm font-medium">Как использовать этот блок</p>
              <p class="mt-2 text-sm leading-6 text-muted-foreground">
                Чем выше карточка в списке, тем сильнее сочетание неуспехов, публикационных потерь и внимания со стороны runtime.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Последние технические инциденты</CardTitle>
          <CardDescription>
            Отдельный список, чтобы ошибки не смешивались с аналитическими блоками и оперативным списком закупок.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EmptyState
            v-if="technicalIncidents.length === 0"
            title="Критичных инцидентов нет"
            description="Последние запуски парсеров выглядят стабильно."
          />
          <div v-else class="grid gap-4 lg:grid-cols-2">
            <div
              v-for="incident in technicalIncidents"
              :key="incident.title"
              class="rounded-3xl border bg-muted/15 p-4"
            >
              <p class="text-sm font-semibold">{{ incident.title }}</p>
              <p class="mt-2 text-sm leading-6 text-muted-foreground">{{ incident.text }}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Источники под инженерным наблюдением</CardTitle>
          <CardDescription>
            Детальная таблица остаётся на месте, но теперь идёт после визуального приоритезационного слоя.
          </CardDescription>
        </CardHeader>
        <CardContent class="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Источник</TableHead>
                <TableHead>Причина внимания</TableHead>
                <TableHead>Последняя ошибка</TableHead>
                <TableHead>Успех</TableHead>
                <TableHead>Публикация</TableHead>
                <TableHead>Последний запуск</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-for="item in scraperOverview.sources" :key="item.sourceCode">
                <TableCell>
                  <div class="space-y-1">
                    <p class="font-medium">{{ item.sourceName }}</p>
                    <p class="text-sm text-muted-foreground">{{ item.sourceCode }}</p>
                  </div>
                </TableCell>
                <TableCell>{{ item.attentionReason }}</TableCell>
                <TableCell>{{ item.lastErrorMessage || "Нет ошибок" }}</TableCell>
                <TableCell>{{ formatPercent(item.successRate) }}</TableCell>
                <TableCell>{{ formatPercent(item.publicationRate) }}</TableCell>
                <TableCell>{{ formatDateTime(item.lastRunAt) }}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </template>
  </template>
</template>
