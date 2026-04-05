import { gql } from "@apollo/client/core";

export const LOGIN_MUTATION = gql`
  mutation Login($input: LoginInput!) {
    login(input: $input) {
      accessToken
      refreshToken
      expiresInSeconds
      user {
        id
        email
        fullName
        avatarUrl
        role
      }
    }
  }
`;

export const LOGOUT_MUTATION = gql`
  mutation Logout($input: RefreshTokenInput!) {
    logout(input: $input)
  }
`;

export const REFRESH_MUTATION = gql`
  mutation RefreshSession($input: RefreshTokenInput!) {
    refreshSession(input: $input) {
      accessToken
      refreshToken
      expiresInSeconds
      user {
        id
        email
        fullName
        avatarUrl
        role
      }
    }
  }
`;

export const ME_QUERY = gql`
  query Me {
    me {
      id
      email
      fullName
      avatarUrl
      role
      isActive
      lastLoginAt
      createdAt
      updatedAt
    }
  }
`;

export const DASHBOARD_QUERY = gql`
  query DashboardSummary {
    dashboardSummary {
      totalRecords
      totalProcurements
      activeSources
      runsLast24h
      lastPublishedAt
      lastUpdatedAt
      bySource {
        source
        count
      }
      procurementsByStatus {
        status
        count
      }
      procurementsOverTime {
        date
        count
      }
      recentProcurements {
        id
        externalId
        source
        title
        description
        customer
        supplier
        amount
        currency
        status
        publishedAt
        deadlineAt
        sourceUrl
        createdAt
        updatedAt
      }
      recentSourceRuns {
        id
        runKey
        sourceCode
        status
        startedAt
        finishedAt
        itemsDiscovered
        itemsPublished
        itemsFailed
        errorMessage
      }
      sourcesSummary {
        source
        name
        kind
        isActive
        procurementCount
        recordCount
        runCount
        lastRunAt
      }
    }
  }
`;

export const ANALYTICS_QUERY = gql`
  query AnalyticsSummary {
    analyticsSummary {
      closingSoonCount
      overdueCount
      highValueCount
      averageProcurementValue
      atRiskSources
      runSuccessRate
      publicationEfficiency
      riskSignalsLast30d
      deadlinePressure {
        label
        count
      }
      sourceHealth {
        source
        name
        kind
        isActive
        lastRunAt
        lastRunStatus
        successRate
        publicationRate
        failedRuns
        hoursSinceLastRun
        riskLevel
      }
      supplierExposure {
        supplier
        procurementCount
        totalAmount
        sharePercent
      }
      attentionProcurements {
        id
        externalId
        source
        title
        description
        customer
        supplier
        amount
        currency
        status
        publishedAt
        deadlineAt
        sourceUrl
        createdAt
        updatedAt
      }
    }
  }
`;

export const PROCUREMENTS_QUERY = gql`
  query ProcurementItems(
    $filter: ProcurementFilterInput
    $sort: ProcurementSortInput
    $limit: Int
    $offset: Int
  ) {
    procurementItems(filter: $filter, sort: $sort, limit: $limit, offset: $offset) {
      total
      items {
        id
        externalId
        source
        title
        description
        customer
        supplier
        amount
        currency
        status
        publishedAt
        deadlineAt
        sourceUrl
        updatedAt
      }
    }
  }
`;

export const PROCUREMENT_QUERY = gql`
  query ProcurementItem($id: String!) {
    procurementItem(id: $id) {
      id
      externalId
      source
      title
      description
      customer
      supplier
      amount
      currency
      status
      publishedAt
      deadlineAt
      sourceUrl
      createdAt
      updatedAt
      rawPayload
    }
  }
`;

export const SOURCES_QUERY = gql`
  query Sources {
    sources {
      id
      code
      name
      description
      kind
      isActive
      baseUrl
      createdAt
      updatedAt
      lastRun {
        id
        runKey
        sourceCode
        status
        startedAt
        finishedAt
        itemsDiscovered
        itemsPublished
        itemsFailed
        errorMessage
      }
    }
  }
`;

export const SOURCE_RUNS_QUERY = gql`
  query SourceRuns($source: String, $limit: Int) {
    sourceRuns(source: $source, limit: $limit) {
      id
      runKey
      sourceCode
      status
      startedAt
      finishedAt
      itemsDiscovered
      itemsPublished
      itemsFailed
      errorMessage
    }
  }
`;

export const TRIGGER_COLLECTORS_MUTATION = gql`
  mutation TriggerCollectors($sourceCodes: [String!]) {
    triggerCollectors(sourceCodes: $sourceCodes) {
      triggeredAt
      allAccepted
      items {
        sourceCode
        sourceName
        accepted
        runKey
        startedAt
        message
      }
    }
  }
`;

