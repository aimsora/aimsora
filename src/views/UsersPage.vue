<script setup lang="ts">
import { onMounted, reactive, ref } from "vue";
import { formatDateTime, formatEnumLabel, statusTone } from "../lib/format";
import { apolloClient } from "../services/apollo";
import type { AppUser, UserRole } from "../services/graphql-types";
import { useAuthStore } from "../stores/auth";
import {
  CREATE_USER_MUTATION,
  DEACTIVATE_USER_MUTATION,
  UPDATE_USER_ROLE_MUTATION,
  USERS_QUERY
} from "../services/queries";

const loading = ref(true);
const error = ref("");
const actionMessage = ref("");
const users = ref<AppUser[]>([]);
const authStore = useAuthStore();
const pendingRoles = reactive<Record<string, UserRole>>({});
const createForm = reactive<{
  email: string;
  fullName: string;
  password: string;
  role: UserRole;
}>({
  email: "",
  fullName: "",
  password: "",
  role: "ANALYST"
});

async function loadUsers() {
  loading.value = true;
  error.value = "";

  try {
    const { data } = await apolloClient.query<{ users: AppUser[] }>({
      query: USERS_QUERY,
      fetchPolicy: "network-only"
    });

    users.value = data.users;
    for (const user of data.users) {
      pendingRoles[user.id] = user.role;
    }
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : "Unable to load users";
  } finally {
    loading.value = false;
  }
}

async function createUser() {
  actionMessage.value = "";
  error.value = "";

  try {
    await apolloClient.mutate({
      mutation: CREATE_USER_MUTATION,
      variables: {
        input: {
          email: createForm.email,
          fullName: createForm.fullName,
          password: createForm.password,
          role: createForm.role
        }
      }
    });

    createForm.email = "";
    createForm.fullName = "";
    createForm.password = "";
    createForm.role = "ANALYST";
    actionMessage.value = "User created";
    await loadUsers();
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : "Unable to create user";
  }
}

async function updateRole(user: AppUser) {
  actionMessage.value = "";
  error.value = "";

  try {
    await apolloClient.mutate({
      mutation: UPDATE_USER_ROLE_MUTATION,
      variables: {
        input: {
          userId: user.id,
          role: pendingRoles[user.id]
        }
      }
    });

    actionMessage.value = `Role updated for ${user.email}`;
    await loadUsers();
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : "Unable to update role";
  }
}

async function deactivate(user: AppUser) {
  actionMessage.value = "";
  error.value = "";

  try {
    await apolloClient.mutate({
      mutation: DEACTIVATE_USER_MUTATION,
      variables: { userId: user.id }
    });

    actionMessage.value = `User ${user.email} deactivated`;
    await loadUsers();
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : "Unable to deactivate user";
  }
}

onMounted(() => {
  void loadUsers();
});
</script>

<template>
  <section class="page-header">
    <div>
      <p class="eyebrow">Administration</p>
      <h2>Users</h2>
    </div>
    <p class="caption">Минимальный CRUD-like admin UI поверх backend user mutations.</p>
  </section>

  <section class="card">
    <div class="section-title">
      <h3>Create user</h3>
      <span v-if="actionMessage" class="success-text">{{ actionMessage }}</span>
    </div>
    <form class="form-grid" @submit.prevent="createUser">
      <label>
        Full name
        <input v-model="createForm.fullName" required />
      </label>
      <label>
        Email
        <input v-model="createForm.email" type="email" required />
      </label>
      <label>
        Password
        <input v-model="createForm.password" type="password" required />
      </label>
      <label>
        Role
        <select v-model="createForm.role">
          <option value="USER">User</option>
          <option value="ANALYST">Analyst</option>
          <option value="ADMIN">Admin</option>
        </select>
      </label>
      <button class="primary-button" type="submit">Create user</button>
    </form>
  </section>

  <div v-if="loading" class="card">Loading users...</div>
  <div v-else-if="error" class="card error-text">{{ error }}</div>
  <section v-else class="card">
    <table class="table">
      <thead>
        <tr>
          <th>Name</th>
          <th>Email</th>
          <th>Role</th>
          <th>Active</th>
          <th>Last login</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="user in users" :key="user.id">
          <td>{{ user.fullName }}</td>
          <td>{{ user.email }}</td>
          <td>
            <div class="inline-actions">
              <select v-model="pendingRoles[user.id]">
                <option value="USER">User</option>
                <option value="ANALYST">Analyst</option>
                <option value="ADMIN">Admin</option>
              </select>
              <button class="secondary-button small" type="button" @click="updateRole(user)">
                Save
              </button>
            </div>
          </td>
          <td>
            <span class="status-chip" :class="user.isActive ? 'is-success' : 'is-danger'">
              {{ user.isActive ? "Active" : "Inactive" }}
            </span>
          </td>
          <td>{{ formatDateTime(user.lastLoginAt) }}</td>
          <td>
            <div class="inline-actions">
              <span class="status-chip" :class="statusTone(user.role)">
                {{ formatEnumLabel(user.role) }}
              </span>
              <button
                class="secondary-button small"
                type="button"
                :disabled="user.id === authStore.user?.id || !user.isActive"
                @click="deactivate(user)"
              >
                Deactivate
              </button>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </section>
</template>
