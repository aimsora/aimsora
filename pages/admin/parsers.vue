<script setup lang="ts">
definePageMeta({
  title: "Парсеры",
  description: "Администрирование расписания и здоровья парсеров",
  roles: ["DEVELOPER", "ADMIN"]
});

useHead({
  title: "Администрирование парсеров"
});

const auth = useAuthSession();
const scraperAdmin = useScraperAdmin();
const schedule = ref("*/20 * * * *");
const autoRunEnabled = ref(true);
const canManageScrapers = computed(() => auth.can("scraper-admin.manage"));

const schedulePresets = [
  { label: "Каждые 5 минут", value: "*/5 * * * *" },
  { label: "Каждые 10 минут", value: "*/10 * * * *" },
  { label: "Каждые 20 минут", value: "*/20 * * * *" },
  { label: "Каждые 30 минут", value: "*/30 * * * *" },
  { label: "Каждый час", value: "0 * * * *" }
] as const;

const overview = computed(() => scraperAdmin.overview.value);
const sourceRows = computed(() =>
  [...(overview.value?.sources ?? [])].sort((left, right) => {
    if (left.attentionRequired !== right.attentionRequired) {
      return left.attentionRequired ? -1 : 1;
    }

    if (left.isRunning !== right.isRunning) {
      return left.isRunning ? -1 : 1;
    }

    return left.sourceCode.localeCompare(right.sourceCode);
  })
);

const summaryCards = computed(() => {
  const sources = overview.value?.sources ?? [];
  const runtime = overview.value?.runtime;

  return [
    {
      label: "Автозапуск",
      value: runtime?.autoRunEnabled ? "Включён" : "Отключён",
      hint: `Текущее расписание: ${runtime?.schedule ?? "нет данных"}`
    },
    {
      label: "Проблемные источники",
      value: formatNumber(sources.filter((item) => item.attentionRequired).length),
      hint: "Источники, требующие внимания администратора"
    },
    {
      label: "Сейчас выполняются",
      value: formatNumber(sources.filter((item) => item.isRunning).length),
      hint: "Запущены прямо сейчас"
    },
    {
      label: "Контур управления",
      value: runtime?.reachable ? "Доступен" : "Недоступен",
      hint: runtime?.reachable ? "scraper-service отвечает на control API" : runtime?.message || "Нет связи"
    }
  ];
});

watch(
  () => overview.value?.config,
  (config) => {
    if (!config) {
      return;
    }

    schedule.value = config.schedule;
    autoRunEnabled.value = config.autoRunEnabled;
  },
  { immediate: true }
);

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

function runtimeBadgeVariant() {
  return overview.value?.runtime.reachable ? ("success" as const) : ("destructive" as const);
}

async function saveConfig() {
  await scraperAdmin.save({
    schedule: schedule.value.trim(),
    autoRunEnabled: autoRunEnabled.value
  });
}

onMounted(() => {
  void scraperAdmin.load();
});
</script>

