# 功能清單

## 完成狀態總覽

| 功能模組 | 狀態 |
|----------|------|
| 認證系統 | ✅ 完成 |
| 商品瀏覽 | ✅ 完成 |
| 購物車 | ✅ 完成 |
| 訂單系統 | ✅ 完成 |
| 後台商品管理 | ✅ 完成 |
| 後台訂單管理 | ✅ 完成 |
| 前端頁面 | ✅ 完成 |
| ECPay 金流整合 | ✅ 完成（本地端主動查詢模式） |

---

## 認證系統

### 註冊 `POST /api/auth/register`

**行為描述**：建立新使用者帳號，自動指派 `user` 角色，成功後回傳使用者資訊與 JWT Token。

**請求 Body**：

| 欄位 | 型別 | 必填 | 驗證規則 |
|------|------|------|----------|
| email | string | 是 | 必須符合 `/^[^\s@]+@[^\s@]+\.[^\s@]+$/` |
| password | string | 是 | 最少 6 個字元 |
| name | string | 是 | 不可為空 |

**業務邏輯**：
- Email 唯一性檢查（資料庫 UNIQUE 約束 + 程式碼層檢查）
- 密碼以 bcrypt 雜湊儲存（正式環境 10 rounds，測試環境 1 round）
- 註冊成功立即產生 JWT Token（7 天有效期）
- 新帳號角色固定為 `user`，無法透過 API 建立 admin

**錯誤情境**：

| 狀態碼 | 錯誤碼 | 情境 |
|--------|--------|------|
| 400 | VALIDATION_ERROR | 缺少 email / password / name |
| 400 | VALIDATION_ERROR | Email 格式不正確 |
| 400 | VALIDATION_ERROR | 密碼少於 6 個字元 |
| 409 | CONFLICT | Email 已被註冊 |

### 登入 `POST /api/auth/login`

**行為描述**：驗證使用者身份，回傳 JWT Token。

**請求 Body**：

| 欄位 | 型別 | 必填 |
|------|------|------|
| email | string | 是 |
| password | string | 是 |

**業務邏輯**：
- 以 Email 查詢使用者，不存在則回傳 401（不區分「帳號不存在」與「密碼錯誤」，統一回傳「Email 或密碼錯誤」以防止帳號列舉攻擊）
- bcrypt.compareSync 比對密碼
- 成功回傳使用者資訊（id, email, name, role）與 JWT Token

**錯誤情境**：

| 狀態碼 | 錯誤碼 | 情境 |
|--------|--------|------|
| 400 | VALIDATION_ERROR | 缺少 email 或 password |
| 401 | UNAUTHORIZED | Email 不存在或密碼錯誤 |

### 個人資料 `GET /api/auth/profile`

**行為描述**：回傳當前登入使用者的個人資料。

**認證**：Bearer JWT

**回應欄位**：id, email, name, role, created_at

**錯誤情境**：

| 狀態碼 | 錯誤碼 | 情境 |
|--------|--------|------|
| 401 | UNAUTHORIZED | 未提供 Token 或 Token 無效 |
| 404 | NOT_FOUND | 使用者不存在（Token 有效但使用者已被刪除） |

---

## 商品瀏覽

### 商品列表 `GET /api/products`

**行為描述**：回傳分頁的商品列表，按建立時間倒序排列。

**查詢參數**：

| 參數 | 型別 | 預設值 | 範圍 |
|------|------|--------|------|
| page | integer | 1 | 最小 1 |
| limit | integer | 10 | 最小 1，最大 100 |

**回應結構**：
- `data.products`：商品陣列（id, name, description, price, stock, image_url, created_at, updated_at）
- `data.pagination`：分頁資訊（total, page, limit, totalPages）

**排序**：`ORDER BY created_at DESC`

### 商品詳情 `GET /api/products/:id`

**行為描述**：回傳單一商品的完整資訊。

**錯誤情境**：

| 狀態碼 | 錯誤碼 | 情境 |
|--------|--------|------|
| 404 | NOT_FOUND | 商品不存在 |

---

## 購物車

### 雙模式認證機制

購物車所有端點使用 `dualAuth` middleware，支援兩種身份識別方式：

1. **JWT 模式**（已登入使用者）：以 `user_id` 識別購物車擁有者
2. **Session 模式**（匿名使用者）：以 `X-Session-Id` header 識別

**認證優先順序**：
- 優先檢查 Authorization header
- 有 Authorization header 但 token 無效 → 直接回 401（**不 fallback 到 session**）
- 無 Authorization header → 檢查 X-Session-Id
- 兩者皆無 → 401

