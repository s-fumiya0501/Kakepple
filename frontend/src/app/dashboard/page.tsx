'use client';

import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import MainLayout from "@/components/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { transactionApi, analyticsApi, budgetApi, SavingsData } from "@/lib/api";
import { TransactionSummary, Transaction, Budget, CategoryBreakdown } from "@/types";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardSkeleton } from "@/components/DashboardSkeleton";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Heart,
  ShoppingCart,
  Package,
  Car,
  Coffee,
  Sparkles,
  PiggyBank,
  Users,
  Target,
  Plus,
  X,
  Settings,
  Utensils,
  Home,
  Smartphone,
  Gift,
  Plane,
  BookOpen,
  Shirt,
  Zap,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { format, endOfMonth } from 'date-fns';
import { ja } from 'date-fns/locale';

// カテゴリ別の色
const COLORS = [
  '#ec4899', '#8b5cf6', '#3b82f6', '#10b981', '#f59e0b',
  '#ef4444', '#6366f1', '#14b8a6', '#84cc16', '#6b7280'
];

interface MonthlyTrendData {
  month: string;
  収入: number;
  支出: number;
}

// デフォルトのクイック入力用カテゴリ
const defaultQuickCategories = [
  { name: '食費', icon: 'ShoppingCart', color: 'bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-300' },
  { name: '日用品', icon: 'Package', color: 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300' },
  { name: '交通費', icon: 'Car', color: 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-300' },
  { name: '交際費', icon: 'Coffee', color: 'bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-300' },
  { name: '娯楽費', icon: 'Sparkles', color: 'bg-pink-100 text-pink-600 dark:bg-pink-900 dark:text-pink-300' },
];

// アイコンマッピング
const iconMap: { [key: string]: any } = {
  ShoppingCart,
  Package,
  Car,
  Coffee,
  Sparkles,
  Utensils,
  Home,
  Smartphone,
  Gift,
  Plane,
  BookOpen,
  Shirt,
  Zap,
  Heart,
  Target,
};

// 利用可能なアイコンリスト
const availableIcons = [
  { name: 'ShoppingCart', label: '買い物' },
  { name: 'Utensils', label: '食事' },
  { name: 'Package', label: '荷物' },
  { name: 'Car', label: '車' },
  { name: 'Coffee', label: 'カフェ' },
  { name: 'Sparkles', label: '娯楽' },
  { name: 'Home', label: '家' },
  { name: 'Smartphone', label: 'スマホ' },
  { name: 'Gift', label: 'ギフト' },
  { name: 'Plane', label: '旅行' },
  { name: 'BookOpen', label: '書籍' },
  { name: 'Shirt', label: '衣類' },
  { name: 'Zap', label: '光熱費' },
  { name: 'Heart', label: 'ハート' },
];

// 利用可能なカラー
const availableColors = [
  { value: 'bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-300', label: '赤' },
  { value: 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300', label: '青' },
  { value: 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-300', label: '緑' },
  { value: 'bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-300', label: '紫' },
  { value: 'bg-pink-100 text-pink-600 dark:bg-pink-900 dark:text-pink-300', label: 'ピンク' },
  { value: 'bg-amber-100 text-amber-600 dark:bg-amber-900 dark:text-amber-300', label: 'オレンジ' },
  { value: 'bg-cyan-100 text-cyan-600 dark:bg-cyan-900 dark:text-cyan-300', label: 'シアン' },
  { value: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300', label: 'グレー' },
];

interface QuickCategory {
  name: string;
  icon: string;
  color: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, couple, loading: authLoading } = useAuth();
  const [personalSummary, setPersonalSummary] = useState<TransactionSummary | null>(null);
  const [coupleSummary, setCoupleSummary] = useState<TransactionSummary | null>(null);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [expenseBreakdown, setExpenseBreakdown] = useState<CategoryBreakdown[]>([]);
  const [monthlyTrends, setMonthlyTrends] = useState<MonthlyTrendData[]>([]);
  const [personalBudgets, setPersonalBudgets] = useState<Budget[]>([]);
  const [coupleBudgets, setCoupleBudgets] = useState<Budget[]>([]);
  const [savings, setSavings] = useState<SavingsData | null>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [chartsReady, setChartsReady] = useState(false);

  // クイック入力用のstate
  const [quickInputOpen, setQuickInputOpen] = useState(false);
  const [quickInputCategory, setQuickInputCategory] = useState('');
  const [quickInputAmount, setQuickInputAmount] = useState('');
  const [quickInputDescription, setQuickInputDescription] = useState('');
  const [quickInputLoading, setQuickInputLoading] = useState(false);

  // カスタムカテゴリ管理用のstate
  const [quickCategories, setQuickCategories] = useState<QuickCategory[]>(defaultQuickCategories);
  const [categorySettingsOpen, setCategorySettingsOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryIcon, setNewCategoryIcon] = useState('ShoppingCart');
  const [newCategoryColor, setNewCategoryColor] = useState(availableColors[0].value);

  useEffect(() => {
    // Delay chart rendering to ensure animations work after hydration
    const timer = setTimeout(() => {
      setChartsReady(true);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // Load custom categories from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('quickCategories');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setQuickCategories(parsed);
      } catch (e) {
        console.error('Failed to parse saved categories:', e);
      }
    }
  }, []);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [authLoading, user, router]);

  // Fetch dashboard data when user is available
  const fetchData = useCallback(async () => {
    if (!user) return;

    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

    try {
      // Fetch all data in parallel for better performance
      const [
        personalSummaryRes,
        coupleSummaryRes,
        transactionsRes,
        categoryRes,
        trendsRes,
        personalBudgetRes,
        coupleBudgetRes,
        savingsRes
      ] = await Promise.allSettled([
        transactionApi.summary({ scope: 'personal' }),
        couple ? transactionApi.summary({ scope: 'couple' }) : Promise.reject('no couple'),
        transactionApi.list({ scope: 'personal', limit: 5 }),
        analyticsApi.categoryAnalysis({ start_date: startDate, end_date: endDate, scope: 'personal' }),
        analyticsApi.monthlyTrends({ year: now.getFullYear(), scope: 'personal' }),
        budgetApi.getCurrentStatus('personal'),
        couple ? budgetApi.getCurrentStatus('couple') : Promise.reject('no couple'),
        analyticsApi.savings()
      ]);

      // Process results
      if (personalSummaryRes.status === 'fulfilled') {
        setPersonalSummary(personalSummaryRes.value.data);
      }

      if (coupleSummaryRes.status === 'fulfilled') {
        setCoupleSummary(coupleSummaryRes.value.data);
      }

      if (transactionsRes.status === 'fulfilled') {
        setRecentTransactions(transactionsRes.value.data);
      }

      if (categoryRes.status === 'fulfilled') {
        setExpenseBreakdown(categoryRes.value.data.expense_breakdown || []);
      }

      if (trendsRes.status === 'fulfilled') {
        const currentMonth = now.getMonth() + 1;
        const last6Months = trendsRes.value.data
          .filter((m: any) => m.month <= currentMonth)
          .slice(-6)
          .map((m: any) => ({
            month: m.month_name,
            収入: parseFloat(m.total_income),
            支出: parseFloat(m.total_expense)
          }));
        setMonthlyTrends(last6Months);
      }

      if (personalBudgetRes.status === 'fulfilled') {
        setPersonalBudgets(personalBudgetRes.value.data || []);
      }

      if (coupleBudgetRes.status === 'fulfilled') {
        setCoupleBudgets(coupleBudgetRes.value.data || []);
      }

      if (savingsRes.status === 'fulfilled') {
        setSavings(savingsRes.value.data);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setDataLoading(false);
    }
  }, [user, couple]);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user, fetchData]);

  const formatCurrency = (amount: string | number) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return `¥${num.toLocaleString()}`;
  };

  // カテゴリを保存
  const saveCategories = (categories: QuickCategory[]) => {
    setQuickCategories(categories);
    localStorage.setItem('quickCategories', JSON.stringify(categories));
  };

  // カテゴリを追加
  const addCategory = () => {
    if (!newCategoryName.trim()) return;
    const newCategory: QuickCategory = {
      name: newCategoryName.trim(),
      icon: newCategoryIcon,
      color: newCategoryColor,
    };
    saveCategories([...quickCategories, newCategory]);
    setNewCategoryName('');
    setNewCategoryIcon('ShoppingCart');
    setNewCategoryColor(availableColors[0].value);
  };

  // カテゴリを削除
  const removeCategory = (index: number) => {
    const updated = quickCategories.filter((_, i) => i !== index);
    saveCategories(updated);
  };

  // デフォルトにリセット
  const resetCategories = () => {
    saveCategories(defaultQuickCategories);
  };

  // クイック入力を開く
  const openQuickInput = (category: string) => {
    setQuickInputCategory(category);
    setQuickInputAmount('');
    setQuickInputDescription('');
    setQuickInputOpen(true);
  };

  // クイック入力で登録
  const handleQuickSubmit = async () => {
    if (!quickInputAmount || parseFloat(quickInputAmount) <= 0) return;

    setQuickInputLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      await transactionApi.create({
        type: 'expense',
        category: quickInputCategory,
        amount: parseFloat(quickInputAmount),
        date: today,
        description: quickInputDescription || '',
        is_split: false,
      });

      setQuickInputOpen(false);
      setQuickInputAmount('');
      setQuickInputDescription('');
      // データを再取得
      fetchData();
    } catch (error) {
      console.error('Failed to create transaction:', error);
      alert('登録に失敗しました');
    } finally {
      setQuickInputLoading(false);
    }
  };

  // 個人の残り予算情報
  const personalBudgetInfo = useMemo(() => {
    const monthlyBudget = personalBudgets.find(b => b.budget_type === 'monthly_total');
    if (!monthlyBudget) return null;

    const total = parseFloat(monthlyBudget.amount);
    const used = parseFloat(monthlyBudget.current_spent || '0');
    const remaining = total - used;
    const now = new Date();
    const daysInMonth = endOfMonth(now).getDate();
    const currentDay = now.getDate();
    const remainingDays = daysInMonth - currentDay + 1;
    const dailyBudget = remaining > 0 ? remaining / remainingDays : 0;
    const percentUsed = total > 0 ? (used / total) * 100 : 0;

    return {
      total,
      used,
      remaining,
      dailyBudget,
      remainingDays,
      percentUsed,
    };
  }, [personalBudgets]);

  // カップルの残り予算情報
  const coupleBudgetInfo = useMemo(() => {
    const monthlyBudget = coupleBudgets.find(b => b.budget_type === 'monthly_total');
    if (!monthlyBudget) return null;

    const total = parseFloat(monthlyBudget.amount);
    const used = parseFloat(monthlyBudget.current_spent || '0');
    const remaining = total - used;
    const now = new Date();
    const daysInMonth = endOfMonth(now).getDate();
    const currentDay = now.getDate();
    const remainingDays = daysInMonth - currentDay + 1;
    const dailyBudget = remaining > 0 ? remaining / remainingDays : 0;
    const percentUsed = total > 0 ? (used / total) * 100 : 0;

    return {
      total,
      used,
      remaining,
      dailyBudget,
      remainingDays,
      percentUsed,
    };
  }, [coupleBudgets]);

  // 今月の個人収支
  const personalStats = useMemo(() => {
    if (!personalSummary) {
      return { income: 0, expense: 0, balance: 0 };
    }
    return {
      income: parseFloat(personalSummary.total_income),
      expense: parseFloat(personalSummary.total_expense),
      balance: parseFloat(personalSummary.balance),
    };
  }, [personalSummary]);

  // 今月のカップル収支
  const coupleStats = useMemo(() => {
    if (!coupleSummary) {
      return { income: 0, expense: 0, balance: 0 };
    }
    return {
      income: parseFloat(coupleSummary.total_income),
      expense: parseFloat(coupleSummary.total_expense),
      balance: parseFloat(coupleSummary.balance),
    };
  }, [coupleSummary]);

  // Pie chart data
  const pieData = expenseBreakdown.map((item, index) => ({
    name: item.category,
    value: parseFloat(item.total),
    color: COLORS[index % COLORS.length]
  }));

  // Show loading while auth is loading
  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <p className="text-gray-500 dark:text-gray-400">読み込み中...</p>
      </div>
    );
  }

  // Show skeleton while data is loading
  if (dataLoading) {
    return (
      <MainLayout user={user}>
        <DashboardSkeleton />
      </MainLayout>
    );
  }

  // 収支サマリーカードコンポーネント
  const SummaryCard = ({
    label,
    value,
    icon: Icon,
    colorClass,
    bgClass
  }: {
    label: string;
    value: number;
    icon: any;
    colorClass: string;
    bgClass: string;
  }) => (
    <div className="rounded-lg bg-white p-4 shadow dark:bg-gray-800">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-600 dark:text-gray-400">{label}</p>
          <p className={`mt-1 text-lg font-bold ${colorClass}`}>
            {formatCurrency(value)}
          </p>
        </div>
        <div className={`rounded-full p-2 ${bgClass}`}>
          <Icon className={`h-4 w-4 ${colorClass}`} />
        </div>
      </div>
    </div>
  );

  // 予算カードコンポーネント
  const BudgetCard = ({ budgetInfo, gradient }: { budgetInfo: any; gradient: string }) => (
    <div className={`rounded-lg ${gradient} p-4 text-white`}>
      <div className="flex items-center gap-2 mb-2">
        <Target className="h-4 w-4" />
        <h4 className="font-semibold text-sm">残り予算</h4>
      </div>
      <p className="text-2xl font-bold">{formatCurrency(budgetInfo.remaining)}</p>
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <div>
          <p className="opacity-75">1日あたり</p>
          <p className="font-semibold">{formatCurrency(Math.floor(budgetInfo.dailyBudget))}</p>
        </div>
        <div>
          <p className="opacity-75">残り日数</p>
          <p className="font-semibold">{budgetInfo.remainingDays}日</p>
        </div>
      </div>
      <div className="mt-3">
        <div className="h-1.5 overflow-hidden rounded-full bg-white/30">
          <div
            className="h-full bg-white"
            style={{ width: `${Math.min(budgetInfo.percentUsed, 100)}%` }}
          />
        </div>
        <p className="mt-1 text-xs opacity-75">
          {formatCurrency(budgetInfo.used)} / {formatCurrency(budgetInfo.total)}
        </p>
      </div>
    </div>
  );

  // 資産カードコンポーネント
  const AssetCard = ({
    label,
    value,
    subLabel,
    subValue,
    icon: Icon,
    gradient
  }: {
    label: string;
    value: string | number;
    subLabel: string;
    subValue: string;
    icon: any;
    gradient: string;
  }) => (
    <div className={`rounded-lg ${gradient} p-4 text-white`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className="h-4 w-4" />
        <h4 className="font-semibold text-sm">{label}</h4>
      </div>
      <p className="text-xl font-bold">{formatCurrency(value)}</p>
      <p className="text-xs opacity-75 mt-1">{subLabel} ({subValue})</p>
    </div>
  );

  return (
    <MainLayout user={user}>
      <div className="space-y-6">
        {/* ヘッダー */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            ダッシュボード
          </h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">
            {format(new Date(), 'yyyy年M月', { locale: ja })}の収支状況
          </p>
        </div>

        {/* メイン: 個人とカップルの2カラムレイアウト */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* 個人セクション */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-gray-200 dark:border-gray-700">
              <div className="rounded-full bg-emerald-100 p-1.5 dark:bg-emerald-900">
                <Wallet className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">個人</h2>
            </div>

            {/* 予算 */}
            {personalBudgetInfo ? (
              <BudgetCard
                budgetInfo={personalBudgetInfo}
                gradient="bg-gradient-to-r from-emerald-500 to-teal-600"
              />
            ) : (
              <div className="rounded-lg bg-gray-100 dark:bg-gray-800 p-4 text-center">
                <p className="text-sm text-gray-500 dark:text-gray-400">予算が設定されていません</p>
                <Link href="/budgets" className="text-xs text-pink-600 hover:underline">
                  予算を設定する
                </Link>
              </div>
            )}

            {/* 収入・支出・残高 */}
            <div className="grid gap-3 grid-cols-3">
              <SummaryCard
                label="収入"
                value={personalStats.income}
                icon={TrendingUp}
                colorClass="text-green-600 dark:text-green-400"
                bgClass="bg-green-100 dark:bg-green-900"
              />
              <SummaryCard
                label="支出"
                value={personalStats.expense}
                icon={TrendingDown}
                colorClass="text-red-600 dark:text-red-400"
                bgClass="bg-red-100 dark:bg-red-900"
              />
              <SummaryCard
                label="残高"
                value={personalStats.balance}
                icon={Wallet}
                colorClass={personalStats.balance >= 0 ? "text-blue-600 dark:text-blue-400" : "text-orange-600 dark:text-orange-400"}
                bgClass="bg-blue-100 dark:bg-blue-900"
              />
            </div>

            {/* 純資産 */}
            {savings && (
              <div className="grid gap-3 grid-cols-2">
                <AssetCard
                  label="使用可能"
                  value={savings.personal_balance}
                  subLabel="累計残高"
                  subValue="収入-支出"
                  icon={Wallet}
                  gradient="bg-gradient-to-r from-cyan-500 to-blue-600"
                />
                <AssetCard
                  label="総資産"
                  value={savings.personal_total_balance}
                  subLabel="資産含む"
                  subValue={`¥${parseFloat(savings.personal_assets_total).toLocaleString()}`}
                  icon={PiggyBank}
                  gradient="bg-gradient-to-r from-amber-500 to-orange-600"
                />
              </div>
            )}
          </div>

          {/* カップルセクション */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-gray-200 dark:border-gray-700">
              <div className="rounded-full bg-pink-100 p-1.5 dark:bg-pink-900">
                <Users className="h-4 w-4 text-pink-600 dark:text-pink-400" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">カップル</h2>
            </div>

            {couple ? (
              <>
                {/* 予算 */}
                {coupleBudgetInfo ? (
                  <BudgetCard
                    budgetInfo={coupleBudgetInfo}
                    gradient="bg-gradient-to-r from-pink-500 to-purple-600"
                  />
                ) : (
                  <div className="rounded-lg bg-gray-100 dark:bg-gray-800 p-4 text-center">
                    <p className="text-sm text-gray-500 dark:text-gray-400">カップル予算が設定されていません</p>
                    <Link href="/budgets" className="text-xs text-pink-600 hover:underline">
                      予算を設定する
                    </Link>
                  </div>
                )}

                {/* 収入・支出・残高 */}
                <div className="grid gap-3 grid-cols-3">
                  <SummaryCard
                    label="収入"
                    value={coupleStats.income}
                    icon={TrendingUp}
                    colorClass="text-green-600 dark:text-green-400"
                    bgClass="bg-green-100 dark:bg-green-900"
                  />
                  <SummaryCard
                    label="支出"
                    value={coupleStats.expense}
                    icon={TrendingDown}
                    colorClass="text-red-600 dark:text-red-400"
                    bgClass="bg-red-100 dark:bg-red-900"
                  />
                  <SummaryCard
                    label="残高"
                    value={coupleStats.balance}
                    icon={Wallet}
                    colorClass={coupleStats.balance >= 0 ? "text-blue-600 dark:text-blue-400" : "text-orange-600 dark:text-orange-400"}
                    bgClass="bg-blue-100 dark:bg-blue-900"
                  />
                </div>

                {/* 純資産 */}
                {savings && savings.has_couple && savings.couple_balance !== null && (
                  <div className="grid gap-3 grid-cols-2">
                    <AssetCard
                      label="使用可能"
                      value={savings.couple_balance}
                      subLabel="累計残高"
                      subValue="収入-支出"
                      icon={Users}
                      gradient="bg-gradient-to-r from-pink-500 to-rose-600"
                    />
                    <AssetCard
                      label="総資産"
                      value={savings.couple_total_balance || 0}
                      subLabel="資産含む"
                      subValue={`¥${parseFloat(savings.couple_assets_total || '0').toLocaleString()}`}
                      icon={PiggyBank}
                      gradient="bg-gradient-to-r from-violet-500 to-purple-600"
                    />
                  </div>
                )}
              </>
            ) : (
              <div className="rounded-lg bg-pink-50 p-6 dark:bg-pink-900/20">
                <div className="flex items-start">
                  <Heart className="mr-3 h-6 w-6 flex-shrink-0 text-pink-600 dark:text-pink-400" />
                  <div className="flex-1">
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                      カップルで家計簿を共有しませんか？
                    </h3>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                      パートナーと家計簿を共有して、一緒に収支を管理できます。
                    </p>
                    <Link
                      href="/couple"
                      className="mt-3 inline-block rounded-lg bg-pink-600 px-4 py-2 text-sm text-white hover:bg-pink-700 dark:bg-pink-500 dark:hover:bg-pink-600"
                    >
                      カップル登録する
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* クイック入力 */}
        <div className="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              クイック入力
            </h2>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setCategorySettingsOpen(true)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                title="カテゴリ設定"
              >
                <Settings className="h-5 w-5" />
              </button>
              <Link
                href="/transactions/new"
                className="text-sm text-pink-600 hover:text-pink-700 dark:text-pink-400"
              >
                詳細入力
              </Link>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            {quickCategories.map((category, index) => {
              const Icon = iconMap[category.icon] || ShoppingCart;
              return (
                <button
                  key={`${category.name}-${index}`}
                  onClick={() => openQuickInput(category.name)}
                  className={`flex flex-col items-center rounded-lg p-4 ${category.color} hover:opacity-80 transition-opacity`}
                >
                  <Icon className="h-6 w-6" />
                  <span className="mt-2 text-sm font-medium">{category.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* グラフ */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* 支出円グラフ */}
          <div className="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
            <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
              今月のカテゴリー別支出
            </h2>
            {!chartsReady ? (
              <div className="h-[300px] flex items-center justify-center">
                <p className="text-gray-500 dark:text-gray-400">読み込み中...</p>
              </div>
            ) : pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }: any) =>
                      `${name} (¥${value.toLocaleString()})`
                    }
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    animationBegin={0}
                    animationDuration={800}
                  >
                    {pieData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[300px] items-center justify-center text-gray-500 dark:text-gray-400">
                今月の支出データがありません
              </div>
            )}
          </div>

          {/* 月次推移グラフ */}
          <div className="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
            <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
              月次推移（過去6ヶ月）
            </h2>
            {!chartsReady ? (
              <div className="h-[300px] flex items-center justify-center">
                <p className="text-gray-500 dark:text-gray-400">読み込み中...</p>
              </div>
            ) : monthlyTrends.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={monthlyTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Legend />
                  <Bar dataKey="収入" fill="#10b981" animationDuration={800} />
                  <Bar dataKey="支出" fill="#ef4444" animationDuration={800} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[300px] items-center justify-center text-gray-500 dark:text-gray-400">
                収支データがありません
              </div>
            )}
          </div>
        </div>

        {/* 最近の取引 */}
        <div className="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              最近の取引
            </h2>
            <Link
              href="/transactions"
              className="text-sm text-pink-600 hover:text-pink-700 dark:text-pink-400"
            >
              すべて表示
            </Link>
          </div>
          {recentTransactions.length > 0 ? (
            <div className="space-y-3">
              {recentTransactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between border-b border-gray-100 pb-3 last:border-0 dark:border-gray-700"
                >
                  <div className="flex items-center">
                    <div
                      className={`mr-3 rounded-full p-2 ${
                        transaction.type === 'income'
                          ? 'bg-green-100 dark:bg-green-900'
                          : 'bg-red-100 dark:bg-red-900'
                      }`}
                    >
                      {transaction.type === 'income' ? (
                        <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
                      ) : (
                        <TrendingDown className="h-5 w-5 text-red-600 dark:text-red-400" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {transaction.category}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {transaction.description || '-'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p
                      className={`font-semibold ${
                        transaction.type === 'income'
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-red-600 dark:text-red-400'
                      }`}
                    >
                      {transaction.type === 'income' ? '+' : '-'}
                      {formatCurrency(transaction.amount)}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {format(new Date(transaction.date), 'M/d', { locale: ja })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-gray-500 dark:text-gray-400">
              取引がありません
            </div>
          )}
        </div>
      </div>

      {/* Quick Input Modal */}
      <Dialog open={quickInputOpen} onOpenChange={setQuickInputOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {(() => {
                const cat = quickCategories.find(c => c.name === quickInputCategory);
                if (cat) {
                  const Icon = iconMap[cat.icon] || ShoppingCart;
                  return <Icon className="h-5 w-5" />;
                }
                return null;
              })()}
              {quickInputCategory}を登録
            </DialogTitle>
            <DialogDescription>
              金額を入力してください（今日の日付で登録されます）
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-lg">¥</span>
              <Input
                type="number"
                inputMode="numeric"
                placeholder="0"
                value={quickInputAmount}
                onChange={(e) => setQuickInputAmount(e.target.value)}
                className="pl-8 text-2xl h-14 font-bold"
                autoFocus
              />
            </div>
            {/* 金額サジェスト */}
            <div className="flex gap-2">
              {[500, 1000, 2000, 5000].map((amount) => (
                <button
                  key={amount}
                  onClick={() => setQuickInputAmount(String(amount))}
                  className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-full transition-colors"
                >
                  ¥{amount.toLocaleString()}
                </button>
              ))}
            </div>
            {/* 内容入力 */}
            <div>
              <label className="text-sm text-gray-600 dark:text-gray-400 mb-1 block">
                内容（任意）
              </label>
              <Input
                type="text"
                placeholder="例: コンビニでお弁当"
                value={quickInputDescription}
                onChange={(e) => setQuickInputDescription(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleQuickSubmit();
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setQuickInputOpen(false)}
            >
              キャンセル
            </Button>
            <Button
              onClick={handleQuickSubmit}
              disabled={!quickInputAmount || parseFloat(quickInputAmount) <= 0 || quickInputLoading}
              className="bg-pink-600 hover:bg-pink-700"
            >
              {quickInputLoading ? '登録中...' : '登録する'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Category Settings Modal */}
      <Dialog open={categorySettingsOpen} onOpenChange={setCategorySettingsOpen}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              クイック入力カテゴリ設定
            </DialogTitle>
            <DialogDescription>
              よく使うカテゴリを追加・削除できます
            </DialogDescription>
          </DialogHeader>

          {/* 現在のカテゴリ一覧 */}
          <div className="py-4">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              登録済みカテゴリ
            </h4>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {quickCategories.map((category, index) => {
                const Icon = iconMap[category.icon] || ShoppingCart;
                return (
                  <div
                    key={`${category.name}-${index}`}
                    className="flex items-center justify-between p-2 rounded-lg bg-gray-50 dark:bg-gray-800"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`rounded-lg p-2 ${category.color}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <span className="text-sm font-medium">{category.name}</span>
                    </div>
                    <button
                      onClick={() => removeCategory(index)}
                      className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                      title="削除"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                );
              })}
              {quickCategories.length === 0 && (
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                  カテゴリがありません
                </p>
              )}
            </div>
          </div>

          {/* 新規カテゴリ追加 */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              新規カテゴリを追加
            </h4>
            <div className="space-y-3">
              {/* カテゴリ名 */}
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">
                  カテゴリ名
                </label>
                <Input
                  type="text"
                  placeholder="例: 外食費"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                />
              </div>

              {/* アイコン選択 */}
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">
                  アイコン
                </label>
                <div className="flex flex-wrap gap-2">
                  {availableIcons.map((iconOption) => {
                    const Icon = iconMap[iconOption.name];
                    return (
                      <button
                        key={iconOption.name}
                        onClick={() => setNewCategoryIcon(iconOption.name)}
                        className={`p-2 rounded-lg border-2 transition-colors ${
                          newCategoryIcon === iconOption.name
                            ? 'border-pink-500 bg-pink-50 dark:bg-pink-900/30'
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                        }`}
                        title={iconOption.label}
                      >
                        <Icon className="h-4 w-4" />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* カラー選択 */}
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">
                  カラー
                </label>
                <div className="flex flex-wrap gap-2">
                  {availableColors.map((colorOption) => (
                    <button
                      key={colorOption.value}
                      onClick={() => setNewCategoryColor(colorOption.value)}
                      className={`w-8 h-8 rounded-lg ${colorOption.value} border-2 transition-colors ${
                        newCategoryColor === colorOption.value
                          ? 'border-gray-800 dark:border-white'
                          : 'border-transparent'
                      }`}
                      title={colorOption.label}
                    />
                  ))}
                </div>
              </div>

              {/* プレビュー */}
              {newCategoryName && (
                <div className="pt-2">
                  <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">
                    プレビュー
                  </label>
                  <div className={`inline-flex flex-col items-center rounded-lg p-3 ${newCategoryColor}`}>
                    {(() => {
                      const Icon = iconMap[newCategoryIcon];
                      return <Icon className="h-5 w-5" />;
                    })()}
                    <span className="mt-1 text-xs font-medium">{newCategoryName}</span>
                  </div>
                </div>
              )}

              <Button
                onClick={addCategory}
                disabled={!newCategoryName.trim()}
                className="w-full bg-pink-600 hover:bg-pink-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                カテゴリを追加
              </Button>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={resetCategories}
              className="w-full sm:w-auto"
            >
              デフォルトに戻す
            </Button>
            <Button
              onClick={() => setCategorySettingsOpen(false)}
              className="w-full sm:w-auto"
            >
              閉じる
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
