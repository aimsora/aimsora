<script setup lang="ts">
import { getProcurementNppFocus } from "~/utils/procurement-focus";

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
const nppPeriodLabel = computed(() =>
  summary.value
    ? new Date(summary.value.nppPeriodStart).toLocaleDateString("ru-RU", {
        day: "2-digit",
        month: "long",
        year: "numeric"
      })
    : ""
);

const nppSummaryCards = computed(() => {
  if (!summary.value) {
    return [];
  }

  return [
    {
      label: "Атомные закупки",
      value: formatNumber(summary.value.nppProcurementCount),
      hint: `Контур АЭС с ${nppPeriodLabel.value}`
    },
    {
      label: "Контракты 44/223-ФЗ",
      value: formatNumber(summary.value.nppContractCount),
      hint: "Отдельный слой исполненных и действующих договоров"
    },
    {
      label: "Станции в контуре",
      value: formatNumber(summary.value.nppStationsCovered),
      hint: "Сколько разных АЭС уже покрыто собранными данными"
    },
    {
      label: "Сумма по контуру",
      value: formatCurrency(summary.value.nppTotalAmount, "RUB"),
      hint: "Сумма по атомным закупкам и договорам с заполненной ценой"
    }
  ];
});

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

const nppGuide = computed(() => [
  {
    title: "Период фиксирован",
    text: `Все атомные диаграммы на этой странице считаются от ${nppPeriodLabel.value || "01.01.2025"}, чтобы динамика не прыгала вместе с текущим окном.`
  },
  {
    title: "Сначала смотри покрытие",
    text: "Блоки по станциям и источникам показывают, где у нас уже есть плотные данные, а где контур ещё нужно расширять."
  },
  {
    title: "Потом переходи к карточкам",
    text: "Список свежих закупок внизу помогает быстро проверить, что в атомный слой попали именно рабочие закупки, а не шум."
  }
]);

const analyticsGuide = computed(() => [
  {
    title: "Сначала оцени сроки",
    text: "Первый блок показывает, растёт ли давление по дедлайнам и есть ли уже просроченные закупки."
  },
  {
    title: "Потом смотри на источники",
    text: "Риск по источникам нужен, чтобы понять: проблема в самих закупках или в качестве входящего потока."
  },
  {
    title: "И только после этого переходи к поставщикам",
    text: "Концентрация по поставщикам помогает увидеть зависимость от отдельных игроков и перекосы в объёмах."
  }
]);

const deadlinePressureItems = computed(() =>
  (summary.value?.deadlinePressure ?? []).map((bucket) => ({
    label: bucket.label,
    shortLabel: bucket.label,
    value: bucket.count,
    valueLabel: formatNumber(bucket.count),
    accent: bucket.label.toLowerCase().includes("проср")
      ? ("danger" as const)
      : bucket.label.toLowerCase().includes("7")
        ? ("warning" as const)
        : ("primary" as const)
  }))
);

const riskSourceItems = computed(() =>
  [...(summary.value?.sourceHealth ?? [])]
    .sort((left, right) => {
      const leftWeight = sourceRiskWeight(left.riskLevel);
      const rightWeight = sourceRiskWeight(right.riskLevel);
      return rightWeight - leftWeight || left.successRate - right.successRate;
    })
    .slice(0, 6)
    .map((item) => ({
      label: item.name,
      value: Math.max(100 - item.successRate, 1),
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
    accent: "primary" as const
  }))
);

const nppTimelineItems = computed(() =>
  (summary.value?.nppMonthlyDynamics ?? []).map((item) => ({
    label: item.label,
    shortLabel: compactMonthLabel(item.label),
    value: item.procurementCount,
    valueLabel: `${formatNumber(item.procurementCount)} карточек`,
    note: `Сумма за месяц: ${formatCurrency(item.totalAmount, "RUB")}`
  }))
);

const nppStationItems = computed(() =>
  (summary.value?.nppStationCoverage ?? []).map((item) => ({
    label: item.station,
    value: item.procurementCount,
    valueLabel: formatNumber(item.procurementCount),
    note: formatCurrency(item.totalAmount, "RUB"),
    accent: "primary" as const
  }))
);

const nppSourceItems = computed(() =>
  (summary.value?.nppSourceCoverage ?? []).map((item) => ({
    label: item.name,
    value: item.procurementCount,
    valueLabel: formatNumber(item.procurementCount),
    note: `${item.source} · ${formatCurrency(item.totalAmount, "RUB")}`,
    accent: item.source.includes("contracts") ? ("warning" as const) : ("success" as const)
  }))
);

