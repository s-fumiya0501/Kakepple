'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import MainLayout from '@/components/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { authApi, adminApi, AdminTransaction } from '@/lib/api';
import { User } from '@/types';

export default function AdminTransactionsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [transactions, setTransactions] = useState<AdminTransaction[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const limit = 20;

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  useEffect(() => {
    if (user?.is_admin) {
      fetchTransactions();
    }
  }, [user, offset, typeFilter]);

  const fetchCurrentUser = async () => {
    try {
      const userRes = await authApi.me();
      setUser(userRes.data);
      if (!userRes.data.is_admin) {
        router.push('/dashboard');
      }
    } catch (error) {
      router.push('/login');
    }
  };

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const res = await adminApi.listTransactions({
        limit,
        offset,
        type: typeFilter || undefined,
      });
      setTransactions(res.data.transactions);
      setTotal(res.data.total);
      setLoading(false);
    } catch (error: any) {
      setError('トランザクション一覧の取得に失敗しました');
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
    }).format(amount);
  };

  if (!user?.is_admin) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex justify-center items-center">
        <p className="text-gray-500">読み込み中...</p>
      </div>
    );
  }

  return (
    <MainLayout user={user}>
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">トランザクション一覧</h1>
          <p className="text-gray-600 mt-2">全 {total} 件</p>
        </div>
        <Link href="/admin">
          <Button variant="outline">ダッシュボードに戻る</Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="mb-6 flex gap-2">
        <Button
          variant={typeFilter === '' ? 'default' : 'outline'}
          onClick={() => { setTypeFilter(''); setOffset(0); }}
        >
          すべて
        </Button>
        <Button
          variant={typeFilter === 'income' ? 'default' : 'outline'}
          onClick={() => { setTypeFilter('income'); setOffset(0); }}
        >
          収入
        </Button>
        <Button
          variant={typeFilter === 'expense' ? 'default' : 'outline'}
          onClick={() => { setTypeFilter('expense'); setOffset(0); }}
        >
          支出
        </Button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-lg">
          {error}
        </div>
      )}

      {/* Transaction List */}
      <Card>
        <CardHeader>
          <CardTitle>トランザクション一覧</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-gray-500 text-center py-8">読み込み中...</p>
          ) : transactions.length === 0 ? (
            <p className="text-gray-500 text-center py-8">トランザクションが見つかりません</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4">ユーザー</th>
                    <th className="text-left py-3 px-4">種類</th>
                    <th className="text-left py-3 px-4">カテゴリ</th>
                    <th className="text-right py-3 px-4">金額</th>
                    <th className="text-left py-3 px-4">説明</th>
                    <th className="text-left py-3 px-4">日付</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((t) => (
                    <tr key={t.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium">{t.user_name || '-'}</p>
                          <p className="text-sm text-gray-500">{t.user_email}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 text-xs rounded ${
                          t.type === 'income'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {t.type === 'income' ? '収入' : '支出'}
                        </span>
                      </td>
                      <td className="py-3 px-4">{t.category}</td>
                      <td className={`py-3 px-4 text-right font-medium ${
                        t.type === 'income' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-500 max-w-xs truncate">
                        {t.description || '-'}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-500">
                        {formatDate(t.date)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {total > limit && (
            <div className="flex justify-center gap-2 mt-6">
              <Button
                variant="outline"
                onClick={() => setOffset(Math.max(0, offset - limit))}
                disabled={offset === 0}
              >
                前へ
              </Button>
              <span className="py-2 px-4 text-sm text-gray-600">
                {offset + 1} - {Math.min(offset + limit, total)} / {total}
              </span>
              <Button
                variant="outline"
                onClick={() => setOffset(offset + limit)}
                disabled={offset + limit >= total}
              >
                次へ
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </MainLayout>
  );
}
