# 開發規範

## 命名規則

| 類別 | 規則 | 範例 |
|------|------|------|
| 路由檔案 | camelCase + Routes 後綴 | `authRoutes.js`, `cartRoutes.js` |
| Middleware 檔案 | camelCase + Middleware 後綴 | `authMiddleware.js`, `sessionMiddleware.js` |
| 測試檔案 | camelCase + .test.js 後綴 | `auth.test.js`, `adminProducts.test.js` |
| 前端 JS 檔案 | kebab-case | `product-detail.js`, `admin-orders.js` |
| EJS 模板 | kebab-case | `product-detail.ejs`, `order-detail.ejs` |
| 資料庫表名 | snake_case（複數） | `users`, `cart_items`, `order_items` |
| 資料庫欄位 | snake_case | `user_id`, `created_at`, `password_hash` |
| JavaScript 變數 | camelCase | `cartItems`, `totalAmount`, `orderNo` |
| JavaScript 函式 | camelCase | `getOwnerCondition`, `generateOrderNo` |
| API 路徑 | kebab-case（目前無連字號路徑） | `/api/auth/register`, `/api/admin/products` |
| 請求 Body 欄位 | camelCase | `productId`, `recipientName`, `recipientEmail` |
| 回應 Body 欄位 | snake_case（與 DB 一致） | `user_id`, `order_no`, `total_amount` |

**注意**：請求 Body 使用 camelCase，但回應 Body 直接映射資料庫欄位使用 snake_case。這是專案的既有慣例，新增 API 時應遵循。

## 模組系統

專案使用 **CommonJS**（`require` / `module.exports`），唯一例外是 `vitest.config.js` 使用 ESM（`import` / `export`）。

```javascript
// 引入
const express = require('express');
const db = require('../database');

// 匯出
module.exports = router;
module.exports = authMiddleware;
```

## 新增 API 路由步驟

1. **建立路由檔案**：在 `src/routes/` 新增 `<name>Routes.js`

```javascript
const express = require('express');
const db = require('../database');
// 按需引入 middleware
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// 若整個路由都需要認證
// router.use(authMiddleware);

router.get('/', (req, res) => {
  // 統一回應格式
  res.json({
    data: { /* payload */ },
    error: null,
    message: '成功'
  });
});

module.exports = router;
```

2. **掛載路由**：在 `app.js` 中新增

```javascript
app.use('/api/<prefix>', require('./src/routes/<name>Routes'));
```

3. **新增 OpenAPI 註解**：在路由處理函式前加上 `@openapi` JSDoc 註解（參考 `authRoutes.js` 的格式）

4. **撰寫測試**：在 `tests/` 新增測試檔案，並更新 `vitest.config.js` 的 `sequence.files` 陣列

5. **更新文件**：更新 `docs/FEATURES.md` 和 `docs/ARCHITECTURE.md`

## 新增 Middleware 步驟

1. 在 `src/middleware/` 建立新檔案

```javascript
function myMiddleware(req, res, next) {
  // 邏輯
  next();
}

module.exports = myMiddleware;
```

2. **全域 middleware**：在 `app.js` 的 `app.use()` 區塊中掛載（注意順序）
3. **路由級 middleware**：在路由檔案中使用 `router.use()` 或個別路由掛載

**Middleware 掛載順序**（`app.js` 中的現有順序）：
1. CORS
2. express.json()
3. express.urlencoded()
4. sessionMiddleware

## 新增資料庫表步驟

1. 在 `src/database.js` 的 `initializeDatabase()` 函式中新增 `CREATE TABLE IF NOT EXISTS` 語句

