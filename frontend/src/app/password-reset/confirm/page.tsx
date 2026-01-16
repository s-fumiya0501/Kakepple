'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { authApi } from "@/lib/api";
import { AlertCircle, Lock, CheckCircle, Heart } from 'lucide-react';
import ThemeToggle from "@/components/ThemeToggle";

function PasswordResetConfirmContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('パスワードが一致しません');
      return;
    }

    if (password.length < 8) {
      setError('パスワードは8文字以上で入力してください');
      return;
    }

    if (!token) {
      setError('無効なリンクです');
      return;
    }

    setLoading(true);

    try {
      await authApi.confirmPasswordReset(token, password);
      setSuccess(true);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'パスワードの更新に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-pink-50 to-purple-50 px-4 py-12 dark:from-gray-900 dark:to-gray-800">
        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <Link href="/" className="inline-flex items-center space-x-2">
              <Heart className="h-10 w-10 text-pink-600 dark:text-pink-400" />
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Kakepple
              </h1>
            </Link>
          </div>
          <div className="rounded-lg bg-white p-8 shadow-lg dark:bg-gray-800 text-center">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-6" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              無効なリンク
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              このリンクは無効または期限切れです。
              再度パスワードリセットをお試しください。
            </p>
            <Link
              href="/password-reset"
              className="block w-full rounded-lg bg-pink-600 px-4 py-2 text-white hover:bg-pink-700 dark:bg-pink-500 dark:hover:bg-pink-600 transition text-center"
            >
              パスワードリセットページへ
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-pink-50 to-purple-50 px-4 py-12 dark:from-gray-900 dark:to-gray-800">
        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <Link href="/" className="inline-flex items-center space-x-2">
              <Heart className="h-10 w-10 text-pink-600 dark:text-pink-400" />
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Kakepple
              </h1>
            </Link>
          </div>
          <div className="rounded-lg bg-white p-8 shadow-lg dark:bg-gray-800 text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-6" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              パスワードを更新しました
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              新しいパスワードでログインしてください。
            </p>
            <Link
              href="/login"
              className="block w-full rounded-lg bg-pink-600 px-4 py-2 text-white hover:bg-pink-700 dark:bg-pink-500 dark:hover:bg-pink-600 transition text-center"
            >
              ログイン画面へ
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-pink-50 to-purple-50 px-4 py-12 dark:from-gray-900 dark:to-gray-800">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md space-y-8">
        {/* ロゴ */}
        <div className="text-center">
          <Link href="/" className="inline-flex items-center space-x-2">
            <Heart className="h-10 w-10 text-pink-600 dark:text-pink-400" />
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Kakepple
            </h1>
          </Link>
          <h2 className="mt-6 text-2xl font-bold text-gray-900 dark:text-white">
            新しいパスワードを設定
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            新しいパスワードを入力してください
          </p>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <div className="space-y-4 rounded-lg bg-white p-6 shadow-lg dark:bg-gray-800">
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                新しいパスワード（8文字以上）
              </label>
              <div className="relative mt-1">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pl-10"
                  required
                  minLength={8}
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                パスワード（確認）
              </label>
              <div className="relative mt-1">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pl-10"
                  required
                  minLength={8}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-pink-600 px-4 py-2 text-white hover:bg-pink-700 disabled:opacity-50 dark:bg-pink-500 dark:hover:bg-pink-600 transition"
            >
              {loading ? '更新中...' : 'パスワードを更新'}
            </button>
          </div>
        </form>

        <p className="text-center text-sm text-gray-600 dark:text-gray-400">
          <Link
            href="/login"
            className="font-medium text-pink-600 hover:text-pink-500 dark:text-pink-400"
          >
            ログイン画面に戻る
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function PasswordResetConfirmPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-pink-50 to-purple-50 dark:from-gray-900 dark:to-gray-800">
        <div className="text-center text-gray-600 dark:text-gray-300">読み込み中...</div>
      </div>
    }>
      <PasswordResetConfirmContent />
    </Suspense>
  );
}
