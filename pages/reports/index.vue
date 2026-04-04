<script setup lang="ts">
definePageMeta({
  title: "Отчёты",
  description: "Оперативные аналитические отчёты платформы",
  roles: ["ANALYST", "DEVELOPER", "ADMIN"]
});

useHead({
  title: "Отчёты"
});

const auth = useAuthSession();
const reports = useReportsData();

const reportTypeLabels: Record<string, string> = {
  "daily-overview": "Ежедневный обзор",
  "supplier-risk": "Риски поставщиков",
  "pipeline-incident": "Инциденты пайплайна"
};

const reportTypeDescriptions: Record<string, string> = {
  "daily-overview": "Сводка по закупкам, дедлайнам, публикациям и свежести данных.",
  "supplier-risk": "Сигналы по поставщикам, концентрации и срочным закупкам.",
  "pipeline-incident": "Проблемные запуски, качество публикации и слабые места в конвейере."
};

const reportTypeCadences: Record<string, string> = {
  "daily-overview": "Каждые 12 часов",
  "supplier-risk": "Каждые 24 часа",
  "pipeline-incident": "Каждые 6 часов"
};

const roleVisibleReportTypes: Record<string, string[]> = {
  ANALYST: ["daily-overview", "supplier-risk"],
  DEVELOPER: ["pipeline-incident"],
  ADMIN: Object.keys(reportTypeLabels)
};

const visibleReportTypes = computed(() => roleVisibleReportTypes[auth.user.value?.role ?? ""] ?? []);
const visibleReports = computed(() =>
  reports.reports.value.filter((item) => visibleReportTypes.value.includes(item.reportType))
);
const featuredReports = computed(() => visibleReports.value.slice(0, 3));
const pageDescription = computed(() => {
  if (auth.isDeveloper.value) {
    return "Инженерный контур отчётности: состояние пайплайна, инциденты парсеров и качество доставки данных.";
  }

  if (auth.isAdmin.value) {
    return "Полный реестр отчётов: бизнес-аналитика, инженерные срезы, ручной запуск и управление историей версий.";
  }

  return "Рабочая полка с аналитическими сценариями: обзор, риски поставщиков и динамика закупочного потока.";
});

const summaryCards = computed(() => [
  {
    label: "Всего отчётов",
    value: formatNumber(visibleReports.value.length),
    hint: auth.isDeveloper.value ? "Доступные инженерные отчёты" : "Все доступные сценарии в системе"
  },
  {
    label: auth.isDeveloper.value ? "Стабильные инженерные срезы" : "Готовы к чтению",
    value: formatNumber(visibleReports.value.filter((item) => item.status === "READY").length),
    hint: "Можно открывать и использовать в работе"
  },
  {
    label: "Проблемные",
    value: formatNumber(visibleReports.value.filter((item) => item.status === "FAILED").length),
    hint: "Отчёты, которым требуется внимание"
  },
  {
    label: "Типов аналитики",
    value: formatNumber(new Set(visibleReports.value.map((item) => item.reportType)).size),
    hint: "Разные сценарии обзора данных и рисков"
  }
]);

const cadenceCards = computed(() =>
  visibleReportTypes.value.map((reportType) => ({
    reportType,
    label: reportTypeLabel(reportType),
    cadence: reportTypeCadences[reportType] ?? "По расписанию",
    description: reportTypeDescription(reportType),
    historyCount: visibleReports.value.filter((item) => item.reportType === reportType).length
  }))
);

function reportTypeLabel(reportType?: string | null) {
  return reportTypeLabels[reportType ?? ""] ?? "Оперативный отчёт";
}

function reportTypeDescription(reportType?: string | null) {
  return reportTypeDescriptions[reportType ?? ""] ?? "Структурированный аналитический сценарий.";
}

function openReport(reportId: string) {
  return navigateTo(`/reports/${reportId}`);
}

function generateByType(reportType: string) {
  return reports.refreshReports([reportType]);
}

onMounted(() => {
  void reports.load();
});
</script>

