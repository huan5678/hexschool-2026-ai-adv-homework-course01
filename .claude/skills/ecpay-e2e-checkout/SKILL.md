---
name: ecpay-e2e-checkout
description: >-
  Run an end-to-end purchase + checkout flow against the local 花卉電商
  (Flower Shop) app using the Playwright MCP browser tools — log in, add a
  product to the cart, create an order, pay through ECPay 綠界 staging, and
  verify the order becomes 已付款. Use this whenever the user asks to E2E test
  the shop, "走一次購買流程", verify checkout, test the ECPay / 綠界 payment
  flow, or pay with 網路銀行 / 網路ATM / WebATM / a specific bank such as
  台灣土地銀行. Also use it when validating that orders, the cart, or the
  payment-status query still work after a change.
---

# 花卉電商 ECPay E2E 結帳流程

This skill drives the full buy-and-pay journey through a real browser using the
Playwright MCP tools (`mcp__playwright__browser_*`). It encodes the exact
selectors, the ECPay staging navigation, and one environment requirement that
silently breaks payment verification if missed.

The goal is a passing run: an order that ends in **已付款 (paid)** state on the
order-detail page.

## Why this skill exists (the one thing that will bite you)

The ECPay payment itself happens in the **browser** — selecting a bank and
"paying" works fine. But verifying the result calls
`POST /api/orders/:id/check-payment`, and the **backend** (the dev server) must
make an outbound call to `payment-stage.ecpay.com.tw` to run `QueryTradeInfo`.

If the server process has no network egress to that host, the endpoint returns
**500** with `ECPay query error: fetch failed` in the server log, and the order
is stuck at 待付款 even though payment succeeded. This is the most common reason
an otherwise-correct run "fails" at the last step.

**Requirement:** the dev server must be able to reach `payment-stage.ecpay.com.tw`
and `pay-stage.ecpay.com.tw`. If commands run under a network sandbox that
blocks those hosts, ask the user to allowlist them (the `/sandbox` command
manages these restrictions) before relying on payment verification. Decisions
about loosening the sandbox belong to the user — surface the need and let them
choose; don't disable sandboxing on your own initiative.

## Preconditions

- Default admin login works: `admin@hexschool.com` / `12345678`.
- ECPay runs in staging by default (test store `3002607` + public test keys in
  `src/utils/ecpay.js`), so payments are simulated — no real money moves.
- The browser must be able to reach `payment-stage.ecpay.com.tw` and
  `pay-stage.ecpay.com.tw`.

## Step 0 — Ensure the server is running

Check health first; only start it if needed.

```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/   # 200 = ready
```

If it is not 200, start it in the background and poll until ready:

```bash
npm run dev:server            # run_in_background: true
until curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/ | grep -q 200; do sleep 0.5; done
```

The server needs outbound access to the ECPay hosts (see the requirement above)
for Step 7 to work; if that egress is blocked you will hit a 500 there.

## Step 1 — Log in

1. `browser_navigate` → `http://localhost:3001/login`
2. `browser_snapshot`, then fill:
   - Email textbox (placeholder「請輸入 Email」) → `admin@hexschool.com`
   - 密碼 textbox (placeholder「請輸入密碼」) → `12345678`
3. Click the **登入** submit button.
4. Success redirects to `/` and the header shows **Admin / 登出 / 我的訂單**.

## Step 2 — Add a product to the cart

1. From `/`, click a product card (e.g. 「粉色玫瑰花束」) to open
   `/products/:id`. Avoid any card showing **SOLD OUT / 已售完**.
2. On the detail page, optionally adjust quantity with the `−` / `+` stepper.
3. Click **加入購物車**.

## Step 3 — Cart → checkout

1. `browser_navigate` → `/cart`; confirm the item and total are present.
2. Click **前往結帳** → lands on `/checkout` (works because we are logged in).

## Step 4 — Fill recipient info and create the order

Fill the three textboxes (selected by placeholder) and submit:

- 收件人姓名 (「請輸入收件人姓名」) → e.g. `測試管理員`
- Email (「請輸入 Email」) → `admin@hexschool.com`
- 收件地址 (「請輸入收件地址」) → e.g. `台北市信義區測試路 1 號`

Click **確認送出訂單**. This redirects to `/orders/:id`. Note the order id from
the URL and the order number (e.g. `ORD-20260531-83FEF`); status is **待付款**.

## Step 5 — Go to ECPay

Click **前往付款（ECPay 綠界）**. The frontend fetches an auto-submitting form
from `POST /api/orders/:id/ecpay-payment` and the browser lands on
`https://payment-stage.ecpay.com.tw/Cashier/AioCheckOut/V5` (the 綠界 cashier).

## Step 6 — Pay with 網路ATM / 台灣土地銀行

On the cashier, "網路銀行" maps to ECPay's **網路ATM (WebATM)** category.

1. Click the **網路ATM** payment method in the list.
2. In the revealed **選擇銀行** dropdown, `browser_select_option` →
   `台灣土地銀行` (other banks like 台灣銀行, 玉山銀行, 中國信託 also exist if asked).
3. Click **前往付款**. A reminder modal (`simplert`) appears and intercepts
   clicks — it only has a **關閉** button. Click **關閉**: closing it
   auto-redirects to the staging mock bank page
   `https://pay-stage.ecpay.com.tw/MockMPPost/LandWebAtm`.
4. The mock page is pre-filled for success (`RC=0`, `MSG=交易成功`,
   `CurAmt` = order total). Click **Save** to post the simulated result.
   For a failure-path test, change `RC` to a non-zero value before saving.

After Save, the browser returns to `/orders/:id?payment=ecpay`.

## Step 7 — Verify payment

On return the page auto-calls `POST /api/orders/:id/check-payment` once. Because
the redirect and the auto-call can race the backend's `QueryTradeInfo`, the
status may still read 待付款 and a **查詢付款狀態** button appears.

- Click **查詢付款狀態** (or navigate to `/orders/:id` and click it).
- On success the page shows **付款成功！感謝您的購買。** and status flips to
  **已付款**.

If it returns 500 instead: this is the egress issue from the top of this skill —
the backend can't reach ECPay. Resolve the network access (ask the user to
allowlist the ECPay hosts via `/sandbox`, or run the server where it has egress),
then click 查詢付款狀態 again. The order/payment already succeeded at ECPay; only
the local verification was blocked.

## Evidence to capture

Take screenshots at the meaningful milestones so the run is auditable:
- ECPay cashier with 網路ATM + 台灣土地銀行 selected
- the mock WebATM page (RC=0 交易成功)
- the final order-detail page showing **已付款**

Use `browser_take_screenshot` (jpeg) for these.

## Common failure modes

| Symptom | Cause | Fix |
|---|---|---|
| `check-payment` 500, `fetch failed` in server log, stuck 待付款 | backend has no network egress to ECPay | allowlist `payment-stage.ecpay.com.tw` via `/sandbox` (ask the user) or run the server where it has egress; re-click 查詢付款狀態 |
| Can't add to cart, button says 已售完/SOLD OUT | chosen product is out of stock | pick a different product |
| Reminder modal blocks the 前往付款 click | ECPay `simplert` modal overlays the page | click its 關閉 button; it auto-advances to the bank page |
| Redirected to `/login` at /checkout | not logged in / token missing | re-run Step 1 before checkout |
