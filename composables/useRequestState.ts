function toRequestErrorMessage(caught: unknown, fallbackMessage: string) {
  return caught instanceof Error ? caught.message : fallbackMessage;
}

export function requireRequestData<T>(data: T | null | undefined, fallbackMessage: string): T {
  if (!data) {
    throw new Error(fallbackMessage);
  }

  return data;
}

export function useRequestState(initialLoading = false) {
  const loading = ref(initialLoading);
  const error = ref("");

  function begin() {
    loading.value = true;
    error.value = "";
  }

  function fail(caught: unknown, fallbackMessage: string) {
    error.value = toRequestErrorMessage(caught, fallbackMessage);
  }

  function finish() {
    loading.value = false;
  }

  return {
    loading,
    error,
    begin,
    fail,
    finish
  };
}
