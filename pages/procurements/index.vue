<script setup lang="ts">
import { getProcurementNppFocus, NPP_FOCUS_OPTIONS } from "~/utils/procurement-focus";

definePageMeta({
  title: "Закупки",
  description: "Реестр закупок с фильтрами, таблицей и пагинацией",
  roles: ["ANALYST", "ADMIN"]
});

useHead({
  title: "Закупки"
});

const procurements = useProcurementsData();
const allSourcesValue = "__ALL_SOURCES__";
const allNppFocusValue = "__ALL_NPP_FOCUS__";
const allStatusesValue = "__ALL_STATUSES__";

const selectedSource = computed({
  get: () => procurements.filters.source || allSourcesValue,
  set: (value: string) => {
    procurements.filters.source = value === allSourcesValue ? "" : value;
  }
});

const selectedStatus = computed({
  get: () => procurements.filters.status || allStatusesValue,
  set: (value: string) => {
    procurements.filters.status =
      value === allStatusesValue ? "" : (value as typeof procurements.filters.status);
  }
});

const selectedNppFocus = computed({
  get: () => procurements.filters.nppFocus || allNppFocusValue,
  set: (value: string) => {
    procurements.filters.nppFocus = value === allNppFocusValue ? "" : value;
  }
});

const statusOptions = [
  { label: "Все статусы", value: allStatusesValue },
  { label: "Черновик", value: "DRAFT" },
  { label: "Активна", value: "ACTIVE" },
  { label: "Завершена", value: "CLOSED" },
  { label: "В архиве", value: "ARCHIVED" }
];

const listGuide = [
  {
    title: "Фильтры задают срез",
    text: "Сначала определи источник и статус, а затем уже смотри таблицу. Так реестр читается намного быстрее."
  },
  {
    title: "Диаграммы выше таблицы показывают текущую выборку",
    text: "Они не заменяют реестр, а помогают быстро увидеть перекос по статусам и источникам до детального просмотра строк."
  },
  {
    title: "Таблица нужна для перехода в карточку",
    text: "Если в диаграммах видно необычный перекос, уже из таблицы можно открыть конкретную закупку и проверить её детали."
  },
  {
    title: "Фильтр Цель АЭС работает отдельно",
    text: "Он не подменяет юридического заказчика, а выделяет станцию назначения из самой закупки ЕИС."
  }
];

const currentPageStatusSegments = computed(() => {
  const counters = new Map<string, number>();

  for (const item of procurements.items.value) {
    counters.set(item.status, (counters.get(item.status) ?? 0) + 1);
  }

  return Array.from(counters.entries()).map(([status, count]) => ({
    label: formatEnumLabel(status),
    value: count,
    valueLabel: formatNumber(count),
    accent: statusAccent(status)
  }));
});

const currentPageSourceItems = computed(() => {
  const counters = new Map<string, number>();

  for (const item of procurements.items.value) {
    counters.set(item.source, (counters.get(item.source) ?? 0) + 1);
  }

  return Array.from(counters.entries())
    .sort((left, right) => right[1] - left[1])
    .slice(0, 6)
    .map(([source, count]) => ({
      label: source,
      value: count,
      valueLabel: formatNumber(count),
      note: "Закупок на текущей странице",
      accent: "primary" as const
    }));
});

const selectionCards = computed(() => {
  const items = procurements.items.value;
  const activeCount = items.filter((item) => item.status === "ACTIVE").length;
  const totalAmount = items.reduce((sum, item) => sum + (item.amount ?? 0), 0);
  const latestUpdatedAt = items
    .map((item) => item.updatedAt)
    .filter((value): value is string => Boolean(value))
    .sort((left, right) => new Date(right).getTime() - new Date(left).getTime())[0];

  return [
    {
      label: "Закупки в рабочем реестре",
      value: formatNumber(procurements.total.value),
      hint: `По текущим фильтрам найдено ${formatNumber(procurements.total.value)} записей, на этой странице показано ${formatNumber(items.length)}`
    },
    {
      label: "Активные закупки на странице",
      value: formatNumber(activeCount),
      hint: "Считается по строкам, которые сейчас открыты в реестре"
    },
    {
      label: "Источники в текущем срезе",
      value: formatNumber(new Set(items.map((item) => item.source)).size),
      hint: "Показывает, насколько реестр сейчас узкий или смешанный по источникам"
    },
    {
      label: "Последнее обновление данных",
      value: latestUpdatedAt ? formatDateTime(latestUpdatedAt) : "Нет данных",
      hint: `Совокупная сумма закупок на текущей странице: ${formatCurrency(totalAmount, "RUB")}`
    }
  ];
});

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