**重要限制**：匿名使用者（session 模式）的購物車不會在登入後自動合併到使用者購物車。

### 查看購物車 `GET /api/cart`

**行為描述**：回傳當前使用者的購物車內容，包含每個商品的詳細資訊與總金額。

**回應結構**：
- `data.items[]`：購物車項目陣列
  - `id`：購物車項目 ID
  - `product_id`：商品 ID
  - `quantity`：數量
  - `product`：巢狀商品物件 `{ name, price, stock, image_url }`
- `data.total`：總金額 = Σ(product.price × quantity)

### 加入購物車 `POST /api/cart`

**行為描述**：將商品加入購物車。若商品已在購物車中，累加數量而非建立新項目。

**請求 Body**：

| 欄位 | 型別 | 必填 | 預設值 |
|------|------|------|--------|
| productId | string | 是 | — |
| quantity | integer | 否 | 1 |

**業務邏輯**：
1. 驗證 `productId` 不為空
2. 驗證 `quantity` 為正整數（`Number.isInteger(qty) && qty >= 1`）
3. 檢查商品存在
4. 查詢是否已在購物車中
   - **已存在**：計算 `新數量 = 現有數量 + 請求數量`，檢查庫存後更新
   - **不存在**：檢查庫存後新增項目
5. 庫存檢查：請求數量不可超過商品 stock

**錯誤情境**：

| 狀態碼 | 錯誤碼 | 情境 |
|--------|--------|------|
| 400 | VALIDATION_ERROR | 缺少 productId |
| 400 | VALIDATION_ERROR | quantity 非正整數 |
| 400 | STOCK_INSUFFICIENT | 庫存不足（含累加後超過庫存的情況） |
| 401 | UNAUTHORIZED | 未提供認證 |
| 404 | NOT_FOUND | 商品不存在 |

### 修改數量 `PATCH /api/cart/:itemId`

**行為描述**：直接設定購物車項目的數量（非累加）。

**請求 Body**：

| 欄位 | 型別 | 必填 |
|------|------|------|
| quantity | integer | 是 |

**業務邏輯**：
- 驗證 quantity 為正整數
- 確認購物車項目存在且屬於當前使用者/session
- 檢查新數量不超過商品庫存

**錯誤情境**：

| 狀態碼 | 錯誤碼 | 情境 |
|--------|--------|------|
| 400 | VALIDATION_ERROR | quantity 非正整數 |
| 400 | STOCK_INSUFFICIENT | 庫存不足 |
| 404 | NOT_FOUND | 購物車項目不存在 |

### 移除商品 `DELETE /api/cart/:itemId`

**行為描述**：從購物車中移除指定項目（硬刪除）。

**錯誤情境**：

| 狀態碼 | 錯誤碼 | 情境 |
|--------|--------|------|
| 404 | NOT_FOUND | 購物車項目不存在 |

---

## 訂單系統

### 建立訂單 `POST /api/orders`

**行為描述**：將使用者購物車的所有商品轉為訂單。整個流程在一個 SQLite transaction 中完成，確保原子性。

**認證**：僅支援 Bearer JWT（不支援 Session 模式，訂單必須綁定使用者）

**請求 Body**：

| 欄位 | 型別 | 必填 | 驗證規則 |
|------|------|------|----------|
| recipientName | string | 是 | 不可為空 |
| recipientEmail | string | 是 | 符合 Email 格式 `/^[^\s@]+@[^\s@]+\.[^\s@]+$/` |
| recipientAddress | string | 是 | 不可為空 |

**業務邏輯（原子交易）**：
1. 驗證收件人資訊完整性與 Email 格式
2. 查詢使用者購物車（以 `user_id` 條件，JOIN products 取得商品資訊）
3. 檢查購物車不為空
4. 檢查所有商品庫存充足（列出庫存不足的商品名稱）
5. 計算訂單總金額 = Σ(product_price × quantity)
6. **Transaction 開始**：
   - 建立 orders 記錄（狀態為 `pending`）
   - 建立 order_items 記錄（快照商品名稱與價格）
   - 扣減各商品 stock（`stock = stock - quantity`）
   - 清空使用者購物車（`DELETE FROM cart_items WHERE user_id = ?`）
7. **Transaction 結束**
8. 回傳訂單資訊與項目列表

