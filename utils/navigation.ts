import type { UserRole } from "~/graphql/types";

export type AppNavigationItem = {
  title: string;
  href: string;
  description: string;
  roles?: UserRole[];
};

export type AppNavigationGroup = {
  title: string;
  items: AppNavigationItem[];
};

export const APP_NAVIGATION_GROUPS: AppNavigationGroup[] = [
  {
    title: "Рабочее пространство",
    items: [
      {
        title: "Дашборд",
        href: "/dashboard",
        description: "Оперативная сводка по системе"
      }
    ]
  },
  {
    title: "Аналитика",
    items: [
      {
        title: "Закупки",
        href: "/procurements",
        description: "Реестр закупок и фильтры",
        roles: ["ANALYST", "ADMIN"]
      },
      {
        title: "Аналитика",
        href: "/analytics",
        description: "Риски, сроки и качество потока",
        roles: ["ANALYST", "ADMIN"]
      }
    ]
  },
  {
    title: "Парсеры",
    items: [
      {
        title: "Источники",
        href: "/sources",
        description: "Состояние подключённых источников",
        roles: ["ANALYST", "DEVELOPER", "ADMIN"]
      },
      {
        title: "Коллекторы",
        href: "/collectors",
        description: "Ручной запуск сборщиков",
        roles: ["DEVELOPER", "ADMIN"]
      },
      {
        title: "Отчёты парсеров",
        href: "/jobs",
        description: "Инциденты, ошибки и журнал работы сборщиков",
        roles: ["DEVELOPER", "ADMIN"]
      }
    ]
  },
  {
    title: "Отчёты",
    items: [
      {
        title: "Отчёты",
        href: "/reports",
        description: "Ролевой контур аналитических и инженерных отчётов",
        roles: ["ANALYST", "DEVELOPER", "ADMIN"]
      }
    ]
  },
  {
    title: "Администрирование",
    items: [
      {
        title: "Парсеры",
        href: "/admin/parsers",
        description: "Контур управления и здоровья сборщиков",
        roles: ["DEVELOPER", "ADMIN"]
      },
      {
        title: "Пользователи",
        href: "/users",
        description: "Роли и доступ пользователей",
        roles: ["ADMIN"]
      }
    ]
  }
];