const nppCustomerItems = computed(() =>
  (summary.value?.nppCustomerCoverage ?? []).map((item) => ({
    label: item.customer,
    value: item.procurementCount,
    valueLabel: formatNumber(item.procurementCount),
    note: formatCurrency(item.totalAmount, "RUB"),
    accent: item.customer.includes("РОСАТОМ") ? ("success" as const) : ("primary" as const)
  }))
);

const statusSegments = computed(() => [
  {
    label: "Срочные",
    value: summary.value?.closingSoonCount ?? 0,
    valueLabel: formatNumber(summary.value?.closingSoonCount ?? 0),
    accent: "warning" as const
  },
  {
    label: "Просроченные",
    value: summary.value?.overdueCount ?? 0,
    valueLabel: formatNumber(summary.value?.overdueCount ?? 0),
    accent: "danger" as const
  },
  {
    label: "Высокий чек",
    value: summary.value?.highValueCount ?? 0,
    valueLabel: formatNumber(summary.value?.highValueCount ?? 0),
    accent: "success" as const
  }
]);

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
    description="Страница разложена по понятным вопросам: сроки, риск по источникам, концентрация по поставщикам и закупки под вниманием."
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
    <Card class="overflow-hidden border-border/70 bg-gradient-to-br from-background via-background to-muted/25">
      <CardContent class="grid gap-6 p-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div class="space-y-4">
          <p class="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">Атомный контур</p>
          <div class="space-y-2">
            <h2 class="text-2xl font-semibold tracking-tight">Здесь видно не только “сколько”, но и “где у нас реально собран контур АЭС”</h2>
            <p class="max-w-3xl text-sm leading-6 text-muted-foreground">
              Верхний блок теперь работает как отдельная аналитика по закупкам и договорам АЭС России с фиксированным периодом с
              {{ nppPeriodLabel }}. Ниже остаётся общий операционный слой по срокам, рискам и здоровью источников.
            </p>
          </div>
        </div>

        <div class="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
          <div
            v-for="item in nppGuide"
            :key="item.title"
            class="rounded-3xl border border-border/70 bg-background/80 p-4"
          >
            <p class="text-sm font-semibold">{{ item.title }}</p>
            <p class="mt-2 text-sm leading-6 text-muted-foreground">{{ item.text }}</p>
          </div>
        </div>
      </CardContent>
    </Card>

    <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <StatCard
        v-for="card in nppSummaryCards"
        :key="card.label"
        :label="card.label"
        :value="card.value"
        :hint="card.hint"
      />
    </div>

    <div class="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
      <Card>
        <CardHeader>
          <CardTitle>Динамика по месяцам с января 2025</CardTitle>
          <CardDescription>
            Интерактивный график показывает, как атомный контур заполняется по месяцам: количество карточек видно сразу, а сумма раскрывается по выбранной точке.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MetricLineChartInteractive
            :items="nppTimelineItems"
            empty-text="После следующего цикла сбора здесь появится помесячная динамика по атомному контуру."
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Покрытие по станциям</CardTitle>
          <CardDescription>
            Блок нужен для быстрой проверки, что данные распределяются не только по Росатому в целом, но и по конкретным АЭС.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MetricBarList
            :items="nppStationItems"
            empty-text="Пока ни одна карточка не привязана к конкретной станции."
          />
        </CardContent>
      </Card>
    </div>

    <div class="grid gap-4 xl:grid-cols-[1fr_1fr]">
      <Card>
        <CardHeader>
          <CardTitle>Вклад источников в атомный поток</CardTitle>
          <CardDescription>
            Сравнение помогает понять, какой парсер сейчас реально даёт объём: notices, 44-ФЗ контракты или 223-ФЗ договоры.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MetricBarList
            :items="nppSourceItems"
            empty-text="После первого успешного прогона новые атомные источники появятся здесь."
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Ключевые заказчики атомного контура</CardTitle>
          <CardDescription>
            Этот блок показывает, кто формирует основной объём атомных закупок и где уже появились прямые заказчики уровня АЭС и сервисных обществ.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MetricBarList
            :items="nppCustomerItems"
            empty-text="После накопления карточек с заказчиками здесь появится раскладка по атомному контуру."
          />
        </CardContent>
      </Card>
    </div>

    <Card>
      <CardHeader>
        <CardTitle>Свежие закупки и договоры АЭС</CardTitle>
        <CardDescription>
          Последние атомные карточки показываются отдельно, чтобы можно было быстро проверить качество отбора и увидеть целевую станцию.
        </CardDescription>
      </CardHeader>
      <CardContent v-if="summary.nppRecentProcurements.length === 0">
        <EmptyState
          title="Атомный контур ещё пуст"
          description="После прогона новых источников здесь появятся свежие закупки и договоры по АЭС."
        />
      </CardContent>
      <CardContent v-else class="px-0">
        <Table>
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
              <TableCell>
                <NuxtLink :to="`/procurements/${item.id}`" class="font-medium text-primary hover:underline">
                  {{ item.title }}
                </NuxtLink>
              </TableCell>
              <TableCell>{{ item.source }}</TableCell>
              <TableCell>
                <div class="space-y-1">
                  <p>{{ item.customer || "Заказчик не указан" }}</p>
                  <p class="text-sm text-muted-foreground">
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

    <Card class="overflow-hidden border-border/70 bg-gradient-to-br from-background via-background to-muted/25">
      <CardContent class="grid gap-6 p-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div class="space-y-4">
          <p class="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">Общий поток</p>
          <div class="space-y-2">
            <h2 class="text-2xl font-semibold tracking-tight">Операционный слой остаётся отдельным</h2>
            <p class="max-w-3xl text-sm leading-6 text-muted-foreground">
              Ниже идёт уже общий контур по всем источникам: сроки, здоровье pipeline и концентрация по поставщикам. Так атомная аналитика не смешивается
              с ежедневным мониторингом рисков.
            </p>
          </div>
        </div>

        <div class="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
          <div
            v-for="item in analyticsGuide"
            :key="item.title"
            class="rounded-3xl border border-border/70 bg-background/80 p-4"
          >
            <p class="text-sm font-semibold">{{ item.title }}</p>
            <p class="mt-2 text-sm leading-6 text-muted-foreground">{{ item.text }}</p>
          </div>
        </div>
      </CardContent>
    </Card>

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
          <CardDescription>
            Диаграмма сразу показывает, где накапливаются активные закупки: в безопасной зоне, в зоне наблюдения или уже после дедлайна.
          </CardDescription>
        </CardHeader>
        <CardContent class="space-y-5">
          <MetricColumnChart :items="deadlinePressureItems" />

          <div class="rounded-3xl border bg-muted/15 p-4">
            <div class="flex items-center justify-between gap-3">
              <p class="text-sm font-medium">Краткий сигнал</p>
              <Badge variant="secondary">{{ formatNumber(summary.riskSignalsLast30d) }} риск-сигналов</Badge>
            </div>
            <p class="mt-2 text-sm leading-6 text-muted-foreground">
              За последние 30 дней в риск-контуре зафиксировано {{ formatNumber(summary.riskSignalsLast30d) }}
              сигналов по поставщикам. Этот показатель помогает сопоставлять дедлайны с общим уровнем напряжения в потоке.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Карта приоритетов</CardTitle>
          <CardDescription>
            Слева — укрупнённое распределение проблемных зон, справа — список источников, которые проседают сильнее остальных.
          </CardDescription>
        </CardHeader>
        <CardContent class="space-y-6">
          <MetricStackBar :segments="statusSegments" />
          <MetricBarList :items="riskSourceItems" />
        </CardContent>
      </Card>
    </div>

    <div class="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
      <Card>
        <CardHeader>
          <CardTitle>Концентрация по поставщикам</CardTitle>
          <CardDescription>
            Вынесена в отдельный блок, чтобы можно было быстро увидеть зависимость потока от конкретных поставщиков.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MetricBarList
            :items="supplierExposureItems"
            empty-text="После появления связок с поставщиками здесь появится аналитика концентрации."
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Здоровье источников</CardTitle>
          <CardDescription>
            Таблица оставлена для детального чтения, но теперь идёт после визуального блока и работает как расшифровка.
          </CardDescription>
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
    </div>

    <Card>
      <CardHeader>
        <CardTitle>Закупки под вниманием</CardTitle>
        <CardDescription>
          Операционный список вынесен в конец страницы: после того как понятна общая картина, можно переходить к конкретным карточкам.
        </CardDescription>
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
