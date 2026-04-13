const crypto = require('crypto');

const ECPAY_CONFIG = {
  merchantId: process.env.ECPAY_MERCHANT_ID || '3002607',
  hashKey: process.env.ECPAY_HASH_KEY || 'pwFHCqoQZGmho4w6',
  hashIV: process.env.ECPAY_HASH_IV || 'EkRm7iFT261dpevs',
  isProduction: process.env.ECPAY_ENV === 'production',
};

function getAioCheckOutUrl() {
  return ECPAY_CONFIG.isProduction
    ? 'https://payment.ecpay.com.tw/Cashier/AioCheckOut/V5'
    : 'https://payment-stage.ecpay.com.tw/Cashier/AioCheckOut/V5';
}

function getQueryTradeInfoUrl() {
  return ECPAY_CONFIG.isProduction
    ? 'https://payment.ecpay.com.tw/Cashier/QueryTradeInfo/V5'
    : 'https://payment-stage.ecpay.com.tw/Cashier/QueryTradeInfo/V5';
}

/**
 * .NET style URL encode for ECPay CheckMacValue
 */
function dotNetUrlEncode(str) {
  let encoded = encodeURIComponent(str);
  // Apply .NET conversion table
  encoded = encoded
    .replace(/%2d/gi, '-')
    .replace(/%5f/gi, '_')
    .replace(/%2e/gi, '.')
    .replace(/%21/gi, '!')
    .replace(/%2a/gi, '*')
    .replace(/%28/gi, '(')
    .replace(/%29/gi, ')')
    .replace(/%20/gi, '+');
  return encoded;
}

/**
 * Generate CheckMacValue for ECPay
 * @param {Object} params - Key-value pairs (without CheckMacValue)
 * @returns {string} CheckMacValue (uppercase hex SHA256)
 */
function generateCheckMacValue(params) {
  // 1. Sort keys A-Z (case-insensitive)
  const sorted = Object.keys(params).sort((a, b) =>
    a.toLowerCase().localeCompare(b.toLowerCase())
  );

  // 2. Build query string
  const queryStr = sorted.map(k => `${k}=${params[k]}`).join('&');

  // 3. Prepend HashKey, append HashIV
  const raw = `HashKey=${ECPAY_CONFIG.hashKey}&${queryStr}&HashIV=${ECPAY_CONFIG.hashIV}`;

  // 4. URL encode (.NET style)
  const encoded = dotNetUrlEncode(raw);

  // 5. Lowercase
  const lowered = encoded.toLowerCase();

  // 6. SHA256 → uppercase
  return crypto.createHash('sha256').update(lowered).digest('hex').toUpperCase();
}

/**
 * Verify CheckMacValue from ECPay response
 * @param {Object} params - All response params including CheckMacValue
 * @returns {boolean}
 */
function verifyCheckMacValue(params) {
  const received = params.CheckMacValue;
  if (!received) return false;

  const paramsWithout = { ...params };
  delete paramsWithout.CheckMacValue;

  const expected = generateCheckMacValue(paramsWithout);
  return expected === received;
}

/**
 * Generate ECPay payment form HTML
 * @param {Object} order - Order object from DB
 * @param {string} paymentTradeNo - ECPay MerchantTradeNo
 * @param {Array} orderItems - Order items from DB
 * @param {string} baseUrl - Server base URL
 * @returns {string} HTML form string with auto-submit
 */
function generatePaymentFormHTML(order, paymentTradeNo, orderItems, baseUrl) {
  const now = new Date();
  const tradeDate = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

  // Build item name (max 400 chars, items separated by #)
  let itemName = orderItems
    .map(item => `${item.product_name} x${item.quantity}`)
    .join('#');
  if (itemName.length > 400) {
    itemName = itemName.substring(0, 397) + '...';
  }

  const params = {
    MerchantID: ECPAY_CONFIG.merchantId,
    MerchantTradeNo: paymentTradeNo,
    MerchantTradeDate: tradeDate,
    PaymentType: 'aio',
    TotalAmount: order.total_amount,
    TradeDesc: '花卉電商訂單',
    ItemName: itemName,
    ReturnURL: `${baseUrl}/api/orders/ecpay-notify`,
    OrderResultURL: `${baseUrl}/orders/${order.id}/payment-result`,
    ClientBackURL: `${baseUrl}/orders/${order.id}?payment=cancel`,
    ChoosePayment: 'ALL',
    EncryptType: 1,
    NeedExtraPaidInfo: 'N',
  };

  params.CheckMacValue = generateCheckMacValue(params);

  const actionUrl = getAioCheckOutUrl();

  const hiddenInputs = Object.entries(params)
    .map(([key, value]) => `<input type="hidden" name="${key}" value="${String(value).replace(/"/g, '&quot;')}">`)
    .join('\n');

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>正在前往 ECPay...</title></head>
<body>
<form id="ecpay-form" method="POST" action="${actionUrl}">
${hiddenInputs}
</form>
<script>document.getElementById('ecpay-form').submit();</script>
</body>
</html>`;
}

/**
 * Query ECPay trade info
 * @param {string} merchantTradeNo - The MerchantTradeNo used when creating payment
 * @returns {Promise<Object>} Parsed response from ECPay
 */
async function queryTradeInfo(merchantTradeNo) {
  const timeStamp = Math.floor(Date.now() / 1000);

  const params = {
    MerchantID: ECPAY_CONFIG.merchantId,
    MerchantTradeNo: merchantTradeNo,
    TimeStamp: timeStamp,
  };

  params.CheckMacValue = generateCheckMacValue(params);

  const body = Object.entries(params)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');

  const url = getQueryTradeInfoUrl();

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  const text = await response.text();

  // Parse response (URL-encoded key=value pairs separated by &)
  const result = {};
  text.split('&').forEach(pair => {
    const [key, ...rest] = pair.split('=');
    if (key) {
      result[decodeURIComponent(key)] = decodeURIComponent(rest.join('='));
    }
  });

  return result;
}

module.exports = {
  generateCheckMacValue,
  verifyCheckMacValue,
  generatePaymentFormHTML,
  queryTradeInfo,
  ECPAY_CONFIG,
};