<template>
  <PageHeader
    title="Парсеры"
    description="Административный экран для управления расписанием, автозапуском и здоровьем парсеров."
  >
    <template #actions>
      <Button variant="secondary" :disabled="scraperAdmin.loading.value" @click="scraperAdmin.load()">
        {{ scraperAdmin.loading.value ? "Обновление..." : "Обновить" }}
      </Button>
    </template>
  </PageHeader>

  <div v-if="scraperAdmin.loading.value" class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
    <Skeleton v-for="item in 4" :key="item" class="h-32 rounded-xl" />
  </div>

  <ErrorState
    v-else-if="scraperAdmin.error.value"
    :description="scraperAdmin.error.value"
    action-label="Повторить"
    @action="scraperAdmin.load()"
  />

  <template v-else-if="overview">
    <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <StatCard
        v-for="card in summaryCards"
        :key="card.label"
        :label="card.label"
        :value="card.value"
        :hint="card.hint"
      />
    </div>

    <div class="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
      <Card>
        <CardHeader>
          <CardTitle>Расписание автозапуска</CardTitle>
          <CardDescription>
            {{
              canManageScrapers
                ? "Изменения применяются сразу в scraper-service и сохраняются для следующего рестарта."
                : "Разработчик видит текущее расписание и runtime-состояние, но не меняет конфигурацию."
            }}
          </CardDescription>
        </CardHeader>
        <CardContent class="space-y-5">
          <div
            v-if="!canManageScrapers"
            class="rounded-xl border bg-muted/20 p-4 text-sm text-muted-foreground"
          >
            Управление расписанием и автозапуском доступно только администратору системы.
          </div>

          <div class="grid gap-3">
            <Label for="scrape-schedule">Cron-выражение</Label>
            <Input id="scrape-schedule" v-model="schedule" placeholder="*/20 * * * *" :disabled="!canManageScrapers" />
            <p class="text-sm text-muted-foreground">
              Формат: `минуты часы день-месяца месяц день-недели`, например `*/10 * * * *`.
            </p>
          </div>

          <div class="flex flex-wrap gap-2">
            <Button
              v-for="preset in schedulePresets"
              :key="preset.value"
              type="button"
              variant="outline"
              size="sm"
              :disabled="!canManageScrapers"
              @click="schedule = preset.value"
            >
              {{ preset.label }}
            </Button>
          </div>

          <div class="flex items-center justify-between rounded-xl border bg-muted/20 p-4">
            <div class="space-y-1">
              <p class="font-medium">Автоматические запуски</p>
              <p class="text-sm text-muted-foreground">
                Если выключить, cron и автостарт будут остановлены, останется только ручной запуск.
              </p>
            </div>
            <Switch
              :checked="autoRunEnabled"
              :disabled="!canManageScrapers"
              @update:checked="autoRunEnabled = Boolean($event)"
            />
          </div>

          <div class="flex flex-wrap items-center gap-3">
            <Button
              :disabled="!canManageScrapers || scraperAdmin.saveLoading.value || schedule.trim().length < 5"
              @click="saveConfig()"
            >
              {{ scraperAdmin.saveLoading.value ? "Сохранение..." : "Сохранить настройки" }}
            </Button>
            <Badge variant="secondary">
              Сохранено: {{ formatDateTime(overview.config.updatedAt) }}
            </Badge>
            <Badge variant="outline">
              Источник: {{ overview.config.source === "database" ? "База настроек" : "Значение по умолчанию" }}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Runtime-состояние</CardTitle>
          <CardDescription>
            Администратор видит не только данные БД, но и текущее состояние самого scraper-service.
          </CardDescription>
        </CardHeader>
        <CardContent class="space-y-4">
          <div class="flex flex-wrap items-center gap-2">
            <Badge :variant="runtimeBadgeVariant()">
              {{ overview.runtime.reachable ? "Control API доступен" : "Control API недоступен" }}
            </Badge>
            <Badge variant="secondary">
              {{ overview.runtime.autoRunEnabled ? "Автозапуск включён" : "Автозапуск выключен" }}
            </Badge>
            <Badge v-if="overview.runtime.running" variant="warning">Есть активный прогон</Badge>
          </div>

          <div class="grid gap-3 text-sm text-muted-foreground">
            <div class="flex items-center justify-between">
              <span>Применённое расписание</span>
              <span class="font-medium text-foreground">{{ overview.runtime.schedule }}</span>
            </div>
            <div class="flex items-center justify-between">
              <span>Загруженные источники</span>
              <span class="font-medium text-foreground">{{ formatNumber(overview.runtime.loadedSources.length) }}</span>
            </div>
            <div class="flex items-center justify-between">
              <span>Запущены сейчас</span>
              <span class="font-medium text-foreground">
                {{ overview.runtime.runningSources.length > 0 ? overview.runtime.runningSources.join(", ") : "Нет" }}
              </span>
            </div>
          </div>

          <div
            v-if="overview.runtime.circuitStates.length > 0"
            class="space-y-3 rounded-xl border bg-muted/20 p-4"
          >
            <p class="font-medium">Источники в circuit breaker</p>
            <div
              v-for="item in overview.runtime.circuitStates"
              :key="item.sourceCode"
              class="flex items-center justify-between gap-3 text-sm"
            >
              <span>{{ item.sourceCode }}</span>
              <span class="text-muted-foreground">
                {{ formatNumber(item.failures) }} ошибок · до {{ formatDateTime(item.openUntil) }}
              </span>
            </div>
          </div>

          <div
            v-if="!overview.runtime.reachable && overview.runtime.message"
            class="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"
          >
            {{ overview.runtime.message }}
          </div>
        </CardContent>
      </Card>
    </div>

    <Card>
      <CardHeader>
        <CardTitle>Здоровье парсеров</CardTitle>
        <CardDescription>
          Здесь сразу видно, какой парсер реально не работает, завис, попал в circuit breaker или давно не давал свежих данных.
        </CardDescription>
      </CardHeader>
      <CardContent v-if="sourceRows.length === 0">
        <EmptyState
          title="Источники не найдены"
          description="Когда будут подключены парсеры, здесь появится административный мониторинг."
        />
      </CardContent>
      <CardContent v-else class="px-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Источник</TableHead>
              <TableHead>Внимание</TableHead>
              <TableHead>Риск</TableHead>
              <TableHead>Последний запуск</TableHead>
              <TableHead>Последний успех</TableHead>
              <TableHead>Успех</TableHead>
              <TableHead>Публикация</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-for="item in sourceRows" :key="item.sourceCode">
              <TableCell>
                <div class="space-y-1">
                  <p class="font-medium">{{ item.sourceName }}</p>
                  <p class="text-sm text-muted-foreground">{{ item.sourceCode }}</p>
                </div>
              </TableCell>
              <TableCell>
                <div class="space-y-2">
                  <Badge :variant="item.attentionRequired ? 'destructive' : 'success'">
                    {{ item.attentionRequired ? "Требует внимания" : "Норма" }}
                  </Badge>
                  <p class="max-w-xs text-sm text-muted-foreground">{{ item.attentionReason }}</p>
                </div>
              </TableCell>
              <TableCell>
                <div class="space-y-2">
                  <Badge :variant="riskBadgeVariant(item.riskLevel)">{{ riskLabel(item.riskLevel) }}</Badge>
                  <div class="flex flex-wrap gap-2">
                    <Badge v-if="item.isRunning" variant="warning">Выполняется</Badge>
                    <Badge v-if="item.circuitOpen" variant="destructive">Circuit breaker</Badge>
                    <Badge v-if="item.lastRunStatus" :variant="badgeVariant(item.lastRunStatus)">
                      {{ formatEnumLabel(item.lastRunStatus) }}
                    </Badge>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <div class="space-y-1">
                  <p>{{ formatDateTime(item.lastRunAt) }}</p>
                  <p class="text-sm text-muted-foreground">
                    {{ item.lastErrorMessage || `Сбоев: ${formatNumber(item.failedRuns)}` }}
                  </p>
                </div>
              </TableCell>
              <TableCell>{{ formatDateTime(item.lastSuccessAt) }}</TableCell>
              <TableCell>{{ formatPercent(item.successRate) }}</TableCell>
              <TableCell>{{ formatPercent(item.publicationRate) }}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  </template>
</template>
