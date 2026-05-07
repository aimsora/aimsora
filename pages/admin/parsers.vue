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
type AdminSourceRow = NonNullable<typeof scraperAdmin.overview.value>["sources"][number];
const schedule = ref("*/20 * * * *");
const autoRunEnabled = ref(true);
const search = ref("");
const sourceFilter = ref<"all" | "active" | "disabled" | "attention">("all");
const canManageScrapers = computed(() => auth.can("scraper-admin.manage"));
const sourceFilterOptions = [
  { label: "Все", value: "all" },
  { label: "В сборе", value: "active" },
  { label: "Отключённые", value: "disabled" },
  { label: "Нужна проверка", value: "attention" }
] as const;

const schedulePresets = [
  { label: "Каждые 5 минут", value: "*/5 * * * *" },
  { label: "Каждые 10 минут", value: "*/10 * * * *" },
  { label: "Каждые 20 минут", value: "*/20 * * * *" },
  { label: "Каждые 30 минут", value: "*/30 * * * *" },
  { label: "Каждый час", value: "0 * * * *" }
] as const;

const overview = computed(() => scraperAdmin.overview.value);
const normalizedSchedule = computed(() => schedule.value.trim());
const scheduleParts = computed(() => normalizedSchedule.value.split(/\s+/).filter(Boolean));
const isScheduleValid = computed(() => scheduleParts.value.length === 5);
const sourceRows = computed(() =>
  [...(overview.value?.sources ?? [])].sort((left, right) => {
    if (left.isActive !== right.isActive) {
      return left.isActive ? -1 : 1;
    }

    if (left.attentionRequired !== right.attentionRequired) {
      return left.attentionRequired ? -1 : 1;
    }

    if (left.isRunning !== right.isRunning) {
      return left.isRunning ? -1 : 1;
    }

    return left.sourceCode.localeCompare(right.sourceCode);
  })
);

const filteredSourceRows = computed(() =>
  sourceRows.value.filter((item) => {
    const normalizedSearch = search.value.trim().toLowerCase();
    const matchesSearch =
      normalizedSearch.length === 0 ||
      item.sourceName.toLowerCase().includes(normalizedSearch) ||
      item.sourceCode.toLowerCase().includes(normalizedSearch);

    if (!matchesSearch) {
      return false;
    }

    if (sourceFilter.value === "active") {
      return item.isActive;
    }

    if (sourceFilter.value === "disabled") {
      return !item.isActive;
    }

    if (sourceFilter.value === "attention") {
      return item.attentionRequired;
    }

    return true;
  })
);

