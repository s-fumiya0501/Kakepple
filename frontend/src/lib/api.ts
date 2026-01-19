import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://kakepple-production.up.railway.app';

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true, // Important for sending cookies
  headers: {
    'Content-Type': 'application/json',
  },
});

// Auth types
export interface RegisterData {
  email: string;
  password: string;
  name: string;
  oauth_pending_id?: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface OAuthPendingInfo {
  email: string | null;
  name: string | null;
  picture_url: string | null;
  provider: string;
}

// Auth endpoints
export const authApi = {
  // OAuth login URLs
  googleLogin: () => `${API_URL}/api/auth/google`,
  lineLogin: () => `${API_URL}/api/auth/line`,

  // Email/Password auth
  register: (data: RegisterData) => api.post('/api/auth/register', data),
  login: (data: LoginData) => api.post('/api/auth/login', data),

  // Password reset
  requestPasswordReset: (email: string) =>
    api.post('/api/auth/password/reset', { email }),
  confirmPasswordReset: (token: string, newPassword: string) =>
    api.post('/api/auth/password/confirm', { token, new_password: newPassword }),

  // OAuth pending info (for registration flow)
  getOAuthPendingInfo: (pendingId: string) =>
    api.get<OAuthPendingInfo>(`/api/auth/oauth/pending/${pendingId}`),

  // User info
  me: () => api.get('/api/auth/me'),
  logout: () => api.post('/api/auth/logout'),

  // Profile management
  updateProfile: (data: { name?: string }) => api.put('/api/auth/me', data),
  uploadAvatar: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/api/auth/me/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  deleteAvatar: () => api.delete('/api/auth/me/avatar'),
};

// Couple endpoints
export const coupleApi = {
  generateInvite: (hoursValid: number = 24) =>
    api.post('/api/couples/invite', { hours_valid: hoursValid }),
  joinCouple: (inviteCode: string) =>
    api.post('/api/couples/join', { invite_code: inviteCode }),
  getMyCouple: () => api.get('/api/couples/me'),
  leaveCouple: () => api.delete('/api/couples/me'),
};

// Transaction endpoints
export const transactionApi = {
  create: (data: any) => api.post('/api/transactions', data),
  list: (params?: {
    type?: 'income' | 'expense';
    category?: string;
    start_date?: string;
    end_date?: string;
    scope?: 'personal' | 'couple';
    limit?: number;
    offset?: number;
  }) => api.get('/api/transactions', { params }),
  summary: (params?: {
    start_date?: string;
    end_date?: string;
    scope?: 'personal' | 'couple';
  }) => api.get('/api/transactions/summary', { params }),
  get: (id: string) => api.get(`/api/transactions/${id}`),
  update: (id: string, data: any) => api.put(`/api/transactions/${id}`, data),
  delete: (id: string) => api.delete(`/api/transactions/${id}`),
};

// Budget endpoints
export const budgetApi = {
  create: (data: any) => api.post('/api/budgets', data),
  list: (params?: {
    scope?: 'personal' | 'couple';
    year?: number;
    month?: number;
    is_active?: boolean;
  }) => api.get('/api/budgets', { params }),
  get: (id: string) => api.get(`/api/budgets/${id}`),
  update: (id: string, data: any) => api.put(`/api/budgets/${id}`, data),
  delete: (id: string) => api.delete(`/api/budgets/${id}`),
  getCurrentStatus: (scope: 'personal' | 'couple' = 'personal') =>
    api.get('/api/budgets/status/current', { params: { scope } }),
};

// Savings data type
export interface SavingsData {
  personal_total_income: string;
  personal_total_expense: string;
  personal_balance: string;
  personal_transaction_count: number;
  personal_assets_total: string;
  personal_total_balance: string;
  couple_total_income: string | null;
  couple_total_expense: string | null;
  couple_balance: string | null;
  couple_transaction_count: number | null;
  couple_assets_total: string | null;
  couple_total_balance: string | null;
  has_couple: boolean;
}

// Asset types
export interface Asset {
  id: string;
  name: string;
  asset_type: string;
  asset_type_label: string;
  amount: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface AssetCreate {
  name: string;
  asset_type: string;
  amount: number;
  description?: string;
}

export interface AssetUpdate {
  name?: string;
  asset_type?: string;
  amount?: number;
  description?: string;
}

export interface AssetType {
  value: string;
  label: string;
}

// Asset endpoints
export const assetApi = {
  getTypes: () => api.get<{ types: AssetType[] }>('/api/assets/types'),
  create: (data: AssetCreate) => api.post<Asset>('/api/assets', data),
  list: () => api.get<Asset[]>('/api/assets'),
  get: (id: string) => api.get<Asset>(`/api/assets/${id}`),
  update: (id: string, data: AssetUpdate) => api.put<Asset>(`/api/assets/${id}`, data),
  delete: (id: string) => api.delete(`/api/assets/${id}`),
};

// Analytics endpoints
export const analyticsApi = {
  categoryAnalysis: (params: {
    start_date: string;
    end_date: string;
    scope?: 'personal' | 'couple';
  }) => api.get('/api/analytics/category-analysis', { params }),
  monthlyTrends: (params: {
    year: number;
    scope?: 'personal' | 'couple';
  }) => api.get('/api/analytics/monthly-trends', { params }),
  yearlyTrends: (params: {
    start_year: number;
    end_year: number;
    scope?: 'personal' | 'couple';
  }) => api.get('/api/analytics/yearly-trends', { params }),
  monthlyReport: (params: {
    year: number;
    month: number;
    scope?: 'personal' | 'couple';
  }) => api.get('/api/analytics/report/monthly', { params }),
  yearlyReport: (params: {
    year: number;
    scope?: 'personal' | 'couple';
  }) => api.get('/api/analytics/report/yearly', { params }),
  savings: () => api.get<SavingsData>('/api/analytics/savings'),
};

// Export endpoints
export const exportApi = {
  transactionsCsv: (params?: {
    start_date?: string;
    end_date?: string;
    scope?: 'personal' | 'couple';
  }) => api.get('/api/exports/csv', {
    params,
    responseType: 'blob',
  }),
  monthlyReportCsv: (params: {
    year: number;
    month: number;
    scope?: 'personal' | 'couple';
  }) => api.get('/api/exports/csv/report/monthly', {
    params,
    responseType: 'blob',
  }),
  yearlyReportCsv: (params: {
    year: number;
    scope?: 'personal' | 'couple';
  }) => api.get('/api/exports/csv/report/yearly', {
    params,
    responseType: 'blob',
  }),
};

// Notification endpoints
export const notificationApi = {
  subscribe: (subscription: PushSubscription) => {
    const subscriptionJson = subscription.toJSON();
    return api.post('/api/notifications/subscribe', {
      endpoint: subscriptionJson.endpoint,
      keys: subscriptionJson.keys,
    });
  },
  unsubscribe: () => api.delete('/api/notifications/subscribe'),
  getPreferences: () => api.get('/api/notifications/preferences'),
  updatePreferences: (data: Partial<any>) =>
    api.put('/api/notifications/preferences', data),
  test: () => api.get('/api/notifications/test'),
};

// Admin types
export interface AdminUser {
  id: string;
  email: string;
  name: string | null;
  picture_url: string | null;
  google_id: string | null;
  line_id: string | null;
  email_verified: boolean;
  is_admin: boolean;
  created_at: string;
  updated_at: string;
}

export interface AdminUserUpdate {
  name?: string;
  email?: string;
  is_admin?: boolean;
  email_verified?: boolean;
}

export interface UserListResponse {
  users: AdminUser[];
  total: number;
  limit: number;
  offset: number;
}

export interface AdminCouple {
  id: string;
  user1_email: string;
  user1_name: string | null;
  user2_email: string;
  user2_name: string | null;
  created_at: string;
}

export interface CoupleListResponse {
  couples: AdminCouple[];
  total: number;
  limit: number;
  offset: number;
}

export interface AdminTransaction {
  id: string;
  user_email: string;
  user_name: string | null;
  type: string;
  category: string;
  amount: number;
  description: string | null;
  date: string;
  created_at: string;
}

export interface TransactionListResponse {
  transactions: AdminTransaction[];
  total: number;
  limit: number;
  offset: number;
}

export interface AdminStats {
  total_users: number;
  total_couples: number;
  total_transactions: number;
  users_this_month: number;
  transactions_this_month: number;
  total_income: number;
  total_expense: number;
}

// Recurring transaction types
export interface RecurringTransaction {
  id: string;
  type: 'income' | 'expense';
  category: string;
  amount: string;
  description: string | null;
  frequency: 'monthly' | 'weekly' | 'yearly';
  day_of_month: number | null;
  day_of_week: number | null;
  is_split: boolean;
  is_active: boolean;
  last_created_at: string | null;
  next_due_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface RecurringTransactionCreate {
  type: 'income' | 'expense';
  category: string;
  amount: number;
  description?: string;
  frequency: 'monthly' | 'weekly' | 'yearly';
  day_of_month?: number;
  day_of_week?: number;
  is_split?: boolean;
}

export interface RecurringTransactionUpdate {
  category?: string;
  amount?: number;
  description?: string;
  frequency?: 'monthly' | 'weekly' | 'yearly';
  day_of_month?: number;
  day_of_week?: number;
  is_split?: boolean;
  is_active?: boolean;
}

// Recurring transaction endpoints
export const recurringApi = {
  create: (data: RecurringTransactionCreate) =>
    api.post<RecurringTransaction>('/api/recurring', data),
  list: (params?: { is_active?: boolean }) =>
    api.get<RecurringTransaction[]>('/api/recurring', { params }),
  get: (id: string) =>
    api.get<RecurringTransaction>(`/api/recurring/${id}`),
  update: (id: string, data: RecurringTransactionUpdate) =>
    api.put<RecurringTransaction>(`/api/recurring/${id}`, data),
  delete: (id: string) =>
    api.delete(`/api/recurring/${id}`),
  execute: (id: string) =>
    api.post<{ message: string; transaction_id: string }>(`/api/recurring/${id}/execute`),
};

// Admin endpoints
export const adminApi = {
  // Dashboard stats
  getStats: () => api.get<AdminStats>('/api/admin/stats'),

  // User management
  listUsers: (params?: { limit?: number; offset?: number; search?: string }) =>
    api.get<UserListResponse>('/api/admin/users', { params }),
  getUser: (userId: string) => api.get<AdminUser>(`/api/admin/users/${userId}`),
  updateUser: (userId: string, data: AdminUserUpdate) =>
    api.put<AdminUser>(`/api/admin/users/${userId}`, data),
  deleteUser: (userId: string) => api.delete(`/api/admin/users/${userId}`),

  // Couple management
  listCouples: (params?: { limit?: number; offset?: number }) =>
    api.get<CoupleListResponse>('/api/admin/couples', { params }),

  // Transaction management
  listTransactions: (params?: {
    limit?: number;
    offset?: number;
    user_id?: string;
    type?: string;
  }) => api.get<TransactionListResponse>('/api/admin/transactions', { params }),
};