**訂單編號生成規則**：
```
ORD-{YYYYMMDD}-{5碼隨機大寫}
範例：ORD-20260413-A3B2C
```
- 日期來自 `new Date().toISOString().slice(0, 10)`
- 隨機碼來自 `uuidv4().slice(0, 5).toUpperCase()`

**錯誤情境**：

| 狀態碼 | 錯誤碼 | 情境 |
|--------|--------|------|
| 400 | VALIDATION_ERROR | 缺少收件人資訊 |
| 400 | VALIDATION_ERROR | Email 格式不正確 |
| 400 | CART_EMPTY | 購物車為空 |
| 400 | STOCK_INSUFFICIENT | 庫存不足（訊息含商品名稱列表） |
| 401 | UNAUTHORIZED | 未登入 |

### 訂單列表 `GET /api/orders`

**行為描述**：回傳當前使用者的所有訂單，按建立時間倒序排列。

**回應欄位**：id, order_no, total_amount, status, created_at

### 訂單詳情 `GET /api/orders/:id`

**行為描述**：回傳單一訂單的完整資訊，包含訂單項目。僅能查看自己的訂單。

**回應包含**：
- 訂單基本資訊（id, order_no, recipient_*, total_amount, status, created_at）
- `items[]`：訂單項目（id, order_id, product_id, product_name, product_price, quantity）

**錯誤情境**：

| 狀態碼 | 錯誤碼 | 情境 |
|--------|--------|------|
| 404 | NOT_FOUND | 訂單不存在或不屬於當前使用者 |

### 模擬付款 `PATCH /api/orders/:id/pay`

**行為描述**：模擬付款流程，更新訂單狀態。僅能對自己的 `pending` 訂單操作。

**請求 Body**：

| 欄位 | 型別 | 必填 | 可選值 |
|------|------|------|--------|
| action | string | 是 | `success` \| `fail` |

**狀態轉換**：
```
pending ──(action: success)──→ paid
pending ──(action: fail)────→ failed
```

**注意**：付款失敗不會自動歸還庫存。

**錯誤情境**：

| 狀態碼 | 錯誤碼 | 情境 |
|--------|--------|------|
| 400 | VALIDATION_ERROR | action 非 success / fail |
| 400 | INVALID_STATUS | 訂單狀態不是 pending |
| 404 | NOT_FOUND | 訂單不存在 |

---

## 後台商品管理

所有端點需要 **Bearer JWT + admin 角色**。

### 商品列表 `GET /api/admin/products`

**行為描述**：與公開商品列表相同的分頁邏輯，但需要管理員權限。

**查詢參數**：page（預設 1）、limit（預設 10，最大 100）

### 新增商品 `POST /api/admin/products`

**請求 Body**：

| 欄位 | 型別 | 必填 | 驗證規則 |
|------|------|------|----------|
| name | string | 是 | 不可為空 |
| price | integer | 是 | 正整數（> 0） |
| stock | integer | 是 | 非負整數（>= 0） |
| description | string | 否 | — |
| image_url | string | 否 | — |

**驗證細節**：
- `price`：`Number.isInteger(price) && price > 0`
- `stock`：`Number.isInteger(stock) && stock >= 0`
- `description` 和 `image_url` 為 null 若未提供

### 編輯商品 `PUT /api/admin/products/:id`

**行為描述**：部分更新商品資訊。未提供的欄位保持原值。

**請求 Body**：所有欄位皆為選填

**驗證規則**：
- `name`：若提供，不可為空字串（trim 後檢查）
- `price`：若提供，必須為正整數
- `stock`：若提供，必須為非負整數
- 更新後自動設定 `updated_at = datetime('now')`

### 刪除商品 `DELETE /api/admin/products/:id`

**行為描述**：永久刪除商品（硬刪除）。

**刪除保護**：若商品存在於任何 `pending` 狀態的訂單中，拒絕刪除並回傳 409。

檢查邏輯：
```sql
SELECT COUNT(*) FROM order_items oi
JOIN orders o ON oi.order_id = o.id
WHERE oi.product_id = ? AND o.status = 'pending'
```

**錯誤情境**：

| 狀態碼 | 錯誤碼 | 情境 |
|--------|--------|------|
| 404 | NOT_FOUND | 商品不存在 |
| 409 | CONFLICT | 商品存在未完成訂單，無法刪除 |

---

## 後台訂單管理

所有端點需要 **Bearer JWT + admin 角色**。

### 訂單列表 `GET /api/admin/orders`

**行為描述**：回傳所有訂單，支援按狀態篩選，按建立時間倒序排列。

