import { REPORT_QUERY } from "~/graphql/documents";
import type { ReportDetail } from "~/graphql/types";

export function useReportDetail() {
  const apollo = useApollo();
  const { loading, error, begin, fail, finish } = useRequestState(true);
  const item = ref<ReportDetail | null>(null);

  async function load(id: string) {
    begin();

    try {
      const result = await apollo.query<{ report: ReportDetail | null }>({
        query: REPORT_QUERY,
        variables: { id },
        fetchPolicy: "network-only"
      });
      const data = requireRequestData(result.data, "Не удалось загрузить отчёт");

      item.value = normalizeReportDetail(data.report);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Не удалось загрузить отчёт";

      if (
        message.includes("Отчёт недоступен") ||
        message.includes("Forbidden") ||
        message.includes("Access denied")
      ) {
        throw createError({
          statusCode: 403,
          statusMessage: "Доступ запрещён"
        });
      }

      if (message.includes("Отчёт не найден")) {
        throw createError({
          statusCode: 404,
          statusMessage: "Доступ запрещён"
        });
      }

      fail(caught, "Не удалось загрузить отчёт");
    } finally {
      finish();
    }
  }

  return {
    loading,
    error,
    item,
    load
  };
}

function normalizeReportDetail(report: ReportDetail | null): ReportDetail | null {
  if (!report) {
    return null;
  }

  return {
    ...report,
    metrics: asArray(report.metrics),
    highlights: asArray(report.highlights),
    scores: asArray(report.scores),
    actions: asArray(report.actions),
    deadlinePressure: asArray(report.deadlinePressure),
    statusMix: asArray(report.statusMix),
    amountDistribution: asArray(report.amountDistribution),
    customerExposure: asArray(report.customerExposure),
    sourceContribution: asArray(report.sourceContribution),
    sourceHealth: asArray(report.sourceHealth),
    supplierExposure: asArray(report.supplierExposure),
    supplierDueDiligence: asArray(report.supplierDueDiligence).map((item) => ({
      ...item,
      flags: asArray(item.flags)
    })),
    nppStationOrders: asArray(report.nppStationOrders).map((item) => ({
      ...item,
      orders: asArray(item.orders)
    })),
    nppNicheOrders: asArray(report.nppNicheOrders).map((item) => ({
      ...item,
      stations: asArray(item.stations),
      orders: asArray(item.orders)
    })),
    recentSourceRuns: asArray(report.recentSourceRuns),
    recentProcurements: asArray(report.recentProcurements)
  };
}

function asArray<T>(value: T[] | null | undefined): T[] {
  return Array.isArray(value) ? value : [];
}
