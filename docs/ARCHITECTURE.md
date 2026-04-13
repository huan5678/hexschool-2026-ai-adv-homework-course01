# 架構文件

## 目錄結構

```
├── app.js                          # Express 應用程式設定（middleware、路由掛載、錯誤處理）
├── server.js                       # 進入點，驗證 JWT_SECRET 並啟動 HTTP 伺服器
├── package.json                    # 依賴與腳本定義
├── vitest.config.js                # 測試設定（執行順序、全域變數、逾時設定）
├── swagger-config.js               # OpenAPI 3.0.3 設定
├── generate-openapi.js             # 產生 OpenAPI JSON 檔的腳本
├── .env.example                    # 環境變數範本
│
├── src/
│   ├── database.js                 # SQLite 初始化（建表 + 種子資料），匯出 db 實例
│   ├── middleware/
│   │   ├── authMiddleware.js       # JWT 驗證，附加 req.user = { userId, email, role }
│   │   ├── adminMiddleware.js      # 檢查 req.user.role === 'admin'，回傳 403
│   │   ├── sessionMiddleware.js    # 從 X-Session-Id header 擷取 req.sessionId
│   │   └── errorHandler.js         # 全域錯誤處理，安全訊息映射
│   ├── utils/
│   │   └── ecpay.js                # ECPay 工具（CheckMacValue、付款表單、QueryTradeInfo）
│   └── routes/
│       ├── authRoutes.js           # POST /register, POST /login, GET /profile
│       ├── productRoutes.js        # GET / (列表), GET /:id (詳情)
│       ├── cartRoutes.js           # GET / POST / PATCH /:itemId DELETE /:itemId（雙模式認證）
│       ├── orderRoutes.js          # POST / GET / GET /:id PATCH /:id/pay POST /:id/ecpay-payment POST /:id/check-payment POST /ecpay-notify
│       ├── adminProductRoutes.js   # GET / POST / PUT /:id DELETE /:id
│       ├── adminOrderRoutes.js     # GET / GET /:id
│       └── pageRoutes.js           # 前端頁面 SSR 路由（含 ECPay 導回路由）
│
├── views/
│   ├── layouts/
│   │   ├── front.ejs               # 前台共用版型（header + footer）
│   │   └── admin.ejs               # 後台共用版型（header + sidebar）
│   ├── pages/
│   │   ├── index.ejs               # 首頁
│   │   ├── login.ejs               # 登入頁
│   │   ├── product-detail.ejs      # 商品詳情頁
│   │   ├── cart.ejs                # 購物車頁
│   │   ├── checkout.ejs            # 結帳頁
│   │   ├── orders.ejs              # 訂單列表頁
│   │   ├── order-detail.ejs        # 訂單詳情頁
│   │   ├── 404.ejs                 # 404 頁面
│   │   └── admin/
│   │       ├── products.ejs        # 後台商品管理頁
│   │       └── orders.ejs          # 後台訂單管理頁
│   └── partials/
│       ├── head.ejs                # HTML <head> 區塊
│       ├── header.ejs              # 前台頁首
│       ├── footer.ejs              # 前台頁尾
│       ├── admin-header.ejs        # 後台頁首
│       ├── admin-sidebar.ejs       # 後台側邊欄
│       └── notification.ejs        # Toast 通知元件
│
├── public/
│   ├── css/
│   │   ├── input.css               # Tailwind CSS 來源檔
│   │   └── output.css              # 編譯產出（.gitignore）
│   ├── stylesheets/
│   │   └── style.css               # 額外自訂樣式
│   └── js/
│       ├── api.js                  # Fetch 封裝（自動附加 Token，401 自動跳轉登入頁）
│       ├── auth.js                 # 前端認證管理（localStorage: flower_token, flower_user, flower_session_id）
│       ├── notification.js         # Toast 通知系統
│       ├── header-init.js          # Header 初始化
│       └── pages/
│           ├── index.js            # 首頁邏輯
│           ├── product-detail.js   # 商品詳情頁邏輯
│           ├── login.js            # 登入頁邏輯
│           ├── cart.js             # 購物車頁邏輯
│           ├── checkout.js         # 結帳頁邏輯
│           ├── orders.js           # 訂單列表頁邏輯
│           ├── order-detail.js     # 訂單詳情頁邏輯
│           ├── admin-products.js   # 後台商品管理邏輯
│           └── admin-orders.js     # 後台訂單管理邏輯
│
└── tests/
    ├── setup.js                    # 測試輔助函式（getAdminToken, registerUser）
    ├── auth.test.js                # 認證端點測試
    ├── products.test.js            # 商品端點測試
    ├── cart.test.js                # 購物車端點測試
    ├── orders.test.js              # 訂單端點測試
    ├── adminProducts.test.js       # 後台商品端點測試
    └── adminOrders.test.js         # 後台訂單端點測試
```

