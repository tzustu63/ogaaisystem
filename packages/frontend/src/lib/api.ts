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
  delete: (id: string) => api.delete(`/kpi/${id}`),
  updateValue: (id: string, data: any) => api.post(`/kpi/${id}/values`, data),
  markException: (id: string, period: string, reason: string) => 
    api.post(`/kpi/${id}/values/${period}/exception`, { reason }),
  removeException: (id: string, period: string) => 
    api.delete(`/kpi/${id}/values/${period}/exception`),
  updateInitiatives: (id: string, initiative_ids: string[]) =>
    api.put(`/kpi/${id}/initiatives`, { initiative_ids }),
};

// Initiative API
export const initiativeApi = {
  getAll: () => api.get('/initiatives'),
  getById: (id: string) => api.get(`/initiatives/${id}`),
  create: (data: any) => api.post('/initiatives', data),
  update: (id: string, data: any) => api.put(`/initiatives/${id}`, data),
  delete: (id: string) => api.delete(`/initiatives/${id}`),
  getProgramReport: (id: string) => api.get(`/initiatives/${id}/program-report`),
  getEvidenceSummary: (id: string) => api.get(`/initiatives/${id}/evidence-summary`),
};

// OKR API
export const okrApi = {
  getAll: (params?: any) => api.get('/okr', { params }),
  getById: (id: string) => api.get(`/okr/${id}`),
  create: (data: any) => api.post('/okr', data),
  update: (id: string, data: any) => api.put(`/okr/${id}`, data),
};

// Task API
export const taskApi = {
  getAll: (params?: any) => api.get('/tasks', { params }),
  getById: (id: string) => api.get(`/tasks/${id}`),
  create: (data: any) => api.post('/tasks', data),
  updateStatus: (id: string, status: string) => api.patch(`/tasks/${id}/status`, { status }),
  delete: (id: string) => api.delete(`/tasks/${id}`),
  getKanbanBoard: (params?: any) => api.get('/tasks/kanban/board', { params }),
  getFormDefinitions: (params?: any) => api.get('/tasks/forms/definitions', { params }),
  getTaskForms: (taskId: string) => api.get(`/tasks/${taskId}/forms`),
  submitTaskForm: (taskId: string, data: any) => api.post(`/tasks/${taskId}/forms`, data),
};

// Incident API
export const incidentApi = {
  getAll: (params?: any) => api.get('/incidents', { params }),
  getById: (id: string) => api.get(`/incidents/${id}`),
  create: (data: any) => api.post('/incidents', data),
  updateChecklist: (incidentId: string, checklistId: string, isCompleted: boolean) =>
    api.patch(`/incidents/${incidentId}/checklists/${checklistId}`, { is_completed: isCompleted }),
  close: (incidentId: string, data: any) => api.post(`/incidents/${incidentId}/close`, data),
};

// PDCA API
export const pdcaApi = {
  getAll: (params?: any) => api.get('/pdca', { params }),
  getById: (id: string) => api.get(`/pdca/${id}`),
  create: (data: any) => api.post('/pdca', data),
  getActions: (params?: any) => api.get('/pdca/actions/dashboard', { params }),
  createPlan: (id: string, data: any) => api.post(`/pdca/${id}/plans`, data),
  updatePlan: (planId: string, data: any) => api.put(`/pdca/plans/${planId}`, data),
  deletePlan: (planId: string) => api.delete(`/pdca/plans/${planId}`),
  createExecution: (id: string, data: any) => api.post(`/pdca/${id}/executions`, data),
  createCheck: (id: string, data: any) => api.post(`/pdca/${id}/checks`, data),
  createAction: (id: string, data: any) => api.post(`/pdca/${id}/actions`, data),
};


// Trace API
export const traceApi = {
  getTaskTraceUp: (taskId: string) => api.get(`/trace/task/${taskId}/up`),
  getKpiTraceDown: (kpiId: string) => api.get(`/trace/kpi/${kpiId}/down`),
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

