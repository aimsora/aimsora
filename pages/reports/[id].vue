<script setup lang="ts">
definePageMeta({
  title: "Карточка отчёта",
  description: "Детальная аналитика по выбранному отчёту",
  roles: ["ANALYST", "DEVELOPER", "ADMIN"]
});

const route = useRoute();
const detail = useReportDetail();

const reportTypeLabels: Record<string, string> = {
  "daily-overview": "Ежедневный обзор",
  "supplier-risk": "Риски поставщиков",
  "pipeline-incident": "Инциденты пайплайна"
};

const reportTypeDescriptions: Record<string, string> = {
  "daily-overview": "Сводка по закупкам, объёму данных, дедлайнам и активности источников.",
  "supplier-risk": "Отчёт про концентрацию, риск-сигналы и закупки, требующие внимания.",
  "pipeline-incident": "Срез по качеству запусков, публикации и сбоям в сборе."
};

const title = computed(() => detail.item.value?.name || "Карточка отчёта");
const description = computed(() => {
  if (detail.item.value?.description) {
    return detail.item.value.description;
  }

  return reportTypeDescriptions[detail.item.value?.reportType ?? ""] || "Детальный аналитический отчёт.";
});

const metricCards = computed(() => detail.item.value?.metrics ?? []);
const scoreCards = computed(() => detail.item.value?.scores ?? []);
const deadlineMax = computed(() =>
  Math.max(...(detail.item.value?.deadlinePressure.map((item) => item.count) ?? [1]), 1)
);
const statusMixMax = computed(() =>
  Math.max(...(detail.item.value?.statusMix.map((item) => item.count) ?? [1]), 1)
);

function reportTypeLabel(reportType?: string | null) {
  return reportTypeLabels[reportType ?? ""] ?? "Оперативный отчёт";
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
  <PageHeader :title="title" :description="description">
    <template #actions>
      <Badge v-if="detail.item.value" variant="secondary">
        {{ reportTypeLabel(detail.item.value.reportType) }}
      </Badge>
      <Badge v-if="detail.item.value" :variant="badgeVariant(detail.item.value.status)">
        {{ formatEnumLabel(detail.item.value.status) }}
      </Badge>
      <Button as-child variant="secondary">
        <NuxtLink to="/reports">К списку</NuxtLink>
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
    </div>

    <div class="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
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
            <div class="flex items-center justify-between gap-3">
              <div class="min-w-0">
                <p class="truncate text-sm font-medium">{{ item.label }}</p>
                <p class="text-sm text-muted-foreground">
                  {{ formatNumber(item.procurementCount) }} закупок · {{ formatCurrency(item.totalAmount, "RUB") }}
                </p>
              </div>
              <Badge variant="secondary">{{ formatPercent(item.sharePercent) }}</Badge>
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
    </div>

    <div class="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
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
              <div class="flex items-center justify-between gap-3">
                <div class="min-w-0">
                  <p class="truncate text-sm font-medium">{{ item.supplier }}</p>
                  <p class="text-sm text-muted-foreground">
                    {{ formatNumber(item.procurementCount) }} закупок · {{ formatCurrency(item.totalAmount, "RUB") }}
                  </p>
                </div>
                <Badge variant="secondary">{{ formatPercent(item.sharePercent) }}</Badge>
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
              <div class="flex items-center justify-between gap-3">
                <div class="min-w-0">
                  <p class="truncate text-sm font-medium">{{ item.customer }}</p>
                  <p class="text-sm text-muted-foreground">
                    {{ formatNumber(item.procurementCount) }} закупок · {{ formatCurrency(item.totalAmount, "RUB") }}
                  </p>
                </div>
                <Badge variant="secondary">{{ formatPercent(item.sharePercent) }}</Badge>
              </div>
              <div class="h-2 rounded-full bg-muted">
                <div class="h-2 rounded-full bg-primary" :style="{ width: `${Math.max(8, item.sharePercent)}%` }" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>

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
  </template>

  <EmptyState
    v-else
    title="Отчёт не найден"
    description="Возможно, он был удалён или идентификатор больше не актуален."
  />
</template>