const summaryCards = computed(() => {
  const sources = overview.value?.sources ?? [];
  const runtime = overview.value?.runtime;

  return [
    {
      label: "В сборе",
      value: formatNumber(sources.filter((item) => item.isActive).length),
      hint: "Источники, участвующие в плановом контуре"
    },
    {
      label: "Отключены",
      value: formatNumber(sources.filter((item) => !item.isActive).length),
      hint: "Источники, которые администратор исключил из сбора"
    },
    {
      label: "Требуют внимания",
      value: formatNumber(sources.filter((item) => item.attentionRequired).length),
      hint: "Активные источники с ошибками, зависанием или stale-состоянием"
    },
    {
      label: "Загружены в runtime",
      value: formatNumber(runtime?.loadedSources.length ?? 0),
      hint: runtime?.reachable ? "Адаптеры, которые реально видит scraper-service" : "Runtime сейчас недоступен"
    },
    {
      label: "Сейчас выполняются",
      value: formatNumber(sources.filter((item) => item.isRunning).length),
      hint: runtime?.reachable ? "Прогоны, которые идут прямо сейчас" : runtime?.message || "Нет связи с runtime"
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

function sourceStateVariant(item: AdminSourceRow) {
  if (!item.isActive) {
    return "secondary" as const;
  }

  if (item.attentionRequired) {
    return "destructive" as const;
  }

  return "success" as const;
}

function sourceStateLabel(item: AdminSourceRow) {
  if (!item.isActive) {
    return "Отключён";
  }

  if (item.isRunning) {
    return "Выполняется";
  }

  if (item.attentionRequired) {
    return "Нужна проверка";
  }

  return "В сборе";
}

function availabilityVariant(item: AdminSourceRow) {
  return item.isLoaded ? ("outline" as const) : ("warning" as const);
}

function availabilityLabel(item: AdminSourceRow) {
  return item.isLoaded ? "Загружен в runtime" : "Нет в runtime";
}

async function updateSource(sourceCode: string, isActive: boolean) {
  try {
    await scraperAdmin.updateSourceState({ sourceCode, isActive });
  } catch {
    // Ошибка уже показана toast-уведомлением в composable.
  }
}

async function runSource(sourceCode: string) {
  try {
    await scraperAdmin.runSource(sourceCode);
  } catch {
    // Ошибка уже показана toast-уведомлением в composable.
  }
}

async function saveConfig() {
  if (!isScheduleValid.value) {
    return;
  }

  try {
    await scraperAdmin.save({
      schedule: normalizedSchedule.value,
      autoRunEnabled: autoRunEnabled.value
    });
  } catch {
    // Ошибка уже показана toast-уведомлением в composable.
  }
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
          <CardTitle>Расписание и режим</CardTitle>
          <CardDescription>
            {{
              canManageScrapers
                ? "Здесь меняется общий режим работы scraper-service. Управление отдельными источниками находится ниже."
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

          <div class="grid gap-2">
            <Label for="scrape-schedule">Cron-выражение</Label>
            <Input id="scrape-schedule" v-model="schedule" placeholder="*/20 * * * *" :disabled="!canManageScrapers" />
            <p class="text-xs text-muted-foreground">
              Формат: `минуты часы день-месяца месяц день-недели`, например `*/10 * * * *`.
            </p>
            <p v-if="normalizedSchedule && !isScheduleValid" class="text-xs text-destructive">
              Cron должен состоять из 5 частей.
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
              :disabled="!canManageScrapers || scraperAdmin.saveLoading.value || !isScheduleValid"
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
          <CardTitle>Runtime scraper-service</CardTitle>
          <CardDescription>
            Видно, что реально загружено в памяти сервиса, что включено в runtime и есть ли связь с control API.
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
              <span>Включены в runtime</span>
              <span class="font-medium text-foreground">{{ formatNumber(overview.runtime.enabledSources.length) }}</span>
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
        <CardTitle>Источники и управление сбором</CardTitle>
        <CardDescription>Компактное управление источниками без горизонтальной прокрутки таблицы.</CardDescription>
      </CardHeader>
      <CardContent class="space-y-4">
        <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div class="flex flex-wrap gap-2">
            <Button
              v-for="item in sourceFilterOptions"
              :key="item.value"
              :variant="sourceFilter === item.value ? 'default' : 'outline'"
              size="sm"
              @click="sourceFilter = item.value"
            >
              {{ item.label }}
            </Button>
          </div>
          <Input
            v-model="search"
            class="w-full lg:max-w-sm"
            placeholder="Поиск по коду или названию источника"
          />
        </div>
      </CardContent>
      <CardContent v-if="filteredSourceRows.length === 0">
        <EmptyState
          title="Источники не найдены"
          description="Попробуйте изменить фильтр или строку поиска."
        />
      </CardContent>
      <CardContent v-else>
        <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <article
            v-for="item in filteredSourceRows"
            :key="item.sourceCode"
            class="flex min-h-full flex-col gap-3 rounded-lg border bg-muted/10 p-3"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0 space-y-1">
                <p class="truncate font-medium">{{ item.sourceName }}</p>
                <p class="text-xs text-muted-foreground">{{ item.sourceCode }}</p>
              </div>
              <Badge :variant="sourceStateVariant(item)" class="shrink-0">{{ sourceStateLabel(item) }}</Badge>
            </div>

            <div class="flex flex-wrap gap-2">
              <Badge :variant="availabilityVariant(item)">{{ availabilityLabel(item) }}</Badge>
              <Badge :variant="riskBadgeVariant(item.riskLevel)">{{ riskLabel(item.riskLevel) }}</Badge>
              <Badge v-if="item.lastRunStatus" :variant="badgeVariant(item.lastRunStatus)">
                {{ formatEnumLabel(item.lastRunStatus) }}
              </Badge>
              <Badge v-if="item.circuitOpen" variant="destructive">Circuit breaker</Badge>
            </div>

            <p class="min-h-5 break-words text-xs text-muted-foreground">{{ item.attentionReason }}</p>

            <div class="grid gap-2 rounded-md bg-background/70 p-2 text-xs">
              <div class="flex justify-between gap-3">
                <span class="text-muted-foreground">Последний запуск</span>
                <span class="text-right font-medium">{{ formatDateTime(item.lastRunAt) }}</span>
              </div>
              <div class="flex justify-between gap-3">
                <span class="text-muted-foreground">Успех</span>
                <span class="font-medium">{{ formatPercent(item.successRate) }}</span>
              </div>
              <div class="flex justify-between gap-3">
                <span class="text-muted-foreground">Публикация</span>
                <span class="font-medium">{{ formatPercent(item.publicationRate) }}</span>
              </div>
              <div class="flex justify-between gap-3">
                <span class="text-muted-foreground">Сбоев</span>
                <span class="font-medium">{{ formatNumber(item.failedRuns) }}</span>
              </div>
            </div>

            <p v-if="item.lastErrorMessage" class="line-clamp-2 break-words text-xs text-destructive">
              {{ item.lastErrorMessage }}
            </p>
            <p v-else class="text-xs text-muted-foreground">
              Последний успех: {{ formatDateTime(item.lastSuccessAt) }}
            </p>

            <div class="mt-auto flex items-center justify-between gap-3 border-t pt-3">
              <div class="flex items-center gap-2">
                <Switch
                  :checked="item.isActive"
                  :disabled="
                    !canManageScrapers ||
                    !overview.runtime.reachable ||
                    !item.isLoaded ||
                    scraperAdmin.isSourceUpdating(item.sourceCode)
                  "
                  @update:checked="updateSource(item.sourceCode, Boolean($event))"
                />
                <span class="text-sm text-muted-foreground">
                  {{ scraperAdmin.isSourceUpdating(item.sourceCode) ? "Сохраняю..." : "В сборе" }}
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                :disabled="
                  !overview.runtime.reachable ||
                  !item.isLoaded ||
                  !item.isActive ||
                  item.isRunning ||
                  scraperAdmin.isSourceRunning(item.sourceCode)
                "
                @click="runSource(item.sourceCode)"
              >
                {{
                  scraperAdmin.isSourceRunning(item.sourceCode)
                    ? "Запуск..."
                    : item.isRunning
                      ? "Идёт"
                      : "Запустить"
                }}
              </Button>
            </div>
          </article>
        </div>
      </CardContent>
    </Card>
  </template>
</template>
