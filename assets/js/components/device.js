/**
 * Device — những chỗ riêng của iOS Safari mà CSS không tự lo được.
 *
 *   - Chặn zoom bằng hai ngón (iOS bỏ qua `user-scalable=no`) và chặn zoom khi
 *     chạm đúp: cảnh cuộn ngang mà bị phóng to là hỏng cả bố cục.
 *   - Đánh dấu `is-ios` lên <html> để CSS bắt riêng khi cần.
 * Chỉ chạy một lần lúc nạp trang.
 */
window.App = window.App || {};

App.Device = {
    isIOS: /iP(hone|ad|od)/.test(navigator.platform || '')
        // iPadOS 13+ tự xưng là Mac nhưng có cảm ứng nhiều điểm
        || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1),

    init() {
        if (this.isIOS) document.documentElement.classList.add('is-ios');

        // Pinch-zoom trên Safari
        ['gesturestart', 'gesturechange', 'gestureend'].forEach((name) => {
            document.addEventListener(name, (e) => e.preventDefault());
        });

        // Chạm đúp để phóng to: touch-action: manipulation đã chặn ở CSS, đây là
        // lưới an toàn cho phiên bản cũ
        let lastTouch = 0;
        document.addEventListener('touchend', (e) => {
            const now = Date.now();
            if (now - lastTouch < 300) e.preventDefault();
            lastTouch = now;
        }, { passive: false });
        return this;
    }
};