<template>
  <PageHeader
    title="Отчёты"
    :description="pageDescription"
  >
    <template #actions>
      <div class="flex gap-2">
        <Button
          v-if="auth.can('reports.generate')"
          :disabled="reports.refreshLoading.value"
          @click="reports.refreshReports()"
        >
          {{ reports.refreshLoading.value ? "Формирование..." : "Сформировать отчёты" }}
        </Button>
        <Button variant="secondary" :disabled="reports.loading.value" @click="reports.load()">
          {{ reports.loading.value ? "Обновление..." : "Обновить" }}
        </Button>
      </div>
    </template>
  </PageHeader>

  <div v-if="reports.loading.value" class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
    <Skeleton v-for="item in 4" :key="item" class="h-32 rounded-xl" />
  </div>

  <ErrorState
    v-else-if="reports.error.value"
    :description="reports.error.value"
    action-label="Повторить"
    @action="reports.load()"
  />

  <template v-else>
    <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <StatCard
        v-for="card in summaryCards"
        :key="card.label"
        :label="card.label"
        :value="card.value"
        :hint="card.hint"
      />
    </div>

    <div class="grid gap-4 xl:grid-cols-3">
      <Card
        v-for="card in cadenceCards"
        :key="card.reportType"
        class="border-border/70 bg-gradient-to-br from-background via-background to-muted/20"
      >
        <CardHeader class="space-y-3">
          <div class="flex items-start justify-between gap-3">
            <Badge variant="secondary">{{ card.label }}</Badge>
            <Badge variant="outline">{{ card.cadence }}</Badge>
          </div>
          <div class="space-y-1">
            <CardTitle class="text-base">Регламент формирования</CardTitle>
            <CardDescription>{{ card.description }}</CardDescription>
          </div>
        </CardHeader>
        <CardContent class="grid gap-2 text-sm text-muted-foreground">
          <p>Новых версий в истории: {{ formatNumber(card.historyCount) }}</p>
          <p>Каждая новая генерация создаёт отдельную запись и сохраняет предыдущие отчёты.</p>
          <div class="pt-2">
            <Button
              v-if="auth.can('reports.generate')"
              type="button"
              variant="secondary"
              size="sm"
              :disabled="reports.refreshLoading.value"
              @click="generateByType(card.reportType)"
            >
              Сформировать сейчас
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>

    <Card v-if="visibleReports.length === 0">
      <CardContent class="pt-6">
        <EmptyState
          title="Отчёты отсутствуют"
          description="Когда сервер сформирует аналитические сценарии, они появятся в этом разделе."
        />
      </CardContent>
    </Card>

    <template v-else>
      <div class="grid gap-4 xl:grid-cols-3">
        <Card
          v-for="report in featuredReports"
          :key="report.id"
          class="border-border/70 bg-gradient-to-br from-background via-background to-muted/30"
          role="button"
          tabindex="0"
          @click="openReport(report.id)"
          @keydown.enter.prevent="openReport(report.id)"
        >
          <CardHeader class="space-y-4">
            <div class="flex items-start justify-between gap-3">
              <Badge variant="secondary">{{ reportTypeLabel(report.reportType) }}</Badge>
              <Badge :variant="badgeVariant(report.status)">{{ formatEnumLabel(report.status) }}</Badge>
            </div>
            <div class="space-y-2">
              <CardTitle class="text-lg">{{ report.name }}</CardTitle>
              <CardDescription>
                {{ report.description || reportTypeDescription(report.reportType) }}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent class="space-y-4">
            <div class="grid gap-2 text-sm text-muted-foreground">
              <p>Сценарий: {{ reportTypeDescription(report.reportType) }}</p>
              <p>Последнее обновление: {{ formatDateTime(report.updatedAt) }}</p>
            </div>
            <Button class="w-full" @click.stop="openReport(report.id)">
              Открыть отчёт
            </Button>
            <Button
              v-if="auth.can('reports.archive')"
              class="w-full"
              variant="outline"
              :disabled="reports.archiveLoadingId.value === report.id"
              @click.stop="reports.archiveReport(report.id)"
            >
              {{ reports.archiveLoadingId.value === report.id ? "Архивация..." : "Убрать из реестра" }}
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Реестр отчётов</CardTitle>
          <CardDescription>Полный архив версий. В карточках выше показаны только 3 последних отчёта.</CardDescription>
        </CardHeader>
        <CardContent class="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Отчёт</TableHead>
                <TableHead>Тип</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead>Обновлён</TableHead>
                <TableHead class="text-right">Действие</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-for="report in visibleReports" :key="report.id">
                <TableCell>
                  <div class="space-y-1">
                    <button
                      type="button"
                      class="font-medium text-primary hover:underline"
                      @click="openReport(report.id)"
                    >
                      {{ report.name }}
                    </button>
                    <p class="text-sm text-muted-foreground">
                      {{ report.description || reportTypeDescription(report.reportType) }}
                    </p>
                  </div>
                </TableCell>
                <TableCell>{{ reportTypeLabel(report.reportType) }}</TableCell>
                <TableCell>
                  <Badge :variant="badgeVariant(report.status)">{{ formatEnumLabel(report.status) }}</Badge>
                </TableCell>
                <TableCell>{{ formatDateTime(report.updatedAt) }}</TableCell>
                <TableCell class="text-right">
                  <div class="flex justify-end gap-2">
                    <Button size="sm" variant="secondary" @click="openReport(report.id)">
                      Открыть
                    </Button>
                    <Button
                      v-if="auth.can('reports.archive')"
                      size="sm"
                      variant="outline"
                      :disabled="reports.archiveLoadingId.value === report.id"
                      @click="reports.archiveReport(report.id)"
                    >
                      Архивировать
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </template>
  </template>
</template>
