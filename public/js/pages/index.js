const { createApp, ref, onMounted } = Vue;

createApp({
  setup() {
    const products = ref([]);
    const pagination = ref({ total: 0, page: 1, limit: 8, totalPages: 0 });
    const loading = ref(true);

    const featuredImages = [
      'https://images.unsplash.com/photo-1490750967868-88aa4f44baee?w=800&q=80',
      'https://images.unsplash.com/photo-1487530811176-3780de880c2d?w=800&q=80',
      'https://images.unsplash.com/photo-1508610048659-a06b669e3321?w=800&q=80',
      'https://images.unsplash.com/photo-1455659817273-f96807779a8a?w=800&q=80',
    ];

    const testimonials = [
      { text: '花束非常漂亮，包裝細緻，收到的人超級喜歡！', who: '— 小美' },
      { text: '訂閱服務每月都有驚喜，花材新鮮，質感很好。', who: '— Jason' },
      { text: '乾燥花圈擺在家裡很有氛圍，一定會再回購。', who: '— 雅婷' },
    ];

    const services = [
      { title: '快速配送', desc: '台北市區當日送達，準時送上心意。' },
      { title: '職人包裝', desc: '手工綁束與選材，每束皆為孤品。' },
      { title: '鮮花保證', desc: '收到不滿意，七日內全額退款。' },
    ];

    async function loadProducts(page) {
      page = page || 1;
      loading.value = true;
      try {
        const res = await apiFetch('/api/products?page=' + page + '&limit=8');
        products.value = res.data.products.map(function (p) {
          p._adding = false;
          return p;
        });
        pagination.value = res.data.pagination;
      } catch (e) {
        products.value = [];
      } finally {
        loading.value = false;
      }
    }

    function goToProduct(id) {
      window.location.href = '/products/' + id;
    }

    async function addToCart(product) {
      if (product._adding) return;
      product._adding = true;
      try {
        await apiFetch('/api/cart', {
          method: 'POST',
          body: JSON.stringify({ productId: product.id, quantity: 1 })
        });
        Notification.show('已加入購物車', 'success');
        // Update cart badge
        var badge = document.getElementById('cart-badge');
        if (badge) {
          var count = parseInt(badge.textContent || '0') + 1;
          badge.textContent = count;
          badge.style.display = 'flex';
        }
      } catch (e) {
        Notification.show('加入購物車失敗', 'error');
      } finally {
        product._adding = false;
      }
    }

    onMounted(function () {
      loadProducts(1);
    });

    return {
      products, pagination, loading, featuredImages, testimonials, services,
      loadProducts, goToProduct, addToCart
    };
  }
}).mount('#app');
