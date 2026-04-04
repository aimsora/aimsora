<script setup lang="ts">
definePageMeta({
  title: "Дашборд",
  description: "Оперативная сводка по закупкам, источникам, запускам и отчётам"
});

useHead({
  title: "Дашборд"
});

const dashboard = useDashboardData();
const reportsData = useReportsData();
const summary = computed(() => dashboard.summary.value);

const loading = computed(() => dashboard.loading.value || reportsData.loading.value);
const error = computed(() => dashboard.error.value || reportsData.error.value);

const summaryCards = computed(() => {
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
      hint: "Источники, участвующие в регулярном сборе"
    },
    {
      label: "Запуски за 24 часа",
      value: formatNumber(summary.value.runsLast24h),
      hint: "Последняя суточная активность системы"
    },
    {
      label: "Готовые отчёты",
      value: formatNumber(
        reportsData.reports.value.filter((item) => item.status === "READY").length
      ),
      hint: `Последняя публикация: ${formatDateTime(summary.value.lastPublishedAt)}`
    }
  ];
});

const alerts = computed(() => {
  const failedRuns = summary.value?.recentSourceRuns
    .filter((item) => item.status === "FAILED" || item.status === "PARTIAL")
    .slice(0, 3)
    .map((item) => ({
      title: `${item.sourceCode} · ${formatEnumLabel(item.status)}`,
      text:
        item.errorMessage ||
        `Опубликовано ${formatNumber(item.itemsPublished)}, ошибок ${formatNumber(item.itemsFailed)}`
    })) ?? [];

  const reportAlerts = reportsData.reports.value
    .filter((item) => item.status !== "READY")
    .slice(0, 2)
    .map((item) => ({
      title: `${item.name} · ${formatEnumLabel(item.status)}`,
      text: `Обновлён ${formatDateTime(item.updatedAt)}`
    }));

  return [...failedRuns, ...reportAlerts];
});

const recentReports = computed(() => reportsData.reports.value.slice(0, 5));

const runStatusRows = computed(() => {
  const counts = new Map<string, number>();

  for (const run of summary.value?.recentSourceRuns ?? []) {
    counts.set(run.status, (counts.get(run.status) ?? 0) + 1);
  }

  return Array.from(counts.entries()).map(([status, count]) => ({
    status,
    count
  }));
});

async function reload() {
  await Promise.all([dashboard.load(), reportsData.load()]);
}

onMounted(async () => {
  await reload();
});
</script>