## 啟動流程

```
npm start
  │
  ├─ npm run css:build              # Tailwind CLI 編譯 input.css → output.css（壓縮）
  │
  └─ node server.js
       │
       ├─ 檢查 JWT_SECRET 環境變數    # 缺少則 process.exit(1)
       │
       ├─ require('./app')
       │    │
       │    ├─ dotenv.config()       # 載入 .env
       │    ├─ require('./src/database')
       │    │    ├─ 開啟 SQLite（database.sqlite）
       │    │    ├─ 啟用 WAL mode + Foreign Keys
       │    │    ├─ 建立 5 張資料表（IF NOT EXISTS）
       │    │    ├─ 種子：管理員帳號（如不存在）
       │    │    └─ 種子：8 個花卉商品（如 products 表為空）
       │    │
       │    ├─ 設定 EJS 模板引擎
       │    ├─ 掛載靜態檔案（public/）
       │    ├─ 掛載全域 middleware（依序）：
       │    │    1. CORS
       │    │    2. express.json()
       │    │    3. express.urlencoded({ extended: false })
       │    │    4. sessionMiddleware（擷取 X-Session-Id）
       │    │
       │    ├─ 掛載 API 路由
       │    ├─ 掛載前端頁面路由
       │    ├─ 404 處理（API 回 JSON，頁面回 EJS）
       │    └─ 全域錯誤處理 middleware
       │
       └─ app.listen(PORT)           # 預設 3001
```

## API 路由總覽

### 認證 `/api/auth` — `authRoutes.js`

| 方法 | 路徑 | 認證 | 說明 |
|------|------|------|------|
| POST | `/api/auth/register` | 無 | 註冊新帳號 |
| POST | `/api/auth/login` | 無 | 登入取得 Token |
| GET | `/api/auth/profile` | Bearer JWT | 取得個人資料 |

### 商品 `/api/products` — `productRoutes.js`

| 方法 | 路徑 | 認證 | 說明 |
|------|------|------|------|
| GET | `/api/products` | 無 | 商品列表（分頁） |
| GET | `/api/products/:id` | 無 | 商品詳情 |

### 購物車 `/api/cart` — `cartRoutes.js`

| 方法 | 路徑 | 認證 | 說明 |
|------|------|------|------|
| GET | `/api/cart` | Bearer JWT **或** X-Session-Id | 查看購物車 |
| POST | `/api/cart` | Bearer JWT **或** X-Session-Id | 加入商品 |
| PATCH | `/api/cart/:itemId` | Bearer JWT **或** X-Session-Id | 修改數量 |
| DELETE | `/api/cart/:itemId` | Bearer JWT **或** X-Session-Id | 移除商品 |

### 訂單 `/api/orders` — `orderRoutes.js`

| 方法 | 路徑 | 認證 | 說明 |
|------|------|------|------|
| POST | `/api/orders` | Bearer JWT | 從購物車建立訂單 |
| GET | `/api/orders` | Bearer JWT | 使用者訂單列表 |
| GET | `/api/orders/:id` | Bearer JWT | 訂單詳情 |
| PATCH | `/api/orders/:id/pay` | Bearer JWT | 模擬付款 |
| POST | `/api/orders/:id/ecpay-payment` | Bearer JWT | 產生 ECPay 付款表單 |
| POST | `/api/orders/:id/check-payment` | Bearer JWT | 查詢 ECPay 付款狀態 |
| POST | `/api/orders/ecpay-notify` | 無 | ECPay Server Notify（ReturnURL） |

### 後台商品 `/api/admin/products` — `adminProductRoutes.js`

