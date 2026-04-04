<script setup lang="ts">
definePageMeta({
  title: "Аналитика",
  description: "Сигналы по срокам, источникам и структуре потока",
  roles: ["ANALYST", "ADMIN"]
});

useHead({
  title: "Аналитика"
});

const analytics = useAnalyticsData();
const summary = computed(() => analytics.summary.value);

const summaryCards = computed(() => {
  if (!summary.value) {
    return [];
  }

  return [
    {
      label: "Срочные закупки",
      value: formatNumber(summary.value.closingSoonCount),
      hint: "Активные закупки с дедлайном в ближайшие 7 дней"
    },
    {
      label: "Просроченные",
      value: formatNumber(summary.value.overdueCount),
      hint: "Активные закупки, у которых срок уже прошёл"
    },
    {
      label: "Высокий чек",
      value: formatNumber(summary.value.highValueCount),
      hint: "Записи с суммой от 1 000 000"
    },
    {
      label: "Средняя сумма",
      value: formatCurrency(summary.value.averageProcurementValue, "RUB"),
      hint: "Средний чек по закупкам с заполненной суммой"
    },
    {
      label: "Источники под риском",
      value: formatNumber(summary.value.atRiskSources),
      hint: "Источники с просадкой по качеству или свежести"
    },
    {
      label: "Успешность запусков",
      value: formatPercent(summary.value.runSuccessRate),
      hint: `Эффективность публикации: ${formatPercent(summary.value.publicationEfficiency)}`
    }
  ];
});

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

async function reload() {
  await analytics.load();
}

onMounted(() => {
  void reload();
});
</script>

<template>
  <PageHeader
    title="Аналитика"
    description="Отдельный слой аналитики по срокам, источникам и структуре данных."
  >
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
    <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <StatCard
        v-for="card in summaryCards"
        :key="card.label"
        :label="card.label"
        :value="card.value"
        :hint="card.hint"
      />
    </div>

    <div class="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
      <Card>
        <CardHeader>
          <CardTitle>Давление по дедлайнам</CardTitle>
          <CardDescription>Какой объём активных закупок уже просрочен или скоро закроется.</CardDescription>
        </CardHeader>
        <CardContent class="space-y-4">
          <div
            v-for="bucket in summary.deadlinePressure"
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
                :style="{
                  width: `${Math.max(
                    8,
                    (bucket.count /
                      Math.max(...summary.deadlinePressure.map((item) => item.count), 1)) *
                      100
                  )}%`
                }"
              />
            </div>
          </div>

          <div class="rounded-xl border bg-muted/20 p-4 text-sm text-muted-foreground">
            За последние 30 дней риск-сигналов по поставщикам: {{ formatNumber(summary.riskSignalsLast30d) }}.
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Концентрация по поставщикам</CardTitle>
          <CardDescription>Топ поставщиков по доле закупочного потока за последние 90 дней.</CardDescription>
        </CardHeader>
        <CardContent>
          <EmptyState
            v-if="summary.supplierExposure.length === 0"
            title="Недостаточно данных"
            description="После появления связок с поставщиками здесь появится аналитика концентрации."
          />
          <div v-else class="space-y-4">
            <div
              v-for="item in summary.supplierExposure"
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
                <div
                  class="h-2 rounded-full bg-primary"
                  :style="{ width: `${Math.max(8, item.sharePercent)}%` }"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>

    <Card>
      <CardHeader>
        <CardTitle>Здоровье источников</CardTitle>
        <CardDescription>Уровень риска, успех запусков и эффективность публикации по каждому источнику.</CardDescription>
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
            <TableRow v-for="item in summary.sourceHealth" :key="item.source">
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
              <TableCell>
                <div class="space-y-1">
                  <p>{{ formatDateTime(item.lastRunAt) }}</p>
                  <p class="text-sm text-muted-foreground">
                    {{
                      item.hoursSinceLastRun === null || item.hoursSinceLastRun === undefined
                        ? "Запусков не было"
                        : `${formatNumber(item.hoursSinceLastRun)} ч назад`
                    }}
                  </p>
                </div>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle>Закупки под вниманием</CardTitle>
        <CardDescription>Список активных закупок, у которых дедлайн уже наступил или наступит скоро.</CardDescription>
      </CardHeader>
      <CardContent v-if="summary.attentionProcurements.length === 0">
        <EmptyState
          title="Срочных закупок нет"
          description="На текущий момент среди активных закупок нет критичных сроков."
        />
      </CardContent>
      <CardContent v-else class="px-0">
        <Table>
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
              <TableCell>
                <NuxtLink :to="`/procurements/${item.id}`" class="font-medium text-primary hover:underline">
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
</template>
