import { DASHBOARD_QUERY } from "~/graphql/documents";
import type { DashboardSummary } from "~/graphql/types";

export function useDashboardData() {
  const apollo = useApollo();
  const { loading, error, begin, fail, finish } = useRequestState(true);
  const summary = ref<DashboardSummary | null>(null);

  async function load() {
    begin();

    try {
      const result = await apollo.query<{ dashboardSummary: DashboardSummary }>({
        query: DASHBOARD_QUERY,
        fetchPolicy: "network-only"
      });
      const data = requireRequestData(result.data, "Не удалось загрузить дашборд");

      summary.value = data.dashboardSummary;
    } catch (caught) {
      fail(caught, "Не удалось загрузить дашборд");
    } finally {
      finish();
    }
  }

  return {
    loading,
    error,
    summary,
    load
  };
}
