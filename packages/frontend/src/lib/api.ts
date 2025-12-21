import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 請求攔截器：加入認證 token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 響應攔截器：處理 401 錯誤（未認證）
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // 清除 token 並重定向到登入頁
      localStorage.removeItem('token');
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// KPI API
export const kpiApi = {
  getAll: () => api.get('/kpi'),
  getById: (id: string) => api.get(`/kpi/${id}`),
  create: (data: any) => api.post('/kpi', data),
  update: (id: string, data: any) => api.put(`/kpi/${id}`, data),
  updateValue: (id: string, data: any) => api.post(`/kpi/${id}/values`, data),
  markException: (id: string, period: string, reason: string) => 
    api.post(`/kpi/${id}/values/${period}/exception`, { reason }),
  removeException: (id: string, period: string) => 
    api.delete(`/kpi/${id}/values/${period}/exception`),
};

// Initiative API
export const initiativeApi = {
  getAll: () => api.get('/initiatives'),
  getById: (id: string) => api.get(`/initiatives/${id}`),
  create: (data: any) => api.post('/initiatives', data),
  update: (id: string, data: any) => api.put(`/initiatives/${id}`, data),
  getProgramReport: (id: string) => api.get(`/initiatives/${id}/program-report`),
  getEvidenceSummary: (id: string) => api.get(`/initiatives/${id}/evidence-summary`),
};

// Task API
export const taskApi = {
  getAll: (params?: any) => api.get('/tasks', { params }),
  getById: (id: string) => api.get(`/tasks/${id}`),
  create: (data: any) => api.post('/tasks', data),
  updateStatus: (id: string, status: string) => api.patch(`/tasks/${id}/status`, { status }),
  getKanbanBoard: (params?: any) => api.get('/tasks/kanban/board', { params }),
  getFormDefinitions: (params?: any) => api.get('/tasks/forms/definitions', { params }),
  getTaskForms: (taskId: string) => api.get(`/tasks/${taskId}/forms`),
  submitTaskForm: (taskId: string, data: any) => api.post(`/tasks/${taskId}/forms`, data),
};

// BSC API
export const bscApi = {
  getObjectives: (params?: any) => api.get('/bsc/objectives', { params }),
  getObjectiveById: (id: string) => api.get(`/bsc/objectives/${id}`),
  createObjective: (data: any) => api.post('/bsc/objectives', data),
  getCausalLinks: () => api.get('/bsc/causal-links'),
  createCausalLink: (data: any) => api.post('/bsc/causal-links', data),
  deleteCausalLink: (id: string) => api.delete(`/bsc/causal-links/${id}`),
  getDashboardSummary: () => api.get('/bsc/dashboard/summary'),
};

// Trace API
export const traceApi = {
  getTaskTraceUp: (taskId: string) => api.get(`/trace/task/${taskId}/up`),
  getKpiTraceDown: (kpiId: string) => api.get(`/trace/kpi/${kpiId}/down`),
};

// RACI API
export const raciApi = {
  getTemplates: () => api.get('/raci/templates'),
  createTemplate: (data: any) => api.post('/raci/templates', data),
  getWorkflows: () => api.get('/raci/workflows'),
  getConsultationProgress: (workflowId: string) => 
    api.get(`/raci/workflows/${workflowId}/consultation-progress`),
};

// GDPR API
export const gdprApi = {
  getCollectionPurposes: () => api.get('/gdpr/collection-purposes'),
  createCollectionPurpose: (data: any) => api.post('/gdpr/collection-purposes', data),
  getConsentForms: (params?: any) => api.get('/gdpr/consent-forms', { params }),
  createConsentForm: (data: any) => api.post('/gdpr/consent-forms', data),
  getRetentionPolicies: () => api.get('/gdpr/retention-policies'),
  createRetentionPolicy: (data: any) => api.post('/gdpr/retention-policies', data),
  getDeletionRequests: (params?: any) => api.get('/gdpr/deletion-requests', { params }),
  createDeletionRequest: (data: any) => api.post('/gdpr/deletion-requests', data),
  approveDeletionRequest: (id: string, data?: any) => 
    api.post(`/gdpr/deletion-requests/${id}/approve`, data),
};

// Integration API
export const integrationApi = {
  getIntegrations: () => api.get('/integrations'),
  getIntegrationStatus: (id: string) => api.get(`/integrations/${id}/status`),
  createIntegration: (data: any) => api.post('/integrations', data),
  triggerSync: (id: string, data?: any) => api.post(`/integrations/${id}/sync`, data),
  getSyncLogs: (id: string, params?: any) => api.get(`/integrations/${id}/sync-logs`, { params }),
};

// Data Quality API
export const dataQualityApi = {
  getReports: (params?: any) => api.get('/data-quality/reports', { params }),
  getReport: (id: string) => api.get(`/data-quality/reports/${id}`),
  exportReports: (data: any) => api.post('/data-quality/reports/export', data),
};

// User API
export const userApi = {
  getUsers: (params?: any) => api.get('/users', { params }),
  createUser: (data: any) => api.post('/users', data),
  updateUser: (id: string, data: any) => api.put(`/users/${id}`, data),
};

// Settings API
export const settingsApi = {
  getNotificationSettings: () => api.get('/settings/notifications'),
  updateNotificationSettings: (data: any) => api.put('/settings/notifications', data),
};

// Audit API
export const auditApi = {
  getAuditLogs: (params?: any) => api.get('/audit', { params }),
  getAuditDiff: (id: string) => api.get(`/audit/${id}/diff`),
};

// Auth API
export const authApi = {
  login: (username: string, password: string) => 
    api.post('/auth/login', { username, password }),
  getMe: () => api.get('/auth/me'),
};

export default api;

