'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { budgetApi } from '@/lib/api';
import { Budget, ALL_EXPENSE_CATEGORIES } from '@/types';
import MainLayout from '@/components/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Plus, Trash2, Target, Wallet, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { PageSkeleton } from '@/components/DashboardSkeleton';

export default function BudgetsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [scope, setScope] = useState<'personal' | 'couple'>('personal');
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Form state
  const [budgetType, setBudgetType] = useState<'category' | 'monthly_total'>('monthly_total');
  const [category, setCategory] = useState('');
  const [amount, setAmount] = useState('');
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [formLoading, setFormLoading] = useState(false);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [authLoading, user, router]);

  const loadBudgets = useCallback(async () => {
    if (!user) return;
    try {
      const response = await budgetApi.list({ scope });
      setBudgets(response.data);
    } catch (err: any) {
      console.error('Failed to load budgets:', err);
    } finally {
      setDataLoading(false);
    }
  }, [user, scope]);

  useEffect(() => {
    if (user) {
      loadBudgets();
    }
  }, [user, loadBudgets]);

  const resetForm = () => {
    setBudgetType('monthly_total');
    setCategory('');
    setAmount('');
    setYear(new Date().getFullYear());
    setMonth(new Date().getMonth() + 1);
  };

  const handleCreateBudget = async () => {
    if (!amount) {
      alert('金額を入力してください');
      return;
    }
    if (budgetType === 'category' && !category) {
      alert('カテゴリを選択してください');
      return;
    }

    setFormLoading(true);
    try {
      await budgetApi.create({
        scope,
        budget_type: budgetType,
        category: budgetType === 'category' ? category : null,
        amount: parseFloat(amount),
        year,
        month,
      });
      setIsDialogOpen(false);
      resetForm();
      loadBudgets();
    } catch (err: any) {
      alert(err.response?.data?.detail || '予算の作成に失敗しました');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteBudget = async (id: string) => {
    if (!confirm('この予算を削除しますか？')) return;
    try {
      await budgetApi.delete(id);
      loadBudgets();
    } catch (err: any) {
      alert(err.response?.data?.detail || '予算の削除に失敗しました');
    }
  };

  const formatCurrency = (value: string | number) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return `¥${num.toLocaleString()}`;
  };

  const getProgressColor = (percentage?: number) => {
    if (!percentage) return 'bg-emerald-500';
    if (percentage < 50) return 'bg-emerald-500';
    if (percentage < 80) return 'bg-amber-500';
    if (percentage < 100) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getGradient = (percentage?: number) => {
    if (!percentage || percentage < 80) return 'from-emerald-500 to-teal-600';
    if (percentage < 100) return 'from-amber-500 to-orange-600';
    return 'from-red-500 to-rose-600';
  };

  // Group budgets by year-month
  const currentMonth = budgets.filter(b => b.year === new Date().getFullYear() && b.month === new Date().getMonth() + 1);
  const otherBudgets = budgets.filter(b => !(b.year === new Date().getFullYear() && b.month === new Date().getMonth() + 1));

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
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">予算管理</h1>
            <p className="mt-1 text-gray-600 dark:text-gray-400">
              月次予算を設定して支出を管理
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700">
                <Plus className="w-4 h-4 mr-2" />
                予算を追加
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="text-xl">新しい予算を作成</DialogTitle>
                <DialogDescription>
                  月次予算を設定して支出を管理しましょう
                </DialogDescription>
              </DialogHeader>

              <div className="mt-4 space-y-4">
                {/* Budget Type */}
                <div>
                  <Label className="mb-2 block">予算タイプ</Label>
                  <Select value={budgetType} onValueChange={(v: any) => setBudgetType(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly_total">月次総予算</SelectItem>
                      <SelectItem value="category">カテゴリ別予算</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Category (if category type) */}
                {budgetType === 'category' && (
                  <div>
                    <Label className="mb-2 block">カテゴリ</Label>
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger>
                        <SelectValue placeholder="カテゴリを選択" />
                      </SelectTrigger>
                      <SelectContent>
                        {ALL_EXPENSE_CATEGORIES.map((cat) => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Amount */}
                <div>
                  <Label className="mb-2 block">予算額</Label>
                  <Input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="100000"
                  />
                </div>

                {/* Year & Month */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="mb-2 block">年</Label>
                    <Input
                      type="number"
                      value={year}
                      onChange={(e) => setYear(parseInt(e.target.value))}
                    />
                  </div>
                  <div>
                    <Label className="mb-2 block">月</Label>
                    <Select value={month.toString()} onValueChange={(v) => setMonth(parseInt(v))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                          <SelectItem key={m} value={m.toString()}>{m}月</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Buttons */}
                <div className="flex gap-3 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                    className="flex-1"
                  >
                    キャンセル
                  </Button>
                  <Button
                    onClick={handleCreateBudget}
                    disabled={formLoading}
                    className="flex-1 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700"
                  >
                    {formLoading ? '作成中...' : '作成'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Scope Toggle */}
        <div className="flex gap-2">
          <button
            onClick={() => setScope('personal')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              scope === 'personal'
                ? 'bg-pink-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
            }`}
          >
            個人
          </button>
          <button
            onClick={() => setScope('couple')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              scope === 'couple'
                ? 'bg-pink-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
            }`}
          >
            カップル
          </button>
        </div>

        {/* Current Month Budgets */}
        {currentMonth.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              今月の予算
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              {currentMonth.map((budget) => (
                <div
                  key={budget.id}
                  className={`rounded-lg bg-gradient-to-r ${getGradient(budget.percentage)} p-5 text-white`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2">
                      <Target className="h-5 w-5" />
                      <h3 className="font-semibold">
                        {budget.budget_type === 'category' ? budget.category : '月次総予算'}
                      </h3>
                    </div>
                    <button
                      onClick={() => handleDeleteBudget(budget.id)}
                      className="p-1 hover:bg-white/20 rounded transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="mb-3">
                    <p className="text-2xl font-bold">
                      {formatCurrency(parseFloat(budget.amount) - parseFloat(budget.current_spent || '0'))}
                    </p>
                    <p className="text-sm opacity-90">残り予算</p>
                  </div>

                  <div className="space-y-2">
                    <div className="h-2 overflow-hidden rounded-full bg-white/30">
                      <div
                        className="h-full bg-white transition-all"
                        style={{ width: `${Math.min(budget.percentage || 0, 100)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>{formatCurrency(budget.current_spent || 0)} / {formatCurrency(budget.amount)}</span>
                      <span className="font-semibold">{(budget.percentage || 0).toFixed(0)}%</span>
                    </div>
                    {budget.is_exceeded && (
                      <div className="flex items-center gap-1 text-sm font-medium">
                        <AlertTriangle className="h-4 w-4" />
                        予算超過
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Other Budgets */}
        {otherBudgets.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              その他の予算
            </h2>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow divide-y divide-gray-200 dark:divide-gray-700">
              {otherBudgets.map((budget) => (
                <div
                  key={budget.id}
                  className="px-6 py-4 flex items-center justify-between"
                >
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {budget.budget_type === 'category' ? budget.category : '月次総予算'}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {budget.year}年{budget.month}月
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">
                      {formatCurrency(budget.amount)}
                    </p>
                    <button
                      onClick={() => handleDeleteBudget(budget.id)}
                      className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {budgets.length === 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
            <Wallet className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
              予算が設定されていません
            </h3>
            <p className="mt-2 text-gray-500 dark:text-gray-400">
              「予算を追加」ボタンから予算を作成してください
            </p>
            <Button
              onClick={() => setIsDialogOpen(true)}
              className="mt-4 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              最初の予算を作成
            </Button>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
