<script setup lang="ts">
definePageMeta({
  title: "Дашборд",
  description: "Ролевой dashboard по закупкам, аналитике и контуру сбора"
});

useHead({
  title: "Дашборд"
});

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

const businessCards = computed(() => {
  if (!summary.value) {
    return [];
  }

  return [
    {
      label: "Объекты в базе",
      value: formatCompactNumber(summary.value.totalRecords),
      hint: `Закупки: ${formatCompactNumber(summary.value.totalProcurements)}`
    },
    {
      label: "Активные источники",
      value: formatNumber(summary.value.activeSources),
      hint: "Источники, участвующие в регулярном контуре сбора"
    },
    {
      label: "Запуски за 24 часа",
      value: formatNumber(summary.value.runsLast24h),
      hint: "Последняя суточная активность системы"
    },
    {
      label: "Готовые отчёты",
      value: formatNumber(reportsData.reports.value.filter((item) => item.status === "READY").length),
      hint: `Последняя публикация: ${formatDateTime(summary.value.lastPublishedAt)}`
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
      hint: "Точки, требующие немедленного разбора"
    },
    {
      label: "Источники под наблюдением",
      value: formatNumber(analytics.value.atRiskSources),
      hint: "Есть ограничения по свежести или качеству данных"
    },
    {
      label: "Эффективность публикации",
      value: formatPercent(analytics.value.publicationEfficiency),
      hint: `Успешность запусков: ${formatPercent(analytics.value.runSuccessRate)}`
    }
  ];
});

const collectionSignals = computed(() => {
  const recentRuns = summary.value?.recentSourceRuns ?? [];
  const degradedRuns = recentRuns.filter((item) => item.status === "FAILED" || item.status === "PARTIAL").length;
  const runningRuns = recentRuns.filter((item) => item.status === "RUNNING").length;
  const pendingReports = reportsData.reports.value.filter((item) => item.status !== "READY").length;

  return [
    {
      title: "Контур сбора",
      text:
        runningRuns > 0
          ? `Сейчас выполняются ${formatNumber(runningRuns)} запуска, данные продолжают поступать в систему.`
          : degradedRuns > 0
            ? `По части контуров ведутся работы. Подробные технические ошибки доступны разработчику и администратору.`
            : "Сбор идёт по расписанию, критичных отклонений в аналитическом контуре не видно."
    },
    {
      title: "Источники в зоне внимания",
      text: analytics.value
        ? `${formatNumber(analytics.value.atRiskSources)} источников требуют наблюдения по свежести или качеству потока.`
        : "Аналитический слой ещё загружается."
    },
    {
      title: "Отчётный контур",
      text:
        pendingReports > 0
          ? `${formatNumber(pendingReports)} отчётов ещё не готовы и будут пересчитаны после обновления данных.`
          : "Аналитические отчёты готовы к работе и доступны для формирования."
    }
  ];
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
      hint: "Источники, требующие инженерного внимания"
    },
    {
      label: "Сейчас выполняются",
      value: formatNumber(sources.filter((item) => item.isRunning).length),
      hint: "Активные прогоны в runtime-контуре"
    },
    {
      label: "Circuit breaker",
      value: formatNumber(overview?.runtime.circuitStates.length ?? 0),
      hint: overview?.runtime.reachable ? "Открытые контуры защиты от повторных сбоев" : "Control API недоступен"
    }
  ];
});

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

const recentReports = computed(() => reportsData.reports.value.slice(0, 5));

