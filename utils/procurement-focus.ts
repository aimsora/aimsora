const STATION_NAME_ENDINGS = "(?:ая|ой|ую|ое|ом|ие|их)?";
const ATOMIC_LABEL_PATTERN =
  "(?:атомн(?:ая|ой|ую|ое|ом|ых)?\\s+станци(?:я|и|ю|е|ей|ям|ями|ях)|аэс(?:-[а-яa-z]+)*)";
const NPP_LABEL_PATTERN = /[А-ЯЁA-Z][^,.()]{2,}?(?:атомн(?:ая|ой|ую|ое|ом)? станци(?:я|и|ю|е|ей)|АЭС(?:-[А-ЯA-Z]+)*)/i;

const NPP_FOCUS_MATCHERS = [
  { canonical: "Балаковская атомная станция", stem: "балаковск" },
  { canonical: "Белоярская атомная станция", stem: "белоярск" },
  { canonical: "Билибинская атомная станция", stem: "билибинск" },
  { canonical: "Калининская атомная станция", stem: "калининск" },
  { canonical: "Кольская атомная станция", stem: "кольск" },
  { canonical: "Курская атомная станция", stem: "курск" },
  { canonical: "Ленинградская атомная станция", stem: "ленинградск" },
  { canonical: "Нововоронежская атомная станция", stem: "нововоронежск" },
  { canonical: "Ростовская атомная станция", stem: "ростовск" },
  { canonical: "Смоленская атомная станция", stem: "смоленск" }
].map((item) => ({
  canonical: item.canonical,
  pattern: new RegExp(`${item.stem}${STATION_NAME_ENDINGS}\\s+${ATOMIC_LABEL_PATTERN}`, "i")
}));

export const NPP_FOCUS_OPTIONS = NPP_FOCUS_MATCHERS.map((item) => item.canonical) as ReadonlyArray<string>;

export function getProcurementNppFocus(rawPayload?: Record<string, unknown> | null): string | null {
  if (!rawPayload || typeof rawPayload !== "object") {
    return null;
  }

  const sourceSpecificData = asRecord(rawPayload.sourceSpecificData);
  const explicitStationName = asString(sourceSpecificData?.targetStationName);
  if (explicitStationName) {
    return explicitStationName;
  }

  const matchedQuery = asString(sourceSpecificData?.matchedQuery);
  if (matchedQuery && NPP_LABEL_PATTERN.test(matchedQuery)) {
    return matchedQuery.match(NPP_LABEL_PATTERN)?.[0] ?? matchedQuery;
  }

  const searchHaystack = [
    matchedQuery,
    asString(sourceSpecificData?.customerName),
    asString(sourceSpecificData?.supplierName),
    asString(sourceSpecificData?.title),
    asString(sourceSpecificData?.description)
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

  if (!searchHaystack) {
    return null;
  }

  return NPP_FOCUS_MATCHERS.find((item) => item.pattern.test(searchHaystack))?.canonical ?? null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
