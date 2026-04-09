<script setup lang="ts">
import {
  REPORT_SECTION_META,
  REPORT_TYPE_CADENCES,
  REPORT_TYPE_DESCRIPTIONS,
  REPORT_TYPE_LABELS,
  getReportTypesForSection,
  type ReportSectionId
} from "~/utils/report-sections";

const props = defineProps<{
  sectionId: ReportSectionId;
}>();

const auth = useAuthSession();
const reports = useReportsData();
const section = computed(() => REPORT_SECTION_META[props.sectionId]);
const sectionReportTypes = computed(() => getReportTypesForSection(props.sectionId));
const sectionReports = computed(() =>
  reports.reports.value.filter((item) => sectionReportTypes.value.includes(item.reportType))
);
const sectionCards = computed(() =>
  sectionReportTypes.value.map((reportType) => {
    const items = sectionReports.value.filter((item) => item.reportType === reportType);
    const latest = items[0] ?? null;

    return {
      reportType,
      label: reportTypeLabel(reportType),
      description: reportTypeDescription(reportType),
      cadence: reportTypeCadence(reportType),
      latest,
      historyCount: items.length
    };
  })
);
const summaryCards = computed(() => [
  {
    label: "Всего отчётов",
    value: formatNumber(sectionReports.value.length),
    hint: `Все версии внутри раздела «${section.value.navTitle.toLowerCase()}»`
  },
  {
    label: "Готовы к чтению",
    value: formatNumber(sectionReports.value.filter((item) => item.status === "READY").length),
    hint: "Можно открывать и использовать в работе"
  },
  {
    label: "Проблемные",
    value: formatNumber(sectionReports.value.filter((item) => item.status === "FAILED").length),
    hint: "Требуют внимания или перегенерации"
  },
  {
    label: "Шаблоны раздела",
    value: formatNumber(sectionCards.value.length),
    hint: "Сколько сценариев отчётности собрано в этом направлении"
  }
]);

function reportTypeLabel(reportType?: string | null) {
  return REPORT_TYPE_LABELS[reportType ?? ""] ?? "Оперативный отчёт";
}

function reportTypeDescription(reportType?: string | null) {
  return REPORT_TYPE_DESCRIPTIONS[reportType ?? ""] ?? "Структурированный аналитический сценарий.";
}

function reportTypeCadence(reportType?: string | null) {
  return REPORT_TYPE_CADENCES[reportType ?? ""] ?? "По расписанию";
}

function openReport(reportId: string) {
  return navigateTo({
    path: `/reports/${reportId}`,
    query: {
      section: props.sectionId
    }
  });
}

function generateSectionReports() {
  return reports.refreshReports(sectionReportTypes.value);
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

  <PageHeader :title="section.pageTitle" :description="section.pageDescription">
    <template #actions>
      <div class="flex gap-2">
        <Button
          v-if="auth.can('reports.generate')"
          :disabled="reports.refreshLoading.value"
          @click="generateSectionReports()"
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

    <section :id="`section-${props.sectionId}`" class="space-y-4 scroll-mt-24">
      <Card :class="`border-border/70 bg-gradient-to-br ${section.accent}`">
        <CardHeader class="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div class="space-y-2">
            <div class="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{{ section.navTitle }}</Badge>
              <Badge variant="outline">{{ formatNumber(sectionReports.length) }} версий</Badge>
            </div>
            <div class="space-y-1">
              <CardTitle>{{ section.label }}</CardTitle>
              <CardDescription>{{ section.description }}</CardDescription>
            </div>
          </div>
          <Button variant="secondary" as-child>
            <a href="#top">Наверх</a>
          </Button>
        </CardHeader>
      </Card>

      <div class="grid gap-4 xl:grid-cols-3">
        <Card
          v-for="card in sectionCards"
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
            Версии только для раздела «{{ section.navTitle.toLowerCase() }}».
          </CardDescription>
        </CardHeader>
        <CardContent v-if="sectionReports.length === 0" class="pt-0">
          <EmptyState
            :title="section.emptyTitle"
            :description="section.emptyDescription"
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
              <TableRow v-for="report in sectionReports" :key="report.id">
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
