<script setup lang="ts">
import { TRIGGER_COLLECTORS_MUTATION } from "~/graphql/documents";
import type { CollectorTriggerResult } from "~/graphql/types";

definePageMeta({
  title: "Операции парсеров",
  description: "Ручной запуск сборщиков, журнал прогонов и технические инциденты",
  roles: ["DEVELOPER", "ADMIN"]
});

useHead({
  title: "Операции парсеров"
});

const apollo = useApollo();
const toast = useToast();
const jobs = useJobsData();
const triggerLoading = ref(false);
const pendingByCode = reactive<Record<string, boolean>>({});
const allSourcesValue = "__ALL_SOURCES__";

const selectedSource = computed({
  get: () => jobs.sourceFilter.value || allSourcesValue,
  set: (value: string) => {
    jobs.sourceFilter.value = value === allSourcesValue ? "" : value;
  }
});

const sourceRows = computed(() => jobs.sources.value);
const selectedSourceName = computed(
  () => jobs.sources.value.find((item) => item.code === jobs.sourceFilter.value)?.name ?? "выбранный источник"
);

const summaryCards = computed(() => [
  {
    label: "Доступно сборщиков",
    value: formatNumber(sourceRows.value.length),
    hint: "Источники, которые можно запускать вручную"
  },
  {
    label: "Всего запусков",
    value: formatNumber(jobs.runs.value.length),
    hint: "Количество прогонов в текущей выборке"
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
    hint: "Требуют инженерного внимания"
  }
]);

const launchSummary = computed(() => [
  {
    label: "Активные источники",
    value: formatNumber(sourceRows.value.filter((item) => item.isActive).length),
    hint: "Подключены в текущем окружении"
  },
  {
    label: "С недавним запуском",
    value: formatNumber(sourceRows.value.filter((item) => Boolean(item.lastRun)).length),
    hint: "Есть запись о последнем прогоне"
  }
]);

function setPending(sourceCodes: string[], value: boolean) {
  for (const sourceCode of sourceCodes) {
    pendingByCode[sourceCode] = value;
  }
}

async function loadAll() {
  await Promise.all([jobs.loadSources(), jobs.load()]);
}

async function triggerCollectors(sourceCodes?: string[]) {
  const targetCodes =
    Array.isArray(sourceCodes) && sourceCodes.length > 0
      ? sourceCodes
      : sourceRows.value.map((item) => item.code);

  if (targetCodes.length === 0) {
    toast.warning("Нет доступных источников", "Сначала дождитесь загрузки списка источников.");
    return;
  }

  triggerLoading.value = true;
  setPending(targetCodes, true);

  try {
    const result = await apollo.mutate<{ triggerCollectors: CollectorTriggerResult }>({
      mutation: TRIGGER_COLLECTORS_MUTATION,
      variables: {
        sourceCodes: sourceCodes && sourceCodes.length > 0 ? sourceCodes : null
      }
    });

    const payload = result.data?.triggerCollectors;

    if (!payload) {
      throw new Error("Не удалось запустить сборщики");
    }

    const acceptedItems = payload.items.filter((item) => item.accepted);
    const skippedItems = payload.items.filter((item) => !item.accepted);

    if (acceptedItems.length > 0) {
      toast.success(
        acceptedItems.length === 1 ? "Сборщик запущен" : "Сборщики запущены",
        acceptedItems
          .map((item) => `${item.sourceName}: ${item.runKey ?? "без ключа"}`)
          .join(" • ")
      );
    }

    if (skippedItems.length > 0) {
      toast.warning(
        skippedItems.length === 1 ? "Часть запуска пропущена" : "Некоторые сборщики не запущены",
        skippedItems
          .map((item) => `${item.sourceName}: ${item.message ?? "пропущено"}`)
          .join(" • ")
      );
    }

    window.setTimeout(() => {
      void loadAll();
    }, 1500);
  } catch (caught) {
    toast.error(
      "Не удалось запустить сборщики",
      caught instanceof Error ? caught.message : "Попробуйте ещё раз."
    );
  } finally {
    setPending(targetCodes, false);
    triggerLoading.value = false;
  }
}

onMounted(() => {
  void loadAll();
});
</script>

