'use client';

import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";
import { Heart, TrendingUp, Users, Shield } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 dark:from-gray-900 dark:to-gray-800">
      {/* ヘッダー */}
      <header className="container mx-auto px-4 py-6">
        <nav className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Heart className="h-8 w-8 text-pink-600 dark:text-pink-400" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Kakepple
            </h1>
          </div>
          <div className="flex items-center space-x-4">
            <ThemeToggle />
            <Link
              href="/login"
              className="rounded-lg bg-pink-600 px-6 py-2 text-white hover:bg-pink-700 dark:bg-pink-500 dark:hover:bg-pink-600 transition"
            >
              ログイン
            </Link>
          </div>
        </nav>
      </header>

      {/* ヒーローセクション */}
      <main className="container mx-auto px-4 py-16 text-center">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white">
            カップルで楽しく
            <br />
            <span className="text-pink-600 dark:text-pink-400">
              家計簿をつけよう
            </span>
          </h2>
          <p className="mt-6 text-lg md:text-xl text-gray-600 dark:text-gray-300">
            Kakeppleは、カップル向けの家計簿アプリです。
            <br />
            個人の収支管理に加え、パートナーとの家計簿共有・割り勘機能を提供します。
          </p>
          <div className="mt-10 flex flex-col sm:flex-row justify-center gap-4">
            <Link
              href="/register"
              className="rounded-lg bg-pink-600 px-8 py-3 text-lg font-medium text-white hover:bg-pink-700 dark:bg-pink-500 dark:hover:bg-pink-600 transition"
            >
              無料で始める
            </Link>
            <Link
              href="/login"
              className="rounded-lg border border-gray-300 px-8 py-3 text-lg font-medium text-gray-700 hover:bg-white dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800 transition"
            >
              ログイン
            </Link>
          </div>
        </div>

        {/* 機能紹介 */}
        <div className="mx-auto mt-24 grid max-w-5xl gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl bg-white p-6 shadow-lg dark:bg-gray-800">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-pink-100 dark:bg-pink-900">
              <Heart className="h-6 w-6 text-pink-600 dark:text-pink-400" />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">
              カップルで共有
            </h3>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
              パートナーと家計簿を共有し、一緒に収支を管理できます
            </p>
          </div>

          <div className="rounded-xl bg-white p-6 shadow-lg dark:bg-gray-800">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900">
              <TrendingUp className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">
              簡単な収支管理
            </h3>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
              収入と支出を簡単に記録し、視覚的に確認できます
            </p>
          </div>

          <div className="rounded-xl bg-white p-6 shadow-lg dark:bg-gray-800">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900">
              <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">
              割り勘機能
            </h3>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
              支出を自動で半額ずつに分割し、公平に管理できます
            </p>
          </div>

          <div className="rounded-xl bg-white p-6 shadow-lg dark:bg-gray-800">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
              <Shield className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">
              予算管理
            </h3>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
              カテゴリー別や月次の予算を設定し、使いすぎを防止できます
            </p>
          </div>
        </div>
      </main>

      {/* フッター */}
      <footer className="mt-24 border-t border-gray-200 py-8 dark:border-gray-700">
        <div className="container mx-auto px-4 text-center text-sm text-gray-600 dark:text-gray-400">
          <p>&copy; 2026 Kakepple. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
