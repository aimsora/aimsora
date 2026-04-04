import { SOURCES_QUERY, SOURCE_RUNS_QUERY } from "~/graphql/documents";
import type { Source, SourceRun } from "~/graphql/types";

export function useSourcesData() {
  const apollo = useApollo();
  const { loading, error, begin, fail, finish } = useRequestState(true);
  const sources = ref<Source[]>([]);
  const runs = ref<SourceRun[]>([]);

  async function load() {
    begin();

    try {
      const [sourcesResult, runsResult] = await Promise.all([
        apollo.query<{ sources: Source[] }>({
          query: SOURCES_QUERY,
          fetchPolicy: "network-only"
        }),
        apollo.query<{ sourceRuns: SourceRun[] }>({
          query: SOURCE_RUNS_QUERY,
          variables: { limit: 20 },
          fetchPolicy: "network-only"
        })
      ]);

      const sourcesData = requireRequestData(sourcesResult.data, "Не удалось загрузить источники");
      const runsData = requireRequestData(runsResult.data, "Не удалось загрузить источники");

      sources.value = sourcesData.sources;
      runs.value = runsData.sourceRuns;
    } catch (caught) {
      fail(caught, "Не удалось загрузить источники");
    } finally {
      finish();
    }
  }

  return {
    loading,
    error,
    sources,
    runs,
    load
  };
}
