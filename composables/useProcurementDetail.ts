import { PROCUREMENT_QUERY } from "~/graphql/documents";
import type { Procurement } from "~/graphql/types";

export function useProcurementDetail() {
  const apollo = useApollo();
  const { loading, error, begin, fail, finish } = useRequestState(true);
  const item = ref<Procurement | null>(null);

  async function load(id: string) {
    begin();

    try {
      const result = await apollo.query<{ procurementItem: Procurement | null }>({
        query: PROCUREMENT_QUERY,
        variables: { id },
        fetchPolicy: "network-only"
      });
      const data = requireRequestData(result.data, "Не удалось загрузить закупку");

      item.value = data.procurementItem;
    } catch (caught) {
      fail(caught, "Не удалось загрузить закупку");
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
