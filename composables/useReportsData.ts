import { REPORTS_QUERY } from "~/graphql/documents";
import type { Report } from "~/graphql/types";

export function useReportsData() {
  const apollo = useApollo();
  const { loading, error, begin, fail, finish } = useRequestState(true);
  const reports = ref<Report[]>([]);

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

  return {
    loading,
    error,
    reports,
    load
  };
}
