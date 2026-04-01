const dateTimeFormatter = new Intl.DateTimeFormat("ru-RU", {
  dateStyle: "medium",
  timeStyle: "short"
});

const dateFormatter = new Intl.DateTimeFormat("ru-RU", {
  dateStyle: "medium"
});

const compactNumberFormatter = new Intl.NumberFormat("ru-RU", {
  notation: "compact",
  maximumFractionDigits: 1
});

const wholeNumberFormatter = new Intl.NumberFormat("ru-RU", {
  maximumFractionDigits: 0
});

export function formatDateTime(value?: string | null) {
  if (!value) {
    return "n/a";
  }

  return dateTimeFormatter.format(new Date(value));
}

export function formatDate(value?: string | null) {
  if (!value) {
    return "n/a";
  }

  return dateFormatter.format(new Date(value));
}

export function formatCurrency(amount?: number | null, currency?: string | null) {
  if (amount === null || amount === undefined) {
    return "n/a";
  }

  const normalizedCurrency = currency?.trim();
  if (!normalizedCurrency) {
    return wholeNumberFormatter.format(amount);
  }

  try {
    return new Intl.NumberFormat("ru-RU", {
      style: "currency",
      currency: normalizedCurrency,
      maximumFractionDigits: 0
    }).format(amount);
  } catch {
    return `${wholeNumberFormatter.format(amount)} ${normalizedCurrency}`;
  }
}

export function formatNumber(value?: number | null) {
  if (value === null || value === undefined) {
    return "0";
  }

  return wholeNumberFormatter.format(value);
}

export function formatCompactNumber(value: number) {
  return compactNumberFormatter.format(value);
}

export function formatDuration(startedAt?: string | null, finishedAt?: string | null) {
  if (!startedAt || !finishedAt) {
    return "n/a";
  }

  const durationMs = new Date(finishedAt).getTime() - new Date(startedAt).getTime();
  if (!Number.isFinite(durationMs) || durationMs <= 0) {
    return "n/a";
  }

  const minutes = Math.round(durationMs / 60000);
  if (minutes < 1) {
    return "< 1 min";
  }

  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  const restMinutes = minutes % 60;
  return restMinutes ? `${hours} h ${restMinutes} min` : `${hours} h`;
}

export function formatEnumLabel(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function statusTone(value?: string | null) {
  const normalized = (value ?? "").toUpperCase();

  if (["READY", "SUCCESS", "ACTIVE", "ADMIN"].includes(normalized)) {
    return "is-success";
  }

  if (["PENDING", "RUNNING", "PARTIAL", "ANALYST", "CLOSED"].includes(normalized)) {
    return "is-warning";
  }

  if (["FAILED", "ARCHIVED", "DRAFT", "INACTIVE"].includes(normalized)) {
    return "is-danger";
  }

  return "is-neutral";
}
