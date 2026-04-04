import type {
  ProcurementStatus,
  ReportStatus,
  SourceKind,
  SourceRunStatus,
  UserRole
} from "~/graphql/types";

const dateTimeFormatter = new Intl.DateTimeFormat("ru-RU", {
  dateStyle: "medium",
  timeStyle: "short"
});

const dateFormatter = new Intl.DateTimeFormat("ru-RU", {
  dateStyle: "medium"
});

const wholeNumberFormatter = new Intl.NumberFormat("ru-RU", {
  maximumFractionDigits: 0
});

const compactNumberFormatter = new Intl.NumberFormat("ru-RU", {
  notation: "compact",
  maximumFractionDigits: 1
});

const labels = {
  USER: "Пользователь",
  ANALYST: "Аналитик",
  DEVELOPER: "Разработчик",
  ADMIN: "Администратор",
  DRAFT: "Черновик",
  ACTIVE: "Активна",
  CLOSED: "Завершена",
  ARCHIVED: "В архиве",
  EASUZ: "ЕАСУЗ",
  EIS: "ЕИС",
  FEDRESURS: "Федресурс",
  FNS: "ФНС",
  GISTORGI: "ГИС Торги",
  RNP: "РНП",
  PENDING: "В очереди",
  RUNNING: "Выполняется",
  SUCCESS: "Успешно",
  PARTIAL: "Частично",
  FAILED: "Ошибка",
  READY: "Готов"
} satisfies Record<
  UserRole | ProcurementStatus | SourceKind | SourceRunStatus | ReportStatus,
  string
>;

export function formatEnumLabel(value?: string | null) {
  if (!value) {
    return "Нет данных";
  }

  return labels[value as keyof typeof labels] ?? value;
}

export function formatRoleLabel(value?: UserRole | null) {
  return formatEnumLabel(value);
}

export function formatDateTime(value?: string | null) {
  if (!value) {
    return "Нет данных";
  }

  return dateTimeFormatter.format(new Date(value));
}

export function formatDate(value?: string | null) {
  if (!value) {
    return "Нет данных";
  }

  return dateFormatter.format(new Date(value));
}

export function formatNumber(value?: number | null) {
  if (value === null || value === undefined) {
    return "0";
  }

  return wholeNumberFormatter.format(value);
}

export function formatCompactNumber(value?: number | null) {
  if (value === null || value === undefined) {
    return "0";
  }

  return compactNumberFormatter.format(value);
}

export function formatPercent(value?: number | null) {
  if (value === null || value === undefined) {
    return "0%";
  }

  return `${new Intl.NumberFormat("ru-RU", {
    maximumFractionDigits: 1
  }).format(value)}%`;
}

export function formatCurrency(amount?: number | null, currency?: string | null) {
  if (amount === null || amount === undefined) {
    return "Нет данных";
  }

  if (!currency) {
    return formatNumber(amount);
  }

  try {
    return new Intl.NumberFormat("ru-RU", {
      style: "currency",
      currency,
      maximumFractionDigits: 0
    }).format(amount);
  } catch {
    return `${formatNumber(amount)} ${currency}`;
  }
}

export function formatDuration(startedAt?: string | null, finishedAt?: string | null) {
  if (!startedAt || !finishedAt) {
    return "Нет данных";
  }

  const duration = new Date(finishedAt).getTime() - new Date(startedAt).getTime();

  if (!Number.isFinite(duration) || duration <= 0) {
    return "Нет данных";
  }

  const totalMinutes = Math.round(duration / 60000);
  if (totalMinutes < 1) {
    return "< 1 мин";
  }

  if (totalMinutes < 60) {
    return `${totalMinutes} мин`;
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes > 0 ? `${hours} ч ${minutes} мин` : `${hours} ч`;
}

export function badgeVariant(value?: string | null) {
  const normalized = (value ?? "").toUpperCase();

  if (["SUCCESS", "READY", "ACTIVE"].includes(normalized)) {
    return "success" as const;
  }

  if (["FAILED", "ARCHIVED"].includes(normalized)) {
    return "destructive" as const;
  }

  if (["PARTIAL", "PENDING", "RUNNING", "CLOSED", "ANALYST", "DEVELOPER"].includes(normalized)) {
    return "warning" as const;
  }

  return "secondary" as const;
}
