<script setup lang="ts">
definePageMeta({
  title: "Отчёты",
  description: "Оперативные аналитические отчёты платформы",
  roles: ["ANALYST", "DEVELOPER", "ADMIN"]
});

useHead({
  title: "Отчёты"
});

type ReportSectionId = "analytics" | "suppliers" | "npp" | "parsers";

const route = useRoute();
const auth = useAuthSession();
const reports = useReportsData();

const reportTypeLabels: Record<string, string> = {
  "daily-overview": "Аналитическая сводка по закупкам",
  "supplier-risk": "Риски и концентрация поставщиков",
  "supplier-due-diligence": "Проверка благонадёжности поставщиков",
  "npp-station-orders": "Закупочная активность АЭС",
  "pipeline-incident": "Стабильность парсеров и публикации"
};

const reportTypeDescriptions: Record<string, string> = {
  "daily-overview": "Сводный отчет по объему закупок, срокам, публикациям и актуальности данных.",
  "supplier-risk": "Отчет по концентрации, риск-сигналам и закупкам, требующим внимания по поставщикам.",
  "supplier-due-diligence": "Проверка контрагентов по ФНС, Федресурсу, РНП и собственной закупочной активности.",
  "npp-station-orders": "Аналитика по станциям: какие закупки публиковались, где есть договорный след и как менялась активность.",
  "pipeline-incident": "Отчет по сбоям запусков, потерям публикации и нестабильности источников."
};

const reportTypeCadences: Record<string, string> = {
  "daily-overview": "Каждые 12 часов",
  "supplier-risk": "Каждые 24 часа",
  "supplier-due-diligence": "Каждые 24 часа",
  "npp-station-orders": "Каждые 12 часов",
  "pipeline-incident": "Каждые 6 часов"
};

const reportTypeSection: Record<string, ReportSectionId> = {
  "daily-overview": "analytics",
  "supplier-risk": "suppliers",
  "supplier-due-diligence": "suppliers",
  "npp-station-orders": "npp",
  "pipeline-incident": "parsers"
};

const sectionMeta: Record<
  ReportSectionId,
  { tabLabel: string; label: string; description: string; accent: string; emptyTitle: string; emptyDescription: string }
> = {
  analytics: {
    tabLabel: "Отчёты - аналитика",
    label: "Аналитика",
    description: "Сводные отчеты по закупочному контуру, публикационной активности и актуальности данных.",
    accent: "from-sky-500/10 via-background to-background",
    emptyTitle: "Нет отчетов по аналитике",
    emptyDescription: "Когда сервер сформирует обзорные сценарии, они появятся в этой вкладке."
  },
  suppliers: {
    tabLabel: "Отчёты - поставщики",
    label: "Поставщики",
    description: "Отчеты по рискам, благонадёжности, концентрации и активности контрагентов.",
    accent: "from-amber-500/10 via-background to-background",
    emptyTitle: "Нет отчетов по поставщикам",
    emptyDescription: "После следующей генерации здесь появятся сценарии по поставщикам."
  },
  npp: {
    tabLabel: "Отчёты - закупки АЭС",
    label: "Закупки АЭС",
    description: "Отчеты по атомным станциям: закупки, договорный слой и история публикаций.",
    accent: "from-emerald-500/10 via-background to-background",
    emptyTitle: "Нет отчетов по закупкам АЭС",
    emptyDescription: "Когда сервер пересчитает станционные сценарии, они появятся здесь."
  },
  parsers: {
    tabLabel: "Отчёты - парсеры",
    label: "Парсеры",
    description: "Технические отчеты по проблемным запускам, качеству публикации и стабильности конвейера.",
    accent: "from-rose-500/10 via-background to-background",
    emptyTitle: "Нет отчетов по парсерам",
    emptyDescription: "После следующего запуска системы здесь появятся технические отчёты по парсерам."
  }
};

const roleVisibleSections: Record<string, ReportSectionId[]> = {
  ANALYST: ["analytics", "suppliers", "npp"],
  DEVELOPER: ["parsers"],
  ADMIN: ["analytics", "suppliers", "npp", "parsers"]
};

