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
import { Trash2, Plus, Filter, Pencil } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { PaidBySelector } from "@/components/PaidBySelector";
import { PageSkeleton } from "@/components/DashboardSkeleton";
import { PageLoadingSpinner } from "@/components/ui/loading-spinner";

const categoryColors: Record<string, string> = {
  '食費': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  '日用品': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  '交通費': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  '交際費': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  '趣味・娯楽': 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
  '医療費': 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200',
  '被服・美容': 'bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-900 dark:text-fuchsia-200',
  '家賃': 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  '電気・ガス・水道': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  '通信費': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
  'サブスク・保険': 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200',
  '本業': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
  '副業': 'bg-lime-100 text-lime-800 dark:bg-lime-900 dark:text-lime-200',
  'アルバイト': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  'パート': 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200',
  'その他': 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
};

const defaultCategoryColor = 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';

function UserAvatar({ name, pictureUrl, size = 'h-10 w-10', textSize = 'text-sm' }: { name: string; pictureUrl?: string | null; size?: string; textSize?: string }) {
  if (pictureUrl) {
    return <img src={pictureUrl} alt={name} className={`${size} rounded-full object-cover`} />;
  }
  return (
    <div className={`${size} rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center ${textSize} font-bold text-gray-700 dark:text-gray-200`}>
      {(name || '?')[0]}
    </div>
  );
}

