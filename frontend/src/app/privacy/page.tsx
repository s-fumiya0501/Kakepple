'use client';

import Link from 'next/link';
import { Heart, ArrowLeft } from 'lucide-react';

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-2">
            <Heart className="h-8 w-8 text-pink-600 dark:text-pink-400" />
            <span className="text-xl font-bold text-gray-900 dark:text-white">Kakepple</span>
          </Link>
          <Link
            href="/"
            className="flex items-center text-sm text-gray-600 dark:text-gray-400 hover:text-pink-600 dark:hover:text-pink-400"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            トップに戻る
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            プライバシーポリシー
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
            最終更新日: 2024年1月
          </p>

          <div className="prose dark:prose-invert max-w-none">
            <h2>はじめに</h2>
            <p>
              Kakepple（以下「本アプリ」）は、ユーザーのプライバシーを尊重し、
              個人情報の保護に努めます。本プライバシーポリシーは、本アプリが収集する情報、
              その使用方法、およびユーザーの権利について説明します。
            </p>

            <h2>収集する情報</h2>
            <p>本アプリは以下の情報を収集します：</p>

            <h3>1. アカウント情報</h3>
            <ul>
              <li>メールアドレス</li>
              <li>氏名（表示名）</li>
              <li>プロフィール画像（任意）</li>
            </ul>

            <h3>2. 認証情報</h3>
            <ul>
              <li>Google、LINEなどのソーシャルログイン経由で取得するID</li>
            </ul>

            <h3>3. 利用データ</h3>
            <ul>
              <li>収入・支出の記録</li>
              <li>予算設定</li>
              <li>カップル連携情報</li>
            </ul>

            <h2>情報の利用目的</h2>
            <p>収集した情報は以下の目的で利用します：</p>
            <ul>
              <li>アカウントの作成・管理</li>
              <li>サービスの提供・改善</li>
              <li>カップル間でのデータ共有機能の提供</li>
              <li>ユーザーサポートの提供</li>
            </ul>

            <h2>情報の共有</h2>
            <p>
              本アプリは、以下の場合を除き、ユーザーの個人情報を第三者と共有しません：
            </p>
            <ul>
              <li>ユーザーの同意がある場合</li>
              <li>法令に基づく開示請求があった場合</li>
              <li>カップル機能において、連携したパートナーとの共有（ユーザーが明示的に許可した場合）</li>
            </ul>

            <h2>データの保護</h2>
            <p>
              本アプリは、適切な技術的・組織的措置を講じて、
              ユーザーの情報を不正アクセス、紛失、破壊から保護します。
            </p>

            <h2>ユーザーの権利</h2>
            <p>ユーザーは以下の権利を有します：</p>
            <ul>
              <li>自身の情報へのアクセス</li>
              <li>情報の修正・更新</li>
              <li>アカウントの削除</li>
              <li>データのエクスポート</li>
            </ul>

            <h2>Cookieの使用</h2>
            <p>本アプリは、セッション管理のためにCookieを使用します。</p>

            <h2>お問い合わせ</h2>
            <p>
              プライバシーに関するご質問は、アプリ内のお問い合わせ機能よりご連絡ください。
            </p>

            <h2>変更について</h2>
            <p>
              本プライバシーポリシーは、必要に応じて更新されることがあります。
              重要な変更がある場合は、アプリ内で通知します。
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-4xl mx-auto px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
        <p>&copy; 2024 Kakepple. All rights reserved.</p>
      </footer>
    </div>
  );
}
