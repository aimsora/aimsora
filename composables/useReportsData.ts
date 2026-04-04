import { ARCHIVE_REPORT_MUTATION, REFRESH_REPORTS_MUTATION, REPORTS_QUERY } from "~/graphql/documents";
import type { Report } from "~/graphql/types";

export function useReportsData() {
  const apollo = useApollo();
  const toast = useToast();
  const { loading, error, begin, fail, finish } = useRequestState(true);
  const reports = ref<Report[]>([]);
  const refreshLoading = ref(false);
  const archiveLoadingId = ref("");

  async function load() {
    begin();

    try {
      const result = await apollo.query<{ reports: Report[] }>({
        query: REPORTS_QUERY,
        fetchPolicy: "network-only"
      });
      const data = requireRequestData(result.data, "Не удалось загрузить отчёты");
      reports.value = data.reports;
    } catch (caught) {
      fail(caught, "Не удалось загрузить отчёты");
    } finally {
      finish();
    }
  }

  async function refreshReports(types?: string[]) {
    refreshLoading.value = true;

    try {
      const result = await apollo.mutate<{ refreshReports: Report[] }>({
        mutation: REFRESH_REPORTS_MUTATION,
        variables: {
          types: types?.length ? types : undefined
        }
      });
      const data = requireRequestData(result.data, "Не удалось сформировать отчёты");
      reports.value = data.refreshReports;
      toast.success("Отчёты сформированы", "Аналитические сценарии пересчитаны по текущим данным.");
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Не удалось сформировать отчёты";
      toast.error("Ошибка формирования отчётов", message);
    } finally {
      refreshLoading.value = false;
    }
  }

  async function archiveReport(id: string) {
    archiveLoadingId.value = id;

    try {
      const result = await apollo.mutate<{ archiveReport: boolean }>({
        mutation: ARCHIVE_REPORT_MUTATION,
        variables: { id }
      });
      requireRequestData(result.data, "Не удалось архивировать отчёт");
      reports.value = reports.value.filter((item) => item.id !== id);
      toast.success("Отчёт архивирован", "Версия отчёта убрана из активного реестра.");
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Не удалось архивировать отчёт";
      toast.error("Ошибка архивирования", message);
    } finally {
      archiveLoadingId.value = "";
    }
  }

  return {
    loading,
    error,
    reports,
    refreshLoading,
    archiveLoadingId,
    load,
    refreshReports,
    archiveReport
  };
}