<template>
  <PageHeader
    title="Операции парсеров"
    description="Единая зона для ручного запуска сборщиков, чтения последних прогонов и разбора технических инцидентов."
  />

  <div v-if="jobs.loading.value" class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
    <Skeleton v-for="item in 4" :key="item" class="h-32 rounded-xl" />
  </div>

  <ErrorState
    v-else-if="jobs.error.value"
    :description="jobs.error.value"
    action-label="Повторить"
    @action="jobs.load()"
  />

  <template v-else>
    <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <StatCard
        v-for="card in summaryCards"
        :key="card.label"
        :label="card.label"
        :value="card.value"
        :hint="card.hint"
      />
    </div>

    <div class="grid gap-4">
      <Card class="border-border/70 bg-gradient-to-br from-background via-background to-muted/20">
        <CardHeader>
          <CardTitle>Панель запуска</CardTitle>
        <CardDescription>
          Здесь собраны ручной старт и быстрые ориентиры по доступности источников. Повторный запуск уже активного
          процесса будет пропущен сервером.
        </CardDescription>
      </CardHeader>
        <CardContent class="space-y-5">
          <div class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto_auto]">
            <div class="space-y-2">
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

            <div class="flex items-end">
              <Button
                class="w-full lg:w-auto"
                :disabled="triggerLoading || sourceRows.length === 0"
                @click="triggerCollectors(jobs.sourceFilter.value ? [jobs.sourceFilter.value] : undefined)"
              >
                {{
                  triggerLoading
                    ? "Запуск..."
                    : jobs.sourceFilter.value
                      ? `Запустить ${selectedSourceName}`
                      : "Запустить все источники"
                }}
              </Button>
            </div>

            <div class="flex items-end">
              <Button variant="secondary" class="w-full lg:w-auto" :disabled="jobs.loading.value" @click="loadAll()">
                {{ jobs.loading.value ? "Загрузка..." : "Обновить" }}
              </Button>
            </div>
          </div>

          <div class="grid gap-3 sm:grid-cols-2">
            <div
              v-for="item in launchSummary"
              :key="item.label"
              class="rounded-3xl border bg-muted/15 p-4"
            >
              <p class="text-sm text-muted-foreground">{{ item.label }}</p>
              <p class="mt-2 text-2xl font-semibold">{{ item.value }}</p>
              <p class="mt-2 text-sm leading-6 text-muted-foreground">{{ item.hint }}</p>
            </div>
          </div>

          <div class="rounded-3xl border bg-muted/15 p-4">
            <p class="text-sm font-medium">Как пользоваться этой страницей</p>
            <p class="mt-2 text-sm leading-6 text-muted-foreground">
              Сначала можно вручную запустить нужный источник, а ниже сразу проверить, чем закончился прогон и были ли
              потери или ошибки публикации.
            </p>
          </div>

          <div class="flex flex-wrap gap-2">
            <Button
              v-if="jobs.sourceFilter.value"
              variant="outline"
              :disabled="triggerLoading || sourceRows.length === 0"
              @click="triggerCollectors()"
            >
              Запустить весь контур
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Источники и ручной запуск</CardTitle>
          <CardDescription>
            Компактный список по каждому сборщику: активность, последний прогон и точечный запуск без перехода в другой
            раздел.
          </CardDescription>
        </CardHeader>
        <CardContent v-if="sourceRows.length === 0">
          <EmptyState
            title="Источники не найдены"
            description="После загрузки подключённых источников здесь появятся доступные сборщики."
          />
        </CardContent>
        <CardContent v-else class="grid gap-4 xl:grid-cols-2">
          <div
            v-for="item in sourceRows"
            :key="item.id"
            class="rounded-2xl border bg-background p-5"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="space-y-2">
                <Badge variant="secondary" class="w-fit">{{ formatEnumLabel(item.kind) }}</Badge>
                <div>
                  <p class="text-base font-semibold">{{ item.name }}</p>
                  <p class="text-sm text-muted-foreground">{{ item.code }}</p>
                </div>
              </div>
              <Badge :variant="item.isActive ? 'success' : 'destructive'">
                {{ item.isActive ? "Активен" : "Неактивен" }}
              </Badge>
            </div>

            <p class="mt-4 text-sm text-muted-foreground">
              {{ item.description || "Описание для источника пока не заполнено." }}
            </p>

            <div class="mt-4 grid gap-2 text-sm text-muted-foreground">
              <div class="flex items-center justify-between">
                <span>Последний запуск</span>
                <span class="font-medium text-foreground">
                  {{ item.lastRun ? formatDateTime(item.lastRun.startedAt) : "Нет данных" }}
                </span>
              </div>
              <div class="flex items-center justify-between">
                <span>Статус</span>
                <span class="font-medium text-foreground">
                  {{ item.lastRun ? formatEnumLabel(item.lastRun.status) : "Ещё не запускался" }}
                </span>
              </div>
            </div>

            <div class="mt-5 flex items-center justify-between gap-3">
              <a
                v-if="item.baseUrl"
                :href="item.baseUrl"
                target="_blank"
                rel="noreferrer"
                class="text-sm font-medium text-primary hover:underline"
              >
                Открыть источник
              </a>
              <span v-else class="text-sm text-muted-foreground">Адрес не указан</span>

              <Button
                :disabled="triggerLoading || pendingByCode[item.code]"
                @click="triggerCollectors([item.code])"
              >
                {{ pendingByCode[item.code] ? "Запуск..." : "Запустить" }}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  </template>
</template>
