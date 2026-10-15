/**
 * Device — những chỗ riêng của iOS Safari mà CSS không tự lo được, và App.Orient: xoay
 * cả giao diện bằng CSS.
 *
 *   - Chặn zoom bằng hai ngón (iOS bỏ qua `user-scalable=no`) và chặn zoom khi
 *     chạm đúp: cảnh cuộn ngang mà bị phóng to là hỏng cả bố cục.
 *   - Đánh dấu `is-ios` lên <html> để CSS bắt riêng khi cần.
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

        App.Orient.init();
        return this;
    }
};

/**
 * Orient — xoay cả giao diện 90° bằng CSS khi máy cầm dọc mà người xem muốn xem ngang.
 *
 * Không quan tâm hệ điều hành có cho xoay màn hình hay không: bấm là giao diện xoay luôn.
 * Máy xoay ngang thật thì tự tắt (giao diện đã ngang rồi, xoay thêm là sai).
 *
 * Khi xoay, "khung giao diện" (UI) có trục khác khung màn hình. Mọi chỗ đo hình học trên
 * màn hình (getBoundingClientRect, innerWidth…) phải đi qua rect()/width()/height() dưới
 * đây để ra số theo khung giao diện — đo thẳng bằng API trình duyệt sẽ ra số của màn hình.
 *
 * Phép xoay (xem base.css): #app xoay 90° theo chiều kim đồng hồ quanh góc trên-trái rồi
 * đẩy sang phải `innerWidth`. Điểm UI (x, y) hiện ra ở màn hình (innerWidth − y, x),
 * ngược lại điểm màn hình (sx, sy) là UI (sy, innerWidth − sx).
 */
App.Orient = {
    wanted: false,   // người xem đã bấm nút
    forced: false,   // đang xoay thật (muốn xoay VÀ máy đang cầm dọc)

    init() {
        const refresh = () => this.update();
        window.addEventListener('resize', refresh);
        window.addEventListener('orientationchange', refresh);
        return this;
    },

    /** Bật/tắt chế độ xoay; trả về trạng thái mới */
    toggle() {
        this.wanted = !this.wanted;
        this.update();
        return this.wanted;
    },

    update() {
        const forced = this.wanted && window.innerHeight > window.innerWidth;
        if (forced === this.forced) return this;

        this.forced = forced;
        document.documentElement.classList.toggle('is-landscape-forced', forced);
        // Bố cục đổi theo: cho các thành phần tính lại (Stage giữ vị trí tương đối đang xem)
        window.dispatchEvent(new Event('resize'));
        document.dispatchEvent(new CustomEvent('orient:change', { detail: forced }));
        return this;
    },

    /** Bề rộng / cao của màn hình NHƯ NGƯỜI XEM THẤY (đã tính phép xoay) */
    width()  { return this.forced ? window.innerHeight : window.innerWidth; },
    height() { return this.forced ? window.innerWidth : window.innerHeight; },

    /** getBoundingClientRect() đổi sang khung giao diện */
    rect(el) {
        const r = el.getBoundingClientRect();
        if (!this.forced) return r;

        const W = window.innerWidth;
        return {
            left: r.top, right: r.bottom,
            top: W - r.right, bottom: W - r.left,
            width: r.height, height: r.width,
            x: r.top, y: W - r.right
        };
    }
};
