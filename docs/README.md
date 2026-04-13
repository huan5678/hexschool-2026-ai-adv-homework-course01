# 花卉電商 (Flower Shop E-Commerce)

全端花卉電商平台，提供商品瀏覽、購物車、訂單管理與後台管理功能。

## 技術棧

| 類別 | 技術 | 版本 |
|------|------|------|
| 後端框架 | Express.js | ~4.16.1 |
| 資料庫 | better-sqlite3 (SQLite) | ^12.8.0 |
| 模板引擎 | EJS | ^5.0.1 |
| CSS 框架 | Tailwind CSS (CLI) | ^4.2.2 |
| 認證 | jsonwebtoken (JWT) | ^9.0.2 |
| 密碼雜湊 | bcrypt | ^6.0.0 |
| UUID 生成 | uuid (v4) | ^11.1.0 |
| API 文件 | swagger-jsdoc (OpenAPI 3.0.3) | ^6.2.8 |
| CORS | cors | ^2.8.5 |
| 環境變數 | dotenv | ^16.4.7 |
| 測試框架 | Vitest | ^2.1.9 |
| HTTP 測試 | supertest | ^7.2.2 |

## 快速開始

```bash
# 1. 安裝依賴
npm install

# 2. 設定環境變數
cp .env.example .env
# 編輯 .env，至少設定 JWT_SECRET

# 3. 啟動（含 CSS 編譯）
npm start
# 伺服器預設在 http://localhost:3001

# 4. 開發模式（僅啟動 server，不編譯 CSS）
npm run dev:server

# 5. 開發模式（CSS 監聽）
npm run dev:css
```

## 預設帳號

| 角色 | Email | 密碼 |
|------|-------|------|
| Admin | admin@hexschool.com | 12345678 |

## 常用指令

| 指令 | 說明 |
|------|------|
| `npm start` | 編譯 CSS 並啟動伺服器 |
| `npm run dev:server` | 僅啟動伺服器（不編譯 CSS） |
| `npm run dev:css` | Tailwind CSS watch 模式 |
| `npm run css:build` | 編譯並壓縮 CSS |
| `npm run openapi` | 產生 OpenAPI 規格檔 |
| `npm test` | 執行所有測試（Vitest） |

## 文件索引

| 文件 | 說明 |
|------|------|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | 架構、目錄結構、資料流、API 路由、資料庫 schema |
| [FEATURES.md](./FEATURES.md) | 功能清單、行為描述、錯誤碼 |
| [DEVELOPMENT.md](./DEVELOPMENT.md) | 開發規範、命名規則、環境變數、計畫歸檔流程 |
| [TESTING.md](./TESTING.md) | 測試規範、執行順序、輔助函式、撰寫指南 |
| [CHANGELOG.md](./CHANGELOG.md) | 更新日誌 |
