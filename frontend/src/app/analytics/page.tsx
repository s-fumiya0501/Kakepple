'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { authApi, analyticsApi } from '@/lib/api';
import { CategoryAnalysis, User } from '@/types';
import MainLayout from '@/components/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from 'recharts';

const COLORS = ['#ec4899', '#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#6366f1', '#14b8a6'];

export default function AnalyticsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [chartsReady, setChartsReady] = useState(false);

  useEffect(() => {
    // Delay chart rendering to ensure animations work after hydration
    const timer = setTimeout(() => {
      setChartsReady(true);
    }, 100);
    return () => clearTimeout(timer);
  }, []);
  const [scopeFilter, setScopeFilter] = useState<'personal' | 'couple'>('personal');
  const [startDate, setStartDate] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [analysis, setAnalysis] = useState<CategoryAnalysis | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const userRes = await authApi.me();
        setUser(userRes.data);
        setLoading(false);
      } catch (error) {
        router.push('/login');
      }
    };
    fetchUser();
  }, [router]);

  useEffect(() => {
    if (user) {
      loadAnalysis();
    }
  }, [scopeFilter, startDate, endDate, user]);

  const loadAnalysis = async () => {
    try {
      const response = await analyticsApi.categoryAnalysis({
        start_date: startDate,
        end_date: endDate,
        scope: scopeFilter,
      });
      setAnalysis(response.data);
    } catch (err) {
      console.error('Failed to load analysis:', err);
    }
  };

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

  const totalIncome = incomeData.reduce((sum, d) => sum + d.value, 0);
  const totalExpense = expenseData.reduce((sum, d) => sum + d.value, 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex justify-center items-center">
        <p className="text-gray-500 dark:text-gray-400">読み込み中...</p>
      </div>
    );
  }

  return (
    <MainLayout user={user!}>
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
            {!chartsReady ? (
              <div className="h-[300px] flex items-center justify-center">
                <p className="text-gray-500 dark:text-gray-400">読み込み中...</p>
              </div>
            ) : incomeData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={incomeData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry: any) => `${entry.name} (¥${entry.value.toLocaleString()})`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    animationBegin={0}
                    animationDuration={800}
                  >
                    {incomeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-gray-500 dark:text-gray-400 py-20">データがありません</p>
            )}
          </div>

          {/* Expense Pie Chart */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
              支出内訳（円グラフ）
            </h3>
            {!chartsReady ? (
              <div className="h-[300px] flex items-center justify-center">
                <p className="text-gray-500 dark:text-gray-400">読み込み中...</p>
              </div>
            ) : expenseData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={expenseData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry: any) => `${entry.name} (¥${entry.value.toLocaleString()})`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    animationBegin={0}
                    animationDuration={800}
                  >
                    {expenseData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
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
          {!chartsReady ? (
            <div className="h-[300px] flex items-center justify-center">
              <p className="text-gray-500 dark:text-gray-400">読み込み中...</p>
            </div>
          ) : topExpenseData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topExpenseData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Legend />
                <Bar dataKey="value" fill="#ec4899" name="支出額" animationDuration={800} />
              </BarChart>
            </ResponsiveContainer>
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
