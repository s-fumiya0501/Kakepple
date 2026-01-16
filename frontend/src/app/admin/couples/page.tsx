'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import MainLayout from '@/components/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { authApi, adminApi, AdminCouple } from '@/lib/api';
import { User } from '@/types';

export default function AdminCouplesPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [couples, setCouples] = useState<AdminCouple[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const limit = 20;

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  useEffect(() => {
    if (user?.is_admin) {
      fetchCouples();
    }
  }, [user, offset]);

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

  const fetchCouples = async () => {
    try {
      setLoading(true);
      const res = await adminApi.listCouples({ limit, offset });
      setCouples(res.data.couples);
      setTotal(res.data.total);
      setLoading(false);
    } catch (error: any) {
      setError('カップル一覧の取得に失敗しました');
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
          <h1 className="text-3xl font-bold text-gray-900">カップル一覧</h1>
          <p className="text-gray-600 mt-2">全 {total} カップル</p>
        </div>
        <Link href="/admin">
          <Button variant="outline">ダッシュボードに戻る</Button>
        </Link>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-lg">
          {error}
        </div>
      )}

      {/* Couple List */}
      <Card>
        <CardHeader>
          <CardTitle>カップル一覧</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-gray-500 text-center py-8">読み込み中...</p>
          ) : couples.length === 0 ? (
            <p className="text-gray-500 text-center py-8">カップルが見つかりません</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4">ユーザー1</th>
                    <th className="text-left py-3 px-4">ユーザー2</th>
                    <th className="text-left py-3 px-4">登録日</th>
                  </tr>
                </thead>
                <tbody>
                  {couples.map((couple) => (
                    <tr key={couple.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium">{couple.user1_name || '-'}</p>
                          <p className="text-sm text-gray-500">{couple.user1_email}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium">{couple.user2_name || '-'}</p>
                          <p className="text-sm text-gray-500">{couple.user2_email}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-500">
                        {formatDate(couple.created_at)}
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
