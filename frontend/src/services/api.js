import axios from 'axios';

const API_URL = 'http://localhost:8000/api/v1';

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});

// API Key management
const getApiKey = () => localStorage.getItem('llmops_api_key') || 'dev-key';
const setApiKey = (key) => localStorage.setItem('llmops_api_key', key);

api.interceptors.request.use((config) => {
  config.headers['Authorization'] = `Bearer ${getApiKey()}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.detail || error.message || 'An error occurred';
    if (error.response?.status === 401) {
      console.error('Unauthorized - Invalid or missing API key');
    }
    return Promise.reject({ ...error, friendlyMessage: message });
  }
);

// ===== Prompts =====
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

// ===== Runs =====
export const runApiService = {
  list: async (skip = 0, limit = 100) => {
    const { data } = await api.get('/runs', { params: { skip, limit } });
    return data;
  },

  create: async (payload) => {
    const { data } = await api.post('/run', payload);
    return data;
  },

  getTaskStatus: async (taskId) => {
    const { data } = await api.get(`/task-status/${taskId}`);
    return data;
  },
};

// ===== Golden Examples =====
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

// ===== Evaluations =====
export const evaluationService = {
  run: async (promptId, versionId) => {
    const { data } = await api.post(`/prompts/${promptId}/versions/${versionId}/evaluate`);
    return data;
  },
};

// ===== Experiments =====
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

// ===== Health =====
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

// Legacy compatibility export
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

export { getApiKey, setApiKey };
export default api;
