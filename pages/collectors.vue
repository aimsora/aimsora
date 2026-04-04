<script setup lang="ts">
import { TRIGGER_COLLECTORS_MUTATION } from "~/graphql/documents";
import type { CollectorTriggerResult } from "~/graphql/types";

definePageMeta({
  title: "Коллекторы",
  description: "Ручной запуск подключённых сборщиков данных",
  roles: ["DEVELOPER", "ADMIN"]
});

useHead({
  title: "Коллекторы"
});

const apollo = useApollo();
const toast = useToast();
const sourcesData = useSourcesData();
const triggerLoading = ref(false);
const pendingByCode = reactive<Record<string, boolean>>({});

const sourceRows = computed(() => sourcesData.sources.value);

const summaryCards = computed(() => [
  {
    label: "Доступно сборщиков",
    value: formatNumber(sourceRows.value.length),
    hint: "Источники, которые можно запустить вручную"
  },
  {
    label: "Активные",
    value: formatNumber(sourceRows.value.filter((item) => item.isActive).length),
    hint: "Подключены в текущем окружении"
  },
  {
    label: "С недавним запуском",
    value: formatNumber(sourceRows.value.filter((item) => Boolean(item.lastRun)).length),
    hint: "Есть запись о последнем запуске"
  }
]);

function setPending(sourceCodes: string[], value: boolean) {
  for (const sourceCode of sourceCodes) {
    pendingByCode[sourceCode] = value;
  }
}

async function load() {
  await sourcesData.load();
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
      void load();
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
  void load();
});
</script>

<template>
  <PageHeader
    title="Коллекторы"
    description="Отдельная панель для ручного запуска подключённых сборщиков данных."
  >
    <template #actions>
      <div class="flex gap-2">
        <Button variant="secondary" :disabled="sourcesData.loading.value || triggerLoading" @click="load()">
          {{ sourcesData.loading.value ? "Обновление..." : "Обновить" }}
        </Button>
        <Button :disabled="triggerLoading || sourceRows.length === 0" @click="triggerCollectors()">
          {{ triggerLoading ? "Запуск..." : "Запустить все" }}
        </Button>
      </div>
    </template>
  </PageHeader>

  <div v-if="sourcesData.loading.value" class="grid gap-4 md:grid-cols-3">
    <Skeleton v-for="item in 3" :key="item" class="h-32 rounded-xl" />
  </div>

  <ErrorState
    v-else-if="sourcesData.error.value"
    :description="sourcesData.error.value"
    action-label="Повторить"
    @action="load()"
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
        <CardTitle>Ручной запуск</CardTitle>
        <CardDescription>
          Кнопка запускает сборщик сразу, не дожидаясь cron. Если источник уже работает, повторный старт будет пропущен.
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
  </template>
</template>
