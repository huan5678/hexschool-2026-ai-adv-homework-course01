# 測試規範

## 測試框架與工具

| 工具 | 用途 |
|------|------|
| Vitest 2.x | 測試框架（globals 模式，免 import describe/it/expect） |
| supertest 7.x | HTTP 端點測試（對 Express app 發送請求） |

## 測試檔案總覽

| # | 檔案 | 測試數 | 涵蓋範圍 |
|---|------|--------|----------|
| 1 | `tests/auth.test.js` | 6 | 註冊、登入、個人資料（含驗證錯誤、重複 Email） |
| 2 | `tests/products.test.js` | 4 | 商品列表、分頁、詳情、404 |
| 3 | `tests/cart.test.js` | 6 | 訪客模式（新增/查看/修改/刪除）、登入模式、不存在商品 |
| 4 | `tests/orders.test.js` | 6 | 建立訂單、空購物車、無認證、訂單列表、詳情、404 |
| 5 | `tests/adminProducts.test.js` | 6 | 列表、新增、更新、刪除、非 admin 被拒、無 token 被拒 |
| 6 | `tests/adminOrders.test.js` | 4 | 列表、狀態篩選、詳情（含 user 資訊）、非 admin 被拒 |

## 執行順序與依賴關係

測試**必須按順序執行**，因為共用同一個 SQLite 資料庫實例且有資料依賴。

```
vitest.config.js 設定：
  fileParallelism: false     # 檔案間不可並行
  sequence.files: [明確排序]  # 指定執行順序
  hookTimeout: 10000         # beforeAll/afterAll 逾時 10 秒
```

依賴鏈：

```
auth.test.js
  └─ 建立種子管理員、測試使用者 → 後續測試使用

products.test.js
  └─ 使用種子商品資料 → cart/orders 測試需要 productId

cart.test.js
  └─ 使用 products 的商品 → orders 測試需要購物車功能

orders.test.js
  └─ 使用 auth 使用者 + products 商品 + cart 功能 → adminOrders 需要訂單

adminProducts.test.js
  └─ 使用 admin token → 獨立 CRUD（新增後刪除自己建立的商品）

adminOrders.test.js
  └─ 使用 admin token + 在 beforeAll 中建立完整訂單流程
```

## 輔助函式 (`tests/setup.js`)

### `getAdminToken()`

登入種子管理員帳號（`admin@hexschool.com` / `12345678`），回傳 JWT token 字串。

```javascript
const adminToken = await getAdminToken();
// 使用方式
request(app)
  .get('/api/admin/products')
  .set('Authorization', `Bearer ${adminToken}`)
```

### `registerUser(overrides = {})`

註冊新使用者並回傳 `{ token, user }`。

```javascript
// 使用預設值
const { token, user } = await registerUser();
// 自訂欄位
const { token } = await registerUser({ name: '自訂名稱' });
```

**預設值**：
- `email`: `test-{Date.now()}-{random}@example.com`（每次不同）
- `password`: `password123`
- `name`: `測試使用者`

### 匯出物件

```javascript
module.exports = { app, request, getAdminToken, registerUser };
```

- `app`：Express 應用程式實例（從 `../app` 引入）
- `request`：supertest 的 `request` 函式

## 撰寫新測試的步驟

### 1. 建立測試檔案

```javascript
// tests/newFeature.test.js
const { app, request, getAdminToken, registerUser } = require('./setup');

describe('新功能', () => {
  let userToken;

  beforeAll(async () => {
    // 取得測試用 token
    const { token } = await registerUser();
    userToken = token;
  });

  it('should do something', async () => {
    const res = await request(app)
      .get('/api/new-endpoint')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.error).toBeNull();
    expect(res.body.data).toBeDefined();
  });
});
```

### 2. 更新 vitest.config.js

將新檔案加入 `sequence.files` 陣列的適當位置：

```javascript
sequence: {
  files: [
    'tests/auth.test.js',
    'tests/products.test.js',
    'tests/cart.test.js',
    'tests/orders.test.js',
    'tests/adminProducts.test.js',
    'tests/adminOrders.test.js',
    'tests/newFeature.test.js',  // 新增
  ],
},
```

### 3. 執行測試

```bash
npm test
```

## 常見測試模式

### 測試認證保護

```javascript
it('should deny access without token', async () => {
  const res = await request(app).get('/api/protected-endpoint');
  expect(res.status).toBe(401);
  expect(res.body.error).toBe('UNAUTHORIZED');
});
```

### 測試 Admin 權限

```javascript
it('should deny access to regular user', async () => {
  const { token } = await registerUser();
  const res = await request(app)
    .get('/api/admin/endpoint')
    .set('Authorization', `Bearer ${token}`);
  expect(res.status).toBe(403);
  expect(res.body.error).toBe('FORBIDDEN');
});
```

### 測試購物車（訪客模式）

```javascript
const sessionId = `test-session-${Date.now()}`;
const res = await request(app)
  .post('/api/cart')
  .set('X-Session-Id', sessionId)
  .send({ productId, quantity: 1 });
```

### 測試驗證錯誤

```javascript
it('should fail with invalid data', async () => {
  const res = await request(app)
    .post('/api/endpoint')
    .send({ /* 缺少必填欄位 */ });
  expect(res.status).toBe(400);
  expect(res.body.error).toBe('VALIDATION_ERROR');
});
```

## 常見陷阱

### 1. 不可開啟並行測試

`fileParallelism` 必須為 `false`。測試共用同一個 SQLite 資料庫，並行執行會導致資料競爭和不可預期的失敗。

### 2. 測試順序很重要

某些測試依賴前面測試建立的資料（例如 orders 測試需要 cart 中有商品）。新增測試檔案時，考慮它在 `sequence.files` 中的位置。

### 3. 共用狀態副作用

某些測試會改變資料庫狀態：
- `orders.test.js` 的建立訂單測試會**清空使用者購物車**並**扣減庫存**
- `adminProducts.test.js` 的刪除測試會永久移除商品
- 後續測試不應依賴被前面測試修改過的資料

### 4. 動態 Email 生成

`registerUser()` 使用 `Date.now()` + 隨機字串生成 Email，確保每次測試執行不會有 Email 衝突。不要在測試中使用固定 Email（除了 admin 帳號）。

### 5. Token 過期不影響測試

JWT 有效期為 7 天，遠超測試執行時間，不會在測試中遇到 token 過期問題。

### 6. 資料庫在測試間不會重置

測試開始時，`require('../app')` 會觸發 `database.js` 的初始化，但使用 `IF NOT EXISTS` 和 `COUNT(*)` 檢查，不會重複建立資料。測試結束後資料庫保留所有變更。