const visibleSections = computed(() => roleVisibleSections[auth.user.value?.role ?? ""] ?? []);
const visibleReportTypes = computed(() =>
  Object.entries(reportTypeSection)
    .filter(([, sectionId]) => visibleSections.value.includes(sectionId))
    .map(([reportType]) => reportType)
);
const visibleReports = computed(() =>
  reports.reports.value.filter((item) => visibleReportTypes.value.includes(item.reportType))
);
const selectedSection = computed<ReportSectionId | null>(() => {
  const rawSection = route.query.section;
  const requestedSection = typeof rawSection === "string" ? rawSection : null;

  if (requestedSection && visibleSections.value.includes(requestedSection as ReportSectionId)) {
    return requestedSection as ReportSectionId;
  }

  return visibleSections.value[0] ?? null;
});

const activeSection = computed(() => {
  if (!selectedSection.value) {
    return null;
  }

  const sectionId = selectedSection.value;
  const sectionReportTypes = visibleReportTypes.value.filter((reportType) => reportTypeSection[reportType] === sectionId);
  const sectionReports = visibleReports.value.filter((item) => reportTypeSection[item.reportType] === sectionId);
  const cards = sectionReportTypes.map((reportType) => {
    const items = sectionReports.filter((item) => item.reportType === reportType);
    const latest = items[0] ?? null;

    return {
      reportType,
      label: reportTypeLabel(reportType),
      description: reportTypeDescription(reportType),
      cadence: reportTypeCadence(reportType),
      latest,
      historyCount: items.length
    };
  });

  return {
    id: sectionId,
    ...sectionMeta[sectionId],
    reports: sectionReports,
    cards
  };
});

const pageDescription = computed(() => {
  if (auth.isDeveloper.value) {
    return "Отдельная витрина по парсерам: проблемные запуски, сбои публикации и нестабильные источники.";
  }

  return "Отчёты разнесены по направлениям: аналитика, поставщики и закупки АЭС.";
});

const summaryCards = computed(() => [
  {
    label: "Всего отчётов",
    value: formatNumber(visibleReports.value.length),
    hint: auth.isDeveloper.value ? "Доступные инженерные версии" : "Все версии, доступные для текущей роли"
  },
  {
    label: auth.isDeveloper.value ? "Стабильные парсерные срезы" : "Готовы к чтению",
    value: formatNumber(visibleReports.value.filter((item) => item.status === "READY").length),
    hint: "Можно открывать и использовать в работе"
  },
  {
    label: "Проблемные",
    value: formatNumber(visibleReports.value.filter((item) => item.status === "FAILED").length),
    hint: "Требуют внимания или перегенерации"
  },
  {
    label: "Вкладок",
    value: formatNumber(visibleSections.value.length),
    hint: selectedSection.value ? `Активна: ${sectionMeta[selectedSection.value].label}` : "Разделы отчётности для текущей роли"
  }
]);

function reportTypeLabel(reportType?: string | null) {
  return reportTypeLabels[reportType ?? ""] ?? "Оперативный отчёт";
}

function reportTypeDescription(reportType?: string | null) {
  return reportTypeDescriptions[reportType ?? ""] ?? "Структурированный аналитический сценарий.";
}

function reportTypeCadence(reportType?: string | null) {
  return reportTypeCadences[reportType ?? ""] ?? "По расписанию";
}

function sectionLink(sectionId: ReportSectionId) {
  return {
    path: "/reports",
    query: {
      section: sectionId
    }
  };
}

