export type UserRole = "USER" | "ANALYST" | "ADMIN";

export type ProcurementStatus = "DRAFT" | "ACTIVE" | "CLOSED" | "ARCHIVED";

export type SourceKind = "DEMO" | "FIND_TENDER";

export type SourceRunStatus = "PENDING" | "RUNNING" | "SUCCESS" | "PARTIAL" | "FAILED";

export type ReportStatus = "PENDING" | "READY" | "FAILED";

export type SessionUser = {
  id: string;
  email: string;
  fullName: string;
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

export type DashboardSummary = {
  totalProcurements: number;
  activeSources: number;
  runsLast24h: number;
  lastPublishedAt?: string | null;
  bySource: DashboardSourceStat[];
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

export type Report = {
  id: string;
  name: string;
  description?: string | null;
  status: ReportStatus;
  createdAt: string;
  updatedAt: string;
};

export type AppUser = {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  isActive: boolean;
  lastLoginAt?: string | null;
  createdAt: string;
  updatedAt: string;
};
