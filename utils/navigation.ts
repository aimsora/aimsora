import type { UserRole } from "~/graphql/types";
import type { AnalyticsSectionId } from "~/utils/analytics-sections";
import type { ReportSectionId } from "~/utils/report-sections";

export type AppNavigationItem = {
  title: string;
  href: string;
  description: string;
  roles?: UserRole[];
  analyticsSection?: AnalyticsSectionId;
  reportSection?: ReportSectionId;
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
        title: "Обзор",
        href: "/analytics/overview",
        description: "Главный экран по срокам, объёмам и закупкам под вниманием",
        roles: ["ANALYST", "ADMIN"],
        analyticsSection: "overview"
      },
      {
        title: "Поставщики",
        href: "/analytics/suppliers",
        description: "Концентрация поставщиков, источники риска и качество публикации",
        roles: ["ANALYST", "ADMIN"],
        analyticsSection: "suppliers"
      },
      {
        title: "АЭС",
        href: "/analytics/npp",
        description: "Станции, заказчики, источники и динамика атомного контура",
        roles: ["ANALYST", "ADMIN"],
        analyticsSection: "npp"
      },
      {
        title: "Источники",
        href: "/sources",
        description: "Состояние подключённых источников",
        roles: ["ANALYST", "DEVELOPER", "ADMIN"]
      }
    ]
  },
  {
    title: "Парсеры",
    items: [
      {
        title: "Операции парсеров",
        href: "/jobs",
        description: "Ручной запуск, журнал прогонов и инциденты сборщиков",
        roles: ["DEVELOPER", "ADMIN"]
      },
      {
        title: "Парсеры",
        href: "/reports/parsers",
        description: "Технические отчёты по стабильности парсеров",
        roles: ["DEVELOPER", "ADMIN"],
        reportSection: "parsers"
      }
    ]
  },
  {
    title: "Отчёты",
    items: [
      {
        title: "Поставщики",
        href: "/reports/suppliers",
        description: "Добросовестность и концентрация поставщиков",
        roles: ["ANALYST", "ADMIN"],
        reportSection: "suppliers"
      },
      {
        title: "Ниши",
        href: "/reports/niches",
        description: "Ниши закупок атомных станций",
        roles: ["ANALYST", "ADMIN"],
        reportSection: "niches"
      },
      {
        title: "АЭС",
        href: "/reports/aes",
        description: "Закупочная активность по атомным станциям",
        roles: ["ANALYST", "ADMIN"],
        reportSection: "npp"
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
