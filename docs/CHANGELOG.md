# Changelog

## v1.1.0 (2026-04-13)

### 新增功能

- **ECPay 金流整合**：串接綠界 ECPay 付款，支援信用卡、ATM、超商代碼等多種付款方式
  - `POST /api/orders/:id/ecpay-payment`：產生 ECPay 付款表單 HTML，自動跳轉至 ECPay
  - `POST /api/orders/:id/check-payment`：主動查詢 ECPay 付款狀態，更新訂單
  - `POST /api/orders/ecpay-notify`：ECPay Server Notify 接收端點
  - `POST /orders/:id/payment-result`：ECPay 付款完成後導回頁面路由
- **資料庫遷移**：orders 表新增 `payment_trade_no` 欄位，儲存 ECPay 交易編號
- **前端更新**：訂單詳情頁新增「前往付款（ECPay 綠界）」按鈕與付款狀態查詢功能
- 保留原有模擬付款功能作為測試用途

### 技術細節

- 本地端無法接收 ECPay Server Notify，改為主動呼叫 QueryTradeInfo API 查詢付款結果
- CheckMacValue 使用 SHA256 + .NET 風格 URL 編碼
- 新增 `src/utils/ecpay.js` 工具模組

## v1.0.0 (2026-04-13)

### 新增功能

- **認證系統**：使用者註冊、登入、JWT Token 認證、個人資料查詢
- **商品管理**：商品列表（分頁）、商品詳情
- **購物車**：雙模式認證（JWT / Session ID）、新增 / 修改數量 / 刪除商品
- **訂單系統**：從購物車建立訂單（原子交易）、訂單列表、訂單詳情、模擬付款
- **後台管理 - 商品**：CRUD 操作、刪除保護（pending 訂單時禁止刪除）
- **後台管理 - 訂單**：訂單列表（支援狀態篩選）、訂單詳情（含使用者資訊）
- **前端頁面**：首頁、商品詳情、購物車、結帳、登入、訂單列表、訂單詳情、後台商品管理、後台訂單管理
- **資料庫**：SQLite with WAL mode、5 張資料表、種子資料（管理員 + 8 個花卉商品）
- **測試**：6 個測試檔案、涵蓋所有 API 端點
- **API 文件**：OpenAPI 3.0.3 規格，swagger-jsdoc 註解
