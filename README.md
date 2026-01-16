# Kakepple - カップル向け家計簿アプリ

カップルで共有できる家計簿アプリです。個人の家計簿管理に加えて、カップル間で家計簿を共有し、割り勘機能を使って支出を自動的に分割できます。

## 機能

- **ログイン機能** - Google OAuth 2.0による認証
- **個人の家計簿管理** - 収入と支出の記録、カテゴリー別管理
- **カップルペアリング** - 招待コードでカップルを登録
- **カップル共有家計簿** - カップル間で家計簿を共有
- **割り勘機能** - 支出を登録する際、自動的に半額ずつ計算

## 技術スタック

### Backend
- FastAPI
- PostgreSQL
- SQLAlchemy
- Redis (セッション管理)
- Alembic (DBマイグレーション)

### Frontend
- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- shadcn/ui

### 開発環境
- Docker & Docker Compose

## セットアップ

### 前提条件

- Docker & Docker Compose がインストールされていること
- Google Cloud Console でOAuth 2.0認証情報を取得していること

### 1. リポジトリのクローン

```bash
git clone <repository-url>
cd kakepple
```

### 2. 環境変数の設定

`.env.example` をコピーして `.env` ファイルを作成します。

```bash
cp .env.example .env
```

`.env` ファイルを編集して、以下の値を設定してください:

```env
# Google OAuth 2.0の認証情報
GOOGLE_CLIENT_ID=your-google-client-id-here
GOOGLE_CLIENT_SECRET=your-google-client-secret-here

# セキュリティキー (本番環境では必ず変更してください)
SECRET_KEY=your-super-secret-key-change-this-in-production
```

### 3. Google OAuth 2.0の設定

1. [Google Cloud Console](https://console.cloud.google.com/)にアクセス
2. プロジェクトを作成または選択
3. 「APIとサービス」→「認証情報」を開く
4. 「認証情報を作成」→「OAuth 2.0 クライアント ID」を選択
5. アプリケーションの種類: 「ウェブアプリケーション」を選択
6. 承認済みのリダイレクト URIに以下を追加:
   - `http://localhost:8000/api/auth/google/callback`
7. クライアントIDとクライアントシークレットをコピーして `.env` に設定

### 4. アプリケーションの起動

```bash
docker-compose up --build
```

初回起動時は、データベースのマイグレーションを実行します:

```bash
docker-compose exec backend alembic upgrade head
```

### 5. アクセス

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs (Swagger): http://localhost:8000/docs

## 開発

### データベースマイグレーション

新しいマイグレーションファイルを作成:

```bash
docker-compose exec backend alembic revision --autogenerate -m "migration message"
```

マイグレーションを適用:

```bash
docker-compose exec backend alembic upgrade head
```

マイグレーションをロールバック:

```bash
docker-compose exec backend alembic downgrade -1
```

### ログの確認

```bash
# 全コンテナのログ
docker-compose logs -f

# 特定のコンテナのログ
docker-compose logs -f backend
docker-compose logs -f frontend
```

### コンテナの停止

```bash
docker-compose down
```

データベースのデータも削除する場合:

```bash
docker-compose down -v
```

## プロジェクト構造

```
kakepple/
├── backend/                # FastAPI バックエンド
│   ├── app/
│   │   ├── api/           # APIエンドポイント
│   │   ├── core/          # コア機能 (認証など)
│   │   ├── models/        # SQLAlchemyモデル
│   │   ├── schemas/       # Pydanticスキーマ
│   │   ├── utils/         # ユーティリティ関数
│   │   ├── config.py      # 設定
│   │   ├── database.py    # DB接続
│   │   └── main.py        # FastAPIアプリ
│   ├── alembic/           # DBマイグレーション
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/              # Next.js フロントエンド
│   ├── src/
│   │   ├── app/          # Next.js App Router
│   │   ├── components/   # Reactコンポーネント
│   │   ├── lib/          # ユーティリティ・APIクライアント
│   │   └── types/        # TypeScript型定義
│   ├── package.json
│   └── Dockerfile
├── docker-compose.yml
├── .env.example
└── README.md
```

## API エンドポイント

### 認証
- `GET /api/auth/google` - Google OAuth開始
- `GET /api/auth/google/callback` - OAuth コールバック
- `GET /api/auth/me` - 現在のユーザー情報取得
- `POST /api/auth/logout` - ログアウト

### カップル
- `POST /api/couples/invite` - 招待コード生成
- `POST /api/couples/join` - カップルに参加
- `GET /api/couples/me` - 自分のカップル情報取得
- `DELETE /api/couples/me` - カップルから退出

### トランザクション
- `POST /api/transactions` - トランザクション作成
- `GET /api/transactions` - トランザクション一覧取得
- `GET /api/transactions/summary` - 収支サマリー取得
- `GET /api/transactions/{id}` - トランザクション詳細取得
- `PUT /api/transactions/{id}` - トランザクション更新
- `DELETE /api/transactions/{id}` - トランザクション削除

## カテゴリー

### 収入カテゴリー
- 本業
- 副業
- アルバイト
- パート
- その他

### 支出カテゴリー (固定費)
- 家賃
- 電気・ガス・水道
- 通信費
- サブスク・保険

### 支出カテゴリー (変動費)
- 食費
- 日用品
- 交通費
- 交際費
- 医療費
- 被服・美容
- 趣味・娯楽

## トラブルシューティング

### ポートが使用中の場合

`docker-compose.yml` のポート番号を変更してください:

```yaml
ports:
  - "8001:8000"  # backend
  - "3001:3000"  # frontend
```

### データベース接続エラー

1. PostgreSQLコンテナが起動しているか確認:
   ```bash
   docker-compose ps
   ```

2. データベースのヘルスチェックが通っているか確認:
   ```bash
   docker-compose logs db
   ```

3. 環境変数が正しく設定されているか確認:
   ```bash
   docker-compose exec backend env | grep DATABASE_URL
   ```

### Redis接続エラー

Redisコンテナが起動しているか確認:
```bash
docker-compose logs redis
```

## 今後の拡張機能

- [ ] ダッシュボードのグラフ表示
- [ ] 月次・年次レポート
- [ ] カテゴリー別分析
- [ ] 予算設定・アラート機能
- [ ] エクスポート機能 (CSV, PDF)
- [ ] 定期支出の自動登録
- [ ] プッシュ通知

## ライセンス

MIT License