export default function TransactionsPage() {
  const router = useRouter();
  const { user, couple, loading: authLoading } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  // Filter state
  const [scopeFilter, setScopeFilter] = useState<'all' | 'personal' | 'couple'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Form state (for new transaction)
  const [formType, setFormType] = useState<'income' | 'expense'>('expense');
  const [formCategory, setFormCategory] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formDescription, setFormDescription] = useState('');
  const [formIsSplit, setFormIsSplit] = useState(false);
  const [formPaidBy, setFormPaidBy] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  // Delete confirmation state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // Edit form state
  const [editFormType, setEditFormType] = useState<'income' | 'expense'>('expense');
  const [editFormCategory, setEditFormCategory] = useState('');
  const [editFormAmount, setEditFormAmount] = useState('');
  const [editFormDate, setEditFormDate] = useState('');
  const [editFormDescription, setEditFormDescription] = useState('');
  const [editFormIsSplit, setEditFormIsSplit] = useState(false);
  const [editFormPaidBy, setEditFormPaidBy] = useState('');
  const [editFormLoading, setEditFormLoading] = useState(false);

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

  const requestDelete = (id: string) => {
    setDeleteTargetId(id);
    setDeleteConfirmOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteTargetId) return;

    try {
      await transactionApi.delete(deleteTargetId);
      toast({
        title: "削除しました",
        variant: "success",
      });
      fetchTransactions();
    } catch (error) {
      console.error('Failed to delete transaction:', error);
      toast({
        title: "エラー",
        description: "取引の削除に失敗しました",
        variant: "destructive",
      });
    } finally {
      setDeleteTargetId(null);
    }
  };

  const handleSubmit = async (continueAdding: boolean = false) => {
    if (!formCategory || !formAmount) {
      toast({
        title: "入力エラー",
        description: "カテゴリーと金額は必須です",
        variant: "destructive",
      });
      return;
    }

    setFormLoading(true);
    try {
      const isSplit = formType === 'expense' && formIsSplit;
      await transactionApi.create({
        type: formType,
        category: formCategory,
        amount: parseFloat(formAmount),
        date: formDate,
        description: formDescription,
        is_split: isSplit,
        ...(isSplit && formPaidBy ? { paid_by_user_id: formPaidBy } : {}),
      });

      toast({
        title: "登録完了",
        description: `${formCategory} ¥${parseFloat(formAmount).toLocaleString()} を記録しました`,
        variant: "success",
      });

      if (continueAdding) {
        setFormAmount('');
        setFormDescription('');
      } else {
        setIsDialogOpen(false);
        resetForm();
      }
      fetchTransactions();
    } catch (error) {
      console.error('Failed to create transaction:', error);
      toast({
        title: "エラー",
        description: "登録に失敗しました",
        variant: "destructive",
      });
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
    setFormPaidBy(user?.id || '');
  };

  const openEditDialog = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setEditFormType(transaction.type);
    setEditFormCategory(transaction.category);
    setEditFormAmount(String(transaction.amount));
    setEditFormDate(transaction.date);
    setEditFormDescription(transaction.description || '');
    setEditFormIsSplit(transaction.is_split);
    setEditFormPaidBy(transaction.paid_by_user_id || user?.id || '');
    setIsEditDialogOpen(true);
  };

  const handleEditSubmit = async () => {
    if (!editingTransaction || !editFormCategory || !editFormAmount) {
      toast({
        title: "入力エラー",
        description: "カテゴリーと金額は必須です",
        variant: "destructive",
      });
      return;
    }

    setEditFormLoading(true);
    try {
      const isSplit = editFormType === 'expense' && editFormIsSplit;
      await transactionApi.update(editingTransaction.id, {
        type: editFormType,
        category: editFormCategory,
        amount: parseFloat(editFormAmount),
        date: editFormDate,
        description: editFormDescription,
        is_split: isSplit,
        ...(isSplit && editFormPaidBy ? { paid_by_user_id: editFormPaidBy } : {}),
      });

      toast({
        title: "更新完了",
        description: `${editFormCategory} ¥${parseFloat(editFormAmount).toLocaleString()} を更新しました`,
        variant: "success",
      });

      setIsEditDialogOpen(false);
      setEditingTransaction(null);
      fetchTransactions();
    } catch (error) {
      console.error('Failed to update transaction:', error);
      toast({
        title: "エラー",
        description: "更新に失敗しました",
        variant: "destructive",
      });
    } finally {
      setEditFormLoading(false);
    }
  };

  const editAvailableCategories = editFormType === 'income' ? INCOME_CATEGORIES : ALL_EXPENSE_CATEGORIES;

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
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="text-2xl">取引登録</DialogTitle>
                    <p className="text-sm text-gray-600 dark:text-gray-400">収入または支出を記録します</p>
                  </DialogHeader>

                  <div className="mt-4 space-y-4">
                    {/* Transaction Info */}
                    <div>
                      <h3 className="text-lg font-semibold mb-2 dark:text-white">取引情報</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                        必要な情報を入力してください
                      </p>

                      {/* Type */}
                      <div className="mb-3">
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
                      <div className="mb-3">
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
                      <div className="mb-3">
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
                      <div className="mb-3">
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
                      <div className="mb-3">
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
                              onCheckedChange={(checked) => {
                                setFormIsSplit(checked);
                                if (checked) setFormPaidBy(user?.id || '');
                              }}
                            />
                          </div>
                          {formIsSplit && user && (
                            <PaidBySelector
                              couple={couple}
                              userId={user.id}
                              value={formPaidBy}
                              onChange={setFormPaidBy}
                            />
                          )}
                        </div>
                      )}
                    </div>

                    {/* Buttons */}
                    <div className="flex gap-3 pt-3 border-t dark:border-gray-700">
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
                        variant="outline"
                        onClick={() => handleSubmit(true)}
                        disabled={formLoading}
                        className="flex-1"
                      >
                        {formLoading ? '登録中...' : '続けて登録'}
                      </Button>
                      <Button
                        type="button"
                        onClick={() => handleSubmit(false)}
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

        {/* Transactions - モバイル: カードリスト / デスクトップ: テーブル */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          {transactions.length === 0 ? (
            <div className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
              取引がありません
            </div>
          ) : (
            <>
              {/* モバイル: カードリスト */}
              <div className="md:hidden divide-y divide-gray-100 dark:divide-gray-700">
                {transactions.map((transaction) => {
                  const date = new Date(transaction.date);
                  const formattedDate = `${date.getMonth() + 1}/${date.getDate()}`;
                  return (
                    <button
                      key={transaction.id}
                      onClick={() => openEditDialog(transaction)}
                      className="w-full flex items-center gap-3 p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 active:bg-gray-100 dark:active:bg-gray-700 transition-colors"
                    >
                      <div className="flex-shrink-0 relative">
                        {transaction.is_split && couple ? (
                          // Split: two overlapping avatars, payer on top
                          <div className="relative h-10 w-12">
                            {(() => {
                              const partner = couple.user1.id === user?.id ? couple.user2 : couple.user1;
                              const payer = transaction.paid_by_user_id === user?.id ? { name: user?.name || '', pictureUrl: user?.picture_url } : { name: partner.name || '', pictureUrl: partner.picture_url };
                              const other = transaction.paid_by_user_id === user?.id ? { name: partner.name || '', pictureUrl: partner.picture_url } : { name: user?.name || '', pictureUrl: user?.picture_url };
                              return (
                                <>
                                  <div className="absolute left-0 top-0">
                                    <UserAvatar name={other.name} pictureUrl={other.pictureUrl} size="h-9 w-9" textSize="text-xs" />
                                  </div>
                                  <div className="absolute right-0 top-0.5 ring-2 ring-white dark:ring-gray-800 rounded-full">
                                    <UserAvatar name={payer.name} pictureUrl={payer.pictureUrl} size="h-9 w-9" textSize="text-xs" />
                                  </div>
                                </>
                              );
                            })()}
                          </div>
                        ) : (
                          // Normal: single user avatar with color ring
                          <div className={`rounded-full ring-2 ${
                            transaction.type === 'income'
                              ? 'ring-green-400 dark:ring-green-600'
                              : 'ring-red-400 dark:ring-red-600'
                          }`}>
                            <UserAvatar name={user?.name || ''} pictureUrl={user?.picture_url} />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${categoryColors[transaction.category] || defaultCategoryColor}`}>
                            {transaction.category}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                          {formattedDate} {transaction.description ? `· ${transaction.description}` : ''}
                        </p>
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <p className={`text-base font-bold ${
                          transaction.type === 'income'
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-red-600 dark:text-red-400'
                        }`}>
                          {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* デスクトップ: テーブル */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">日付</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">カテゴリー</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">説明</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">種類</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">金額</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">範囲</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {transactions.map((transaction) => (
                      <tr
                        key={transaction.id}
                        className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                        onClick={() => openEditDialog(transaction)}
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{transaction.date}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${categoryColors[transaction.category] || defaultCategoryColor}`}>
                            {transaction.category}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-300">{transaction.description || '-'}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            transaction.type === 'income'
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                              : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                          }`}>
                            {transaction.type === 'income' ? '収入' : '支出'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium">
                          <span className={transaction.type === 'income' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                            {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          {transaction.is_split && couple ? (
                            <div className="inline-flex items-center">
                              <div className="relative h-7 w-10">
                                {(() => {
                                  const partner = couple.user1.id === user?.id ? couple.user2 : couple.user1;
                                  const payer = transaction.paid_by_user_id === user?.id ? { name: user?.name || '', pictureUrl: user?.picture_url } : { name: partner.name || '', pictureUrl: partner.picture_url };
                                  const other = transaction.paid_by_user_id === user?.id ? { name: partner.name || '', pictureUrl: partner.picture_url } : { name: user?.name || '', pictureUrl: user?.picture_url };
                                  return (
                                    <>
                                      <div className="absolute left-0 top-0">
                                        <UserAvatar name={other.name} pictureUrl={other.pictureUrl} size="h-7 w-7" textSize="text-[10px]" />
                                      </div>
                                      <div className="absolute right-0 top-0 ring-2 ring-white dark:ring-gray-800 rounded-full">
                                        <UserAvatar name={payer.name} pictureUrl={payer.pictureUrl} size="h-7 w-7" textSize="text-[10px]" />
                                      </div>
                                    </>
                                  );
                                })()}
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-500 dark:text-gray-400">個人</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={(e) => { e.stopPropagation(); openEditDialog(transaction); }}
                              className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 p-1"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); requestDelete(transaction.id); }}
                              className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 p-1"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {/* Edit Transaction Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl">取引を編集</DialogTitle>
              <p className="text-sm text-gray-600 dark:text-gray-400">取引内容を変更します</p>
            </DialogHeader>

            <div className="mt-4 space-y-4">
              {/* Transaction Info */}
              <div>
                <h3 className="text-lg font-semibold mb-2 dark:text-white">取引情報</h3>

                {/* Type */}
                <div className="mb-3">
                  <Label className="mb-2 block">
                    種類 <span className="text-red-500">*</span>
                  </Label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setEditFormType('income');
                        setEditFormCategory('');
                        setEditFormIsSplit(false);
                      }}
                      className={`px-4 py-3 rounded-lg border-2 transition-all ${
                        editFormType === 'income'
                          ? 'border-green-500 bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                          : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-300'
                      }`}
                    >
                      収入
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditFormType('expense');
                        setEditFormCategory('');
                      }}
                      className={`px-4 py-3 rounded-lg border-2 transition-all ${
                        editFormType === 'expense'
                          ? 'border-red-500 bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                          : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-300'
                      }`}
                    >
                      支出
                    </button>
                  </div>
                </div>

                {/* Category */}
                <div className="mb-3">
                  <Label htmlFor="edit-category" className="mb-2 block">
                    カテゴリー <span className="text-red-500">*</span>
                  </Label>
                  <Select value={editFormCategory} onValueChange={setEditFormCategory}>
                    <SelectTrigger id="edit-category">
                      <SelectValue placeholder="カテゴリーを選択" />
                    </SelectTrigger>
                    <SelectContent>
                      {editAvailableCategories.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Amount */}
                <div className="mb-3">
                  <Label htmlFor="edit-amount" className="mb-2 block">
                    金額 <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="edit-amount"
                    type="number"
                    placeholder="10000"
                    value={editFormAmount}
                    onChange={(e) => setEditFormAmount(e.target.value)}
                  />
                </div>

                {/* Date */}
                <div className="mb-3">
                  <Label htmlFor="edit-date" className="mb-2 block">
                    日付 <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="edit-date"
                    type="date"
                    value={editFormDate}
                    onChange={(e) => setEditFormDate(e.target.value)}
                  />
                </div>

                {/* Description */}
                <div className="mb-3">
                  <Label htmlFor="edit-description" className="mb-2 block">
                    説明（任意）
                  </Label>
                  <Textarea
                    id="edit-description"
                    placeholder="例: スーパーでの買い物"
                    value={editFormDescription}
                    onChange={(e) => setEditFormDescription(e.target.value)}
                    rows={3}
                  />
                </div>

                {/* Split Setting - only for expenses */}
                {couple && editFormType === 'expense' && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">割り勘にする</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {couple.user1.id === user?.id ? couple.user2.name : couple.user1.name} さんと半額ずつ負担します
                        </p>
                      </div>
                      <Switch
                        checked={editFormIsSplit}
                        onCheckedChange={(checked) => {
                          setEditFormIsSplit(checked);
                          if (checked) setEditFormPaidBy(user?.id || '');
                        }}
                      />
                    </div>
                    {editFormIsSplit && user && (
                      <PaidBySelector
                        couple={couple}
                        userId={user.id}
                        value={editFormPaidBy}
                        onChange={setEditFormPaidBy}
                      />
                    )}
                  </div>
                )}
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-3 border-t dark:border-gray-700">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    if (editingTransaction) {
                      setIsEditDialogOpen(false);
                      requestDelete(editingTransaction.id);
                    }
                  }}
                  className="text-red-600 border-red-200 hover:bg-red-50 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-900/20"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditDialogOpen(false)}
                  className="flex-1"
                >
                  キャンセル
                </Button>
                <Button
                  type="button"
                  onClick={handleEditSubmit}
                  disabled={editFormLoading}
                  className="flex-1 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700"
                >
                  {editFormLoading ? '更新中...' : '更新する'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <ConfirmDialog
          open={deleteConfirmOpen}
          onOpenChange={setDeleteConfirmOpen}
          title="取引を削除しますか？"
          description="この操作は取り消せません"
          confirmLabel="削除する"
          variant="danger"
          onConfirm={handleDelete}
        />
      </div>
    </MainLayout>
  );
}
