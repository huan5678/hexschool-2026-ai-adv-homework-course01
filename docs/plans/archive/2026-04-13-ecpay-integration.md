# 2026-04-13 ECPay 金流整合

## User Story

作為使用者，我希望能透過綠界 ECPay 進行線上付款，以便完成訂單的實際付款流程。
由於本專案僅運行於本地端，無法接收綠界的 Server Notify（ReturnURL），因此付款結果改為由本地端主動呼叫綠界查詢 API 進行驗證。

## Spec

### 付款流程

```
1. 使用者在訂單詳情頁點擊「前往付款」
2. 前端呼叫 POST /api/orders/:id/ecpay-payment
3. 後端產生 ECPay 表單 HTML（含所有必要參數 + CheckMacValue）
4. 前端收到 HTML，建立隱藏表單並自動送出 → 使用者跳轉至 ECPay 付款頁面
5. 使用者在 ECPay 完成付款
6. ECPay 透過 OrderResultURL 將使用者導回 → POST /orders/:id/payment-result
7. 後端解析 ECPay POST 參數，重導至 GET /orders/:id?payment=ecpay
8. 前端偵測 payment=ecpay，自動呼叫 POST /api/orders/:id/check-payment
9. 後端呼叫 ECPay QueryTradeInfo API 查詢付款狀態，驗證 CheckMacValue，更新訂單狀態
10. 前端顯示付款結果
```

### 新增 API 端點

#### `POST /api/orders/:id/ecpay-payment`（需 JWT 認證）

**請求**：無 body
**回應**：
```json
{
  "data": { "html": "<form ...>...</form><script>...</script>" },
  "error": null,
  "message": "ECPay 付款表單已產生"
}
```
**邏輯**：
1. 驗證訂單屬於當前使用者且狀態為 `pending`
2. 產生 `payment_trade_no`（`order_no` 去掉 `-`，如 `ORD20260413A3B2C`，16 字元）
3. 將 `payment_trade_no` 存入 orders 表
4. 組裝 ECPay 所有必要參數
5. 計算 CheckMacValue
6. 回傳自動送出的 HTML 表單

#### `POST /api/orders/:id/check-payment`（需 JWT 認證）

**邏輯**：
1. 驗證訂單屬於當前使用者
2. 呼叫 ECPay QueryTradeInfo API
3. 根據 TradeStatus 更新訂單狀態：`'1'` → `paid`，`'10200095'` → `failed`
4. 回傳更新後的訂單資料

#### `POST /orders/:id/payment-result`（ECPay OrderResultURL，無需認證）

ECPay 付款完成後 POST 到此路徑，303 重導至 `GET /orders/:id?payment=ecpay`

### 資料庫變更

orders 表新增 `payment_trade_no TEXT` 欄位（migration-safe）。

### CheckMacValue 演算法

1. 參數按 key A→Z 排序（不區分大小寫）
2. 組成 `key=value&key=value` 格式
3. 前綴 `HashKey={HashKey}&`，後綴 `&HashIV={HashIV}`
4. URL encode（.NET 風格轉換）
5. 全部轉小寫
6. SHA256 雜湊後轉大寫

## Tasks

### 後端
- [x] 建立 `src/utils/ecpay.js`
- [x] 修改 `src/database.js`：migration-safe 新增 `payment_trade_no` 欄位
- [x] 修改 `src/routes/orderRoutes.js`：新增 ECPay 相關端點
- [x] 修改 `src/routes/pageRoutes.js`：新增 ECPay 導回路由

### 前端
- [x] 修改 `public/js/pages/order-detail.js`：ECPay 付款功能 + 自動查詢
- [x] 修改 `views/pages/order-detail.ejs`：ECPay 付款按鈕 + 查詢中狀態

### 文件
- [x] 更新 `docs/FEATURES.md`
- [x] 更新 `docs/CHANGELOG.md`
- [x] 更新 `docs/ARCHITECTURE.md`
- [x] 歸檔計畫至 `docs/plans/archive/`

## 完成標準

- [x] 所有既有測試通過（`npm test`）
- [x] ECPay 付款表單可成功產生並跳轉至 ECPay staging 頁面
- [x] 付款完成後可透過查詢 API 正確取得付款狀態並更新訂單
- [x] 模擬付款功能保留（作為測試用途）
- [x] 文件已更新
- [x] 計畫已歸檔至 `docs/plans/archive/`
