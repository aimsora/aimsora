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

      item.value = data.report;
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
