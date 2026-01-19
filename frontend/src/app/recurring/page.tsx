'use client';

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import MainLayout from "@/components/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { recurringApi, RecurringTransaction, RecurringTransactionCreate } from "@/lib/api";
import { INCOME_CATEGORIES, ALL_EXPENSE_CATEGORIES } from "@/types";
import { Plus, RefreshCw, Edit2, Trash2, Play, Pause, Calendar, Repeat } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { PageSkeleton } from "@/components/DashboardSkeleton";

const DAYS_OF_WEEK = [
  { value: '0', label: '月曜日' },
  { value: '1', label: '火曜日' },
  { value: '2', label: '水曜日' },
  { value: '3', label: '木曜日' },
  { value: '4', label: '金曜日' },
  { value: '5', label: '土曜日' },
  { value: '6', label: '日曜日' },
];

export default function RecurringPage() {
  const router = useRouter();
  const { user, couple, loading: authLoading } = useAuth();
  const [recurringTransactions, setRecurringTransactions] = useState<RecurringTransaction[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [formType, setFormType] = useState<'income' | 'expense'>('expense');
  const [formCategory, setFormCategory] = useState<string>('');
  const [formAmount, setFormAmount] = useState<string>('');
  const [formDescription, setFormDescription] = useState<string>('');
  const [formFrequency, setFormFrequency] = useState<'monthly' | 'weekly' | 'yearly'>('monthly');
  const [formDayOfMonth, setFormDayOfMonth] = useState<string>('1');
  const [formDayOfWeek, setFormDayOfWeek] = useState<string>('0');
  const [formIsSplit, setFormIsSplit] = useState<boolean>(false);
  const [formLoading, setFormLoading] = useState(false);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [authLoading, user, router]);

  const fetchData = useCallback(async () => {
    if (!user) return;
    try {
      const recurringRes = await recurringApi.list();
      setRecurringTransactions(recurringRes.data);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setDataLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user, fetchData]);

  const resetForm = () => {
    setFormType('expense');
    setFormCategory('');
    setFormAmount('');
    setFormDescription('');
    setFormFrequency('monthly');
    setFormDayOfMonth('1');
    setFormDayOfWeek('0');
    setFormIsSplit(false);
    setEditingId(null);
  };

  const handleSubmit = async () => {
    if (!formCategory || !formAmount) {
      alert('カテゴリーと金額を入力してください');
      return;
    }

    setFormLoading(true);
    try {
      if (editingId) {
        await recurringApi.update(editingId, {
          category: formCategory,
          amount: parseFloat(formAmount),
          description: formDescription || undefined,
          frequency: formFrequency,
          day_of_month: formFrequency === 'monthly' || formFrequency === 'yearly' ? parseInt(formDayOfMonth) : undefined,
          day_of_week: formFrequency === 'weekly' ? parseInt(formDayOfWeek) : undefined,
          is_split: formType === 'expense' ? formIsSplit : false,
        });
      } else {
        const data: RecurringTransactionCreate = {
          type: formType,
          category: formCategory,
          amount: parseFloat(formAmount),
          description: formDescription || undefined,
          frequency: formFrequency,
          day_of_month: formFrequency === 'monthly' || formFrequency === 'yearly' ? parseInt(formDayOfMonth) : undefined,
          day_of_week: formFrequency === 'weekly' ? parseInt(formDayOfWeek) : undefined,
          is_split: formType === 'expense' ? formIsSplit : false,
        };
        await recurringApi.create(data);
      }

      setIsDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error: any) {
      console.error('Failed to save recurring transaction:', error);
      alert(error.response?.data?.detail || '繰り返し取引の保存に失敗しました');
    } finally {
      setFormLoading(false);
    }
  };

  const handleEdit = (recurring: RecurringTransaction) => {
    setFormType(recurring.type);
    setFormCategory(recurring.category);
    setFormAmount(recurring.amount);
    setFormDescription(recurring.description || '');
    setFormFrequency(recurring.frequency);
    setFormDayOfMonth(recurring.day_of_month?.toString() || '1');
    setFormDayOfWeek(recurring.day_of_week?.toString() || '0');
    setFormIsSplit(recurring.is_split);
    setEditingId(recurring.id);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('この繰り返し取引を削除しますか？')) {
      return;
    }

    try {
      await recurringApi.delete(id);
      fetchData();
    } catch (error) {
      console.error('Failed to delete recurring transaction:', error);
      alert('削除に失敗しました');
    }
  };

  const handleToggleActive = async (recurring: RecurringTransaction) => {
    try {
      await recurringApi.update(recurring.id, { is_active: !recurring.is_active });
      fetchData();
    } catch (error) {
      console.error('Failed to toggle recurring transaction:', error);
      alert('更新に失敗しました');
    }
  };

  const handleExecute = async (id: string) => {
    if (!confirm('この繰り返し取引を今すぐ実行しますか？')) {
      return;
    }

    try {
      await recurringApi.execute(id);
      fetchData();
    } catch (error) {
      console.error('Failed to execute recurring transaction:', error);
      alert('実行に失敗しました');
    }
  };

  const formatCurrency = (amount: string | number) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return `¥${num.toLocaleString()}`;
  };

  const formatFrequency = (frequency: string, dayOfMonth: number | null, dayOfWeek: number | null) => {
    if (frequency === 'monthly') {
      return `毎月${dayOfMonth || 1}日`;
    } else if (frequency === 'weekly') {
      const day = DAYS_OF_WEEK.find(d => d.value === String(dayOfWeek || 0));
      return `毎週${day?.label || '月曜日'}`;
    } else if (frequency === 'yearly') {
      return `毎年${dayOfMonth || 1}日`;
    }
    return frequency;
  };

  const formatNextDue = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('ja-JP', {
      month: 'short',
      day: 'numeric',
    });
  };

  const categories = formType === 'income' ? INCOME_CATEGORIES : ALL_EXPENSE_CATEGORIES;

  // Separate active and inactive
  const activeTransactions = recurringTransactions.filter(t => t.is_active);
  const inactiveTransactions = recurringTransactions.filter(t => !t.is_active);

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
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">繰り返し取引</h1>
            <p className="mt-1 text-gray-600 dark:text-gray-400">
              定期的な収入・支出を自動管理
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700">
                <Plus className="w-4 h-4 mr-2" />
                新規登録
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-xl">
                  {editingId ? '繰り返し取引を編集' : '新しい繰り返し取引'}
                </DialogTitle>
                <DialogDescription>
                  定期的に発生する収入や支出を登録します
                </DialogDescription>
              </DialogHeader>

              <div className="mt-4 space-y-4">
                {/* Type */}
                {!editingId && (
                  <div>
                    <Label className="mb-2 block">種類</Label>
                    <Select value={formType} onValueChange={(value: 'income' | 'expense') => {
                      setFormType(value);
                      setFormCategory('');
                    }}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="expense">支出</SelectItem>
                        <SelectItem value="income">収入</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Category */}
                <div>
                  <Label className="mb-2 block">カテゴリー</Label>
                  <Select value={formCategory} onValueChange={setFormCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder="選択してください" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Amount */}
                <div>
                  <Label className="mb-2 block">金額</Label>
                  <Input
                    type="number"
                    value={formAmount}
                    onChange={(e) => setFormAmount(e.target.value)}
                    placeholder="10000"
                    min="0"
                  />
                </div>

                {/* Frequency */}
                <div>
                  <Label className="mb-2 block">頻度</Label>
                  <Select value={formFrequency} onValueChange={(value: 'monthly' | 'weekly' | 'yearly') => setFormFrequency(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">毎月</SelectItem>
                      <SelectItem value="weekly">毎週</SelectItem>
                      <SelectItem value="yearly">毎年</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Day of Month (for monthly/yearly) */}
                {(formFrequency === 'monthly' || formFrequency === 'yearly') && (
                  <div>
                    <Label className="mb-2 block">日付</Label>
                    <Select value={formDayOfMonth} onValueChange={setFormDayOfMonth}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                          <SelectItem key={day} value={String(day)}>
                            {day}日
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Day of Week (for weekly) */}
                {formFrequency === 'weekly' && (
                  <div>
                    <Label className="mb-2 block">曜日</Label>
                    <Select value={formDayOfWeek} onValueChange={setFormDayOfWeek}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DAYS_OF_WEEK.map((day) => (
                          <SelectItem key={day.value} value={day.value}>
                            {day.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Description */}
                <div>
                  <Label className="mb-2 block">メモ（任意）</Label>
                  <Input
                    type="text"
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder="家賃、給料など"
                  />
                </div>

                {/* Split toggle - only for expense and when in a couple */}
                {formType === 'expense' && couple && (
                  <div className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <Label>割り勘</Label>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        パートナーと金額を半分ずつ分けます
                      </p>
                    </div>
                    <Switch
                      checked={formIsSplit}
                      onCheckedChange={setFormIsSplit}
                    />
                  </div>
                )}

                {/* Buttons */}
                <div className="flex gap-3 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsDialogOpen(false);
                      resetForm();
                    }}
                    className="flex-1"
                  >
                    キャンセル
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={formLoading}
                    className="flex-1 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700"
                  >
                    {formLoading ? '保存中...' : (editingId ? '更新' : '登録')}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Active Transactions */}
        {activeTransactions.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              有効な繰り返し取引
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              {activeTransactions.map((recurring) => (
                <div
                  key={recurring.id}
                  className={`rounded-lg bg-gradient-to-r ${
                    recurring.type === 'income'
                      ? 'from-emerald-500 to-teal-600'
                      : 'from-pink-500 to-purple-600'
                  } p-5 text-white`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2">
                      <Repeat className="h-5 w-5" />
                      <h3 className="font-semibold">{recurring.category}</h3>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleExecute(recurring.id)}
                        className="p-1.5 hover:bg-white/20 rounded transition-colors"
                        title="今すぐ実行"
                      >
                        <Play className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleToggleActive(recurring)}
                        className="p-1.5 hover:bg-white/20 rounded transition-colors"
                        title="停止"
                      >
                        <Pause className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleEdit(recurring)}
                        className="p-1.5 hover:bg-white/20 rounded transition-colors"
                        title="編集"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(recurring.id)}
                        className="p-1.5 hover:bg-white/20 rounded transition-colors"
                        title="削除"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="mb-3">
                    <p className="text-2xl font-bold">
                      {recurring.type === 'income' ? '+' : '-'}{formatCurrency(recurring.amount)}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-sm opacity-90">
                        {formatFrequency(recurring.frequency, recurring.day_of_month, recurring.day_of_week)}
                      </span>
                      {recurring.is_split && (
                        <span className="text-xs bg-white/20 px-2 py-0.5 rounded">
                          割り勘
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-sm opacity-90">
                    <Calendar className="h-4 w-4" />
                    <span>次回: {formatNextDue(recurring.next_due_date)}</span>
                  </div>

                  {recurring.description && (
                    <p className="text-sm opacity-75 mt-2 truncate">
                      {recurring.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Inactive Transactions */}
        {inactiveTransactions.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              停止中の取引
            </h2>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow divide-y divide-gray-200 dark:divide-gray-700">
              {inactiveTransactions.map((recurring) => (
                <div
                  key={recurring.id}
                  className="px-6 py-4 flex items-center justify-between opacity-60"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${
                      recurring.type === 'income' ? 'bg-emerald-500' : 'bg-pink-500'
                    }`} />
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {recurring.category}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {formatFrequency(recurring.frequency, recurring.day_of_month, recurring.day_of_week)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <p className={`text-lg font-semibold ${
                      recurring.type === 'income' ? 'text-emerald-600' : 'text-pink-600'
                    }`}>
                      {recurring.type === 'income' ? '+' : '-'}{formatCurrency(recurring.amount)}
                    </p>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleToggleActive(recurring)}
                        className="p-2 text-gray-400 hover:text-emerald-500 transition-colors"
                        title="再開"
                      >
                        <Play className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleEdit(recurring)}
                        className="p-2 text-gray-400 hover:text-blue-500 transition-colors"
                        title="編集"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(recurring.id)}
                        className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                        title="削除"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {recurringTransactions.length === 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
            <RefreshCw className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
              繰り返し取引がありません
            </h3>
            <p className="mt-2 text-gray-500 dark:text-gray-400">
              定期的な収入や支出を登録して自動管理しましょう
            </p>
            <Button
              onClick={() => setIsDialogOpen(true)}
              className="mt-4 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              最初の繰り返し取引を登録
            </Button>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