function procurementFocusLabel(rawPayload?: Record<string, unknown> | null) {
  return getProcurementNppFocus(rawPayload);
}

onMounted(async () => {
  await Promise.all([procurements.loadSources(), procurements.load()]);
});
</script>

<template>
  <PageHeader
    title="Закупки"
    description="Реестр теперь разделён на три слоя: контекст выборки, быстрые диаграммы и только потом детальная таблица."
  >
    <template #actions>
      <Button variant="secondary" :disabled="procurements.loading.value" @click="procurements.load()">
        {{ procurements.loading.value ? "Обновление..." : "Обновить" }}
      </Button>
    </template>
  </PageHeader>

  <Card class="overflow-hidden border-border/70 bg-gradient-to-br from-background via-background to-muted/20">
    <CardContent class="grid gap-6 p-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
      <div class="min-w-0 space-y-3">
        <p class="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">Навигация по реестру</p>
        <h2 class="text-2xl font-semibold tracking-tight">Сначала пойми выборку, потом открывай строки</h2>
        <p class="max-w-3xl text-sm leading-6 text-muted-foreground">
          Верхние блоки помогают быстро увидеть, что именно попало в реестр после фильтров:
          сколько активных закупок осталось, какие источники доминируют и насколько свежие данные лежат на странице.
        </p>
      </div>

      <div class="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
        <div
          v-for="item in listGuide"
          :key="item.title"
          class="min-w-0 rounded-3xl border border-border/70 bg-background/80 p-4"
        >
          <p class="text-sm font-semibold">{{ item.title }}</p>
          <p class="mt-2 text-sm leading-6 text-muted-foreground">{{ item.text }}</p>
        </div>
      </div>
    </CardContent>
  </Card>

  <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
    <StatCard
      v-for="card in selectionCards"
      :key="card.label"
      :label="card.label"
      :value="card.value"
      :hint="card.hint"
    />
  </div>

  <FilterToolbar>
    <template #meta>
      <Badge variant="secondary">Найдено: {{ formatNumber(procurements.total.value) }}</Badge>
    </template>

    <form class="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto]" @submit.prevent="procurements.submitFilters()">
      <div class="space-y-2">
        <Label for="procurement-search">Поиск</Label>
        <Input
          id="procurement-search"
          v-model="procurements.filters.search"
          placeholder="Название, заказчик или поставщик"
        />
      </div>

      <div class="space-y-2">
        <Label for="procurement-source">Источник</Label>
        <Select v-model="selectedSource">
          <SelectTrigger id="procurement-source">
            <SelectValue placeholder="Все источники" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem :value="allSourcesValue">Все источники</SelectItem>
            <SelectItem
              v-for="source in procurements.sources.value"
              :key="source.id"
              :value="source.code"
            >
              {{ source.name }}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div class="space-y-2">
        <Label for="procurement-status">Статус</Label>
        <Select v-model="selectedStatus">
          <SelectTrigger id="procurement-status">
            <SelectValue placeholder="Все статусы" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem
              v-for="status in statusOptions"
              :key="status.value || 'all'"
              :value="status.value"
            >
              {{ status.label }}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div class="space-y-2">
        <Label for="procurement-npp-focus">Цель АЭС</Label>
        <Select v-model="selectedNppFocus">
          <SelectTrigger id="procurement-npp-focus">
            <SelectValue placeholder="Все станции" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem :value="allNppFocusValue">Все станции</SelectItem>
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

      <div class="flex items-end gap-2">
        <Button type="submit" :disabled="procurements.loading.value">Применить</Button>
        <Button
          type="button"
          variant="ghost"
          :disabled="procurements.loading.value"
          @click="procurements.resetFilters()"
        >
          Сбросить
        </Button>
      </div>
    </form>
  </FilterToolbar>

  <Card v-if="procurements.loading.value">
    <CardContent class="space-y-3 pt-6">
      <Skeleton class="h-10 rounded-md" />
      <Skeleton class="h-10 rounded-md" />
      <Skeleton class="h-10 rounded-md" />
      <Skeleton class="h-10 rounded-md" />
    </CardContent>
  </Card>

  <ErrorState
    v-else-if="procurements.error.value"
    :description="procurements.error.value"
    action-label="Повторить"
    @action="procurements.load()"
  />

  <template v-else>
    <div class="grid gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
      <Card class="min-w-0 overflow-hidden">
        <CardHeader>
          <CardTitle>Статусы в текущей выборке</CardTitle>
          <CardDescription>
            Помогает понять, ты сейчас смотришь на живой активный поток или на архивный и закрытый срез.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MetricStackBar
            :segments="currentPageStatusSegments"
            empty-text="После загрузки данных здесь появится распределение по статусам."
          />
        </CardContent>
      </Card>

      <Card class="min-w-0 overflow-hidden">
        <CardHeader>
          <CardTitle>Источники на текущей странице</CardTitle>
          <CardDescription>
            Быстрый визуальный слой по тому, какие каналы формируют текущую страницу реестра после фильтрации.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MetricBarList
            :items="currentPageSourceItems"
            empty-text="После загрузки данных здесь появится распределение по источникам."
          />
        </CardContent>
      </Card>
    </div>

    <Card class="min-w-0 overflow-hidden">
      <CardHeader>
        <CardTitle>Список закупок</CardTitle>
        <CardDescription>
          Клик по строке открывает детальную карточку закупки. Для атомного контура рядом с заказчиком показывается станция назначения, если она выделена из данных.
        </CardDescription>
      </CardHeader>
      <CardContent v-if="procurements.items.value.length === 0">
        <EmptyState
          title="Ничего не найдено"
          description="Измените параметры поиска или сбросьте фильтры."
        />
      </CardContent>
      <template v-else>
        <CardContent class="px-0">
          <Table class="min-w-[880px]">
            <TableHeader>
              <TableRow>
                <TableHead>Закупка</TableHead>
                <TableHead>Источник</TableHead>
                <TableHead>Заказчик</TableHead>
                <TableHead>Сумма</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead>Обновлена</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow
                v-for="item in procurements.items.value"
                :key="item.id"
                class="cursor-pointer"
                @click="navigateTo(`/procurements/${item.id}`)"
              >
                <TableCell class="max-w-[28rem]">
                  <div class="min-w-0 space-y-1">
                    <p class="break-words font-medium">{{ item.title }}</p>
                    <p class="break-all text-sm text-muted-foreground">{{ item.externalId }}</p>
                    <p
                      v-if="procurementFocusLabel(item.rawPayload)"
                      class="break-words text-xs font-medium text-primary"
                    >
                      Цель АЭС: {{ procurementFocusLabel(item.rawPayload) }}
                    </p>
                  </div>
                </TableCell>
                <TableCell class="max-w-[12rem] break-words">{{ item.source }}</TableCell>
                <TableCell class="max-w-[22rem]">
                  <div class="min-w-0 space-y-1">
                    <p class="break-words">{{ item.customer || "Не указан" }}</p>
                    <p
                      v-if="procurementFocusLabel(item.rawPayload) && item.customer"
                      class="break-words text-xs text-muted-foreground"
                    >
                      Юр. заказчик, цель закупки вынесена отдельно
                    </p>
                  </div>
                </TableCell>
                <TableCell>{{ formatCurrency(item.amount, item.currency) }}</TableCell>
                <TableCell>
                  <Badge :variant="badgeVariant(item.status)">{{ formatEnumLabel(item.status) }}</Badge>
                </TableCell>
                <TableCell>
                  <div class="space-y-1">
                    <p>{{ formatDateTime(item.updatedAt) }}</p>
                    <p class="text-xs text-muted-foreground">Публикация: {{ formatDate(item.publishedAt) }}</p>
                  </div>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
        <Pagination
          :page="procurements.page.value"
          :page-size="procurements.pageSize"
          :total="procurements.total.value"
          @update:page="procurements.setPage"
        />
      </template>
    </Card>
  </template>
</template>