| 方法 | 路徑 | 認證 | 說明 |
|------|------|------|------|
| GET | `/api/admin/products` | Bearer JWT + Admin | 商品列表（分頁） |
| POST | `/api/admin/products` | Bearer JWT + Admin | 新增商品 |
| PUT | `/api/admin/products/:id` | Bearer JWT + Admin | 編輯商品 |
| DELETE | `/api/admin/products/:id` | Bearer JWT + Admin | 刪除商品 |

### 後台訂單 `/api/admin/orders` — `adminOrderRoutes.js`

| 方法 | 路徑 | 認證 | 說明 |
|------|------|------|------|
| GET | `/api/admin/orders` | Bearer JWT + Admin | 訂單列表（可篩選狀態） |
| GET | `/api/admin/orders/:id` | Bearer JWT + Admin | 訂單詳情（含使用者資訊） |

### 前端頁面 `/` — `pageRoutes.js`

| 路徑 | 版型 | 頁面腳本 |
|------|------|----------|
| `/` | front | index |
| `/products/:id` | front | product-detail |
| `/cart` | front | cart |
| `/checkout` | front | checkout |
| `/login` | front | login |
| `/orders` | front | orders |
| `/orders/:id` | front | order-detail |
| `POST /orders/:id/payment-result` | — | ECPay OrderResultURL 導回（303 → 訂單詳情） |
| `/admin/products` | admin | admin-products |
| `/admin/orders` | admin | admin-orders |

## 統一回應格式

所有 API 端點回傳相同的 JSON 結構：

```json
{
  "data": <Object|Array|null>,
  "error": <String|null>,
  "message": "<中文訊息>"
}
```

### 成功回應範例

```json
// POST /api/auth/login (200)
{
  "data": {
    "user": { "id": "uuid", "email": "user@example.com", "name": "使用者", "role": "user" },
    "token": "eyJhbGciOiJIUzI1NiIs..."
  },
  "error": null,
  "message": "登入成功"
}

// GET /api/cart (200)
{
  "data": {
    "items": [
      {
        "id": "cart-item-uuid",
        "product_id": "product-uuid",
        "quantity": 2,
        "product": {
          "name": "粉色玫瑰花束",
          "price": 1680,
          "stock": 30,
          "image_url": "https://..."
        }
      }
    ],
    "total": 3360
  },
  "error": null,
  "message": "成功"
}

// GET /api/products (200)
{
  "data": {
    "products": [ ... ],
    "pagination": {
      "total": 8,
      "page": 1,
      "limit": 10,
      "totalPages": 1
    }
  },
  "error": null,
  "message": "成功"
}
```

### 錯誤回應範例

```json
// 400 驗證錯誤
{
  "data": null,
  "error": "VALIDATION_ERROR",
  "message": "email、password、name 為必填欄位"
}

// 401 未授權
{
  "data": null,
  "error": "UNAUTHORIZED",
  "message": "Token 無效或已過期"
}

// 403 權限不足
{
  "data": null,
  "error": "FORBIDDEN",
  "message": "權限不足"
}
```

## 認證與授權機制

### JWT 認證

- **演算法**：HS256 (HMAC-SHA256)
- **密鑰**：`process.env.JWT_SECRET`（啟動時必須設定，缺少則 `process.exit(1)`）
- **有效期**：7 天 (`expiresIn: '7d'`)
- **Payload**：`{ userId, email, role }`
- **格式**：`Authorization: Bearer <token>`
- **無 Refresh Token 機制**，到期後需重新登入

### authMiddleware 行為 (`src/middleware/authMiddleware.js`)

1. 檢查 `Authorization` header 是否以 `Bearer ` 開頭
2. 擷取 token 並以 `HS256` 演算法驗證
3. 從資料庫確認 `decoded.userId` 對應的使用者仍存在
4. 附加 `req.user = { userId, email, role }` 至 request
5. 失敗回傳 `401 UNAUTHORIZED`

### adminMiddleware 行為 (`src/middleware/adminMiddleware.js`)

1. 檢查 `req.user.role === 'admin'`
2. 非 admin 回傳 `403 FORBIDDEN`
3. **必須在 authMiddleware 之後使用**（依賴 `req.user`）

