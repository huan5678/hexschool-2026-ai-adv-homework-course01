const Notification = {
  _timeout: null,

  show(message, type = 'info') {
    const el = document.getElementById('notification-toast');
    if (!el) return;

    const colors = {
      success: 'bg-raised text-cream border border-kaki',
      error: 'bg-raised text-cream border border-[#B8553E]',
      warning: 'bg-raised text-cream border border-hairline',
      info: 'bg-raised text-cream border border-hairline'
    };

    el.className = 'fixed top-24 right-6 z-[100] px-5 py-3 rounded-[3px] shadow-lg text-sm transition-all duration-300 ' + (colors[type] || colors.info);
    el.textContent = message;
    el.style.display = 'block';
    el.style.opacity = '1';

    if (this._timeout) clearTimeout(this._timeout);
    this._timeout = setTimeout(() => {
      el.style.opacity = '0';
      setTimeout(() => { el.style.display = 'none'; }, 300);
    }, 3000);
  }
};
