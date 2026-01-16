# Kakepple セキュリティチェックリスト

## 概要

本ドキュメントは、Kakeppleアプリケーションのセキュリティ対策状況と推奨事項をまとめたものです。

---

## 1. 認証・セッション管理

### 対応済み ✅

| 項目 | 状態 | 詳細 |
|------|------|------|
| パスワードハッシュ化 | ✅ | bcryptを使用 |
| セッションID生成 | ✅ | `secrets.token_urlsafe(32)`で暗号的に安全 |
| セッション有効期限 | ✅ | 7日間（設定可能） |
| HTTPOnly Cookie | ✅ | XSS対策 |
| SameSite Cookie | ✅ | CSRF対策（lax） |
| パスワード最小文字数 | ✅ | 8文字以上 |

### 本番環境で必要 ⚠️

| 項目 | 状態 | 対応方法 |
|------|------|----------|
| Secure Cookie | ⚠️ | `DEBUG=False`で自動有効化 |
| HTTPS強制 | ⚠️ | Nginx/ロードバランサーで設定 |

---

## 2. 環境変数・シークレット管理

### チェックリスト

```
□ SECRET_KEYを本番用に変更（64文字以上のランダム文字列）
□ データベースパスワードを強力なものに変更
□ OAuth認証情報を本番用に設定
□ .envファイルがGitにコミットされていないことを確認
□ .gitignoreに.envが含まれていることを確認
```

### SECRET_KEY生成コマンド

```bash
# Linux/Mac
openssl rand -hex 64

# Python
python -c "import secrets; print(secrets.token_hex(64))"
```

### 本番用.env例

```env
# 本番環境設定
DEBUG=False
SECRET_KEY=<64文字以上のランダム文字列>

# データベース（強力なパスワード）
POSTGRES_USER=kakepple
POSTGRES_PASSWORD=<32文字以上のランダムパスワード>
POSTGRES_DB=kakepple

# OAuth（本番ドメイン）
GOOGLE_REDIRECT_URI=https://your-domain.com/api/auth/google/callback
LINE_REDIRECT_URI=https://your-domain.com/api/auth/line/callback

# CORS
FRONTEND_URL=https://your-domain.com
```

---

## 3. API セキュリティ

### 対応済み ✅

| 項目 | 状態 | 詳細 |
|------|------|------|
| 認証必須エンドポイント | ✅ | `get_current_user`依存関係で保護 |
| 入力バリデーション | ✅ | Pydanticスキーマで検証 |
| SQLインジェクション対策 | ✅ | SQLAlchemy ORMを使用 |
| CORS設定 | ✅ | 許可オリジンを制限 |

### 要対応 ⚠️

| 項目 | 状態 | 対応方法 |
|------|------|----------|
| Rate Limiting | ⚠️ | slowapiを有効化 |
| リクエストサイズ制限 | ⚠️ | Nginx/FastAPIで設定 |

### Rate Limiting 有効化

```bash
# requirements.txtに追加
slowapi==0.1.9

# main.pyに追加
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter

# エンドポイントに適用
@app.get("/api/auth/login")
@limiter.limit("5/minute")
async def login(...):
    ...
```

---

## 4. データ保護

### 対応済み ✅

| 項目 | 状態 | 詳細 |
|------|------|------|
| パスワード暗号化 | ✅ | bcryptハッシュ |
| 機密データ非公開 | ✅ | password_hashはAPIレスポンスに含まれない |

### 推奨事項

| 項目 | 推奨度 | 詳細 |
|------|--------|------|
| データベース暗号化 | 中 | PostgreSQLの透過的暗号化 |
| バックアップ暗号化 | 高 | バックアップファイルの暗号化 |
| 通信暗号化 | 高 | TLS 1.3使用 |

---

## 5. ファイルアップロード

### 対応済み ✅

| 項目 | 状態 | 詳細 |
|------|------|------|
| ファイルタイプ制限 | ✅ | JPEG, PNG, GIF, WebPのみ |
| ファイルサイズ制限 | ✅ | 最大5MB |
| ファイル名サニタイズ | ✅ | UUIDベースのファイル名 |

---

## 6. エラーハンドリング

### チェックリスト

```
□ 本番環境でDEBUG=Falseに設定
□ スタックトレースがユーザーに表示されないことを確認
□ エラーログが適切に記録されることを確認
```

---

## 7. 依存関係の脆弱性

### チェックコマンド

```bash
# フロントエンド
cd frontend && npm audit

# バックエンド
pip install safety
safety check -r requirements.txt
```

### 現在の状況

| パッケージ | 脆弱性 | 重要度 | 対応 |
|-----------|--------|--------|------|
| eslint-config-next | あり | 高 | 開発依存のため影響小 |

---

## 8. インフラセキュリティ

### 推奨設定

#### Nginx（リバースプロキシ）

```nginx
# セキュリティヘッダー
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';" always;

# レート制限
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
limit_req zone=api burst=20 nodelay;

# リクエストサイズ制限
client_max_body_size 10M;
```

#### ファイアウォール

```bash
# UFW設定例
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow http
ufw allow https
ufw enable
```

---

## 9. 監視・ログ

### 推奨事項

```
□ アクセスログの保存
□ エラーログの監視
□ 不正アクセス検知
□ ディスク使用量監視
□ CPU/メモリ監視
```

### ログ設定例

```python
# main.py
import logging

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('app.log'),
        logging.StreamHandler()
    ]
)
```

---

## 10. 定期的なセキュリティ対策

### 月次タスク

```
□ 依存パッケージの更新確認
□ セキュリティパッチの適用
□ アクセスログの確認
□ バックアップのテスト復元
```

### 四半期タスク

```
□ パスワードポリシーの見直し
□ アクセス権限の棚卸し
□ セキュリティ設定の見直し
```

---

## クイックチェック（本番デプロイ前）

```
□ DEBUG=False
□ SECRET_KEYが本番用（64文字以上）
□ データベースパスワードが強力
□ HTTPS有効
□ CORS設定が本番ドメインのみ
□ .envがGitにコミットされていない
□ Rate Limitingが有効
□ エラーメッセージに機密情報が含まれていない
□ ログが適切に設定されている
□ バックアップが設定されている
```

---

## 参考リンク

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [FastAPI Security](https://fastapi.tiangolo.com/tutorial/security/)
- [Next.js Security](https://nextjs.org/docs/advanced-features/security-headers)
