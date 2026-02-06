export interface User {
  id: string;
  email: string;
  name: string | null;
  picture_url: string | null;
  is_admin: boolean;
  created_at: string;
  updated_at: string;
}

export interface Couple {
  id: string;
  user1: User;
  user2: User;
  created_at: string;
}

export interface InviteCode {
  id: string;
  code: string;
  expires_at: string;
  used: boolean;
  created_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  couple_id: string | null;
  type: 'income' | 'expense';
  category: string;
  amount: string;
  description: string | null;
  date: string;
  is_split: boolean;
  original_amount: string | null;
  paid_by_user_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface SettlementData {
  my_paid: string;
  partner_paid: string;
  total: string;
  settlement_amount: string;
  i_pay_partner: boolean;
}

export interface TransactionSummary {
  total_income: string;
  total_expense: string;
  balance: string;
  transaction_count: number;
}

export const INCOME_CATEGORIES = [
  "本業",
  "副業",
  "アルバイト",
  "パート",
  "その他"
];

export const FIXED_EXPENSE_CATEGORIES = [
  "家賃",
  "電気・ガス・水道",
  "通信費",
  "サブスク・保険"
];

export const VARIABLE_EXPENSE_CATEGORIES = [
  "食費",
  "日用品",
  "交通費",
  "交際費",
  "医療費",
  "被服・美容",
  "趣味・娯楽"
];

export const ALL_EXPENSE_CATEGORIES = [
  ...FIXED_EXPENSE_CATEGORIES,
  ...VARIABLE_EXPENSE_CATEGORIES
];

// Budget types
export interface Budget {
  id: string;
  user_id: string | null;
  couple_id: string | null;
  scope: 'personal' | 'couple';
  budget_type: 'category' | 'monthly_total';
  category: string | null;
  amount: string;
  year: number;
  month: number;
  is_active: boolean;
  current_spent?: string;
  percentage?: number;
  is_exceeded?: boolean;
  created_at: string;
  updated_at: string;
}

// Analytics types
export interface CategoryBreakdown {
  category: string;
  total: string;
  percentage: number;
  transaction_count: number;
}

export interface MonthlyTrend {
  year: number;
  month: number;
  month_name: string;
  total_income: string;
  total_expense: string;
  balance: string;
  transaction_count: number;
}

export interface CategoryAnalysis {
  scope: string;
  start_date: string;
  end_date: string;
  income_breakdown: CategoryBreakdown[];
  expense_breakdown: CategoryBreakdown[];
  top_expense_categories: CategoryBreakdown[];
}

export interface TimeSeriesData {
  date: string;
  label: string;
  income: string;
  expense: string;
  balance: string;
}

export interface ReportData {
  period: 'monthly' | 'yearly';
  scope: string;
  year: number;
  month?: number;
  summary: TransactionSummary;
  category_analysis: CategoryAnalysis;
  time_series: TimeSeriesData[];
  budget_status?: Budget[] | null;
}

// Notification types
export interface NotificationPreferences {
  budget_exceeded: boolean;
  budget_warning_80: boolean;
  partner_expense: boolean;
  monthly_report: boolean;
  created_at: string;
  updated_at: string;
}
