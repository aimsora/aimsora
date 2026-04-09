export type UserRole = "USER" | "ANALYST" | "DEVELOPER" | "ADMIN";

export type ProcurementStatus = "DRAFT" | "ACTIVE" | "CLOSED" | "ARCHIVED";

export type SourceKind =
  | "EASUZ"
  | "EIS"
  | "RNP"
  | "FEDRESURS"
  | "FNS"
  | "GISTORGI";

export type SourceRunStatus = "PENDING" | "RUNNING" | "SUCCESS" | "PARTIAL" | "FAILED";

export type ReportStatus = "PENDING" | "READY" | "FAILED";

export type SessionUser = {
  id: string;
  email: string;
  fullName: string;
  avatarUrl?: string | null;
  role: UserRole;
  isActive?: boolean;
  lastLoginAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type AuthPayload = {
  accessToken: string;
  refreshToken: string;
  expiresInSeconds: number;
  user: SessionUser;
};

export type DashboardSourceStat = {
  source: string;
  count: number;
};

export type DashboardProcurementStatusStat = {
  status: ProcurementStatus;
  count: number;
};

export type DashboardTimelinePoint = {
  date: string;
  count: number;
};

export type DashboardSourceSummaryItem = {
  source: string;
  name: string;
  kind: SourceKind;
  isActive: boolean;
  procurementCount: number;
  recordCount: number;
  runCount: number;
  lastRunAt?: string | null;
};

export type DashboardSummary = {
  totalRecords: number;
  totalProcurements: number;
  activeSources: number;
  runsLast24h: number;
  lastPublishedAt?: string | null;
  lastUpdatedAt?: string | null;
  bySource: DashboardSourceStat[];
  procurementsByStatus: DashboardProcurementStatusStat[];
  procurementsOverTime: DashboardTimelinePoint[];
  recentProcurements: Procurement[];
  recentNppProcurements: Procurement[];
  recentSourceRuns: SourceRun[];
  sourcesSummary: DashboardSourceSummaryItem[];
};

export type Procurement = {
  id: string;
  externalId: string;
  source: string;
  title: string;
  description?: string | null;
  customer?: string | null;
  supplier?: string | null;
  amount?: number | null;
  currency?: string | null;
  status: ProcurementStatus;
  publishedAt?: string | null;
  deadlineAt?: string | null;
  sourceUrl?: string | null;
  createdAt?: string;
  updatedAt?: string;
  rawPayload?: Record<string, unknown> | null;
};

export type ProcurementPage = {
  total: number;
  items: Procurement[];
};

export type Source = {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  kind: SourceKind;
  baseUrl?: string | null;
  isActive: boolean;
  lastRun?: SourceRun | null;
  createdAt: string;
  updatedAt: string;
};

export type SourceRun = {
  id: string;
  runKey: string;
  sourceCode: string;
  status: SourceRunStatus;
  startedAt: string;
  finishedAt?: string | null;
  itemsDiscovered: number;
  itemsPublished: number;
  itemsFailed: number;
  errorMessage?: string | null;
};

export type CollectorTriggerItem = {
  sourceCode: string;
  sourceName: string;
  accepted: boolean;
  runKey?: string | null;
  startedAt?: string | null;
  message?: string | null;
};

export type CollectorTriggerResult = {
  triggeredAt: string;
  allAccepted: boolean;
  items: CollectorTriggerItem[];
};

export type ScraperAdminConfig = {
  schedule: string;
  autoRunEnabled: boolean;
  updatedAt: string;
  source: string;
};

export type ScraperRuntimeCircuitState = {
  sourceCode: string;
  failures: number;
  openUntil?: string | null;
};

export type ScraperRuntimeState = {
  reachable: boolean;
  schedule: string;
  autoRunEnabled: boolean;
  running: boolean;
  runningSources: string[];
  loadedSources: string[];
  circuitStates: ScraperRuntimeCircuitState[];
  message?: string | null;
};

export type ScraperAdminSourceStatus = {
  sourceCode: string;
  sourceName: string;
  isActive: boolean;
  lastRunStatus?: SourceRunStatus | null;
  lastRunAt?: string | null;
  lastSuccessAt?: string | null;
  lastErrorMessage?: string | null;
  riskLevel: string;
  successRate: number;
  publicationRate: number;
  failedRuns: number;
  hoursSinceLastRun?: number | null;
  isRunning: boolean;
  circuitOpen: boolean;
  consecutiveFailures: number;
  circuitOpenUntil?: string | null;
  attentionRequired: boolean;
  attentionReason: string;
};

export type ScraperAdminOverview = {
  config: ScraperAdminConfig;
  runtime: ScraperRuntimeState;
  sources: ScraperAdminSourceStatus[];
};

export type AnalyticsDeadlineBucket = {
  label: string;
  count: number;
};

export type AnalyticsSourceHealthItem = {
  source: string;
  name: string;
  kind: SourceKind;
  isActive: boolean;
  lastRunAt?: string | null;
  lastRunStatus?: SourceRunStatus | null;
  successRate: number;
  publicationRate: number;
  failedRuns: number;
  hoursSinceLastRun?: number | null;
  riskLevel: string;
};

export type AnalyticsSupplierExposureItem = {
  supplier: string;
  procurementCount: number;
  totalAmount: number;
  sharePercent: number;
};

export type AnalyticsCustomerExposureItem = {
  customer: string;
  procurementCount: number;
  totalAmount: number;
  sharePercent: number;
};

export type AnalyticsSupplierRiskWatchItem = {
  supplier: string;
  taxId?: string | null;
  ogrn?: string | null;
  riskSignalsCount: number;
  activeRiskSignalsCount: number;
  activeProcurements: number;
  latestRiskAt?: string | null;
};

export type AnalyticsNppTimelineItem = {
  label: string;
  procurementCount: number;
  totalAmount: number;
};

export type AnalyticsNppStationItem = {
  station: string;
  procurementCount: number;
  totalAmount: number;
};

export type AnalyticsNppSourceItem = {
  source: string;
  name: string;
  procurementCount: number;
  totalAmount: number;
};

export type AnalyticsNppCustomerItem = {
  customer: string;
  procurementCount: number;
  totalAmount: number;
};

export type AnalyticsSummary = {
  nppPeriodStart: string;
  nppProcurementCount: number;
  nppContractCount: number;
  nppStationsCovered: number;
  nppTotalAmount: number;
  closingSoonCount: number;
  overdueCount: number;
  highValueCount: number;
  averageProcurementValue: number;
  atRiskSources: number;
  runSuccessRate: number;
  publicationEfficiency: number;
  riskSignalsLast30d: number;
  deadlinePressure: AnalyticsDeadlineBucket[];
  sourceHealth: AnalyticsSourceHealthItem[];
  supplierExposure: AnalyticsSupplierExposureItem[];
  customerExposure: AnalyticsCustomerExposureItem[];
  supplierRiskWatchlist: AnalyticsSupplierRiskWatchItem[];
  nppMonthlyDynamics: AnalyticsNppTimelineItem[];
  nppStationCoverage: AnalyticsNppStationItem[];
  nppSourceCoverage: AnalyticsNppSourceItem[];
  nppCustomerCoverage: AnalyticsNppCustomerItem[];
  nppRecentProcurements: Procurement[];
  attentionProcurements: Procurement[];
};

export type Report = {
  id: string;
  name: string;
  description?: string | null;
  status: ReportStatus;
  reportType: string;
  createdAt: string;
  updatedAt: string;
};

export type ReportMetric = {
  label: string;
  value: string;
  hint: string;
};

export type ReportHighlight = {
  title: string;
  description: string;
  severity: string;
};

export type ReportScore = {
  label: string;
  value: number;
  detail: string;
  severity: string;
};

export type ReportAction = {
  title: string;
  description: string;
  priority: string;
};

export type ReportStatusMixItem = {
  label: string;
  count: number;
  sharePercent: number;
};

export type ReportAmountDistributionItem = {
  label: string;
  procurementCount: number;
  totalAmount: number;
  sharePercent: number;
};

export type ReportCustomerExposureItem = {
  customer: string;
  procurementCount: number;
  totalAmount: number;
  sharePercent: number;
};

export type ReportSourceContributionItem = {
  sourceCode: string;
  sourceName: string;
  procurementCount: number;
  totalAmount: number;
  sharePercent: number;
};

export type ReportSupplierDueDiligenceItem = {
  supplier: string;
  taxId?: string | null;
  ogrn?: string | null;
  procurementCount: number;
  activeProcurements: number;
  totalAmount: number;
  lastProcurementAt?: string | null;
  companyStatus?: string | null;
  registrationDate?: string | null;
  region?: string | null;
  okved?: string | null;
  liquidationMark?: boolean | null;
  riskSignalsCount: number;
  activeRiskSignalsCount: number;
  rnpEntriesCount: number;
  activeRnpEntriesCount: number;
  latestRiskAt?: string | null;
  integrityScore: number;
  flags: string[];
};

export type ReportNppStationOrderEntry = {
  procurementId: string;
  externalId: string;
  title: string;
  customer?: string | null;
  supplier?: string | null;
  source: string;
  amount?: number | null;
  currency?: string | null;
  status: string;
  publishedAt?: string | null;
  sourceUrl?: string | null;
};

export type ReportNppStationOrderItem = {
  station: string;
  procurementCount: number;
  contractCount: number;
  totalAmount: number;
  firstPublishedAt?: string | null;
  lastPublishedAt?: string | null;
  orders: ReportNppStationOrderEntry[];
};

export type ReportNppNicheOrderEntry = {
  procurementId: string;
  externalId: string;
  title: string;
  station: string;
  customer?: string | null;
  supplier?: string | null;
  source: string;
  amount?: number | null;
  currency?: string | null;
  status: string;
  publishedAt?: string | null;
  sourceUrl?: string | null;
};

export type ReportNppNicheItem = {
  niche: string;
  procurementCount: number;
  stationCount: number;
  totalAmount: number;
  lastPublishedAt?: string | null;
  stations: string[];
  orders: ReportNppNicheOrderEntry[];
};

export type ReportDetail = {
  id: string;
  name: string;
  description?: string | null;
  status: ReportStatus;
  reportType: string;
  generatedAt: string;
  metrics: ReportMetric[];
  highlights: ReportHighlight[];
  scores: ReportScore[];
  actions: ReportAction[];
  deadlinePressure: AnalyticsDeadlineBucket[];
  statusMix: ReportStatusMixItem[];
  amountDistribution: ReportAmountDistributionItem[];
  customerExposure: ReportCustomerExposureItem[];
  sourceContribution: ReportSourceContributionItem[];
  sourceHealth: AnalyticsSourceHealthItem[];
  supplierExposure: AnalyticsSupplierExposureItem[];
  supplierDueDiligence: ReportSupplierDueDiligenceItem[];
  nppStationOrders: ReportNppStationOrderItem[];
  nppNicheOrders: ReportNppNicheItem[];
  recentSourceRuns: SourceRun[];
  recentProcurements: Procurement[];
};

export type AppUser = {
  id: string;
  email: string;
  fullName: string;
  avatarUrl?: string | null;
  role: UserRole;
  isActive: boolean;
  lastLoginAt?: string | null;
  createdAt: string;
  updatedAt: string;
};
