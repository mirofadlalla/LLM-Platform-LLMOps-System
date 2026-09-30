/**
 * api.js — single Axios instance + all service modules.
 *
 * Base URL is read from the VITE_API_URL environment variable (set in .env).
 * Never hardcode http://localhost:8000 here — change .env instead.
 *
 * Auth strategy:
 *   • Login flow  → JWT stored in localStorage as 'llmops_jwt'
 *                   Used by: /auth/* endpoints (key management)
 *   • Platform    → raw API key stored in localStorage as 'llmops_api_key'
 *                   Used by: all /prompts /runs /experiments /ab-tests endpoints
 *
 * The interceptor sends whichever token is appropriate based on the request URL.
 * Both tokens live in localStorage so they survive page refreshes.
 */

import axios from 'axios';

// ── Base URL (from .env, never hardcoded) ─────────────────────────────────────
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 60000, // 60s — LLM calls can take time
});

// ── Token helpers ─────────────────────────────────────────────────────────────

/** The raw platform API key (llmops_xxx…) used for all platform calls. */
export const getApiKey   = () => localStorage.getItem('llmops_api_key') || '';
export const setApiKey   = (key) => localStorage.setItem('llmops_api_key', key);
export const clearApiKey = () => localStorage.removeItem('llmops_api_key');

/** The JWT returned by /auth/login — used only for auth-management endpoints. */
export const getJwt   = () => localStorage.getItem('llmops_jwt') || '';
export const setJwt   = (token) => localStorage.setItem('llmops_jwt', token);
export const clearJwt = () => localStorage.removeItem('llmops_jwt');

/** Stored user info (username, user_id) */
export const getStoredUser = () => {
  try { return JSON.parse(localStorage.getItem('llmops_user') || 'null'); }
  catch { return null; }
};
export const setStoredUser = (user) =>
  localStorage.setItem('llmops_user', JSON.stringify(user));
export const clearStoredUser = () => localStorage.removeItem('llmops_user');

/** True when the user is logged in and has an API key configured. */
export const isAuthenticated = () => !!getJwt();
export const hasApiKey       = () => !!getApiKey();

// ── Request interceptor: attach the right token ───────────────────────────────
api.interceptors.request.use((config) => {
  const url = config.url || '';

  // Auth management routes use the JWT
  if (url.startsWith('/auth/api-keys')) {
    const jwt = getJwt();
    if (jwt) config.headers['Authorization'] = `Bearer ${jwt}`;
  } else {
    // All other platform routes use the raw API key
    const key = getApiKey();
    if (key) config.headers['Authorization'] = `Bearer ${key}`;
  }
  return config;
});

// ── Response interceptor: normalise errors ────────────────────────────────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.detail ||
      error.message ||
      'An unexpected error occurred';

    if (error.response?.status === 401) {
      console.warn('401 Unauthorized — token may be invalid or expired');
    }

    return Promise.reject({ ...error, friendlyMessage: message });
  }
);

// ── Auth service ──────────────────────────────────────────────────────────────
export const authService = {
  register: async ({ username, email, password }) => {
    const { data } = await api.post('/auth/register', { username, email, password });
    return data; // { user_id, username, email, created_at }
  },

  login: async ({ username, password }) => {
    const { data } = await api.post('/auth/login', { username, password });
    // Persist JWT + user info for the session
    setJwt(data.access_token);
    setStoredUser({ user_id: data.user_id, username: data.username });
    return data; // { access_token, token_type, user_id, username }
  },

  logout: () => {
    clearJwt();
    clearStoredUser();
    // keep API key — user may want to re-use it after re-login
  },

  /** Requires JWT — create a new API key */
  createApiKey: async ({ name } = {}) => {
    const { data } = await api.post('/auth/api-keys', { name });
    // Also save the new key as the active platform key
    setApiKey(data.key);
    return data; // { api_key_id, name, key, created_at }
  },

  /** Requires JWT — list this user's API keys (values masked) */
  listApiKeys: async () => {
    const { data } = await api.get('/auth/api-keys');
    return data; // [{ api_key_id, name, is_active, created_at }]
  },

  /** Requires JWT — revoke one API key */
  revokeApiKey: async (apiKeyId) => {
    const { data } = await api.delete(`/auth/api-keys/${apiKeyId}`);
    return data; // { api_key_id, revoked }
  },
};

// ── Models / Providers (for UI dropdowns) ─────────────────────────────────────
export const modelsService = {
  /** Returns { groq: [{slug, api_id, display_name, extra_params}], huggingface: [...] } */
  catalog: async () => {
    const { data } = await api.get('/models');
    return data;
  },

  listProviders: async () => {
    const { data } = await api.get('/providers');
    return data.providers; // ['groq', 'huggingface']
  },

  listModels: async (providerId) => {
    const { data } = await api.get(`/providers/${providerId}/models`);
    return data.models;
  },
};