<template>
  <PageHeader
    title="Дашборд"
    description="Коммерческий app dashboard по закупкам, источникам, запускам и отчётности."
  >
    <template #actions>
      <Button variant="secondary" :disabled="loading" @click="reload()">
        {{ loading ? "Обновление..." : "Обновить" }}
      </Button>
    </template>
  </PageHeader>

  <div v-if="loading" class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
    <Skeleton v-for="item in 4" :key="item" class="h-32 rounded-xl" />
  </div>

  <ErrorState v-else-if="error" :description="error" action-label="Повторить" @action="reload()" />

  <template v-else-if="summary">
    <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <StatCard
        v-for="card in summaryCards"
        :key="card.label"
        :label="card.label"
        :value="card.value"
        :hint="card.hint"
      />
    </div>

    <div class="grid gap-4 xl:grid-cols-[1.35fr_0.95fr]">
      <Card>
        <CardHeader>
          <CardTitle>Публикации за 14 дней</CardTitle>
          <CardDescription>Тренд свежих закупок по дням без отвлекающей визуальной перегрузки.</CardDescription>
        </CardHeader>
        <CardContent>
          <div class="flex h-56 items-end gap-3">
            <div
              v-for="point in summary.procurementsOverTime"
              :key="point.date"
              class="flex flex-1 flex-col items-center gap-3"
            >
              <div class="flex h-40 w-full items-end rounded-md bg-muted/50 px-1">
                <div
                  class="w-full rounded-md bg-primary/85"
                  :style="{
                    height: `${Math.max(
                      8,
                      (point.count /
                        Math.max(...summary.procurementsOverTime.map((item) => item.count), 1)) *
                        100
                    )}%`
                  }"
                />
              </div>
              <div class="text-center text-xs text-muted-foreground">
                <div>{{ point.date.slice(5) }}</div>
                <div>{{ formatNumber(point.count) }}</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Статусы запусков</CardTitle>
          <CardDescription>Распределение последних запусков по состояниям.</CardDescription>
        </CardHeader>
        <CardContent class="space-y-4">
          <EmptyState
            v-if="runStatusRows.length === 0"
            title="Запусков пока нет"
            description="После первых запусков здесь появится распределение по статусам."
          />
          <div
            v-for="item in runStatusRows"
            :key="item.status"
            class="space-y-2"
          >
            <div class="flex items-center justify-between text-sm">
              <span>{{ formatEnumLabel(item.status) }}</span>
              <span class="text-muted-foreground">{{ formatNumber(item.count) }}</span>
            </div>
            <div class="h-2 rounded-full bg-muted">
              <div
                class="h-2 rounded-full bg-primary"
                :style="{
                  width: `${Math.max(
                    8,
                    (item.count /
                      Math.max(...runStatusRows.map((entry) => entry.count), 1)) *
                      100
                  )}%`
                }"
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>

    <div class="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
      <Card>
        <CardHeader>
          <CardTitle>Покрытие по источникам</CardTitle>
          <CardDescription>Где сосредоточен основной объём загруженных записей.</CardDescription>
        </CardHeader>
        <CardContent class="space-y-4">
          <div
            v-for="item in summary.bySource.slice(0, 6)"
            :key="item.source"
            class="space-y-2"
          >
            <div class="flex items-center justify-between text-sm">
              <span class="font-medium">{{ item.source }}</span>
              <span class="text-muted-foreground">{{ formatCompactNumber(item.count) }}</span>
            </div>
            <div class="h-2 rounded-full bg-muted">
              <div
                class="h-2 rounded-full bg-primary"
                :style="{
                  width: `${Math.max(
                    8,
                    (item.count / Math.max(...summary.bySource.map((entry) => entry.count), 1)) * 100
                  )}%`
                }"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Сигналы и алерты</CardTitle>
          <CardDescription>Последние события, на которые стоит обратить внимание.</CardDescription>
        </CardHeader>
        <CardContent>
          <EmptyState
            v-if="alerts.length === 0"
            title="Критичных сигналов нет"
            description="Последние запуски и отчёты выглядят стабильно."
          />
          <div v-else class="space-y-3">
            <div
              v-for="alert in alerts"
              :key="alert.title"
              class="rounded-xl border bg-muted/30 p-4"
            >
              <p class="text-sm font-medium">{{ alert.title }}</p>
              <p class="mt-1 text-sm text-muted-foreground">{{ alert.text }}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>

    <div class="grid gap-4 xl:grid-cols-[1.3fr_0.7fr]">
      <Card>
        <CardHeader>
          <CardTitle>Последние закупки</CardTitle>
          <CardDescription>Свежие записи, доступные для перехода в карточку.</CardDescription>
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

      <div class="grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Состояние источников</CardTitle>
            <CardDescription>Краткий health-блок по активным каналам.</CardDescription>
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

        <Card>
          <CardHeader>
            <CardTitle>Последние отчёты</CardTitle>
            <CardDescription>Статус недавних аналитических выгрузок.</CardDescription>
          </CardHeader>
          <CardContent class="space-y-3">
            <div
              v-for="report in recentReports"
              :key="report.id"
              class="rounded-xl border bg-muted/30 p-4"
            >
              <div class="flex items-center justify-between gap-2">
                <p class="text-sm font-medium">{{ report.name }}</p>
                <Badge :variant="badgeVariant(report.status)">{{ formatEnumLabel(report.status) }}</Badge>
              </div>
              <p class="mt-2 text-sm text-muted-foreground">
                {{ report.description || "Описание отчёта пока не задано." }}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  </template>
</template>