export const SCRAPER_ADMIN_OVERVIEW_QUERY = gql`
  query ScraperAdminOverview {
    scraperAdminOverview {
      config {
        schedule
        autoRunEnabled
        updatedAt
        source
      }
      runtime {
        reachable
        schedule
        autoRunEnabled
        running
        runningSources
        loadedSources
        circuitStates {
          sourceCode
          failures
          openUntil
        }
        message
      }
      sources {
        sourceCode
        sourceName
        isActive
        lastRunStatus
        lastRunAt
        lastSuccessAt
        lastErrorMessage
        riskLevel
        successRate
        publicationRate
        failedRuns
        hoursSinceLastRun
        isRunning
        circuitOpen
        consecutiveFailures
        circuitOpenUntil
        attentionRequired
        attentionReason
      }
    }
  }
`;

export const UPDATE_SCRAPER_ADMIN_CONFIG_MUTATION = gql`
  mutation UpdateScraperAdminConfig($input: UpdateScraperAdminConfigInput!) {
    updateScraperAdminConfig(input: $input) {
      schedule
      autoRunEnabled
      updatedAt
      source
    }
  }
`;

export const REPORTS_QUERY = gql`
  query Reports {
    reports {
      id
      name
      description
      status
      reportType
      createdAt
      updatedAt
    }
  }
`;

export const REFRESH_REPORTS_MUTATION = gql`
  mutation RefreshReports($types: [String!]) {
    refreshReports(types: $types) {
      id
      name
      description
      status
      reportType
      createdAt
      updatedAt
    }
  }
`;

export const ARCHIVE_REPORT_MUTATION = gql`
  mutation ArchiveReport($id: String!) {
    archiveReport(id: $id)
  }
`;

export const REPORT_QUERY = gql`
  query Report($id: String!) {
    report(id: $id) {
      id
      name
      description
      status
      reportType
      generatedAt
      metrics {
        label
        value
        hint
      }
      highlights {
        title
        description
        severity
      }
      scores {
        label
        value
        detail
        severity
      }
      actions {
        title
        description
        priority
      }
      deadlinePressure {
        label
        count
      }
      statusMix {
        label
        count
        sharePercent
      }
      amountDistribution {
        label
        procurementCount
        totalAmount
        sharePercent
      }
      customerExposure {
        customer
        procurementCount
        totalAmount
        sharePercent
      }
      sourceContribution {
        sourceCode
        sourceName
        procurementCount
        totalAmount
        sharePercent
      }
      sourceHealth {
        source
        name
        kind
        isActive
        lastRunAt
        lastRunStatus
        successRate
        publicationRate
        failedRuns
        hoursSinceLastRun
        riskLevel
      }
      supplierExposure {
        supplier
        procurementCount
        totalAmount
        sharePercent
      }
      recentSourceRuns {
        id
        runKey
        sourceCode
        status
        startedAt
        finishedAt
        itemsDiscovered
        itemsPublished
        itemsFailed
        errorMessage
      }
      recentProcurements {
        id
        externalId
        source
        title
        description
        customer
        supplier
        amount
        currency
        status
        publishedAt
        deadlineAt
        sourceUrl
        createdAt
        updatedAt
      }
    }
  }
`;

export const USERS_QUERY = gql`
  query Users {
    users {
      id
      email
      fullName
      avatarUrl
      role
      isActive
      lastLoginAt
      createdAt
      updatedAt
    }
  }
`;

export const CREATE_USER_MUTATION = gql`
  mutation CreateUser($input: CreateUserInput!) {
    createUser(input: $input) {
      id
      email
      fullName
      avatarUrl
      role
      isActive
      lastLoginAt
      createdAt
      updatedAt
    }
  }
`;

export const UPDATE_USER_ROLE_MUTATION = gql`
  mutation UpdateUserRole($input: UpdateUserRoleInput!) {
    updateUserRole(input: $input) {
      id
      email
      fullName
      avatarUrl
      role
      isActive
      lastLoginAt
      createdAt
      updatedAt
    }
  }
`;

export const DEACTIVATE_USER_MUTATION = gql`
  mutation DeactivateUser($userId: String!) {
    deactivateUser(userId: $userId)
  }
`;

export const SET_USER_ACTIVE_MUTATION = gql`
  mutation SetUserActive($input: SetUserActiveInput!) {
    setUserActive(input: $input) {
      id
      email
      fullName
      avatarUrl
      role
      isActive
      lastLoginAt
      createdAt
      updatedAt
    }
  }
`;

export const UPDATE_PROFILE_MUTATION = gql`
  mutation UpdateProfile($input: UpdateProfileInput!) {
    updateProfile(input: $input) {
      id
      email
      fullName
      avatarUrl
      role
      isActive
      lastLoginAt
      createdAt
      updatedAt
    }
  }
`;

export const RESET_USER_PASSWORD_MUTATION = gql`
  mutation ResetUserPassword($input: ResetUserPasswordInput!) {
    resetUserPassword(input: $input) {
      id
      email
      fullName
      avatarUrl
      role
      isActive
      lastLoginAt
      createdAt
      updatedAt
    }
  }
`;
