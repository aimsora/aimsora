import { SOURCES_QUERY, SOURCE_RUNS_QUERY } from "~/graphql/documents";
import type { Source, SourceRun } from "~/graphql/types";

export function useJobsData() {
  const apollo = useApollo();
  const { loading, error, begin, fail, finish } = useRequestState(true);
  const sourceFilter = ref("");
  const runs = ref<SourceRun[]>([]);
  const sources = ref<Source[]>([]);

  async function loadSources() {
    try {
      const result = await apollo.query<{ sources: Source[] }>({
        query: SOURCES_QUERY,
        fetchPolicy: "network-only"
      });
      const data = requireRequestData(result.data, "Не удалось загрузить источники");
      sources.value = data.sources;
    } catch {
      sources.value = [];
    }
  }

  async function load() {
    begin();

    try {
      const result = await apollo.query<{ sourceRuns: SourceRun[] }>({
        query: SOURCE_RUNS_QUERY,
        variables: {
          source: sourceFilter.value || undefined,
          limit: 30
        },
        fetchPolicy: "network-only"
      });
      const data = requireRequestData(result.data, "Не удалось загрузить запуски");
      runs.value = data.sourceRuns;
    } catch (caught) {
      fail(caught, "Не удалось загрузить запуски");
    } finally {
      finish();
    }
  }

  return {
    loading,
    error,
    sourceFilter,
    runs,
    sources,
    loadSources,
    load
  };
}