### 購物車雙模式認證 (`cartRoutes.js` 內的 `dualAuth`)

購物車端點支援兩種認證方式，允許未登入使用者也能使用購物車：

```
請求進入
  │
  ├─ 有 Authorization: Bearer <token>？
  │    ├─ 是 → 驗證 JWT
  │    │    ├─ 有效 → req.user = decoded，繼續
  │    │    └─ 無效 → 401（立即回傳，不 fallback 到 session）
  │    │
  │    └─ 否 → 檢查 req.sessionId
  │         ├─ 有 → 繼續（匿名模式）
  │         └─ 無 → 401「請提供有效的登入 Token 或 X-Session-Id」
```

**重要**：當提供了 Authorization header 但 token 無效時，**不會** fallback 到 session 模式，直接回 401。

### 資料擁有者判定 (`getOwnerCondition`)

```javascript
// 已登入使用者：以 user_id 查詢
{ field: 'user_id', value: req.user.userId }

// 匿名使用者：以 session_id 查詢
{ field: 'session_id', value: req.sessionId }
```

### 權限層級

| 層級 | 可用功能 |
|------|----------|
| 未認證 | 瀏覽商品、購物車操作（需 X-Session-Id） |
| 一般使用者 (user) | 上述 + 建立訂單、查看訂單、模擬付款、個人資料 |
| 管理員 (admin) | 上述 + 商品 CRUD、查看所有訂單 |

## 資料庫 Schema

資料庫使用 **SQLite**（better-sqlite3），檔案位於專案根目錄 `database.sqlite`。

**啟用設定**：
- WAL mode：`db.pragma('journal_mode = WAL')` — 提升並發讀取效能
- Foreign Keys：`db.pragma('foreign_keys = ON')` — 強制外鍵約束

### users

| 欄位 | 型別 | 約束 | 說明 |
|------|------|------|------|
| id | TEXT | PRIMARY KEY | UUID v4 |
| email | TEXT | UNIQUE NOT NULL | 使用者 Email |
| password_hash | TEXT | NOT NULL | bcrypt 雜湊值 |
| name | TEXT | NOT NULL | 使用者名稱 |
| role | TEXT | NOT NULL DEFAULT 'user', CHECK('user'\|'admin') | 角色 |
| created_at | TEXT | NOT NULL DEFAULT datetime('now') | 建立時間（ISO 8601） |

### products

| 欄位 | 型別 | 約束 | 說明 |
|------|------|------|------|
| id | TEXT | PRIMARY KEY | UUID v4 |
| name | TEXT | NOT NULL | 商品名稱 |
| description | TEXT | — | 商品描述（可為 null） |
| price | INTEGER | NOT NULL, CHECK(price > 0) | 價格（正整數） |
| stock | INTEGER | NOT NULL DEFAULT 0, CHECK(stock >= 0) | 庫存量（非負整數） |
| image_url | TEXT | — | 圖片網址（可為 null） |
| created_at | TEXT | NOT NULL DEFAULT datetime('now') | 建立時間 |
| updated_at | TEXT | NOT NULL DEFAULT datetime('now') | 更新時間 |

### cart_items

| 欄位 | 型別 | 約束 | 說明 |
|------|------|------|------|
| id | TEXT | PRIMARY KEY | UUID v4 |
| session_id | TEXT | — | 匿名使用者的 Session ID |
| user_id | TEXT | FK → users(id) | 已登入使用者的 ID |
| product_id | TEXT | NOT NULL, FK → products(id) | 商品 ID |
| quantity | INTEGER | NOT NULL DEFAULT 1, CHECK(quantity > 0) | 數量（正整數） |

> `session_id` 與 `user_id` 擇一填入，不會同時有值。

### orders

| 欄位 | 型別 | 約束 | 說明 |
|------|------|------|------|
| id | TEXT | PRIMARY KEY | UUID v4 |
| order_no | TEXT | UNIQUE NOT NULL | 訂單編號（格式：`ORD-YYYYMMDD-XXXXX`） |
| user_id | TEXT | NOT NULL, FK → users(id) | 下單使用者 |
| recipient_name | TEXT | NOT NULL | 收件人姓名 |
| recipient_email | TEXT | NOT NULL | 收件人 Email |
| recipient_address | TEXT | NOT NULL | 收件地址 |
| total_amount | INTEGER | NOT NULL | 訂單總金額 |
| status | TEXT | NOT NULL DEFAULT 'pending', CHECK('pending'\|'paid'\|'failed') | 訂單狀態 |
| payment_trade_no | TEXT | — | ECPay 交易編號（order_no 去除 `-`） |
| created_at | TEXT | NOT NULL DEFAULT datetime('now') | 建立時間 |

