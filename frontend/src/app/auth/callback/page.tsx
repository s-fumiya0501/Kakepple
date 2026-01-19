'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authToken } from '@/lib/auth';
import { Heart } from 'lucide-react';

export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Try to extract tokens from URL fragment
    const success = authToken.handleOAuthCallback();

    if (success) {
      // Tokens were successfully stored, redirect to dashboard
      router.push('/dashboard');
    } else {
      // No tokens found in URL, show error
      setError('認証に失敗しました。再度ログインしてください。');
      // Redirect to login after a delay
      setTimeout(() => {
        router.push('/login');
      }, 3000);
    }
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-pink-50 to-purple-50 dark:from-gray-900 dark:to-gray-800">
      <div className="text-center">
        <Heart className="mx-auto h-12 w-12 text-pink-600 dark:text-pink-400 animate-pulse" />
        {error ? (
          <div className="mt-4">
            <p className="text-red-600 dark:text-red-400">{error}</p>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              ログインページにリダイレクトしています...
            </p>
          </div>
        ) : (
          <p className="mt-4 text-gray-600 dark:text-gray-400">
            認証中...
          </p>
        )}
      </div>
    </div>
  );
}
