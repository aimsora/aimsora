<script setup lang="ts">
definePageMeta({
  title: "Отчёты парсеров",
  description: "Журнал запусков, ошибок и инцидентов по сборщикам",
  roles: ["DEVELOPER", "ADMIN"]
});

useHead({
  title: "Отчёты парсеров"
});

const jobs = useJobsData();
const allSourcesValue = "__ALL_SOURCES__";

const selectedSource = computed({
  get: () => jobs.sourceFilter.value || allSourcesValue,
  set: (value: string) => {
    jobs.sourceFilter.value = value === allSourcesValue ? "" : value;
  }
});

const summaryCards = computed(() => [
  {
    label: "Всего запусков",
    value: formatNumber(jobs.runs.value.length),
    hint: "Количество запусков в текущей выборке"
  },
  {
    label: "Успешные",
    value: formatNumber(jobs.runs.value.filter((item) => item.status === "SUCCESS").length),
    hint: "Завершились без ошибок"
  },
  {
    label: "С ошибками",
    value: formatNumber(
      jobs.runs.value.filter((item) => item.status === "FAILED" || item.status === "PARTIAL").length
    ),
    hint: "Требуют внимания команды"
  }
]);

onMounted(async () => {
  await Promise.all([jobs.loadSources(), jobs.load()]);
});
</script>

<template>
  <PageHeader
    title="Отчёты парсеров"
    description="Инженерный журнал запусков по сбору и публикации данных с деталями ошибок."
  >
    <template #actions>
      <div class="flex items-end gap-2">
        <div class="w-56 space-y-2">
          <Label for="jobs-source">Источник</Label>
          <Select v-model="selectedSource">
            <SelectTrigger id="jobs-source">
              <SelectValue placeholder="Все источники" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem :value="allSourcesValue">Все источники</SelectItem>
              <SelectItem v-for="source in jobs.sources.value" :key="source.id" :value="source.code">
                {{ source.name }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button variant="secondary" :disabled="jobs.loading.value" @click="jobs.load()">
          {{ jobs.loading.value ? "Загрузка..." : "Показать" }}
        </Button>
      </div>
    </template>
  </PageHeader>

  <div v-if="jobs.loading.value" class="grid gap-4 md:grid-cols-3">
    <Skeleton v-for="item in 3" :key="item" class="h-32 rounded-xl" />
  </div>

  <ErrorState
    v-else-if="jobs.error.value"
    :description="jobs.error.value"
    action-label="Повторить"
    @action="jobs.load()"
  />

  <template v-else>
    <div class="grid gap-4 md:grid-cols-3">
      <StatCard
        v-for="card in summaryCards"
        :key="card.label"
        :label="card.label"
        :value="card.value"
        :hint="card.hint"
      />
    </div>

    <Card>
      <CardHeader>
        <CardTitle>Журнал запусков</CardTitle>
        <CardDescription>По каждому запуску видны источник, статус, длительность и технические детали инцидентов.</CardDescription>
      </CardHeader>
      <CardContent v-if="jobs.runs.value.length === 0">
        <EmptyState
          title="Запуски не найдены"
          description="Измените фильтр по источнику или дождитесь новых запусков."
        />
      </CardContent>
      <CardContent v-else class="px-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ключ запуска</TableHead>
              <TableHead>Источник</TableHead>
              <TableHead>Статус</TableHead>
              <TableHead>Старт</TableHead>
              <TableHead>Длительность</TableHead>
              <TableHead>Найдено</TableHead>
              <TableHead>Опубликовано</TableHead>
              <TableHead>Ошибок</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-for="run in jobs.runs.value" :key="run.id">
              <TableCell>
                <div class="space-y-1">
                  <p class="font-medium">{{ run.runKey }}</p>
                  <p class="text-sm text-muted-foreground">{{ run.errorMessage || "Без ошибок" }}</p>
                </div>
              </TableCell>
              <TableCell>{{ run.sourceCode }}</TableCell>
              <TableCell>
                <Badge :variant="badgeVariant(run.status)">{{ formatEnumLabel(run.status) }}</Badge>
              </TableCell>
              <TableCell>{{ formatDateTime(run.startedAt) }}</TableCell>
              <TableCell>{{ formatDuration(run.startedAt, run.finishedAt) }}</TableCell>
              <TableCell>{{ formatNumber(run.itemsDiscovered) }}</TableCell>
              <TableCell>{{ formatNumber(run.itemsPublished) }}</TableCell>
              <TableCell>{{ formatNumber(run.itemsFailed) }}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  </template>
</template>
