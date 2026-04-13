# CLAUDE.md

## 專案概述

花卉電商 (Flower Shop E-Commerce) — Express.js + SQLite + EJS + Tailwind CSS 全端電商平台

## 常用指令

```bash
npm start              # 編譯 CSS 並啟動伺服器（http://localhost:3001）
npm run dev:server     # 僅啟動伺服器（開發用）
npm run dev:css        # Tailwind CSS watch 模式
npm run css:build      # 編譯並壓縮 CSS
npm run openapi        # 產生 OpenAPI 規格檔
npm test               # 執行所有測試（Vitest，依序執行）
```

## 關鍵規則

- 所有 API 回應使用統一格式：`{ data, error, message }`，錯誤碼使用大寫底線分隔（如 `VALIDATION_ERROR`），訊息為繁體中文
- 購物車使用**雙模式認證**（JWT 或 X-Session-Id），當 Authorization header 存在但無效時不 fallback 到 session，直接回 401
- 訂單建立在 SQLite transaction 中完成（建立訂單 → 快照商品 → 扣庫存 → 清購物車），確保原子性
- 請求 Body 欄位使用 camelCase（如 `productId`），回應欄位使用 snake_case（映射 DB 欄位，如 `product_id`）
- 功能開發使用 `docs/plans/` 記錄計畫；完成後移至 `docs/plans/archive/`，並更新 FEATURES.md 與 CHANGELOG.md

## 詳細文件

- @docs/README.md — 項目介紹與快速開始
- @docs/ARCHITECTURE.md — 架構、目錄結構、資料流
- @docs/DEVELOPMENT.md — 開發規範、命名規則
- @docs/FEATURES.md — 功能列表與完成狀態
- @docs/TESTING.md — 測試規範與指南
- @docs/CHANGELOG.md — 更新日誌
