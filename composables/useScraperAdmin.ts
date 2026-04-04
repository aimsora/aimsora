import {
  SCRAPER_ADMIN_OVERVIEW_QUERY,
  UPDATE_SCRAPER_ADMIN_CONFIG_MUTATION
} from "~/graphql/documents";
import type { ScraperAdminConfig, ScraperAdminOverview } from "~/graphql/types";

export function useScraperAdmin() {
  const apollo = useApollo();
  const toast = useToast();
  const { loading, error, begin, fail, finish } = useRequestState(true);
  const overview = ref<ScraperAdminOverview | null>(null);
  const saveLoading = ref(false);

  async function load() {
    begin();

    try {
      const result = await apollo.query<{ scraperAdminOverview: ScraperAdminOverview }>({
        query: SCRAPER_ADMIN_OVERVIEW_QUERY,
        fetchPolicy: "network-only"
      });
      const data = requireRequestData(result.data, "Не удалось загрузить управление парсерами");

      overview.value = data.scraperAdminOverview;
    } catch (caught) {
      fail(caught, "Не удалось загрузить управление парсерами");
    } finally {
      finish();
    }
  }

  async function save(input: { schedule: string; autoRunEnabled: boolean }) {
    saveLoading.value = true;

    try {
      const result = await apollo.mutate<{ updateScraperAdminConfig: ScraperAdminConfig }>({
        mutation: UPDATE_SCRAPER_ADMIN_CONFIG_MUTATION,
        variables: {
          input
        }
      });

      if (!result.data?.updateScraperAdminConfig) {
        throw new Error("Не удалось сохранить конфигурацию");
      }

      toast.success("Настройки сохранены", "Новое расписание применено к scraper-service.");
      await load();
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Попробуйте ещё раз.";
      toast.error("Не удалось обновить настройки", message);
      throw caught;
    } finally {
      saveLoading.value = false;
    }
  }

  return {
    loading,
    error,
    overview,
    saveLoading,
    load,
    save
  };
}