### order_items

| 欄位 | 型別 | 約束 | 說明 |
|------|------|------|------|
| id | TEXT | PRIMARY KEY | UUID v4 |
| order_id | TEXT | NOT NULL, FK → orders(id) | 所屬訂單 |
| product_id | TEXT | NOT NULL | 商品 ID（供參考） |
| product_name | TEXT | NOT NULL | 商品名稱快照（下單時凍結） |
| product_price | INTEGER | NOT NULL | 商品價格快照（下單時凍結） |
| quantity | INTEGER | NOT NULL | 購買數量 |

> `product_name` 與 `product_price` 為下單當下的快照，即使商品日後修改價格或名稱，訂單紀錄不受影響。

### 資料表關係

```
users ──┬── cart_items（user_id）
        └── orders（user_id）
                └── order_items（order_id）

products ──┬── cart_items（product_id）
           └── order_items（product_id）
```

## 種子資料

### 管理員帳號

- Email：`admin@hexschool.com`（可透過 `ADMIN_EMAIL` 環境變數覆蓋）
- 密碼：`12345678`（可透過 `ADMIN_PASSWORD` 環境變數覆蓋）
- bcrypt salt rounds：正式環境 10 / 測試環境 1

### 花卉商品（8 個）

| 名稱 | 價格 (NT$) | 庫存 |
|------|-----------|------|
| 粉色玫瑰花束 | 1,680 | 30 |
| 白色百合花禮盒 | 1,280 | 25 |
| 繽紛向日葵花束 | 980 | 40 |
| 紫色鬱金香盆栽 | 750 | 50 |
| 乾燥花藝術花圈 | 1,450 | 20 |
| 迷你多肉組合盆 | 580 | 60 |
| 經典紅玫瑰花束 | 3,980 | 15 |
| 季節鮮花訂閱（月配） | 890 | 100 |

## 前端架構

### 模板系統

使用 EJS 模板引擎，採兩層渲染機制：

1. 先渲染 `pages/*.ejs` 產出 `body` HTML
2. 再將 `body` 嵌入 `layouts/front.ejs` 或 `layouts/admin.ejs`

`pageRoutes.js` 中的 `renderFront()` 和 `renderAdmin()` 輔助函式封裝此流程。

### 前端 JavaScript 模組

- **`auth.js`**：管理 `localStorage` 中的 `flower_token`、`flower_user`、`flower_session_id`
- **`api.js`**：Fetch 封裝，自動附加 Bearer Token 或 X-Session-Id，收到 401 時自動跳轉登入頁
- **`notification.js`**：Toast 通知系統
- **`pages/*.js`**：各頁面獨立邏輯，由 EJS 模板的 `pageScript` 變數動態載入

### 主題色彩

- Primary (Rose)：`#C4727F`
- Accent (Apricot)：`#D4956A`
- Complementary (Sage)：`#7EA584`
- Background (Cream)：`#FBF8F4`
- Background (Blush)：`#FFF1EC`

## 全域錯誤處理

`errorHandler.js` 處理所有未捕獲的錯誤：

- **4xx 錯誤**：使用安全訊息映射表（SAFE_MESSAGES），若 `err.isOperational` 為 true 則使用原始訊息
- **5xx 錯誤**：一律回傳 `伺服器內部錯誤`，避免洩露內部細節
- 所有錯誤以 `console.error` 記錄

安全訊息映射：

| HTTP 狀態碼 | 安全訊息 |
|-------------|----------|
| 400 | 請求格式錯誤 |
| 401 | 未授權的請求 |
| 403 | 禁止存取 |
| 404 | 找不到該資源 |
| 409 | 資源衝突 |
| 422 | 無法處理的請求 |
| 429 | 請求過於頻繁 |
