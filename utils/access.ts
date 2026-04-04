import type { UserRole } from "~/graphql/types";

export type AppPermission =
  | "dashboard.view"
  | "profile.view"
  | "procurements.view"
  | "analytics.view"
  | "reports.generate"
  | "reports.archive"
  | "sources.view"
  | "jobs.view"
  | "collectors.run"
  | "reports.view"
  | "scraper-admin.view"
  | "scraper-admin.manage"
  | "users.view"
  | "users.manage"
  | "users.reset-password";

export type PermissionDefinition = {
  key: AppPermission;
  label: string;
  description: string;
  category: "Базовый контур" | "Аналитика" | "Инженерия парсеров" | "Администрирование";
};

export const PERMISSION_DEFINITIONS: PermissionDefinition[] = [
  {
    key: "dashboard.view",
    label: "Дашборд",
    description: "Просмотр оперативной сводки по системе.",
    category: "Базовый контур"
  },
  {
    key: "procurements.view",
    label: "Закупки",
    description: "Доступ к реестру закупок и карточкам записей.",
    category: "Базовый контур"
  },
  {
    key: "profile.view",
    label: "Профиль",
    description: "Просмотр и управление собственной сессией.",
    category: "Базовый контур"
  },
  {
    key: "analytics.view",
    label: "Аналитика",
    description: "Доступ к аналитическим метрикам и риск-сигналам.",
    category: "Аналитика"
  },
  {
    key: "sources.view",
    label: "Источники",
    description: "Просмотр состояния подключённых источников и контуров сбора.",
    category: "Инженерия парсеров"
  },
  {
    key: "jobs.view",
    label: "Отчёты парсеров",
    description: "Журнал запусков, ошибок и технических инцидентов по сборщикам.",
    category: "Инженерия парсеров"
  },
  {
    key: "reports.generate",
    label: "Формирование отчётов",
    description: "Ручной запуск пересчёта доступных для роли сценариев отчётности.",
    category: "Аналитика"
  },
  {
    key: "reports.view",
    label: "Отчёты",
    description: "Доступ к ролевому контуру отчётности платформы.",
    category: "Аналитика"
  },
  {
    key: "reports.archive",
    label: "Архив отчётов",
    description: "Удаление устаревших версий отчётов из активного реестра.",
    category: "Администрирование"
  },
  {
    key: "collectors.run",
    label: "Коллекторы",
    description: "Ручной запуск сборщиков данных.",
    category: "Инженерия парсеров"
  },
  {
    key: "scraper-admin.view",
    label: "Контур парсеров",
    description: "Просмотр runtime-состояния, circuit breaker и здоровья парсеров.",
    category: "Инженерия парсеров"
  },
  {
    key: "scraper-admin.manage",
    label: "Администрирование парсеров",
    description: "Управление расписанием, автозапуском и контролем здоровья парсеров.",
    category: "Администрирование"
  },
  {
    key: "users.view",
    label: "Пользователи",
    description: "Просмотр списка пользователей и их ролей.",
    category: "Администрирование"
  },
  {
    key: "users.manage",
    label: "Управление пользователями",
    description: "Создание, смена ролей, активация и деактивация учётных записей.",
    category: "Администрирование"
  },
  {
    key: "users.reset-password",
    label: "Сброс пароля",
    description: "Назначение нового пароля пользователю администратором.",
    category: "Администрирование"
  }
];

const USER_PERMISSIONS: AppPermission[] = [
  "dashboard.view",
  "profile.view"
];

const ANALYST_PERMISSIONS: AppPermission[] = [
  ...USER_PERMISSIONS,
  "procurements.view",
  "analytics.view",
  "sources.view",
  "reports.view",
  "reports.generate"
];

const DEVELOPER_PERMISSIONS: AppPermission[] = [
  ...USER_PERMISSIONS,
  "sources.view",
  "jobs.view",
  "collectors.run",
  "scraper-admin.view",
  "reports.view",
  "reports.generate"
];

const ADMIN_PERMISSIONS: AppPermission[] = [
  ...new Set([...ANALYST_PERMISSIONS, ...DEVELOPER_PERMISSIONS]),
  "reports.archive",
  "scraper-admin.manage",
  "users.view",
  "users.manage",
  "users.reset-password"
] as AppPermission[];

export const ROLE_PERMISSION_MAP: Record<UserRole, AppPermission[]> = {
  USER: USER_PERMISSIONS,
  ANALYST: ANALYST_PERMISSIONS,
  DEVELOPER: DEVELOPER_PERMISSIONS,
  ADMIN: ADMIN_PERMISSIONS
};

export function getRolePermissions(role: UserRole | null | undefined): PermissionDefinition[] {
  if (!role) {
    return [];
  }

  const allowed = new Set(ROLE_PERMISSION_MAP[role]);
  return PERMISSION_DEFINITIONS.filter((permission) => allowed.has(permission.key));
}

export function roleHasPermission(
  role: UserRole | null | undefined,
  permission: AppPermission
): boolean {
  return Boolean(role && ROLE_PERMISSION_MAP[role].includes(permission));
}
