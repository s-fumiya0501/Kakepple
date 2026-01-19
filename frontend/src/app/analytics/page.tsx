'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { analyticsApi } from '@/lib/api';
import { CategoryAnalysis } from '@/types';
import MainLayout from '@/components/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { PageSkeleton } from '@/components/DashboardSkeleton';
import { PageLoadingSpinner, ChartLoadingSpinner } from '@/components/ui/loading-spinner';

const COLORS = ['#ec4899', '#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#6366f1', '#14b8a6'];

// Lazy load chart components
const IncomePieChart = dynamic(
  () => import('@/components/analytics/AnalyticsCharts').then(mod => ({ default: mod.IncomePieChart })),
  { loading: () => <ChartLoadingSpinner />, ssr: false }
);

const ExpensePieChart = dynamic(
  () => import('@/components/analytics/AnalyticsCharts').then(mod => ({ default: mod.ExpensePieChart })),
  { loading: () => <ChartLoadingSpinner />, ssr: false }
);

const TopExpenseBarChart = dynamic(
  () => import('@/components/analytics/AnalyticsCharts').then(mod => ({ default: mod.TopExpenseBarChart })),
  { loading: () => <ChartLoadingSpinner />, ssr: false }
);

export default function AnalyticsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [scopeFilter, setScopeFilter] = useState<'personal' | 'couple'>('personal');
  const [startDate, setStartDate] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [analysis, setAnalysis] = useState<CategoryAnalysis | null>(null);
  const [dataLoading, setDataLoading] = useState(true);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [authLoading, user, router]);

  const loadAnalysis = useCallback(async () => {
    if (!user) return;
    try {
      const response = await analyticsApi.categoryAnalysis({
        start_date: startDate,
        end_date: endDate,
        scope: scopeFilter,
      });
      setAnalysis(response.data);
    } catch (err) {
      console.error('Failed to load analysis:', err);
    } finally {
      setDataLoading(false);
    }
  }, [user, startDate, endDate, scopeFilter]);

  useEffect(() => {
    if (user) {
      loadAnalysis();
    }
  }, [user, loadAnalysis]);

  const formatCurrency = (value: string | number) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return `¥${num.toLocaleString()}`;
  };

  // Prepare data for charts
  const incomeData = analysis?.income_breakdown.map((item, index) => ({
    name: item.category,
    value: parseFloat(item.total),
    color: COLORS[index % COLORS.length],
    count: item.transaction_count,
    percentage: item.percentage,
  })) || [];

  const expenseData = analysis?.expense_breakdown.map((item, index) => ({
    name: item.category,
    value: parseFloat(item.total),
    color: COLORS[index % COLORS.length],
    count: item.transaction_count,
    percentage: item.percentage,
  })) || [];

  const topExpenseData = analysis?.top_expense_categories.map((item, index) => ({
    name: item.category,
    value: parseFloat(item.total),
    color: COLORS[index % COLORS.length],
  })) || [];

  // Show spinner while loading
  if (authLoading || !user) {
    return <PageLoadingSpinner />;
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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">分析</h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">収支の詳細分析</p>
        </div>

        {/* Filter Section */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white">期間指定</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                開始日
              </label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                終了日
              </label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full"
              />
            </div>
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
                onClick={loadAnalysis}
                className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700"
              >
                分析を実行
              </Button>
            </div>
          </div>
        </div>

        {/* Pie Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Income Pie Chart */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
              収入内訳（円グラフ）
            </h3>
            {incomeData.length > 0 ? (
              <IncomePieChart data={incomeData} />
            ) : (
              <p className="text-center text-gray-500 dark:text-gray-400 py-20">データがありません</p>
            )}
          </div>

          {/* Expense Pie Chart */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
              支出内訳（円グラフ）
            </h3>
            {expenseData.length > 0 ? (
              <ExpensePieChart data={expenseData} />
            ) : (
              <p className="text-center text-gray-500 dark:text-gray-400 py-20">データがありません</p>
            )}
          </div>
        </div>

        {/* Top Expense Categories Bar Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
            トップ支出カテゴリー（棒グラフ）
          </h3>
          {topExpenseData.length > 0 ? (
            <TopExpenseBarChart data={topExpenseData} formatCurrency={formatCurrency} />
          ) : (
            <p className="text-center text-gray-500 dark:text-gray-400 py-20">データがありません</p>
          )}
        </div>

        {/* Detail Tables */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Income Details Table */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">収入詳細テーブル</h3>
            {incomeData.length > 0 ? (
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                      カテゴリー
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                      金額
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                      割合
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                      件数
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {incomeData.map((item) => (
                    <tr key={item.name}>
                      <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-100">{item.name}</td>
                      <td className="px-4 py-2 text-sm text-right text-green-600 dark:text-green-400">
                        {formatCurrency(item.value)}
                      </td>
                      <td className="px-4 py-2 text-sm text-right text-gray-600 dark:text-gray-400">
                        {item.percentage.toFixed(1)}%
                      </td>
                      <td className="px-4 py-2 text-sm text-right text-gray-600 dark:text-gray-400">
                        {item.count}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-center text-gray-500 dark:text-gray-400 py-8">データがありません</p>
            )}
          </div>

          {/* Expense Details Table */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">支出詳細テーブル</h3>
            {expenseData.length > 0 ? (
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                      カテゴリー
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                      金額
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                      割合
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                      件数
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {expenseData.map((item) => (
                    <tr key={item.name}>
                      <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-100">{item.name}</td>
                      <td className="px-4 py-2 text-sm text-right text-red-600 dark:text-red-400">
                        {formatCurrency(item.value)}
                      </td>
                      <td className="px-4 py-2 text-sm text-right text-gray-600 dark:text-gray-400">
                        {item.percentage.toFixed(1)}%
                      </td>
                      <td className="px-4 py-2 text-sm text-right text-gray-600 dark:text-gray-400">
                        {item.count}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-center text-gray-500 dark:text-gray-400 py-8">データがありません</p>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
