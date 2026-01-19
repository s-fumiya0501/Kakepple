'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTheme } from '@/components/ThemeProvider';
import {
  LayoutDashboard,
  Receipt,
  Target,
  TrendingUp,
  FileText,
  Repeat,
  Heart,
  Users,
  Menu,
  X,
  Moon,
  Sun,
  LogOut,
  UserCircle,
  PiggyBank,
  Settings,
} from 'lucide-react';

// Production API URL - hardcoded to ensure HTTPS
const PRODUCTION_API_URL = 'https://kakepple-production.up.railway.app';
const API_URL = process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_API_URL
  ? process.env.NEXT_PUBLIC_API_URL
  : PRODUCTION_API_URL;
import { User } from '@/types';
import { authApi } from '@/lib/api';

interface MainLayoutProps {
  user: User;
  children: React.ReactNode;
}

export default function MainLayout({ user, children }: MainLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { resolvedTheme, setTheme } = useTheme();

  const handleLogout = async () => {
    try {
      await authApi.logout();
      router.push('/');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const navigation = [
    { name: 'ダッシュボード', href: '/dashboard', icon: LayoutDashboard },
    { name: '家計簿', href: '/transactions', icon: Receipt },
    { name: '資産', href: '/assets', icon: PiggyBank },
    { name: '予算', href: '/budgets', icon: Target },
    { name: '分析', href: '/analytics', icon: TrendingUp },
    { name: 'レポート', href: '/reports', icon: FileText },
    { name: '繰り返し取引', href: '/recurring', icon: Repeat },
    { name: 'カップル', href: '/couple', icon: Heart },
  ];

  const adminNavigation = user.is_admin
    ? [{ name: '管理者', href: '/admin', icon: Users }]
    : [];

  const accountNavigation = [
    { name: 'アカウント', href: '/account', icon: Settings },
  ];

  const allNavigation = [...navigation, ...adminNavigation, ...accountNavigation];

  const getAvatarUrl = () => {
    if (!user?.picture_url) return null;
    if (user.picture_url.startsWith('/uploads/')) {
      return `${API_URL}${user.picture_url}`;
    }
    return user.picture_url;
  };

  const isActive = (path: string) => pathname === path || pathname?.startsWith(path + '/');

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* デスクトップサイドバー */}
      <div className="hidden md:fixed md:inset-y-0 md:flex md:w-64 md:flex-col">
        <div className="flex min-h-0 flex-1 flex-col border-r border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
          <div className="flex flex-1 flex-col overflow-y-auto pt-5 pb-4">
            <div className="flex flex-shrink-0 items-center px-4">
              <Heart className="h-8 w-8 text-pink-600 dark:text-pink-400" />
              <h1 className="ml-2 text-2xl font-bold text-pink-600 dark:text-pink-400">
                Kakepple
              </h1>
            </div>
            <nav className="mt-8 flex-1 space-y-1 px-2">
              {allNavigation.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`group flex items-center rounded-md px-2 py-2 text-sm font-medium ${
                      isActive(item.href)
                        ? 'bg-pink-100 text-pink-900 dark:bg-pink-900 dark:text-pink-100'
                        : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                    }`}
                  >
                    <Icon className="mr-3 h-5 w-5" />
                    {item.name}
                  </Link>
                );
              })}
            </nav>
          </div>
          <div className="flex flex-shrink-0 border-t border-gray-200 p-4 dark:border-gray-700">
            <div className="flex w-full flex-col">
              <Link href="/account" className="flex items-center hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg p-2 -m-2 transition-colors">
                {getAvatarUrl() ? (
                  <img
                    src={getAvatarUrl()!}
                    alt={user.name || 'Avatar'}
                    className="h-8 w-8 rounded-full object-cover"
                  />
                ) : (
                  <UserCircle className="h-8 w-8 text-gray-400" />
                )}
                <div className="ml-3 flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
                    {user.name || 'ユーザー'}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {user.email}
                  </p>
                </div>
              </Link>
              <div className="mt-3 flex space-x-2">
                <button
                  onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
                  className="flex-1 rounded-md bg-gray-100 px-3 py-2 text-sm text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                >
                  {resolvedTheme === 'dark' ? (
                    <Sun className="mx-auto h-4 w-4" />
                  ) : (
                    <Moon className="mx-auto h-4 w-4" />
                  )}
                </button>
                <button
                  onClick={handleLogout}
                  className="flex-1 rounded-md bg-pink-100 px-3 py-2 text-sm text-pink-700 hover:bg-pink-200 dark:bg-pink-900 dark:text-pink-300 dark:hover:bg-pink-800"
                >
                  <LogOut className="mx-auto h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* モバイルヘッダー */}
      <div className="sticky top-0 z-10 flex h-16 flex-shrink-0 border-b border-gray-200 bg-white md:hidden dark:border-gray-700 dark:bg-gray-800">
        <button
          type="button"
          className="border-r border-gray-200 px-4 text-gray-500 focus:outline-none dark:border-gray-700"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          <Menu className="h-6 w-6" />
        </button>
        <div className="flex flex-1 justify-between px-4">
          <div className="flex flex-1 items-center">
            <Heart className="h-6 w-6 text-pink-600 dark:text-pink-400" />
            <h1 className="ml-2 text-xl font-bold text-pink-600 dark:text-pink-400">
              Kakepple
            </h1>
          </div>
        </div>
      </div>

      {/* モバイルメニュー */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="fixed inset-0 bg-gray-600 bg-opacity-75"
            onClick={() => setIsMobileMenuOpen(false)}
          ></div>
          <div className="fixed inset-y-0 left-0 flex w-full max-w-xs flex-col bg-white dark:bg-gray-800">
            <div className="flex h-16 flex-shrink-0 items-center justify-between px-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center">
                <Heart className="h-6 w-6 text-pink-600 dark:text-pink-400" />
                <h1 className="ml-2 text-xl font-bold text-pink-600 dark:text-pink-400">
                  Kakepple
                </h1>
              </div>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="text-gray-500"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <nav className="mt-5 flex-1 space-y-1 px-2">
              {allNavigation.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`group flex items-center rounded-md px-2 py-2 text-base font-medium ${
                      isActive(item.href)
                        ? 'bg-pink-100 text-pink-900 dark:bg-pink-900 dark:text-pink-100'
                        : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                    }`}
                  >
                    <Icon className="mr-4 h-6 w-6" />
                    {item.name}
                  </Link>
                );
              })}
            </nav>
            <div className="flex flex-shrink-0 border-t border-gray-200 p-4 dark:border-gray-700">
              <div className="flex w-full flex-col">
                <Link
                  href="/account"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg p-2 -m-2 transition-colors"
                >
                  {getAvatarUrl() ? (
                    <img
                      src={getAvatarUrl()!}
                      alt={user.name || 'Avatar'}
                      className="h-10 w-10 rounded-full object-cover"
                    />
                  ) : (
                    <UserCircle className="h-10 w-10 text-gray-400" />
                  )}
                  <div className="ml-3 flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
                      {user.name || 'ユーザー'}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {user.email}
                    </p>
                  </div>
                </Link>
                <div className="mt-3 flex space-x-2">
                  <button
                    onClick={() =>
                      setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')
                    }
                    className="flex-1 rounded-md bg-gray-100 px-3 py-2 text-sm text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                  >
                    {resolvedTheme === 'dark' ? (
                      <Sun className="mx-auto h-5 w-5" />
                    ) : (
                      <Moon className="mx-auto h-5 w-5" />
                    )}
                  </button>
                  <button
                    onClick={handleLogout}
                    className="flex-1 rounded-md bg-pink-100 px-3 py-2 text-sm text-pink-700 hover:bg-pink-200 dark:bg-pink-900 dark:text-pink-300 dark:hover:bg-pink-800"
                  >
                    <LogOut className="mx-auto h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* メインコンテンツ */}
      <div className="md:pl-64">
        <main className="p-4 md:p-8 pb-20 md:pb-8">
          {children}
        </main>
      </div>

      {/* モバイル下部ナビゲーション */}
      <div className="fixed bottom-0 left-0 right-0 z-10 border-t border-gray-200 bg-white md:hidden dark:border-gray-700 dark:bg-gray-800">
        <div className="flex justify-around">
          {navigation.slice(0, 5).map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex flex-col items-center py-2 px-3 ${
                  isActive(item.href)
                    ? 'text-pink-600 dark:text-pink-400'
                    : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                <Icon className="h-6 w-6" />
                <span className="mt-1 text-xs">{item.name}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
