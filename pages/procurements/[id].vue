<script setup lang="ts">
definePageMeta({
  title: "Карточка закупки",
  description: "Структурированная информация по выбранной закупке",
  roles: ["ANALYST", "ADMIN"]
});

const route = useRoute();
const detail = useProcurementDetail();

const title = computed(() => detail.item.value?.title || "Карточка закупки");
const description = computed(
  () => detail.item.value?.externalId || "Структурированная детальная информация по выбранной записи."
);

const rawJson = computed(() => JSON.stringify(detail.item.value?.rawPayload ?? {}, null, 2));

watchEffect(() => {
  useHead({
    title: detail.item.value?.title || "Карточка закупки"
  });
});

onMounted(() => {
  void detail.load(String(route.params.id));
});
</script>

<template>
  <PageHeader :title="title" :description="description">
    <template #actions>
      <Badge v-if="detail.item.value" :variant="badgeVariant(detail.item.value.status)">
        {{ formatEnumLabel(detail.item.value.status) }}
      </Badge>
      <Button as-child variant="secondary">
        <NuxtLink to="/procurements">К списку</NuxtLink>
      </Button>
    </template>
  </PageHeader>

  <Card v-if="detail.loading.value">
    <CardContent class="space-y-3 pt-6">
      <Skeleton class="h-10 rounded-md" />
      <Skeleton class="h-32 rounded-md" />
      <Skeleton class="h-32 rounded-md" />
    </CardContent>
  </Card>

  <ErrorState
    v-else-if="detail.error.value"
    :description="detail.error.value"
    action-label="Повторить"
    @action="detail.load(String(route.params.id))"
  />

  <template v-else-if="detail.item.value">
    <Card>
      <CardHeader class="gap-4 md:flex-row md:items-start md:justify-between">
        <div class="space-y-2">
          <Badge variant="secondary" class="w-fit">{{ detail.item.value.source }}</Badge>
          <CardTitle class="text-2xl">{{ detail.item.value.title }}</CardTitle>
          <CardDescription>
            {{ detail.item.value.description || "Для этой закупки пока не добавлено текстовое описание." }}
          </CardDescription>
        </div>
        <div class="flex flex-col items-start gap-2">
          <Badge :variant="badgeVariant(detail.item.value.status)">
            {{ formatEnumLabel(detail.item.value.status) }}
          </Badge>
          <p class="text-sm text-muted-foreground">
            Обновлена {{ formatDateTime(detail.item.value.updatedAt) }}
          </p>
        </div>
      </CardHeader>
    </Card>

    <div class="grid gap-4 xl:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle class="text-base">Основная информация</CardTitle>
        </CardHeader>
        <CardContent class="grid gap-4 sm:grid-cols-2">
          <div>
            <p class="text-sm text-muted-foreground">Идентификатор</p>
            <p class="mt-1 font-medium">{{ detail.item.value.externalId }}</p>
          </div>
          <div>
            <p class="text-sm text-muted-foreground">Статус</p>
            <p class="mt-1 font-medium">{{ formatEnumLabel(detail.item.value.status) }}</p>
          </div>
          <div>
            <p class="text-sm text-muted-foreground">Опубликована</p>
            <p class="mt-1 font-medium">{{ formatDateTime(detail.item.value.publishedAt) }}</p>
          </div>
          <div>
            <p class="text-sm text-muted-foreground">Срок подачи</p>
            <p class="mt-1 font-medium">{{ formatDateTime(detail.item.value.deadlineAt) }}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle class="text-base">Контрагенты и сумма</CardTitle>
        </CardHeader>
        <CardContent class="grid gap-4 sm:grid-cols-2">
          <div>
            <p class="text-sm text-muted-foreground">Заказчик</p>
            <p class="mt-1 font-medium">{{ detail.item.value.customer || "Не указан" }}</p>
          </div>
          <div>
            <p class="text-sm text-muted-foreground">Поставщик</p>
            <p class="mt-1 font-medium">{{ detail.item.value.supplier || "Не указан" }}</p>
          </div>
          <div>
            <p class="text-sm text-muted-foreground">Сумма</p>
            <p class="mt-1 font-medium">{{ formatCurrency(detail.item.value.amount, detail.item.value.currency) }}</p>
          </div>
          <div>
            <p class="text-sm text-muted-foreground">Переход к источнику</p>
            <a
              v-if="detail.item.value.sourceUrl"
              :href="detail.item.value.sourceUrl"
              target="_blank"
              rel="noreferrer"
              class="mt-1 inline-flex text-sm font-medium text-primary hover:underline"
            >
              Открыть первоисточник
            </a>
            <p v-else class="mt-1 font-medium">Ссылка отсутствует</p>
          </div>
        </CardContent>
      </Card>
    </div>

    <Card>
      <CardHeader>
        <CardTitle class="text-base">Технические данные</CardTitle>
        <CardDescription>Raw JSON спрятан в сворачиваемый блок и не шумит на основном экране.</CardDescription>
      </CardHeader>
      <CardContent>
        <details class="rounded-xl border bg-muted/20 p-4">
          <summary class="cursor-pointer text-sm font-medium">Показать raw JSON</summary>
          <pre class="mt-4 overflow-auto rounded-lg bg-background p-4 text-xs leading-6">{{ rawJson }}</pre>
        </details>
      </CardContent>
    </Card>
  </template>

  <EmptyState
    v-else
    title="Закупка не найдена"
    description="Запись отсутствует или больше недоступна. Вернитесь к общему списку и выберите другую закупку."
  />
</template>
