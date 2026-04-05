import { PROCUREMENTS_QUERY, SOURCES_QUERY } from "~/graphql/documents";
import type { Procurement, ProcurementPage, ProcurementStatus, Source } from "~/graphql/types";

export function useProcurementsData() {
  const apollo = useApollo();
  const { loading, error, begin, fail, finish } = useRequestState();
  const filters = reactive<{
    search: string;
    source: string;
    status: ProcurementStatus | "";
  }>({
    search: "",
    source: "",
    status: ""
  });
  const total = ref(0);
  const items = ref<Procurement[]>([]);
  const sources = ref<Source[]>([]);
  const page = ref(1);
  const pageSize = 12;

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
      const result = await apollo.query<{ procurementItems: ProcurementPage }>({
        query: PROCUREMENTS_QUERY,
        variables: {
          filter:
            filters.search || filters.source || filters.status
              ? {
                  ...(filters.search ? { search: filters.search } : {}),
                  ...(filters.source ? { source: filters.source } : {}),
                  ...(filters.status ? { status: filters.status } : {})
                }
              : undefined,
          sort: { field: "UPDATED_AT", direction: "DESC" },
          limit: pageSize,
          offset: (page.value - 1) * pageSize
        },
        fetchPolicy: "network-only"
      });
      const data = requireRequestData(result.data, "Не удалось загрузить закупки");

      items.value = data.procurementItems.items;
      total.value = data.procurementItems.total;
    } catch (caught) {
      fail(caught, "Не удалось загрузить закупки");
    } finally {
      finish();
    }
  }

  async function submitFilters() {
    page.value = 1;
    await load();
  }

  async function resetFilters() {
    filters.search = "";
    filters.source = "";
    filters.status = "";
    page.value = 1;
    await load();
  }

  async function setPage(value: number) {
    page.value = value;
    await load();
  }

  return {
    loading,
    error,
    total,
    items,
    sources,
    filters,
    page,
    pageSize,
    load,
    loadSources,
    submitFilters,
    resetFilters,
    setPage
  };
}
