# Kakepple デプロイ準備状況チェック

## 現状の評価

| カテゴリ | 状態 | 詳細 |
|---------|------|------|
| 基本機能 | ✅ 完了 | 認証、CRUD、カップル機能、分析 |
| UI/UX | ✅ 完了 | レスポンシブ、ダークモード対応 |
| 認証 | ✅ 完了 | Google/LINE OAuth、Email/Password |
| セキュリティ | ⚠️ 要対応 | 以下の項目 |
| 本番設定 | ⚠️ 要対応 | 以下の項目 |

---

## 本番デプロイ前に必要な対応

### 1. セキュリティ（重要度: 高）

```bash
# .envの認証情報を本番用に変更必須
SECRET_KEY=ランダムな64文字以上の文字列
GOOGLE_CLIENT_SECRET=本番用
LINE_CHANNEL_SECRET=本番用
```

**対応項目:**
- [ ] 本番用SECRET_KEYの生成（`openssl rand -hex 64`）
- [ ] Rate Limiting有効化（slowapiのインストール）
- [ ] HTTPS強制（Cookieのsecure=True）
- [ ] CORS設定を本番ドメインに限定

### 2. 環境設定

```env
# 本番用.env
DEBUG=False
FRONTEND_URL=https://your-domain.com
GOOGLE_REDIRECT_URI=https://your-domain.com/api/auth/google/callback
LINE_REDIRECT_URI=https://your-domain.com/api/auth/line/callback
```

### 3. フロントエンド脆弱性

```bash
# 4件の脆弱性（ESLint関連、開発依存）
# 本番ビルドには影響少ないが、更新推奨
npm audit fix
```

### 4. インフラ

- [ ] SSL証明書（Let's Encrypt等）
- [ ] リバースプロキシ（Nginx）
- [ ] データベースバックアップ設定
- [ ] ログ管理・監視

---

## 簡易デプロイチェックリスト

```
□ SECRET_KEYを本番用に変更
□ DEBUG=Falseに設定
□ OAuth Redirect URIを本番ドメインに変更
□ CORS設定を本番ドメインに限定
□ SSL証明書の設定
□ データベースの定期バックアップ
□ .envファイルをGitから除外済み確認
```

---

## 結論

**開発・テスト環境**: ✅ 問題なく動作

**本番デプロイ**: ⚠️ 上記の設定変更後にデプロイ可能

最低限必要な対応（1-2時間程度）:
1. 環境変数の本番設定
2. SSL/HTTPS設定
3. OAuth Redirect URI更新

---

## デプロイ方法

### Option 1: VPS (推奨)
- ConoHa, さくらVPS, AWS EC2など
- Docker Composeでそのままデプロイ可能

### Option 2: PaaS
- Railway, Render, Fly.io
- Dockerfileを使用

### Option 3: Vercel + 外部DB
- フロントエンド: Vercel
- バックエンド: Railway, Render
- DB: Supabase, Neon

---

## 参考コマンド

```bash
# 本番用SECRET_KEY生成
openssl rand -hex 64

# Dockerイメージビルド（本番用）
docker-compose -f docker-compose.prod.yml build

# 本番起動
docker-compose -f docker-compose.prod.yml up -d

# ログ確認
docker-compose logs -f
```