```sql
CREATE TABLE IF NOT EXISTS new_table (
  id TEXT PRIMARY KEY,
  -- 使用 UUID v4 作為主鍵
  -- 遵循 snake_case 命名
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

2. 需要種子資料時，新增對應的 seed 函式並在 `initializeDatabase()` 中呼叫

3. ID 生成統一使用 `uuid.v4()`：
```javascript
const { v4: uuidv4 } = require('uuid');
const id = uuidv4();
```

**重要**：
- 所有 ID 欄位使用 TEXT 型別儲存 UUID
- 價格、金額等數值欄位使用 INTEGER（非浮點數）
- 時間欄位使用 TEXT 儲存 ISO 8601 格式（`datetime('now')`）
- 啟用外鍵約束（`FOREIGN KEY ... REFERENCES`）

## 錯誤處理規範

所有錯誤回應必須遵循統一格式：

```javascript
res.status(400).json({
  data: null,
  error: 'VALIDATION_ERROR',  // 大寫底線分隔的錯誤碼
  message: '中文錯誤訊息'       // 面向使用者的訊息
});
```

常用錯誤碼參考 `docs/FEATURES.md` 的錯誤碼總覽。

**安全原則**：
- 4xx 錯誤可回傳具體描述
- 5xx 錯誤一律回傳通用訊息（`伺服器內部錯誤`）
- 登入失敗不區分「帳號不存在」與「密碼錯誤」

## 環境變數

| 變數 | 用途 | 必要 | 預設值 |
|------|------|------|--------|
| `JWT_SECRET` | JWT 簽名密鑰 | **是**（啟動必須） | 無 |
| `PORT` | HTTP 伺服器埠號 | 否 | `3001` |
| `FRONTEND_URL` | CORS 允許的前端來源 | 否 | `http://localhost:3001` |
| `BASE_URL` | 伺服器 URL | 否 | `http://localhost:3001` |
| `ADMIN_EMAIL` | 種子管理員帳號 | 否 | `admin@hexschool.com` |
| `ADMIN_PASSWORD` | 種子管理員密碼 | 否 | `12345678` |
| `NODE_ENV` | 執行環境（影響 bcrypt salt rounds） | 否 | 無（非 `test` 時使用 10 rounds） |
| `ECPAY_MERCHANT_ID` | ECPay 特店代號 | 否 | `3002607` |
| `ECPAY_HASH_KEY` | ECPay Hash Key | 否 | — |
| `ECPAY_HASH_IV` | ECPay Hash IV | 否 | — |
| `ECPAY_ENV` | ECPay 環境（staging/production） | 否 | `staging` |

## 計畫歸檔流程

1. 計畫檔案命名格式：`YYYY-MM-DD-<feature-name>.md`
2. 計畫文件結構：User Story → Spec → Tasks
3. 功能完成後：移至 `docs/plans/archive/`
4. 更新 `docs/FEATURES.md` 和 `docs/CHANGELOG.md`

### 計畫檔案範本

```markdown
# YYYY-MM-DD 功能名稱

## User Story

作為 <角色>，我希望 <功能>，以便 <目的>。

## Spec

### API 端點
- 方法、路徑、認證需求
- 請求 / 回應格式

### 資料庫變更
- 新增 / 修改的表或欄位

### 業務邏輯
- 核心流程描述

## Tasks

- [ ] 任務 1
- [ ] 任務 2
- [ ] 撰寫測試
- [ ] 更新文件

## 完成標準

- [ ] 所有測試通過
- [ ] 文件已更新
```

### 檔案位置

```
docs/plans/
├── YYYY-MM-DD-feature-a.md      # 進行中的計畫
├── YYYY-MM-DD-feature-b.md
└── archive/                      # 已完成的計畫
    └── YYYY-MM-DD-old-feature.md
```

## OpenAPI 文件

路由檔案中使用 JSDoc `@openapi` 註解定義 API 規格。執行 `npm run openapi` 可產生 OpenAPI 3.0.3 JSON 檔。

```javascript
/**
 * @openapi
 * /api/example:
 *   get:
 *     summary: 範例端點
 *     tags: [Example]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *     responses:
 *       200:
 *         description: 成功
 */
```
