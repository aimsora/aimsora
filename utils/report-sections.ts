import type { UserRole } from "~/graphql/types";

export type ReportSectionId = "analytics" | "suppliers" | "niches" | "npp" | "parsers";

export type ReportSectionMeta = {
  navTitle: string;
  label: string;
  pageTitle: string;
  pageDescription: string;
  description: string;
  accent: string;
  emptyTitle: string;
  emptyDescription: string;
  href: string;
  roles: UserRole[];
};

export const REPORT_TYPE_LABELS: Record<string, string> = {
  "daily-overview": "Аналитическая сводка по закупкам",
  "supplier-risk": "Риски и концентрация поставщиков",
  "supplier-due-diligence": "Проверка благонадёжности поставщиков",
  "npp-market-niches": "Ниши закупок АЭС",
  "npp-station-orders": "Закупочная активность АЭС",
  "pipeline-incident": "Стабильность парсеров и публикации"
};

export const REPORT_TYPE_DESCRIPTIONS: Record<string, string> = {
  "daily-overview": "Сводный отчет по объему закупок, срокам, публикациям и актуальности данных.",
  "supplier-risk": "Отчет по концентрации, риск-сигналам и закупкам, требующим внимания по поставщикам.",
  "supplier-due-diligence": "Проверка контрагентов по ФНС, Федресурсу, РНП и собственной закупочной активности.",
  "npp-market-niches": "Группировка закупок АЭС по нишам: где атомные станции закупают чаще всего и как это распределено по тематикам.",
  "npp-station-orders": "Аналитика по станциям: какие закупки публиковались, где есть договорный след и как менялась активность.",
  "pipeline-incident": "Отчет по сбоям запусков, потерям публикации и нестабильности источников."
};

export const REPORT_TYPE_CADENCES: Record<string, string> = {
  "daily-overview": "Каждые 12 часов",
  "supplier-risk": "Каждые 24 часа",
  "supplier-due-diligence": "Каждые 24 часа",
  "npp-market-niches": "Каждые 12 часов",
  "npp-station-orders": "Каждые 12 часов",
  "pipeline-incident": "Каждые 6 часов"
};

export const REPORT_TYPE_SECTION: Record<string, ReportSectionId> = {
  "daily-overview": "analytics",
  "supplier-risk": "suppliers",
  "supplier-due-diligence": "suppliers",
  "npp-market-niches": "niches",
  "npp-station-orders": "npp",
  "pipeline-incident": "parsers"
};

export const REPORT_SECTION_META: Record<ReportSectionId, ReportSectionMeta> = {
  analytics: {
    navTitle: "Аналитика",
    label: "Аналитика",
    pageTitle: "Отчёты: Аналитика",
    pageDescription: "Обзорные отчёты по закупочному контуру и общему состоянию данных.",
    description: "Сводные отчеты по закупочному контуру, публикационной активности и актуальности данных.",
    accent: "from-sky-500/10 via-background to-background",
    emptyTitle: "Нет обзорных отчётов",
    emptyDescription: "Когда сервер сформирует обзорные сценарии, они появятся здесь.",
    href: "/reports",
    roles: ["ANALYST", "ADMIN"]
  },
  suppliers: {
    navTitle: "Поставщики",
    label: "Поставщики",
    pageTitle: "Отчёты: Поставщики",
    pageDescription: "Добросовестность, концентрация и риск-портрет поставщиков.",
    description: "Отчеты по рискам, благонадёжности, концентрации и активности контрагентов.",
    accent: "from-amber-500/10 via-background to-background",
    emptyTitle: "Нет отчётов по поставщикам",
    emptyDescription: "После следующей генерации здесь появятся сценарии по поставщикам.",
    href: "/reports/suppliers",
    roles: ["ANALYST", "ADMIN"]
  },
  niches: {
    navTitle: "Ниши",
    label: "Ниши закупок АЭС",
    pageTitle: "Отчёты: Ниши",
    pageDescription: "Срез закупок АЭС по нишам и тематическим направлениям.",
    description: "Новый отчет по нишам: как закупки атомных станций распределяются по типам работ, услуг и поставок.",
    accent: "from-cyan-500/10 via-background to-background",
    emptyTitle: "Нет отчётов по нишам",
    emptyDescription: "Когда сервер соберёт атомные закупки по нишам, здесь появится этот раздел.",
    href: "/reports/niches",
    roles: ["ANALYST", "ADMIN"]
  },
  npp: {
    navTitle: "АЭС",
    label: "Закупки АЭС",
    pageTitle: "Отчёты: АЭС",
    pageDescription: "Отдельный контур по атомным станциям и их закупочной активности.",
    description: "Отчеты по атомным станциям: закупки, договорный слой и история публикаций.",
    accent: "from-emerald-500/10 via-background to-background",
    emptyTitle: "Нет отчётов по закупкам АЭС",
    emptyDescription: "Когда сервер пересчитает станционные сценарии, они появятся здесь.",
    href: "/reports/aes",
    roles: ["ANALYST", "ADMIN"]
  },
  parsers: {
    navTitle: "Парсеры",
    label: "Парсеры",
    pageTitle: "Отчёты: Парсеры",
    pageDescription: "Технические отчёты по стабильности парсеров и качеству публикации.",
    description: "Технические отчеты по проблемным запускам, качеству публикации и стабильности конвейера.",
    accent: "from-rose-500/10 via-background to-background",
    emptyTitle: "Нет отчётов по парсерам",
    emptyDescription: "После следующего запуска системы здесь появятся технические отчёты по парсерам.",
    href: "/reports/parsers",
    roles: ["DEVELOPER", "ADMIN"]
  }
};

export function getReportSectionPath(sectionId: ReportSectionId) {
  return REPORT_SECTION_META[sectionId].href;
}

export function getReportListRouteByType(reportType?: string | null) {
  const sectionId = reportType ? REPORT_TYPE_SECTION[reportType] : undefined;

  if (!sectionId || sectionId === "analytics") {
    return "/reports";
  }

  return getReportSectionPath(sectionId);
}

export function getReportTypesForSection(sectionId: ReportSectionId) {
  return Object.entries(REPORT_TYPE_SECTION)
    .filter(([, currentSectionId]) => currentSectionId === sectionId)
    .map(([reportType]) => reportType);
}

export function resolveReportSectionFromRoute(
  path: string,
  rawSection?: string | null | undefined
): ReportSectionId | null {
  const explicitSection = typeof rawSection === "string" ? rawSection : null;

  if (
    explicitSection &&
    explicitSection in REPORT_SECTION_META &&
    explicitSection !== "analytics"
  ) {
    return explicitSection as ReportSectionId;
  }

  const matchedEntry = Object.entries(REPORT_SECTION_META).find(([, meta]) => meta.href === path);
  return matchedEntry ? (matchedEntry[0] as ReportSectionId) : null;
}
