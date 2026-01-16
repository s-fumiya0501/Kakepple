'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import MainLayout from '@/components/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { authApi, adminApi, AdminStats } from '@/lib/api';
import { User } from '@/types';

export default function AdminDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Get current user
      const userRes = await authApi.me();
      setUser(userRes.data);

      // Check if user is admin
      if (!userRes.data.is_admin) {
        router.push('/dashboard');
        return;
      }

      // Get admin stats
      const statsRes = await adminApi.getStats();
      setStats(statsRes.data);

      setLoading(false);
    } catch (error: any) {
      console.error('Failed to fetch data:', error);
      if (error.response?.status === 403) {
        setError('管理者権限がありません');
      } else if (error.response?.status === 401) {
        router.push('/login');
      } else {
        setError('データの取得に失敗しました');
      }
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex justify-center items-center">
        <p className="text-gray-500">読み込み中...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col justify-center items-center">
        <p className="text-red-500 mb-4">{error}</p>
        <Link href="/dashboard">
          <Button>ダッシュボードに戻る</Button>
        </Link>
      </div>
    );
  }

  return (
    <MainLayout user={user!}>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">管理者ダッシュボード</h1>
        <p className="text-gray-600 dark:text-gray-300 mt-2">システム全体の統計情報</p>
      </div>

      {/* Quick Links */}
      <div className="mb-8 flex gap-4">
        <Link href="/admin/users">
          <Button>ユーザー管理</Button>
        </Link>
        <Link href="/admin/couples">
          <Button variant="outline">カップル一覧</Button>
        </Link>
        <Link href="/admin/transactions">
          <Button variant="outline">トランザクション一覧</Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>総ユーザー数</CardDescription>
            <CardTitle className="text-3xl">{stats?.total_users || 0}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500">
              今月: +{stats?.users_this_month || 0}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>総カップル数</CardDescription>
            <CardTitle className="text-3xl">{stats?.total_couples || 0}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500">
              ペアリング済み
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>総トランザクション数</CardDescription>
            <CardTitle className="text-3xl">{stats?.total_transactions || 0}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500">
              今月: +{stats?.transactions_this_month || 0}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>総収支</CardDescription>
            <CardTitle className="text-xl">
              <span className="text-green-600">
                {formatCurrency(stats?.total_income || 0)}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-red-500">
              支出: {formatCurrency(stats?.total_expense || 0)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Summary Cards */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>収支サマリー</CardTitle>
            <CardDescription>全ユーザーの合計</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">総収入</span>
              <span className="text-lg font-semibold text-green-600">
                {formatCurrency(stats?.total_income || 0)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">総支出</span>
              <span className="text-lg font-semibold text-red-600">
                {formatCurrency(stats?.total_expense || 0)}
              </span>
            </div>
            <div className="border-t pt-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-900">純残高</span>
                <span className={`text-xl font-bold ${
                  (stats?.total_income || 0) - (stats?.total_expense || 0) >= 0
                    ? 'text-blue-600'
                    : 'text-red-600'
                }`}>
                  {formatCurrency((stats?.total_income || 0) - (stats?.total_expense || 0))}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>今月の活動</CardTitle>
            <CardDescription>新規登録・トランザクション</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">新規ユーザー</span>
              <span className="text-lg font-semibold text-blue-600">
                {stats?.users_this_month || 0}人
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">新規トランザクション</span>
              <span className="text-lg font-semibold text-blue-600">
                {stats?.transactions_this_month || 0}件
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
