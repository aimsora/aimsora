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

export const REPORTS_QUERY = gql`
  query Reports {
    reports {
      id
      name
      description
      status
      createdAt
      updatedAt
    }
  }
`;

export const USERS_QUERY = gql`
  query Users {
    users {
      id
      email
      fullName
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
