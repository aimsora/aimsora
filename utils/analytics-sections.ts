export type AnalyticsSectionId = "overview" | "suppliers" | "npp";

export type AnalyticsSectionMeta = {
  title: string;
  pageTitle: string;
  description: string;
  href: string;
};

export const ANALYTICS_SECTION_META: Record<AnalyticsSectionId, AnalyticsSectionMeta> = {
  overview: {
    title: "Обзор",
    pageTitle: "Аналитика: Обзор",
    description: "Сроки, объёмы, проблемные закупки и общий пульс потока.",
    href: "/analytics/overview"
  },
  suppliers: {
    title: "Поставщики",
    pageTitle: "Аналитика: Поставщики",
    description: "Концентрация поставщиков, здоровье источников и качество публикации.",
    href: "/analytics/suppliers"
  },
  npp: {
    title: "АЭС",
    pageTitle: "Аналитика: АЭС",
    description: "Атомный контур по станциям, заказчикам, источникам и свежим карточкам.",
    href: "/analytics/npp"
  }
};

export function getAnalyticsSectionPath(sectionId: AnalyticsSectionId) {
  return ANALYTICS_SECTION_META[sectionId].href;
}
