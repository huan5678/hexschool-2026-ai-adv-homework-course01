const { createApp, ref, onMounted } = Vue;

createApp({
  setup() {
    if (!Auth.requireAuth()) return {};

    const el = document.getElementById('app');
    const orderId = el.dataset.orderId;
    const paymentResult = ref(el.dataset.paymentResult || null);

    const order = ref(null);
    const loading = ref(true);
    const paying = ref(false);
    const checking = ref(false);

    const statusMap = {
      pending: { label: '待付款', cls: 'bg-apricot/20 text-apricot' },
      paid: { label: '已付款', cls: 'bg-sage/20 text-sage' },
      failed: { label: '付款失敗', cls: 'bg-red-100 text-red-600' },
    };

    const paymentMessages = {
      success: { text: '付款成功！感謝您的購買。', cls: 'bg-sage/10 text-sage border border-sage/20' },
      failed: { text: '付款失敗，請重試。', cls: 'bg-red-50 text-red-600 border border-red-100' },
      cancel: { text: '付款已取消。', cls: 'bg-apricot/10 text-apricot border border-apricot/20' },
      checking: { text: '正在查詢付款結果...', cls: 'bg-blue-50 text-blue-600 border border-blue-100' },
      unpaid: { text: '付款尚未完成，請稍後再查詢或重新付款。', cls: 'bg-apricot/10 text-apricot border border-apricot/20' },
    };

    async function handleEcpayPay() {
      if (!order.value || paying.value) return;
      paying.value = true;
      try {
        const res = await apiFetch('/api/orders/' + order.value.id + '/ecpay-payment', {
          method: 'POST'
        });
        // Write the HTML form to a new document and auto-submit
        document.open();
        document.write(res.data.html);
        document.close();
      } catch (e) {
        Notification.show(e?.data?.message || '產生付款表單失敗', 'error');
        paying.value = false;
      }
    }

    async function checkPayment() {
      if (!order.value || checking.value) return;
      checking.value = true;
      paymentResult.value = 'checking';
      try {
        const res = await apiFetch('/api/orders/' + order.value.id + '/check-payment', {
          method: 'POST'
        });
        order.value = res.data;
        if (res.data.status === 'paid') {
          paymentResult.value = 'success';
        } else if (res.data.status === 'failed') {
          paymentResult.value = 'failed';
        } else {
          paymentResult.value = 'unpaid';
        }
      } catch (e) {
        Notification.show('查詢付款狀態失敗', 'error');
        paymentResult.value = null;
      } finally {
        checking.value = false;
      }
    }

    async function simulatePay(action) {
      if (!order.value || paying.value) return;
      paying.value = true;
      try {
        const res = await apiFetch('/api/orders/' + order.value.id + '/pay', {
          method: 'PATCH',
          body: JSON.stringify({ action })
        });
        order.value = res.data;
        paymentResult.value = action === 'success' ? 'success' : 'failed';
      } catch (e) {
        Notification.show('付款處理失敗', 'error');
      } finally {
        paying.value = false;
      }
    }

    function handlePaySuccess() { simulatePay('success'); }
    function handlePayFail() { simulatePay('fail'); }

    onMounted(async function () {
      try {
        const res = await apiFetch('/api/orders/' + orderId);
        order.value = res.data;
      } catch (e) {
        Notification.show('載入訂單失敗', 'error');
      } finally {
        loading.value = false;
      }

      // Auto-check payment status when returning from ECPay
      if (paymentResult.value === 'ecpay' && order.value && order.value.status === 'pending') {
        checkPayment();
      }
    });

    return {
      order, loading, paying, checking,
      paymentResult, statusMap, paymentMessages,
      handleEcpayPay, checkPayment,
      handlePaySuccess, handlePayFail,
    };
  }
}).mount('#app');
