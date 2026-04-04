<script setup lang="ts">
definePageMeta({
  title: "Источники",
  description: "Подключённые источники и состояние их последних запусков",
  roles: ["ANALYST", "DEVELOPER", "ADMIN"]
});

useHead({
  title: "Источники"
});

const sourcesData = useSourcesData();

const sourceRows = computed(() => sourcesData.sources.value);

const summaryCards = computed(() => {
  const activeCount = sourcesData.sources.value.filter((item) => item.isActive).length;
  const withFailures = sourceRows.value.filter((item) =>
    ["FAILED", "PARTIAL"].includes(item.lastRun?.status ?? "")
  ).length;

  return [
    {
      label: "Всего источников",
      value: formatNumber(sourceRows.value.length),
      hint: "Подключённые каналы мониторинга"
    },
    {
      label: "Активные",
      value: formatNumber(activeCount),
      hint: "Источники в регулярном контуре сбора"
    },
    {
      label: "С ошибками",
      value: formatNumber(withFailures),
      hint: "Последний запуск завершился ошибкой"
    }
  ];
});

onMounted(() => {
  void sourcesData.load();
});
</script>

<template>
  <PageHeader
    title="Источники"
    description="Сводка по источникам, последним запускам и стабильности каналов."
  >
    <template #actions>
      <Button variant="secondary" :disabled="sourcesData.loading.value" @click="sourcesData.load()">
        {{ sourcesData.loading.value ? "Обновление..." : "Обновить" }}
      </Button>
    </template>
  </PageHeader>

  <div v-if="sourcesData.loading.value" class="grid gap-4 md:grid-cols-3">
    <Skeleton v-for="item in 3" :key="item" class="h-32 rounded-xl" />
  </div>

  <ErrorState
    v-else-if="sourcesData.error.value"
    :description="sourcesData.error.value"
    action-label="Повторить"
    @action="sourcesData.load()"
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

    <div class="grid gap-4 xl:grid-cols-3">
      <Card v-for="item in sourceRows" :key="item.id">
        <CardHeader class="space-y-4">
          <div class="flex items-start justify-between gap-3">
            <div class="space-y-1">
              <Badge variant="secondary" class="w-fit">{{ formatEnumLabel(item.kind) }}</Badge>
              <CardTitle class="text-lg">{{ item.name }}</CardTitle>
              <CardDescription>
                {{ item.description || "Описание для источника пока не заполнено." }}
              </CardDescription>
            </div>
            <Badge :variant="item.isActive ? 'success' : 'destructive'">
              {{ item.isActive ? "Активен" : "Неактивен" }}
            </Badge>
          </div>
        </CardHeader>
        <CardContent class="space-y-4">
          <div class="grid gap-2 text-sm text-muted-foreground">
            <div class="flex items-center justify-between">
              <span>Код</span>
              <span class="font-medium text-foreground">{{ item.code }}</span>
            </div>
            <div class="flex items-center justify-between">
              <span>Последний запуск</span>
              <span class="font-medium text-foreground">
                {{ item.lastRun ? formatDateTime(item.lastRun.startedAt) : "Нет данных" }}
              </span>
            </div>
            <div class="flex items-center justify-between">
              <span>Опубликовано</span>
              <span class="font-medium text-foreground">{{ formatNumber(item.lastRun?.itemsPublished) }}</span>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <Badge v-if="item.lastRun" :variant="badgeVariant(item.lastRun.status)">
              {{ formatEnumLabel(item.lastRun.status) }}
            </Badge>
            <span v-else class="text-sm text-muted-foreground">Запусков пока не было</span>
          </div>

          <a
            v-if="item.baseUrl"
            :href="item.baseUrl"
            target="_blank"
            rel="noreferrer"
            class="inline-flex text-sm font-medium text-primary hover:underline"
          >
            Открыть адрес источника
          </a>
        </CardContent>
      </Card>
    </div>

    <Card>
      <CardHeader>
        <CardTitle>Последние запуски по источникам</CardTitle>
        <CardDescription>Оперативный срез по публикациям, ошибкам и времени старта.</CardDescription>
      </CardHeader>
      <CardContent v-if="sourceRows.length === 0">
        <EmptyState
          title="Источники не найдены"
          description="После подключения источников здесь появится таблица со статусами."
        />
      </CardContent>
      <CardContent v-else class="px-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Источник</TableHead>
              <TableHead>Последний запуск</TableHead>
              <TableHead>Опубликовано</TableHead>
              <TableHead>Ошибки</TableHead>
              <TableHead>Время</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-for="item in sourceRows" :key="item.id">
              <TableCell>
                <div class="space-y-1">
                  <p class="font-medium">{{ item.name }}</p>
                  <p class="text-sm text-muted-foreground">{{ item.code }}</p>
                </div>
              </TableCell>
              <TableCell>
                <Badge v-if="item.lastRun" :variant="badgeVariant(item.lastRun.status)">
                  {{ formatEnumLabel(item.lastRun.status) }}
                </Badge>
                <span v-else class="text-sm text-muted-foreground">Запусков пока не было</span>
              </TableCell>
              <TableCell>{{ formatNumber(item.lastRun?.itemsPublished) }}</TableCell>
              <TableCell>{{ formatNumber(item.lastRun?.itemsFailed) }}</TableCell>
              <TableCell>{{ item.lastRun ? formatDateTime(item.lastRun.startedAt) : "Нет данных" }}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  </template>
</template>