**查詢參數**：

| 參數 | 型別 | 必填 | 說明 |
|------|------|------|------|
| page | integer | 否 | 預設 1 |
| limit | integer | 否 | 預設 10，最大 100 |
| status | string | 否 | 可選值：`pending` \| `paid` \| `failed` |

**篩選行為**：
- 提供 `status` 且值為合法狀態時，僅回傳該狀態的訂單
- 不提供 `status` 或值不合法時，回傳所有訂單（不報錯）

### 訂單詳情 `GET /api/admin/orders/:id`

**行為描述**：回傳訂單完整資訊，包含訂單項目與下單使用者資訊。

**回應包含**：
- 訂單完整欄位
- `items[]`：訂單項目
- `user`：`{ name, email }`（使用者已刪除時為 null）

---

## ECPay 金流整合

由於本專案僅運行於本地端，無法接收綠界的 Server Notify（ReturnURL），因此付款結果改為由本地端主動呼叫綠界查詢 API 進行驗證。

### 產生付款表單 `POST /api/orders/:id/ecpay-payment`

**行為描述**：產生 ECPay 付款表單 HTML，前端收到後自動送出跳轉至 ECPay 付款頁面。

**認證**：Bearer JWT

**業務邏輯**：
1. 驗證訂單屬於當前使用者且狀態為 `pending`
2. 產生 `payment_trade_no`（`order_no` 去掉 `-`，如 `ORD20260413A3B2C`）
3. 組裝 ECPay 參數（MerchantID, MerchantTradeNo, TotalAmount, ItemName 等）
4. 計算 CheckMacValue（SHA256）
5. 回傳含自動送出 script 的 HTML 表單

**錯誤情境**：

| 狀態碼 | 錯誤碼 | 情境 |
|--------|--------|------|
| 400 | INVALID_STATUS | 訂單狀態不是 pending |
| 404 | NOT_FOUND | 訂單不存在 |

### 查詢付款狀態 `POST /api/orders/:id/check-payment`

**行為描述**：主動呼叫 ECPay QueryTradeInfo API 查詢付款結果，並更新訂單狀態。

**認證**：Bearer JWT

**業務邏輯**：
1. 取得訂單的 `payment_trade_no`
2. 呼叫 ECPay QueryTradeInfo API
3. 根據 `TradeStatus` 更新訂單：`'1'` → paid，`'10200095'` → failed，`'0'` → 維持 pending
4. 回傳更新後的訂單資料

**錯誤情境**：

| 狀態碼 | 錯誤碼 | 情境 |
|--------|--------|------|
| 400 | VALIDATION_ERROR | 訂單尚未建立 ECPay 付款 |
| 404 | NOT_FOUND | 訂單不存在 |

### ECPay Server Notify `POST /api/orders/ecpay-notify`

**行為描述**：接收 ECPay 伺服器端回傳通知（ReturnURL）。本地端通常無法到達，但為完整性保留。驗證 CheckMacValue 後更新訂單狀態，回傳 `1|OK`。

### ECPay 付款流程

```
使用者點擊「前往付款」
  → POST /api/orders/:id/ecpay-payment → 產生表單 HTML
  → 前端自動送出表單 → 跳轉至 ECPay 付款頁面
  → 使用者完成付款
  → ECPay POST 回 /orders/:id/payment-result → 303 重導至訂單詳情頁
  → 前端偵測 ?payment=ecpay → 自動呼叫 POST /api/orders/:id/check-payment
  → 查詢 ECPay API → 更新訂單狀態 → 顯示結果
```

---

## 錯誤碼總覽

| 錯誤碼 | HTTP 狀態碼 | 說明 |
|--------|-------------|------|
| VALIDATION_ERROR | 400 | 請求參數驗證失敗（缺少欄位、格式錯誤、非法值） |
| CART_EMPTY | 400 | 購物車為空，無法建立訂單 |
| STOCK_INSUFFICIENT | 400 | 商品庫存不足 |
| INVALID_STATUS | 400 | 訂單狀態不允許當前操作 |
| UNAUTHORIZED | 401 | 未提供 Token、Token 無效或已過期 |
| FORBIDDEN | 403 | 權限不足（非管理員存取管理端點） |
| NOT_FOUND | 404 | 資源不存在（商品、訂單、使用者、購物車項目） |
| CONFLICT | 409 | 資源衝突（Email 重複、商品有 pending 訂單無法刪除） |
| INTERNAL_ERROR | 500 | 伺服器未處理的內部錯誤 |
