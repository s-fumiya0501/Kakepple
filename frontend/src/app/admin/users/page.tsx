'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import MainLayout from '@/components/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { authApi, adminApi, AdminUser } from '@/lib/api';
import { User } from '@/types';

export default function AdminUsersPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const limit = 20;

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  useEffect(() => {
    if (user?.is_admin) {
      fetchUsers();
    }
  }, [user, offset, search]);

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

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await adminApi.listUsers({ limit, offset, search: search || undefined });
      setUsers(res.data.users);
      setTotal(res.data.total);
      setLoading(false);
    } catch (error: any) {
      setError('ユーザー一覧の取得に失敗しました');
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setOffset(0);
    fetchUsers();
  };

  const handleUpdateUser = async (userId: string, data: { is_admin?: boolean; email_verified?: boolean }) => {
    try {
      await adminApi.updateUser(userId, data);
      fetchUsers();
      setEditingUser(null);
    } catch (error: any) {
      alert(error.response?.data?.detail || 'ユーザーの更新に失敗しました');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      await adminApi.deleteUser(userId);
      setShowDeleteConfirm(null);
      fetchUsers();
    } catch (error: any) {
      alert(error.response?.data?.detail || 'ユーザーの削除に失敗しました');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
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
          <h1 className="text-3xl font-bold text-gray-900">ユーザー管理</h1>
          <p className="text-gray-600 mt-2">全 {total} ユーザー</p>
        </div>
        <Link href="/admin">
          <Button variant="outline">ダッシュボードに戻る</Button>
        </Link>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="mb-6">
        <div className="flex gap-2">
          <Input
            type="text"
            placeholder="メールアドレスまたは名前で検索..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-md"
          />
          <Button type="submit">検索</Button>
          {search && (
            <Button type="button" variant="outline" onClick={() => {
              setSearch('');
              setOffset(0);
            }}>
              クリア
            </Button>
          )}
        </div>
      </form>

      {error && (
        <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-lg">
          {error}
        </div>
      )}

      {/* User List */}
      <Card>
        <CardHeader>
          <CardTitle>ユーザー一覧</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-gray-500 text-center py-8">読み込み中...</p>
          ) : users.length === 0 ? (
            <p className="text-gray-500 text-center py-8">ユーザーが見つかりません</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4">メール</th>
                    <th className="text-left py-3 px-4">名前</th>
                    <th className="text-left py-3 px-4">認証方法</th>
                    <th className="text-center py-3 px-4">管理者</th>
                    <th className="text-center py-3 px-4">認証済み</th>
                    <th className="text-left py-3 px-4">登録日</th>
                    <th className="text-center py-3 px-4">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <span className="font-medium">{u.email}</span>
                      </td>
                      <td className="py-3 px-4">{u.name || '-'}</td>
                      <td className="py-3 px-4">
                        <div className="flex gap-1">
                          {u.google_id && (
                            <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                              Google
                            </span>
                          )}
                          {u.line_id && (
                            <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded">
                              LINE
                            </span>
                          )}
                          {!u.google_id && !u.line_id && (
                            <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                              Email
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => handleUpdateUser(u.id, { is_admin: !u.is_admin })}
                          className={`px-2 py-1 text-xs rounded ${
                            u.is_admin
                              ? 'bg-purple-100 text-purple-700'
                              : 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          {u.is_admin ? '管理者' : '一般'}
                        </button>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => handleUpdateUser(u.id, { email_verified: !u.email_verified })}
                          className={`px-2 py-1 text-xs rounded ${
                            u.email_verified
                              ? 'bg-green-100 text-green-700'
                              : 'bg-yellow-100 text-yellow-700'
                          }`}
                        >
                          {u.email_verified ? '認証済み' : '未認証'}
                        </button>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-500">
                        {formatDate(u.created_at)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {showDeleteConfirm === u.id ? (
                          <div className="flex gap-2 justify-center">
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDeleteUser(u.id)}
                            >
                              確認
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setShowDeleteConfirm(null)}
                            >
                              取消
                            </Button>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => setShowDeleteConfirm(u.id)}
                            disabled={u.id === user?.id}
                          >
                            削除
                          </Button>
                        )}
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