const dashboardDescription = computed(() => {
  if (role.value === "ANALYST") {
    return "Аналитический контур с закупками, бизнес-метриками и отчётами без технических деталей парсеров.";
  }

  if (role.value === "DEVELOPER") {
    return "Инженерный контур с runtime-состоянием парсеров, инцидентами и техническими отчётами.";
  }

  if (role.value === "ADMIN") {
    return "Полный контур управления: аналитика, техническое состояние парсеров и административный доступ.";
  }

  return "Базовый рабочий экран пользователя системы.";
});

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
    :description="dashboardDescription"
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
    <template v-if="canViewAnalytics">
      <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          v-for="card in businessCards"
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

      <div class="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle>Контур мониторинга</CardTitle>
            <CardDescription>
              Состояние сбора и отчётности в безопасной для аналитика форме без технических ошибок парсеров.
            </CardDescription>
          </CardHeader>
          <CardContent class="space-y-3">
            <div
              v-for="signal in collectionSignals"
              :key="signal.title"
              class="rounded-xl border bg-muted/30 p-4"
            >
              <p class="text-sm font-medium">{{ signal.title }}</p>
              <p class="mt-1 text-sm text-muted-foreground">{{ signal.text }}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Последние отчёты</CardTitle>
            <CardDescription>Быстрый доступ к актуальным аналитическим сценариям.</CardDescription>
          </CardHeader>
          <CardContent class="space-y-3">
            <div
              v-for="report in recentReports"
              :key="report.id"
              class="rounded-xl border bg-muted/30 p-4"
            >
              <div class="flex items-center justify-between gap-2">
                <NuxtLink :to="`/reports/${report.id}`" class="text-sm font-medium text-primary hover:underline">
                  {{ report.name }}
                </NuxtLink>
                <Badge :variant="badgeVariant(report.status)">{{ formatEnumLabel(report.status) }}</Badge>
              </div>
              <p class="mt-2 text-sm text-muted-foreground">
                {{ report.description || "Описание отчёта пока не задано." }}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div class="grid gap-4 xl:grid-cols-[1.3fr_0.7fr]">
        <Card>
          <CardHeader>
            <CardTitle>Последние закупки</CardTitle>
            <CardDescription>Свежие записи, доступные для перехода в карточку закупки.</CardDescription>
          </CardHeader>
          <CardContent class="px-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Закупка</TableHead>
                  <TableHead>Источник</TableHead>
                  <TableHead>Сумма</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead>Опубликована</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow
                  v-for="item in summary.recentProcurements"
                  :key="item.id"
                  class="cursor-pointer"
                  @click="navigateTo(`/procurements/${item.id}`)"
                >
                  <TableCell>
                    <div class="space-y-1">
                      <p class="font-medium">{{ item.title }}</p>
                      <p class="text-sm text-muted-foreground">{{ item.externalId }}</p>
                    </div>
                  </TableCell>
                  <TableCell>{{ item.source }}</TableCell>
                  <TableCell>{{ formatCurrency(item.amount, item.currency) }}</TableCell>
                  <TableCell>
                    <Badge :variant="badgeVariant(item.status)">{{ formatEnumLabel(item.status) }}</Badge>
                  </TableCell>
                  <TableCell>{{ formatDate(item.publishedAt) }}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Источники в мониторинге</CardTitle>
            <CardDescription>Краткий слой по активности и свежести каналов.</CardDescription>
          </CardHeader>
          <CardContent class="space-y-3">
            <div
              v-for="source in summary.sourcesSummary.slice(0, 4)"
              :key="source.source"
              class="rounded-xl border bg-muted/30 p-4"
            >
              <div class="flex items-center justify-between gap-2">
                <div>
                  <p class="text-sm font-medium">{{ source.name }}</p>
                  <p class="text-xs text-muted-foreground">{{ source.source }}</p>
                </div>
                <Badge :variant="source.isActive ? 'success' : 'destructive'">
                  {{ source.isActive ? "Активен" : "Отключён" }}
                </Badge>
              </div>
              <div class="mt-3 grid gap-1 text-sm text-muted-foreground">
                <p>Записей: {{ formatNumber(source.recordCount) }}</p>
                <p>Закупок: {{ formatNumber(source.procurementCount) }}</p>
                <p>Запусков: {{ formatNumber(source.runCount) }}</p>
                <p>Последний запуск: {{ formatDateTime(source.lastRunAt) }}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </template>

    <template v-if="canViewScraperOverview && scraperOverview">
      <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          v-for="card in runtimeCards"
          :key="card.label"
          :label="card.label"
          :value="card.value"
          :hint="card.hint"
        />
      </div>

      <div class="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <Card>
          <CardHeader>
            <CardTitle>Runtime-контур парсеров</CardTitle>
            <CardDescription>
              Разработчик и администратор видят техническое состояние scraper-service и текущие ограничения.
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
              class="space-y-3 rounded-xl border bg-muted/20 p-4"
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
            <CardTitle>Технические инциденты</CardTitle>
            <CardDescription>
              Полный инженерный слой с кодами ошибок и деталями последних проблемных прогонов.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <EmptyState
              v-if="technicalIncidents.length === 0"
              title="Критичных инцидентов нет"
              description="Последние запуски парсеров выглядят стабильно."
            />
            <div v-else class="space-y-3">
              <div
                v-for="incident in technicalIncidents"
                :key="incident.title"
                class="rounded-xl border bg-muted/30 p-4"
              >
                <p class="text-sm font-medium">{{ incident.title }}</p>
                <p class="mt-1 text-sm text-muted-foreground">{{ incident.text }}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Источники под инженерным наблюдением</CardTitle>
          <CardDescription>
            Здесь уже доступны attention reasons, риск, публикация и последние технические сигналы.
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
