# Kakepple ハイブリッド構成デプロイガイド

このガイドでは、以下のサービスを使用したハイブリッド構成でのデプロイ手順を説明します。

| サービス | 用途 | 月額目安 |
|----------|------|----------|
| Vercel | Frontend (Next.js) | 無料 |
| Railway | Backend (FastAPI) | $5〜 |
| Supabase | PostgreSQL | 無料〜 |
| Upstash | Redis | 無料〜 |

---

## 目次

1. [事前準備](#1-事前準備)
2. [Supabase (PostgreSQL) のセットアップ](#2-supabase-postgresql-のセットアップ)
3. [Upstash (Redis) のセットアップ](#3-upstash-redis-のセットアップ)
4. [Railway (Backend) のデプロイ](#4-railway-backend-のデプロイ)
5. [Vercel (Frontend) のデプロイ](#5-vercel-frontend-のデプロイ)
6. [OAuth 設定の更新](#6-oauth-設定の更新)
7. [動作確認](#7-動作確認)
8. [カスタムドメイン設定（任意）](#8-カスタムドメイン設定任意)
9. [トラブルシューティング](#9-トラブルシューティング)

---

## 1. 事前準備

### 必要なアカウント

以下のサービスのアカウントを作成してください（すべて無料で開始可能）:

- [x] [GitHub](https://github.com) - すでにリポジトリをpush済み
- [x] [Supabase](https://supabase.com) - PostgreSQL
- [x] [Upstash](https://upstash.com) - Redis
- [ ] [Railway](https://railway.app) - Backend
- [ ] [Vercel](https://vercel.com) - Frontend

### SECRET_KEY の生成

ターミナルで以下を実行し、結果を控えておいてください:

```bash
openssl rand -hex 32
```

出力例: `a1b2c3d4e5f6...` (64文字の16進数文字列)

---

## 2. Supabase (PostgreSQL) のセットアップ

### 2.1 プロジェクト作成

1. [Supabase Dashboard](https://supabase.com/dashboard) にログイン
2. **New Project** をクリック
3. 以下を入力:
   - **Name**: `kakepple`
   - **Database Password**: 強力なパスワードを設定（メモしておく）
   - **Region**: `Northeast Asia (Tokyo)` を選択
4. **Create new project** をクリック

### 2.2 接続情報の取得

1. プロジェクト作成完了後、左メニューの **Project Settings** → **Database** を選択
2. **Connection string** セクションで **URI** タブを選択
3. 以下の形式の接続文字列をコピー:

```
postgresql://postgres.[project-ref]:[password]@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres

```

**重要**: `[password]` 部分を、2.1で設定したパスワードに置き換えてください。

### 2.3 環境変数メモ

```
DATABASE_URL=postgresql://postgres:x59jTCdidTzW4VDu@db.ysosiwkjcsvvhghetcvw.supabase.co:5432/postgres
```

---

## 3. Upstash (Redis) のセットアップ

### 3.1 Redis データベース作成

1. [Upstash Console](https://console.upstash.com) にログイン
2. **Create Database** をクリック
3. 以下を設定:
   - **Name**: `kakepple-redis`
   - **Type**: `Regional`
   - **Region**: `Asia Pacific (Tokyo)` または `ap-northeast-1`
4. **Create** をクリック

### 3.2 接続情報の取得

1. 作成したデータベースをクリック
2. **Details** タブで以下の情報をコピー:
   - **UPSTASH_REDIS_REST_URL** (使用しない)
   - **Endpoint**: `apn1-xxxxx.upstash.io`
   - **Port**: `6379`
   - **Password**: `xxxxxxxx`

### 3.3 Redis URL の構成
redis-cli --tls -u redis://default:AaDFAAIncDI5NzYwN2IwZmUwNWI0YzkyYWJjNzBmMjU2NTk5N2UwN3AyNDExNTc@enormous-catfish-41157.upstash.io:6379
```
REDIS_URL=redis://default:AaDFAAIncDI5NzYwN2IwZmUwNWI0YzkyYWJjNzBmMjU2NTk5N2UwN3AyNDExNTc@enormous-catfish-41157.upstash.io:6379
```

例:
```
REDIS_URL=redis://default:AXxxxxxxxxxxxx@apn1-caring-mouse-12345.upstash.io:6379
```

**TLS接続の場合** (推奨):
```
REDIS_URL=rediss://default:[password]@[endpoint]:6379
```
(`redis://` → `rediss://` に変更)

---

## 4. Railway (Backend) のデプロイ

### 4.1 Railway CLI のインストール（任意）

```bash
npm install -g @railway/cli
railway login
```

### 4.2 GitHub 連携でデプロイ（推奨）

1. [Railway Dashboard](https://railway.app/dashboard) にログイン
2. **New Project** → **Deploy from GitHub repo** を選択
3. GitHub アカウントを連携し、`Kakepple` リポジトリを選択
4. **Add variables** をクリック

### 4.3 環境変数の設定

Railway ダッシュボードの **Variables** タブで以下を設定:

```env
# Database (Supabaseの接続文字列)
DATABASE_URL=postgresql://postgres.[project-ref]:[password]@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres

# Redis (Upstashの接続文字列)
REDIS_URL=rediss://default:[password]@[endpoint]:6379

# Security
SECRET_KEY=<openssl rand -hex 32 で生成した値>

# Google OAuth
GOOGLE_CLIENT_ID=<Google Cloud Consoleから取得>
GOOGLE_CLIENT_SECRET=<Google Cloud Consoleから取得>
GOOGLE_REDIRECT_URI=https://<railway-domain>/api/auth/google/callback

# LINE OAuth (任意)
LINE_CHANNEL_ID=<LINE Developersから取得>
LINE_CHANNEL_SECRET=<LINE Developersから取得>
LINE_REDIRECT_URI=https://<railway-domain>/api/auth/line/callback

# Frontend URL (CORS設定用、Vercelデプロイ後に更新)
FRONTEND_URL=https://kakepple.vercel.app

# Debug (本番は必ずFalse)
DEBUG=False
```

### 4.4 Root Directory と Start Command の設定

1. **Settings** タブを開く
2. 以下を設定:
   - **Root Directory**: `backend`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port $PORT`

### 4.5 デプロイの確認

1. **Deployments** タブでビルドログを確認
2. 成功すると、ドメインが発行される (例: `kakepple-production.up.railway.app`)
3. ブラウザで `https://<railway-domain>/docs` にアクセスし、FastAPI の Swagger UI が表示されれば成功

### 4.6 Railway ドメインのメモ

```
RAILWAY_BACKEND_URL=https://kakepple-production.up.railway.app
```

---

## 5. Vercel (Frontend) のデプロイ

### 5.1 Vercel CLI のインストール（任意）

```bash
npm install -g vercel
```

### 5.2 GitHub 連携でデプロイ（推奨）

1. [Vercel Dashboard](https://vercel.com/dashboard) にログイン
2. **Add New...** → **Project** を選択
3. GitHub リポジトリ `Kakepple` をインポート
4. **Configure Project** で以下を設定:
   - **Framework Preset**: `Next.js` (自動検出)
   - **Root Directory**: `frontend`

### 5.3 環境変数の設定

**Environment Variables** セクションで以下を追加:

| Name | Value |
|------|-------|
| `NEXT_PUBLIC_API_URL` | `https://kakepple-production.up.railway.app` |

### 5.4 デプロイ実行

1. **Deploy** をクリック
2. ビルドが完了すると、ドメインが発行される (例: `kakepple.vercel.app`)

### 5.5 Vercel ドメインのメモ

```
VERCEL_FRONTEND_URL=https://kakepple.vercel.app
```

---

## 6. OAuth 設定の更新

### 6.1 Railway の FRONTEND_URL を更新

Railway ダッシュボードで環境変数を更新:

```env
FRONTEND_URL=https://kakepple.vercel.app
GOOGLE_REDIRECT_URI=https://kakepple-production.up.railway.app/api/auth/google/callback
LINE_REDIRECT_URI=https://kakepple-production.up.railway.app/api/auth/line/callback
```

### 6.2 Google OAuth の設定更新

1. [Google Cloud Console](https://console.cloud.google.com/apis/credentials) にアクセス
2. OAuth 2.0 クライアント ID を選択
3. 以下を追加:

**承認済みの JavaScript 生成元**:
```
https://kakepple.vercel.app
```

**承認済みのリダイレクト URI**:
```
https://kakepple-production.up.railway.app/api/auth/google/callback
```

### 6.3 LINE OAuth の設定更新（使用する場合）

1. [LINE Developers Console](https://developers.line.biz/console/) にアクセス
2. チャネルを選択 → **LINE Login** タブ
3. **Callback URL** に追加:
```
https://kakepple-production.up.railway.app/api/auth/line/callback
```

---

## 7. 動作確認

### 7.1 バックエンド確認

以下のURLにアクセスして確認:

| エンドポイント | 確認内容 |
|---------------|---------|
| `https://<railway-domain>/docs` | Swagger UI が表示される |
| `https://<railway-domain>/health` | `{"status": "healthy"}` が返る |

### 7.2 フロントエンド確認

1. `https://kakepple.vercel.app` にアクセス
2. ログイン画面が表示されることを確認
3. Google ログインをテスト

### 7.3 データベース接続確認

Railway のログで以下のようなエラーがないことを確認:
- `connection refused`
- `authentication failed`
- `database does not exist`

---

## 8. カスタムドメイン設定（任意）

独自ドメインを使用する場合の設定手順です。

### 8.1 ドメイン構成例

| サブドメイン | サービス | 用途 |
|-------------|---------|------|
| `kakepple.com` | Vercel | Frontend |
| `api.kakepple.com` | Railway | Backend |

### 8.2 Vercel にカスタムドメイン追加

1. Vercel ダッシュボード → **Settings** → **Domains**
2. ドメインを追加
3. 表示される DNS レコードをドメインレジストラで設定

### 8.3 Railway にカスタムドメイン追加

1. Railway ダッシュボード → **Settings** → **Domains**
2. **Custom Domain** を追加
3. 表示される CNAME レコードをドメインレジストラで設定

### 8.4 環境変数の更新

カスタムドメイン設定後、以下を更新:

**Railway**:
```env
FRONTEND_URL=https://kakepple.com
GOOGLE_REDIRECT_URI=https://api.kakepple.com/api/auth/google/callback
LINE_REDIRECT_URI=https://api.kakepple.com/api/auth/line/callback
```

**Vercel**:
```env
NEXT_PUBLIC_API_URL=https://api.kakepple.com
```

**Google Cloud Console / LINE Developers** のリダイレクトURIも更新してください。

---

## 9. トラブルシューティング

### よくある問題と解決方法

#### CORS エラー

```
Access to fetch at 'https://api...' from origin 'https://...' has been blocked by CORS policy
```

**解決方法**:
- Railway の `FRONTEND_URL` が正しいか確認
- プロトコル (`https://`) が一致しているか確認
- 末尾のスラッシュ有無を確認 (`https://example.com` ← スラッシュなし)

#### OAuth コールバックエラー

```
redirect_uri_mismatch
```

**解決方法**:
- Google Cloud Console のリダイレクトURIと `GOOGLE_REDIRECT_URI` が完全一致しているか確認
- URLのプロトコル、ドメイン、パスが完全に一致している必要がある

#### データベース接続エラー

```
could not connect to server: Connection refused
```

**解決方法**:
- Supabase の Connection Pooler URL を使用しているか確認
- パスワードに特殊文字が含まれる場合は URL エンコードする
- Supabase ダッシュボードでデータベースが起動しているか確認

#### Redis 接続エラー

```
redis.exceptions.ConnectionError
```

**解決方法**:
- `rediss://` (TLS) を使用しているか確認
- Upstash のパスワードが正しいか確認
- エンドポイントURLが正しいか確認

#### ビルドエラー (Railway)

```
ModuleNotFoundError: No module named 'xxx'
```

**解決方法**:
- `requirements.txt` に必要なパッケージが含まれているか確認
- Root Directory が `backend` に設定されているか確認

#### ビルドエラー (Vercel)

```
Type error: Cannot find module 'xxx'
```

**解決方法**:
- `package.json` に必要な依存関係が含まれているか確認
- Root Directory が `frontend` に設定されているか確認

---

## デプロイチェックリスト

デプロイ完了後、以下を確認してください:

### セキュリティ
- [ ] `SECRET_KEY` は十分に長いランダムな値になっている
- [ ] `DEBUG=False` に設定されている
- [ ] データベースパスワードは強力なものになっている

### 機能確認
- [ ] フロントエンドにアクセスできる
- [ ] バックエンドの `/docs` にアクセスできる
- [ ] ユーザー登録ができる
- [ ] Google ログインができる
- [ ] データの作成・取得ができる

### 運用準備
- [ ] [Uptime Robot](https://uptimerobot.com) でヘルスチェック監視を設定（無料）
- [ ] エラー通知の設定（Railway の通知設定など）

---

## 月額コスト目安

| サービス | プラン | 月額 |
|----------|--------|------|
| Vercel | Hobby | 無料 |
| Railway | Starter ($5 クレジット/月) | $0〜5 |
| Supabase | Free | 無料 |
| Upstash | Free | 無料 |
| **合計** | | **$0〜5** |

**注意**:
- Railway は月 $5 のクレジットが付与されますが、使用量により超過する場合があります
- Supabase Free プランは 500MB のデータベース容量制限があります
- Upstash Free プランは 10,000 コマンド/日の制限があります

---

## サポート・参考リンク

- [Supabase Documentation](https://supabase.com/docs)
- [Upstash Documentation](https://docs.upstash.com)
- [Railway Documentation](https://docs.railway.app)
- [Vercel Documentation](https://vercel.com/docs)
- [FastAPI Documentation](https://fastapi.tiangolo.com)
- [Next.js Documentation](https://nextjs.org/docs)
