import {
  SCRAPER_ADMIN_OVERVIEW_QUERY,
  TRIGGER_COLLECTORS_MUTATION,
  UPDATE_SCRAPER_ADMIN_SOURCE_STATE_MUTATION,
  UPDATE_SCRAPER_ADMIN_CONFIG_MUTATION
} from "~/graphql/documents";
import type {
  CollectorTriggerResult,
  ScraperAdminConfig,
  ScraperAdminOverview
} from "~/graphql/types";

export function useScraperAdmin() {
  const apollo = useApollo();
  const toast = useToast();
  const { loading, error, begin, fail, finish } = useRequestState(true);
  const overview = ref<ScraperAdminOverview | null>(null);
  const saveLoading = ref(false);
  const sourceUpdateCodes = ref<string[]>([]);
  const sourceRunCodes = ref<string[]>([]);

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

  function markPending(list: { value: string[] }, sourceCode: string) {
    if (!list.value.includes(sourceCode)) {
      list.value = [...list.value, sourceCode];
    }
  }

  function clearPending(list: { value: string[] }, sourceCode: string) {
    list.value = list.value.filter((item) => item !== sourceCode);
  }

  function isSourceUpdating(sourceCode: string) {
    return sourceUpdateCodes.value.includes(sourceCode);
  }

  function isSourceRunning(sourceCode: string) {
    return sourceRunCodes.value.includes(sourceCode);
  }

  async function updateSourceState(input: { sourceCode: string; isActive: boolean }) {
    markPending(sourceUpdateCodes, input.sourceCode);

    try {
      const result = await apollo.mutate<{ updateScraperAdminSourceState: ScraperAdminConfig }>({
        mutation: UPDATE_SCRAPER_ADMIN_SOURCE_STATE_MUTATION,
        variables: {
          input
        }
      });

      if (!result.data?.updateScraperAdminSourceState) {
        throw new Error("Не удалось обновить состояние источника");
      }

      toast.success(
        input.isActive ? "Источник включён" : "Источник отключён",
        input.isActive
          ? "Источник снова участвует в плановом и ручном сборе."
          : "Источник исключён из планового и ручного сбора."
      );
      await load();
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Попробуйте ещё раз.";
      toast.error("Не удалось обновить источник", message);
      throw caught;
    } finally {
      clearPending(sourceUpdateCodes, input.sourceCode);
    }
  }

  async function runSource(sourceCode: string) {
    markPending(sourceRunCodes, sourceCode);

    try {
      const result = await apollo.mutate<{ triggerCollectors: CollectorTriggerResult }>({
        mutation: TRIGGER_COLLECTORS_MUTATION,
        variables: {
          sourceCodes: [sourceCode]
        }
      });

      const payload = result.data?.triggerCollectors;
      const item = payload?.items?.[0];

      if (!payload || !item) {
        throw new Error("Не удалось получить ответ от сервиса сборщиков");
      }

      if (!item.accepted) {
        toast.warning("Ручной запуск не принят", item.message || "Источник пока недоступен для запуска.");
        return;
      }

      toast.success(
        "Ручной запуск отправлен",
        item.sourceName ? `${item.sourceName} поставлен в очередь выполнения.` : undefined
      );
      await load();
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Попробуйте ещё раз.";
      toast.error("Не удалось запустить источник", message);
      throw caught;
    } finally {
      clearPending(sourceRunCodes, sourceCode);
    }
  }

  return {
    loading,
    error,
    overview,
    saveLoading,
    sourceUpdateCodes,
    sourceRunCodes,
    load,
    save,
    isSourceUpdating,
    isSourceRunning,
    updateSourceState,
    runSource
  };
}
