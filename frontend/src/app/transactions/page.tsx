'use client';

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import MainLayout from "@/components/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { transactionApi } from "@/lib/api";
import { Transaction, INCOME_CATEGORIES, ALL_EXPENSE_CATEGORIES } from "@/types";
import { Trash2, Plus, Filter } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { PageSkeleton } from "@/components/DashboardSkeleton";
import { PageLoadingSpinner } from "@/components/ui/loading-spinner";

export default function TransactionsPage() {
  const router = useRouter();
  const { user, couple, loading: authLoading } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Filter state
  const [scopeFilter, setScopeFilter] = useState<'all' | 'personal' | 'couple'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Form state
  const [formType, setFormType] = useState<'income' | 'expense'>('expense');
  const [formCategory, setFormCategory] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formDescription, setFormDescription] = useState('');
  const [formIsSplit, setFormIsSplit] = useState(false);
  const [formLoading, setFormLoading] = useState(false);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [authLoading, user, router]);

  const fetchTransactions = useCallback(async () => {
    if (!user) return;

    try {
      const params: any = {};

      if (scopeFilter !== 'all') {
        params.scope = scopeFilter;
      }

      if (typeFilter !== 'all') {
        params.type = typeFilter;
      }

      if (categoryFilter !== 'all') {
        params.category = categoryFilter;
      }

      const res = await transactionApi.list(params);
      setTransactions(res.data);
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
    } finally {
      setDataLoading(false);
    }
  }, [user, scopeFilter, typeFilter, categoryFilter]);

  useEffect(() => {
    if (user) {
      fetchTransactions();
    }
  }, [user, fetchTransactions]);

  const handleDelete = async (id: string) => {
    if (!confirm('この取引を削除しますか？')) {
      return;
    }

    try {
      await transactionApi.delete(id);
      fetchTransactions();
    } catch (error) {
      console.error('Failed to delete transaction:', error);
      alert('取引の削除に失敗しました');
    }
  };

  const handleSubmit = async () => {
    if (!formCategory || !formAmount) {
      alert('カテゴリーと金額は必須です');
      return;
    }

    setFormLoading(true);
    try {
      await transactionApi.create({
        type: formType,
        category: formCategory,
        amount: parseFloat(formAmount),
        date: formDate,
        description: formDescription,
        is_split: formType === 'expense' ? formIsSplit : false,
      });

      setIsDialogOpen(false);
      resetForm();
      fetchTransactions();
    } catch (error) {
      console.error('Failed to create transaction:', error);
      alert('登録に失敗しました');
    } finally {
      setFormLoading(false);
    }
  };

  const resetForm = () => {
    setFormType('expense');
    setFormCategory('');
    setFormAmount('');
    setFormDate(new Date().toISOString().split('T')[0]);
    setFormDescription('');
    setFormIsSplit(false);
  };

  const formatCurrency = (amount: string | number) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return `¥${num.toLocaleString()}`;
  };

  const allCategories = [...INCOME_CATEGORIES, ...ALL_EXPENSE_CATEGORIES];
  const availableCategories = formType === 'income' ? INCOME_CATEGORIES : ALL_EXPENSE_CATEGORIES;

  // Show spinner while auth is loading
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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">家計簿一覧</h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">すべての収入・支出を管理</p>
        </div>

        {/* Filter Section */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white">フィルター</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                表示範囲
              </label>
              <Select value={scopeFilter} onValueChange={(v: any) => setScopeFilter(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">すべて</SelectItem>
                  <SelectItem value="personal">個人</SelectItem>
                  {couple && <SelectItem value="couple">カップル</SelectItem>}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                種類
              </label>
              <Select value={typeFilter} onValueChange={(v: any) => setTypeFilter(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">すべて</SelectItem>
                  <SelectItem value="income">収入</SelectItem>
                  <SelectItem value="expense">支出</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                カテゴリー
              </label>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">すべて</SelectItem>
                  {allCategories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700">
                    <Plus className="w-4 h-4 mr-2" />
                    新規登録
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle className="text-2xl">取引登録</DialogTitle>
                    <p className="text-sm text-gray-600 dark:text-gray-400">収入または支出を記録します</p>
                  </DialogHeader>

                  <div className="mt-6 space-y-6">
                    {/* Transaction Info */}
                    <div>
                      <h3 className="text-lg font-semibold mb-3 dark:text-white">取引情報</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                        必要な情報を入力してください
                      </p>

                      {/* Type */}
                      <div className="mb-4">
                        <Label className="mb-2 block">
                          種類 <span className="text-red-500">*</span>
                        </Label>
                        <div className="grid grid-cols-2 gap-3">
                          <button
                            type="button"
                            onClick={() => {
                              setFormType('income');
                              setFormCategory('');
                              setFormIsSplit(false);
                            }}
                            className={`px-4 py-3 rounded-lg border-2 transition-all ${
                              formType === 'income'
                                ? 'border-green-500 bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                                : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-300'
                            }`}
                          >
                            収入
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setFormType('expense');
                              setFormCategory('');
                            }}
                            className={`px-4 py-3 rounded-lg border-2 transition-all ${
                              formType === 'expense'
                                ? 'border-red-500 bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                                : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-300'
                            }`}
                          >
                            支出
                          </button>
                        </div>
                      </div>

                      {/* Category */}
                      <div className="mb-4">
                        <Label htmlFor="category" className="mb-2 block">
                          カテゴリー <span className="text-red-500">*</span>
                        </Label>
                        <Select value={formCategory} onValueChange={setFormCategory}>
                          <SelectTrigger id="category">
                            <SelectValue placeholder="カテゴリーを選択" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableCategories.map((cat) => (
                              <SelectItem key={cat} value={cat}>
                                {cat}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Amount */}
                      <div className="mb-4">
                        <Label htmlFor="amount" className="mb-2 block">
                          金額 <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="amount"
                          type="number"
                          placeholder="10000"
                          value={formAmount}
                          onChange={(e) => setFormAmount(e.target.value)}
                        />
                      </div>

                      {/* Date */}
                      <div className="mb-4">
                        <Label htmlFor="date" className="mb-2 block">
                          日付 <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="date"
                          type="date"
                          value={formDate}
                          onChange={(e) => setFormDate(e.target.value)}
                        />
                      </div>

                      {/* Description */}
                      <div className="mb-4">
                        <Label htmlFor="description" className="mb-2 block">
                          説明（任意）
                        </Label>
                        <Textarea
                          id="description"
                          placeholder="例: スーパーでの買い物"
                          value={formDescription}
                          onChange={(e) => setFormDescription(e.target.value)}
                          rows={3}
                        />
                      </div>

                      {/* Split Setting - only for expenses */}
                      {couple && formType === 'expense' && (
                        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-gray-900 dark:text-white">割り勘にする</p>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                {couple.user1.id === user?.id ? couple.user2.name : couple.user1.name} さんと半額ずつ負担します
                              </p>
                            </div>
                            <Switch
                              checked={formIsSplit}
                              onCheckedChange={setFormIsSplit}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Buttons */}
                    <div className="flex gap-3 pt-4 border-t dark:border-gray-700">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsDialogOpen(false)}
                        className="flex-1"
                      >
                        キャンセル
                      </Button>
                      <Button
                        type="button"
                        onClick={handleSubmit}
                        disabled={formLoading}
                        className="flex-1 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700"
                      >
                        {formLoading ? '登録中...' : '登録する'}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>

        {/* Transactions Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap">
                    日付
                  </th>
                  <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    カテゴリー
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider hidden md:table-cell">
                    説明
                  </th>
                  <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider hidden sm:table-cell">
                    種類
                  </th>
                  <th className="px-3 md:px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    金額
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider hidden md:table-cell">
                    範囲
                  </th>
                  <th className="px-2 md:px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">

                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                      取引がありません
                    </td>
                  </tr>
                ) : (
                  transactions.map((transaction) => {
                    const date = new Date(transaction.date);
                    const formattedDate = `${date.getMonth() + 1}/${date.getDate()}`;
                    const fullDate = transaction.date;
                    return (
                      <tr key={transaction.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-3 md:px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          <span className="md:hidden">{formattedDate}</span>
                          <span className="hidden md:inline">{fullDate}</span>
                        </td>
                        <td className="px-3 md:px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200">
                            {transaction.category}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-300 hidden md:table-cell">
                          {transaction.description || '-'}
                        </td>
                        <td className="px-3 md:px-6 py-4 whitespace-nowrap hidden sm:table-cell">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              transaction.type === 'income'
                                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                            }`}
                          >
                            {transaction.type === 'income' ? '収入' : '支出'}
                          </span>
                        </td>
                        <td className="px-3 md:px-6 py-4 whitespace-nowrap text-sm text-right font-medium">
                          <span
                            className={
                              transaction.type === 'income' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                            }
                          >
                            {transaction.type === 'income' ? '+' : '-'}
                            {formatCurrency(transaction.amount)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center hidden md:table-cell">
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {transaction.is_split ? 'カップル' : '個人'}
                          </span>
                        </td>
                        <td className="px-2 md:px-6 py-4 whitespace-nowrap text-center">
                          <button
                            onClick={() => handleDelete(transaction.id)}
                            className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
