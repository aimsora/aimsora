<script setup lang="ts">
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

const statusOptions = [
  { label: "Все статусы", value: allStatusesValue },
  { label: "Черновик", value: "DRAFT" },
  { label: "Активна", value: "ACTIVE" },
  { label: "Завершена", value: "CLOSED" },
  { label: "В архиве", value: "ARCHIVED" }
];

onMounted(async () => {
  await Promise.all([procurements.loadSources(), procurements.load()]);
});
</script>

<template>
  <PageHeader
    title="Закупки"
    description="Поиск, фильтрация и переход в детальную карточку закупки."
  >
    <template #actions>
      <Button variant="secondary" :disabled="procurements.loading.value" @click="procurements.load()">
        {{ procurements.loading.value ? "Обновление..." : "Обновить" }}
      </Button>
    </template>
  </PageHeader>

  <FilterToolbar>
    <template #meta>
      <Badge variant="secondary">Найдено: {{ formatNumber(procurements.total.value) }}</Badge>
    </template>

    <form class="grid gap-4 lg:grid-cols-[1.5fr_1fr_1fr_auto]" @submit.prevent="procurements.submitFilters()">
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

  <Card v-else>
    <CardHeader>
      <CardTitle>Список закупок</CardTitle>
      <CardDescription>Клик по строке открывает детальную карточку закупки.</CardDescription>
    </CardHeader>
    <CardContent v-if="procurements.items.value.length === 0">
      <EmptyState
        title="Ничего не найдено"
        description="Измените параметры поиска или сбросьте фильтры."
      />
    </CardContent>
    <template v-else>
      <CardContent class="px-0">
        <Table>
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
              <TableCell>
                <div class="space-y-1">
                  <p class="font-medium">{{ item.title }}</p>
                  <p class="text-sm text-muted-foreground">{{ item.externalId }}</p>
                </div>
              </TableCell>
              <TableCell>{{ item.source }}</TableCell>
              <TableCell>{{ item.customer || "Не указан" }}</TableCell>
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
