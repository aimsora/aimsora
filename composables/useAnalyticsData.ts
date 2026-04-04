import { ANALYTICS_QUERY } from "~/graphql/documents";
import type { AnalyticsSummary } from "~/graphql/types";

export function useAnalyticsData() {
  const apollo = useApollo();
  const { loading, error, begin, fail, finish } = useRequestState(true);
  const summary = ref<AnalyticsSummary | null>(null);

  async function load() {
    begin();

    try {
      const result = await apollo.query<{ analyticsSummary: AnalyticsSummary }>({
        query: ANALYTICS_QUERY,
        fetchPolicy: "network-only"
      });
      const data = requireRequestData(result.data, "Не удалось загрузить аналитику");

      summary.value = data.analyticsSummary;
    } catch (caught) {
      fail(caught, "Не удалось загрузить аналитику");
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
