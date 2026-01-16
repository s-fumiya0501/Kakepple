# Kakepple デプロイガイド

## 目次
1. [デプロイ方式の選択](#デプロイ方式の選択)
2. [方式A: PaaS利用（推奨）](#方式a-paas利用推奨)
3. [方式B: VPS/セルフホスト](#方式b-vpsセルフホスト)
4. [共通設定](#共通設定)
5. [運用・監視](#運用監視)

---

## デプロイ方式の選択

### 方式A: PaaS利用（推奨） 💡
**メリット**: 管理が楽、自動スケール、SSL自動
**デメリット**: 月額費用がやや高め

| コンポーネント | サービス | 月額目安 |
|--------------|---------|---------|
| Frontend | Vercel | $0〜20 |
| Backend | Railway / Render | $5〜20 |
| Database | Railway / Supabase | $0〜25 |
| Redis | Railway / Upstash | $0〜10 |
| **合計** | | **$5〜75** |

### 方式B: VPS/セルフホスト
**メリット**: コスト安、完全コントロール
**デメリット**: サーバー管理が必要

| VPS | 月額目安 |
|-----|---------|
| Vultr / DigitalOcean | $6〜12 |
| ConoHa VPS | ¥700〜 |
| さくらVPS | ¥700〜 |

---

## 方式A: PaaS利用（推奨）

### 1. Frontend を Vercel にデプロイ

```bash
# Vercel CLI インストール
npm i -g vercel

# frontendディレクトリでデプロイ
cd frontend
vercel
```

**Vercel 環境変数設定**:
- `NEXT_PUBLIC_API_URL`: バックエンドのURL (例: `https://kakepple-api.railway.app`)

**カスタムドメイン設定**:
1. Vercel ダッシュボード → Settings → Domains
2. ドメイン追加 → DNS設定をコピー
3. ドメインレジストラでDNS設定

### 2. Backend を Railway にデプロイ

```bash
# Railway CLI インストール
npm i -g @railway/cli

# ログイン
railway login

# プロジェクト作成
railway init

# backendディレクトリでデプロイ
cd backend
railway up
```

**Railway 環境変数設定** (ダッシュボードから):
```
DATABASE_URL=<Railwayが自動設定>
REDIS_URL=<Railwayが自動設定>
SECRET_KEY=<openssl rand -hex 32 で生成>
GOOGLE_CLIENT_ID=<Google Cloud Console>
GOOGLE_CLIENT_SECRET=<Google Cloud Console>
GOOGLE_REDIRECT_URI=https://kakepple-api.railway.app/api/auth/google/callback
FRONTEND_URL=https://kakepple.vercel.app
```

### 3. Database & Redis (Railway)

```bash
# PostgreSQL追加
railway add --plugin postgresql

# Redis追加
railway add --plugin redis
```

### 4. Google OAuth 設定更新

[Google Cloud Console](https://console.cloud.google.com/apis/credentials) で:

1. 承認済みの JavaScript 生成元を追加:
   - `https://yourdomain.com`

2. 承認済みのリダイレクト URI を追加:
   - `https://kakepple-api.railway.app/api/auth/google/callback`

---

## 方式B: VPS/セルフホスト

### 1. サーバー初期設定

```bash
# Ubuntu/Debian の場合
sudo apt update && sudo apt upgrade -y

# Docker インストール
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# Docker Compose インストール
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

### 2. プロジェクトをクローン

```bash
git clone https://github.com/yourusername/kakepple.git
cd kakepple
```

### 3. 環境変数を設定

```bash
# 本番用環境変数ファイルを作成
cp .env.production.example .env.production

# 編集して本番値を設定
nano .env.production
```

### 4. SSL証明書の取得 (Let's Encrypt)

```bash
# Certbot インストール
sudo apt install certbot

# 証明書取得 (ドメインのDNSを先に設定)
sudo certbot certonly --standalone -d yourdomain.com -d api.yourdomain.com

# 証明書をnginxディレクトリにコピー
mkdir -p nginx/ssl
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem nginx/ssl/
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem nginx/ssl/
sudo chmod 644 nginx/ssl/*.pem
```

### 5. nginx.conf を編集

```bash
# ドメイン名を置換
sed -i 's/yourdomain.com/実際のドメイン/g' nginx/nginx.conf
```

### 6. デプロイ実行

```bash
# 本番用コンテナ起動
docker-compose -f docker-compose.prod.yml --env-file .env.production up -d

# マイグレーション実行
docker-compose -f docker-compose.prod.yml exec backend alembic upgrade head

# ログ確認
docker-compose -f docker-compose.prod.yml logs -f
```

### 7. 証明書自動更新設定

```bash
# cron設定
sudo crontab -e

# 以下を追加 (毎月1日の3時に更新)
0 3 1 * * certbot renew --quiet && cp /etc/letsencrypt/live/yourdomain.com/*.pem /path/to/kakepple/nginx/ssl/ && docker-compose -f /path/to/kakepple/docker-compose.prod.yml restart nginx
```

---

## 共通設定

### バックエンドのヘルスチェックエンドポイント追加

`backend/app/main.py` に追加:

```python
@app.get("/health")
async def health_check():
    return {"status": "healthy"}
```

### データベースマイグレーション

```bash
# ローカルでマイグレーション作成
cd backend
alembic revision --autogenerate -m "description"

# 本番でマイグレーション適用
# Railway: railway run alembic upgrade head
# VPS: docker-compose exec backend alembic upgrade head
```

### バックアップ設定

```bash
# PostgreSQLバックアップスクリプト例
#!/bin/bash
BACKUP_DIR=/backups
DATE=$(date +%Y%m%d_%H%M%S)
docker-compose exec -T db pg_dump -U kakepple kakepple > $BACKUP_DIR/kakepple_$DATE.sql
gzip $BACKUP_DIR/kakepple_$DATE.sql

# 7日以上古いバックアップを削除
find $BACKUP_DIR -name "*.sql.gz" -mtime +7 -delete
```

---

## 運用・監視

### ログ監視

```bash
# 全サービスのログ
docker-compose logs -f

# 特定サービスのログ
docker-compose logs -f backend

# エラーのみ
docker-compose logs backend 2>&1 | grep -i error
```

### メトリクス監視（オプション）

無料の監視サービス:
- **Uptime Robot**: 死活監視 (無料)
- **Sentry**: エラー監視 (無料枠あり)
- **Grafana Cloud**: メトリクス (無料枠あり)

### アラート設定

Uptime Robot でヘルスチェックURL監視:
- `https://yourdomain.com` (フロントエンド)
- `https://api.yourdomain.com/health` (バックエンド)

---

## トラブルシューティング

### よくある問題

1. **CORS エラー**
   - `FRONTEND_URL` が正しく設定されているか確認
   - プロトコル (http/https) が一致しているか確認

2. **OAuth コールバックエラー**
   - Google Cloud Console のリダイレクトURIが正しいか確認
   - `GOOGLE_REDIRECT_URI` 環境変数を確認

3. **Cookie が設定されない**
   - HTTPS が有効か確認
   - `SameSite` と `Secure` 属性を確認

4. **データベース接続エラー**
   - `DATABASE_URL` の形式を確認
   - コンテナ間ネットワークを確認

### コンテナ再起動

```bash
# 全サービス再起動
docker-compose -f docker-compose.prod.yml restart

# 特定サービス再起動
docker-compose -f docker-compose.prod.yml restart backend

# イメージ再ビルド
docker-compose -f docker-compose.prod.yml up -d --build
```

---

## チェックリスト

デプロイ前の確認事項:

- [ ] `SECRET_KEY` を強力なランダム値に変更
- [ ] データベースパスワードを強力なものに変更
- [ ] Google OAuth のリダイレクトURIを本番URLに更新
- [ ] `FRONTEND_URL` を本番URLに設定
- [ ] HTTPS が有効
- [ ] バックアップスクリプトを設定
- [ ] 監視サービスを設定
- [ ] DNS設定が正しい
