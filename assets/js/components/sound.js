/**
 * Sound — tiếng tàu chạy, lặp liên tục chừng nào tàu còn lăn bánh.
 *
 * Bật/tắt theo chuyển động chứ không theo nút bấm, nên tàu tự chạy tới trạm
 * hay người xem tự vuốt đều có tiếng. Vào/ra bằng một nhịp tăng/giảm âm
 * lượng ngắn để khỏi bị cụt tiếng. Tạm dừng thì giữ nguyên chỗ đang phát,
 * lần chạy sau nối tiếp chứ không phát lại từ đầu.
 *
 * Trình duyệt chỉ cho phát âm thanh sau khi người xem đã bấm vào trang — luồng
 * này luôn có lần bấm "Sẵn sàng" trước khi tàu chạy nên không vướng.
 * iOS bỏ qua việc chỉnh âm lượng nên ở đó tiếng vào/ra sẽ dứt khoát hơn.
 */
window.App = window.App || {};

App.Sound = class Sound {
    /**
     * @param {Object} options
     * @param {string} options.src
     * @param {number} [options.volume]  0 → 1, âm lượng khi đang chạy
     * @param {number} [options.fadeIn]  ms
     * @param {number} [options.fadeOut] ms
     */
    constructor(options) {
        this.options = Object.assign({ volume: 0.6, fadeIn: 350, fadeOut: 500 }, options);
        this.playing = false;
        this.fade = null;

        this.audio = new Audio();
        this.audio.src = this.options.src;
        this.audio.loop = true;
        this.audio.preload = 'auto';
        this.audio.volume = 0;

        // iOS chỉ cho phát âm thanh khi lệnh play() chạy NGAY TRONG lần chạm của người
        // xem, mà tiếng tàu lại bật từ chuyển động cuộn (không phải lần chạm). Nên ở
        // lần chạm đầu tiên ta phát thử một nhịp CÂM rồi dừng — từ đó trang được phép
        // phát tiếng bất cứ lúc nào.
        this.unlocked = false;
        const unlock = () => {
            if (this.unlocked) return;
            this.unlocked = true;
            ['touchend', 'click', 'keydown'].forEach((n) => document.removeEventListener(n, unlock, true));

            const a = this.audio;
            a.muted = true;
            const p = a.play();
            const done = () => {
                if (!this.playing) { a.pause(); a.currentTime = 0; }
                a.muted = false;
            };
            if (p && p.then) p.then(done, done); else done();
        };
        ['touchend', 'click', 'keydown'].forEach((n) => document.addEventListener(n, unlock, true));

        // Chuyển tab thì thôi phát, quay lại tàu còn chạy thì phát tiếp
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) this.audio.pause();
            else if (this.playing) this._play();
        });
    }

    /** Tàu bắt đầu lăn bánh */
    start() {
        if (this.playing) return this;
        this.playing = true;
        this._play();
        return this;
    }

    /** Tàu dừng: nhỏ dần rồi tắt */
    stop() {
        if (!this.playing) return this;
        this.playing = false;
        this._ramp(0, this.options.fadeOut, () => {
            if (!this.playing) this.audio.pause();
        });
        return this;
    }

    _play() {
        const p = this.audio.play();
        // Bị chặn (chưa có tương tác) thì thôi, lần chạy sau thử lại
        if (p && p.catch) p.catch(() => { this.playing = false; });
        this._ramp(this.options.volume, this.options.fadeIn);
    }

    /** Đổi âm lượng từ từ tới `to` trong `ms` mili giây */
    _ramp(to, ms, done) {
        cancelAnimationFrame(this.fade);
        const from = this.audio.volume;
        const t0 = performance.now();

        const step = (now) => {
            const k = Math.min(1, (now - t0) / ms);
            this.audio.volume = Math.max(0, Math.min(1, from + (to - from) * k));
            if (k < 1) this.fade = requestAnimationFrame(step);
            else if (done) done();
        };
        this.fade = requestAnimationFrame(step);
    }
};
