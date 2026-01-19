'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { authApi } from '@/lib/api';
import { User } from '@/types';
import { Camera, User as UserIcon, Mail, Calendar, Trash2, Edit2, Shield, Save } from 'lucide-react';

// API URL - Always use HTTPS
const API_URL = 'https://kakepple-production.up.railway.app';

export default function AccountPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [editName, setEditName] = useState('');

  useEffect(() => {
    fetchUser();
  }, []);

  const fetchUser = async () => {
    try {
      const res = await authApi.me();
      setUser(res.data);
      setEditName(res.data.name || '');
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch user:', error);
      router.push('/login');
    }
  };

  const handleUpdateProfile = async () => {
    if (!editName.trim()) {
      alert('名前を入力してください');
      return;
    }

    setSaving(true);
    try {
      const res = await authApi.updateProfile({ name: editName.trim() });
      setUser(res.data);
      setIsEditDialogOpen(false);
    } catch (error: any) {
      console.error('Failed to update profile:', error);
      alert(error.response?.data?.detail || 'プロフィールの更新に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      alert('画像ファイル（JPEG, PNG, GIF, WebP）のみアップロード可能です');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('ファイルサイズは5MB以下にしてください');
      return;
    }

    setUploadingAvatar(true);
    try {
      const res = await authApi.uploadAvatar(file);
      setUser(res.data);
    } catch (error: any) {
      console.error('Failed to upload avatar:', error);
      alert(error.response?.data?.detail || '画像のアップロードに失敗しました');
    } finally {
      setUploadingAvatar(false);
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDeleteAvatar = async () => {
    if (!confirm('プロフィール画像を削除しますか？')) return;

    setUploadingAvatar(true);
    try {
      const res = await authApi.deleteAvatar();
      setUser(res.data);
    } catch (error: any) {
      console.error('Failed to delete avatar:', error);
      alert(error.response?.data?.detail || '画像の削除に失敗しました');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getAvatarUrl = () => {
    if (!user?.picture_url) return null;
    // If it's a local upload, prepend API URL
    if (user.picture_url.startsWith('/uploads/')) {
      return `${API_URL}${user.picture_url}`;
    }
    // External URL (e.g., Google)
    return user.picture_url;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex justify-center items-center">
        <p className="text-gray-500 dark:text-gray-400">読み込み中...</p>
      </div>
    );
  }

  return (
    <MainLayout user={user!}>
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">アカウント設定</h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">
            プロフィール情報を管理
          </p>
        </div>

        {/* Profile Card */}
        <div className="rounded-lg bg-gradient-to-r from-pink-500 to-purple-600 p-6 text-white">
          <div className="flex items-center gap-6">
            {/* Avatar */}
            <div className="relative">
              <div
                onClick={handleAvatarClick}
                className={`w-24 h-24 rounded-full bg-white/20 flex items-center justify-center cursor-pointer overflow-hidden transition-opacity ${
                  uploadingAvatar ? 'opacity-50' : 'hover:opacity-80'
                }`}
              >
                {getAvatarUrl() ? (
                  <img
                    src={getAvatarUrl()!}
                    alt={user?.name || 'Avatar'}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-4xl font-bold">
                    {user?.name?.charAt(0) || user?.email?.charAt(0) || '?'}
                  </span>
                )}
              </div>
              <button
                onClick={handleAvatarClick}
                disabled={uploadingAvatar}
                className="absolute bottom-0 right-0 w-8 h-8 bg-white text-pink-600 rounded-full flex items-center justify-center shadow-lg hover:bg-gray-100 transition-colors"
              >
                <Camera className="w-4 h-4" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>

            {/* Info */}
            <div className="flex-1">
              <h2 className="text-2xl font-bold">{user?.name || '名前未設定'}</h2>
              <p className="text-white/80">{user?.email}</p>
              {user?.is_admin && (
                <span className="inline-flex items-center gap-1 mt-2 text-xs bg-white/20 px-2 py-1 rounded">
                  <Shield className="w-3 h-3" />
                  管理者
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Avatar Actions */}
        {user?.picture_url && (
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDeleteAvatar}
              disabled={uploadingAvatar}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              プロフィール画像を削除
            </Button>
          </div>
        )}

        {/* Profile Details */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow divide-y divide-gray-200 dark:divide-gray-700">
          {/* Name */}
          <div className="p-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-pink-100 dark:bg-pink-900/30 rounded-lg flex items-center justify-center">
                <UserIcon className="w-5 h-5 text-pink-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">名前</p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {user?.name || '未設定'}
                </p>
              </div>
            </div>
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm">
                  <Edit2 className="w-4 h-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-sm">
                <DialogHeader>
                  <DialogTitle>名前を編集</DialogTitle>
                  <DialogDescription>
                    表示名を変更します
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div>
                    <Label className="mb-2 block">名前</Label>
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="名前を入力"
                      maxLength={100}
                    />
                  </div>
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsEditDialogOpen(false);
                        setEditName(user?.name || '');
                      }}
                      className="flex-1"
                    >
                      キャンセル
                    </Button>
                    <Button
                      onClick={handleUpdateProfile}
                      disabled={saving}
                      className="flex-1 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {saving ? '保存中...' : '保存'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Email */}
          <div className="p-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                <Mail className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">メールアドレス</p>
                <p className="font-medium text-gray-900 dark:text-white">{user?.email}</p>
              </div>
            </div>
          </div>

          {/* Created At */}
          <div className="p-6 flex items-center">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center">
                <Calendar className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">アカウント作成日</p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {user ? formatDate(user.created_at) : '-'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Tips */}
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            <strong>ヒント:</strong> プロフィール画像をクリックして新しい画像をアップロードできます。
            対応形式: JPEG, PNG, GIF, WebP（最大5MB）
          </p>
        </div>
      </div>
    </MainLayout>
  );
}
