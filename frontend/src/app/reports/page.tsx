'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { analyticsApi, exportApi } from '@/lib/api';
import { ReportData } from '@/types';
import MainLayout from '@/components/MainLayout';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { FileDown, Calendar } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { PageSkeleton } from '@/components/DashboardSkeleton';

const COLORS = ['#ec4899', '#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#6366f1', '#14b8a6'];

// Lazy load chart components
const ReportExpensePieChart = dynamic(
  () => import('@/components/reports/ReportCharts').then(mod => ({ default: mod.ReportExpensePieChart })),
  { loading: () => <Skeleton className="h-[300px] w-full" />, ssr: false }
);

const ReportTrendLineChart = dynamic(
  () => import('@/components/reports/ReportCharts').then(mod => ({ default: mod.ReportTrendLineChart })),
  { loading: () => <Skeleton className="h-[300px] w-full" />, ssr: false }
);

export default function ReportsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [scopeFilter, setScopeFilter] = useState<'personal' | 'couple'>('personal');
  const [period, setPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [month, setMonth] = useState((new Date().getMonth() + 1).toString());
  const [report, setReport] = useState<ReportData | null>(null);
  const [dataLoading, setDataLoading] = useState(true);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [authLoading, user, router]);

  const loadReport = useCallback(async () => {
    if (!user) return;
    try {
      const response = period === 'monthly'
        ? await analyticsApi.monthlyReport({ year: parseInt(year), month: parseInt(month), scope: scopeFilter })
        : await analyticsApi.yearlyReport({ year: parseInt(year), scope: scopeFilter });
      setReport(response.data);
    } catch (err) {
      console.error('Failed to load report:', err);
    } finally {
      setDataLoading(false);
    }
  }, [user, period, year, month, scopeFilter]);

  useEffect(() => {
    if (user) {
      loadReport();
    }
  }, [user, loadReport]);

  const handleExportCSV = async () => {
    try {
      const response = period === 'monthly'
        ? await exportApi.monthlyReportCsv({ year: parseInt(year), month: parseInt(month), scope: scopeFilter })
        : await exportApi.yearlyReportCsv({ year: parseInt(year), scope: scopeFilter });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `report_${scopeFilter}_${year}_${period === 'monthly' ? month : ''}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Failed to download CSV:', err);
      alert('CSVファイルのダウンロードを開始します');
    }
  };

  const formatCurrency = (value: string | number) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return `¥${num.toLocaleString()}`;
  };

  // Summary data
  const totalIncome = report ? parseFloat(report.summary.total_income) : 0;
  const totalExpense = report ? parseFloat(report.summary.total_expense) : 0;
  const balance = report ? parseFloat(report.summary.balance) : 0;
  const transactionCount = report?.summary.transaction_count || 0;

  // Expense pie chart data
  const expenseData = report?.category_analysis.expense_breakdown.map((item, index) => ({
    name: item.category,
    value: parseFloat(item.total),
    color: COLORS[index % COLORS.length],
  })) || [];

  // Trend line chart data
  const trendData = report?.time_series.map((item) => ({
    month: item.label,
    income: parseFloat(item.income),
    expense: parseFloat(item.expense),
  })) || [];

  // Show skeleton while loading
  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <p className="text-gray-500 dark:text-gray-400">読み込み中...</p>
      </div>
    );
  }

  if (dataLoading) {
    return (
      <MainLayout user={user}>
        <PageSkeleton />
      </MainLayout>
    );
  }

  return (
    <MainLayout user={user}>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">レポート</h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">月次・年次のレポート</p>
        </div>

        {/* Filter Section */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white">期間選択</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                期間
              </label>
              <Select value={period} onValueChange={(v: any) => setPeriod(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">月次</SelectItem>
                  <SelectItem value="yearly">年次</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                年
              </label>
              <Select value={year} onValueChange={setYear}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2024">2024</SelectItem>
                  <SelectItem value="2025">2025</SelectItem>
                  <SelectItem value="2026">2026</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {period === 'monthly' && (
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                  月
                </label>
                <Select value={month} onValueChange={setMonth}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 12 }, (_, i) => (
                      <SelectItem key={i + 1} value={String(i + 1)}>
                        {i + 1}月
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                表示範囲
              </label>
              <Select value={scopeFilter} onValueChange={(v: any) => setScopeFilter(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="personal">個人</SelectItem>
                  <SelectItem value="couple">カップル</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button
                onClick={handleExportCSV}
                className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700"
              >
                <FileDown className="w-4 h-4 mr-2" />
                CSV出力
              </Button>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">総収入</p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
              {formatCurrency(totalIncome)}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">総支出</p>
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">
              {formatCurrency(totalExpense)}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">残高</p>
            <p className={`text-2xl font-bold ${balance >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {formatCurrency(balance)}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">取引数</p>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{transactionCount}件</p>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Expense Pie Chart */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
              支出カテゴリー（円グラフ）
            </h3>
            {expenseData.length > 0 ? (
              <ReportExpensePieChart data={expenseData} />
            ) : (
              <p className="text-center text-gray-500 dark:text-gray-400 py-20">データがありません</p>
            )}
          </div>

          {/* Trend Line Chart */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
              推移グラフ（折れ線）
            </h3>
            {trendData.length > 0 ? (
              <ReportTrendLineChart data={trendData} formatCurrency={formatCurrency} />
            ) : (
              <p className="text-center text-gray-500 dark:text-gray-400 py-20">データがありません</p>
            )}
          </div>
        </div>

        {/* Budget Status */}
        {report?.budget_status && report.budget_status.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">予算ステータス</h3>
            <div className="space-y-4">
              {report.budget_status.map((budget) => {
                const percentage = budget.percentage || 0;
                const isOverBudget = percentage > 100;
                return (
                  <div key={budget.id}>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {budget.budget_type === 'category' ? budget.category : '月次総予算'}
                      </span>
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {formatCurrency(budget.current_spent || 0)} / {formatCurrency(budget.amount)}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Progress
                        value={Math.min(percentage, 100)}
                        className="flex-1"
                      />
                      <span
                        className={`text-sm font-medium ${
                          isOverBudget ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-400'
                        }`}
                      >
                        {percentage.toFixed(0)}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
