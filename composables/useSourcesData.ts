import { SOURCES_QUERY } from "~/graphql/documents";
import type { Source } from "~/graphql/types";

export function useSourcesData() {
  const apollo = useApollo();
  const { loading, error, begin, fail, finish } = useRequestState(true);
  const sources = ref<Source[]>([]);

  async function load() {
    begin();

    try {
      const sourcesResult = await apollo.query<{ sources: Source[] }>({
        query: SOURCES_QUERY,
        fetchPolicy: "network-only"
      });
      const sourcesData = requireRequestData(sourcesResult.data, "Не удалось загрузить источники");
      sources.value = sourcesData.sources;
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
    load
  };
}
