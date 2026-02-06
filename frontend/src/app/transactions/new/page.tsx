'use client';

import { useState, useEffect } from "react";
import { toast } from '@/hooks/use-toast';
import { useRouter } from "next/navigation";
import MainLayout from "@/components/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { authApi, transactionApi, coupleApi } from "@/lib/api";
import { User, Couple, INCOME_CATEGORIES, ALL_EXPENSE_CATEGORIES } from "@/types";
import { PaidBySelector } from "@/components/PaidBySelector";

export default function NewTransactionPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [couple, setCouple] = useState<Couple | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [category, setCategory] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [isSplit, setIsSplit] = useState(false);
  const [paidBy, setPaidBy] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const userRes = await authApi.me();
      setUser(userRes.data);
      setPaidBy(userRes.data.id);

      try {
        const coupleRes = await coupleApi.getMyCouple();
        setCouple(coupleRes.data);
      } catch (error) {
        setCouple(null);
      }

      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      router.push('/login');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!category || !amount || !date) {
      toast({ title: '入力エラー', description: 'すべての必須項目を入力してください', variant: 'destructive' });
      return;
    }

    setSubmitting(true);

    try {
      const splitEnabled = isSplit && couple !== null;
      await transactionApi.create({
        type,
        category,
        amount: parseFloat(amount),
        date,
        description: description || null,
        is_split: splitEnabled,
        ...(splitEnabled && paidBy ? { paid_by_user_id: paidBy } : {}),
      });

      toast({ title: '完了', description: '取引を登録しました', variant: 'success' });
      router.push('/transactions');
    } catch (error: any) {
      console.error('Failed to create transaction:', error);
      toast({ title: 'エラー', description: error.response?.data?.detail || '取引の登録に失敗しました', variant: 'destructive' });
      setSubmitting(false);
    }
  };

  const categories = type === 'income' ? INCOME_CATEGORIES : ALL_EXPENSE_CATEGORIES;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex justify-center items-center">
        <p className="text-gray-500">読み込み中...</p>
      </div>
    );
  }

  return (
    <MainLayout user={user!}>
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">取引登録</h1>
          <p className="text-gray-600 dark:text-gray-300 mt-2">収入または支出を記録します</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>取引情報</CardTitle>
            <CardDescription>必要な情報を入力してください</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Type Selection */}
              <div className="space-y-2">
                <Label>種類 *</Label>
                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => {
                      setType('income');
                      setCategory('');
                      setIsSplit(false);
                    }}
                    className={`flex-1 py-3 px-4 rounded-lg border-2 transition ${
                      type === 'income'
                        ? 'border-green-500 bg-green-50 text-green-900'
                        : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    収入
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setType('expense');
                      setCategory('');
                    }}
                    className={`flex-1 py-3 px-4 rounded-lg border-2 transition ${
                      type === 'expense'
                        ? 'border-red-500 bg-red-50 text-red-900'
                        : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    支出
                  </button>
                </div>
              </div>

              {/* Category Selection */}
              <div className="space-y-2">
                <Label htmlFor="category">カテゴリー *</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="カテゴリーを選択" />
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

              {/* Amount Input */}
              <div className="space-y-2">
                <Label htmlFor="amount">金額 *</Label>
                <Input
                  id="amount"
                  type="number"
                  step="1"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="10000"
                  required
                />
              </div>

              {/* Date Input */}
              <div className="space-y-2">
                <Label htmlFor="date">日付 *</Label>
                <Input
                  id="date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </div>

              {/* Description Input */}
              <div className="space-y-2">
                <Label htmlFor="description">説明（任意）</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="例: スーパーでの買い物"
                  rows={3}
                />
              </div>

              {/* Split Toggle */}
              {couple && type === 'expense' && (
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label htmlFor="split" className="text-blue-900 font-semibold">
                        割り勘にする
                      </Label>
                      <p className="text-sm text-blue-700">
                        {couple.user1.id === user?.id ? couple.user2.name : couple.user1.name} さんと半額ずつ負担します
                        {isSplit && amount && (
                          <span className="block mt-1 font-medium">
                            あなたの負担: ¥{(parseFloat(amount) / 2).toLocaleString()}
                          </span>
                        )}
                      </p>
                    </div>
                    <Switch
                      id="split"
                      checked={isSplit}
                      onCheckedChange={(checked) => {
                        setIsSplit(checked);
                        if (checked) setPaidBy(user?.id || '');
                      }}
                    />
                  </div>
                  {isSplit && user && (
                    <PaidBySelector
                      couple={couple}
                      userId={user.id}
                      value={paidBy}
                      onChange={setPaidBy}
                    />
                  )}
                </div>
              )}

              {/* Submit Button */}
              <div className="flex gap-4">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => router.push('/transactions')}
                  disabled={submitting}
                >
                  キャンセル
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={submitting}
                >
                  {submitting ? '登録中...' : '登録する'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