function sectionCount(sectionId: ReportSectionId) {
  return visibleReports.value.filter((item) => reportTypeSection[item.reportType] === sectionId).length;
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
  <div id="top" />

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

    <Card class="border-border/70">
      <CardHeader>
        <CardTitle>Вкладки отчетов</CardTitle>
        <CardDescription>
          Каждый раздел показывает только свои шаблоны отчетов и свою историю версий.
        </CardDescription>
      </CardHeader>
      <CardContent class="space-y-4">
        <div class="flex flex-wrap gap-2">
          <NuxtLink
            v-for="sectionId in visibleSections"
            :key="sectionId"
            :to="sectionLink(sectionId)"
            class="inline-flex items-center rounded-full border px-3 py-2 text-sm transition"
            :class="
              selectedSection === sectionId
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-background text-foreground hover:border-primary/40'
            "
          >
            {{ sectionMeta[sectionId].tabLabel }}
          </NuxtLink>
        </div>

        <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <NuxtLink
            v-for="sectionId in visibleSections"
            :key="`section-${sectionId}`"
            :to="sectionLink(sectionId)"
            class="rounded-2xl border bg-muted/20 p-4 transition hover:border-primary/40 hover:bg-muted/30"
          >
            <div class="space-y-2">
              <div class="flex items-center justify-between gap-3">
                <Badge variant="secondary">{{ sectionMeta[sectionId].label }}</Badge>
                <span class="text-sm text-muted-foreground">{{ formatNumber(sectionCount(sectionId)) }}</span>
              </div>
              <p class="text-sm text-muted-foreground">{{ sectionMeta[sectionId].description }}</p>
            </div>
          </NuxtLink>
        </div>
      </CardContent>
    </Card>

    <Card v-if="!activeSection">
      <CardContent class="pt-6">
        <EmptyState
          title="Раздел недоступен"
          description="Для текущей роли нет доступных вкладок отчётности."
        />
      </CardContent>
    </Card>

    <template v-else>
      <section
        :id="`section-${activeSection.id}`"
        class="space-y-4 scroll-mt-24"
      >
        <Card :class="`border-border/70 bg-gradient-to-br ${activeSection.accent}`">
          <CardHeader class="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div class="space-y-2">
              <div class="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">{{ activeSection.tabLabel }}</Badge>
                <Badge variant="outline">{{ formatNumber(activeSection.reports.length) }} версий</Badge>
              </div>
              <div class="space-y-1">
                <CardTitle>{{ activeSection.label }}</CardTitle>
                <CardDescription>{{ activeSection.description }}</CardDescription>
              </div>
            </div>
            <Button variant="secondary" as-child>
              <a href="#top">Наверх</a>
            </Button>
          </CardHeader>
        </Card>

        <div class="grid gap-4 xl:grid-cols-3">
          <Card
            v-for="card in activeSection.cards"
            :key="card.reportType"
            class="border-border/70 bg-gradient-to-br from-background via-background to-muted/20"
          >
            <CardHeader class="space-y-3">
              <div class="flex items-start justify-between gap-3">
                <Badge variant="secondary">{{ card.label }}</Badge>
                <Badge variant="outline">{{ card.cadence }}</Badge>
              </div>
              <div class="space-y-1">
                <CardTitle class="text-base">Шаблон отчёта</CardTitle>
                <CardDescription>{{ card.description }}</CardDescription>
              </div>
            </CardHeader>
            <CardContent class="space-y-4 text-sm text-muted-foreground">
              <p>Версий в истории: {{ formatNumber(card.historyCount) }}</p>
              <p v-if="card.latest">
                Последняя генерация: {{ formatDateTime(card.latest.updatedAt) }}
              </p>
              <p v-else>Пока нет ни одной версии этого шаблона.</p>
              <div class="flex flex-col gap-2 pt-1">
                <Button
                  v-if="card.latest"
                  variant="secondary"
                  @click="openReport(card.latest.id)"
                >
                  Открыть последнюю версию
                </Button>
                <Button
                  v-if="auth.can('reports.generate')"
                  type="button"
                  variant="outline"
                  :disabled="reports.refreshLoading.value"
                  @click="generateByType(card.reportType)"
                >
                  Сформировать сейчас
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>История раздела</CardTitle>
            <CardDescription>
              Версии только для вкладки «{{ activeSection.label.toLowerCase() }}».
            </CardDescription>
          </CardHeader>
          <CardContent v-if="activeSection.reports.length === 0" class="pt-0">
            <EmptyState
              :title="activeSection.emptyTitle"
              :description="activeSection.emptyDescription"
            />
          </CardContent>
          <CardContent v-else class="px-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Отчёт</TableHead>
                  <TableHead>Шаблон</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead>Обновлён</TableHead>
                  <TableHead class="text-right">Действие</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow v-for="report in activeSection.reports" :key="report.id">
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
      </section>
    </template>
  </template>
</template>