// ── Prompts ───────────────────────────────────────────────────────────────────
export const promptService = {
  list: async (skip = 0, limit = 100) => {
    const { data } = await api.get('/prompts', { params: { skip, limit } });
    return data;
  },

  create: async (payload) => {
    const { data } = await api.post('/prompts', payload);
    return data;
  },

  listVersions: async (promptId) => {
    const { data } = await api.get(`/prompts/${promptId}/versions`);
    return data;
  },

  createVersion: async (promptId, payload) => {
    const { data } = await api.post(`/prompts/${promptId}/versions`, payload);
    return data;
  },

  activateVersion: async (promptId, versionId) => {
    const { data } = await api.post(`/prompts/${promptId}/versions/${versionId}/activate`);
    return data;
  },

  diff: async (promptId, fromVersionId, toVersionId) => {
    const { data } = await api.get('/prompts/diff', {
      params: { prompt_id: promptId, from_version_id: fromVersionId, to_version_id: toVersionId }
    });
    return data;
  },
};

// ── Runs ──────────────────────────────────────────────────────────────────────
export const runApiService = {
  list: async (skip = 0, limit = 100) => {
    const { data } = await api.get('/runs', { params: { skip, limit } });
    return data;
  },

  /**
   * @param {object} payload
   * @param {string} payload.prompt_version_id
   * @param {object} payload.variables
   * @param {string} payload.provider  e.g. "groq"
   * @param {string} payload.model     e.g. "gpt-oss-20b"
   */
  create: async (payload) => {
    const { data } = await api.post('/run', payload);
    return data;
  },

  getTaskStatus: async (taskId) => {
    const { data } = await api.get(`/task-status/${taskId}`);
    return data;
  },
};

// ── Golden Examples ───────────────────────────────────────────────────────────
export const goldenExampleService = {
  list: async (promptId) => {
    const { data } = await api.get(`/prompts/${promptId}/golden-examples`);
    return data;
  },

  create: async (promptId, payload) => {
    const { data } = await api.post(`/prompts/${promptId}/golden-examples`, payload);
    return data;
  },
};

// ── Evaluations ───────────────────────────────────────────────────────────────
export const evaluationService = {
  run: async (promptId, versionId) => {
    const { data } = await api.post(`/prompts/${promptId}/versions/${versionId}/evaluate`);
    return data;
  },
};

// ── Experiments ───────────────────────────────────────────────────────────────
export const experimentService = {
  list: async (skip = 0, limit = 100) => {
    const { data } = await api.get('/experiments', { params: { skip, limit } });
    return data;
  },

  run: async (promptId, experimentName) => {
    const { data } = await api.post('/experiments/run', null, {
      params: { prompt_id: promptId, experiment_name: experimentName }
    });
    return data;
  },

  getStatus: async (experimentId) => {
    const { data } = await api.get(`/experiments/${experimentId}/status`);
    return data;
  },
};

// ── A/B Testing ───────────────────────────────────────────────────────────────
export const abTestService = {
  /**
   * Run an A/B test — calls both prompt versions with the same query.
   * @param {{ version_a_id, version_b_id, variables, provider, model }} payload
   */
  run: async (payload) => {
    const { data } = await api.post('/ab-tests', payload);
    return data; // { ab_test_id, answer_a, answer_b, ... }
  },

  /**
   * Cast a vote on an existing A/B test.
   * @param {string} abTestId
   * @param {{ winner: 'a'|'b'|'tie', feedback?: string }} payload
   */
  vote: async (abTestId, payload) => {
    const { data } = await api.post(`/ab-tests/${abTestId}/vote`, payload);
    return data;
  },

  list: async (skip = 0, limit = 100) => {
    const { data } = await api.get('/ab-tests', { params: { skip, limit } });
    return data;
  },

  getById: async (abTestId) => {
    const { data } = await api.get(`/ab-tests/${abTestId}`);
    return data;
  },
};

// ── Health ────────────────────────────────────────────────────────────────────
export const healthService = {
  check: async () => {
    try {
      const { data } = await api.get('/health');
      return { healthy: true, ...data };
    } catch {
      return { healthy: false };
    }
  },
};

// ── Utility: expose the resolved base URL for display in Settings ─────────────
export const getApiBaseUrl = () => API_BASE_URL;

// ── Legacy compatibility (existing pages import these) ────────────────────────
export const runService = {
  getRuns: runApiService.list,
  getRunStatus: runApiService.getTaskStatus,
  createRun: runApiService.create,
  createPrompt: promptService.create,
  listPrompts: promptService.list,
  createPromptVersion: promptService.createVersion,
  listPromptVersions: promptService.listVersions,
  activatePromptVersion: promptService.activateVersion,
  createGoldenExample: goldenExampleService.create,
  listGoldenExamples: goldenExampleService.list,
  evaluatePromptVersion: evaluationService.run,
  diffPrompts: promptService.diff,
  runExperiment: experimentService.run,
  listExperiments: experimentService.list,
  getExperimentStatus: experimentService.getStatus,
};

export default api;
