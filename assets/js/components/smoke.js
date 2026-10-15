/**
 * Smoke — cột khói dựng đứng trên ống khói đầu tàu.
 *
 * Mỗi ảnh trong assets/images/smoke/ là NGUYÊN một cột khói, gốc nhọn cắm vào
 * miệng ống khói. Vì vậy khói không bay rời ra thành từng cụm: cột luôn dính
 * liền với ống khói, chỉ đổi dáng và lắc lư.
 *
 * Đổi dáng bằng cách NHẢY KHUNG dứt khoát (kiểu "boil" của hoạt hình vẽ tay),
 * không mờ chồng — mờ chồng làm hai dáng đè nhau thành hình nhoè đôi.
 *
 * Tàu lăn bánh thì cột đổi dáng nhanh hơn và ngả về sau; tàu đứng thì
 * cột dựng thẳng, uốn nhẹ. Dừng ở trạm vẫn giữ nguyên cột khói.
 */
window.App = window.App || {};

App.Smoke = class Smoke {
    /**
     * @param {Object} options
     * @param {string[]} options.images
     * @param {number} [options.size]        chiều cao cột so với chiều cao khung tàu
     * @param {number} [options.hold]        ms mỗi khung khi tàu đứng
     * @param {number} [options.holdRunning] ms mỗi khung khi tàu chạy
     * @param {number} [options.opacity]     độ đậm của cột khói
     * @param {number} [options.lean]        độ ngả về sau khi tàu chạy
     */
    constructor(options) {
        const o = this.options = Object.assign({
            size: 0.85,
            hold: 230,
            holdRunning: 140,
            opacity: 0.8,
            lean: 9
        }, options);

        this.frame = 0;
        this.step = 1;     // chiều chạy của con thoi
        this.isRunning = false;
        this.timer = null;

        this.el = document.createElement('div');
        this.el.className = 'smoke';
        this.el.style.setProperty('--lean', '-' + o.lean + 'deg');

        this.column = document.createElement('div');
        this.column.className = 'smoke__column';
        this.column.style.setProperty('--size', o.size);
        this.column.style.setProperty('--peak', o.opacity);

        // Các dáng khói chồng khít lên nhau, mỗi lúc chỉ một dáng hiện.
        // Gốc mỗi ảnh nằm lệch nhau chút ít nên phải bù riêng từng ảnh,
        // không thì đổi dáng xong cột khói rời khỏi miệng ống khói.
        const R = App.Smoke.GEOMETRY.root;
        this.frames = o.images.map((src, i) => {
            const img = document.createElement('img');
            img.className = 'smoke__frame';
            img.src = src;
            img.alt = '';

            const name = src.split('/').pop();
            const root = App.Smoke.ROOTS[name] || { x: R.x / 100, y: R.y / 100 };
            img.style.left = ((R.x / 100 - root.x) * 100).toFixed(2) + '%';
            img.style.top  = ((R.y / 100 - root.y) * 100).toFixed(2) + '%';

            if (i === 0) img.classList.add('is-current');
            this.column.appendChild(img);
            return img;
        });

        this.el.appendChild(this.column);
    }

    mount(parent) {
        parent.appendChild(this.el);
        return this;
    }

    start() {
        if (this.timer || this.frames.length < 2) return this;
        this._schedule();
        return this;
    }

    stop() {
        clearTimeout(this.timer);
        this.timer = null;
        return this;
    }

    /** Dừng ở trạm thì tắt cột khói, nhường chỗ cho bong bóng kỉ niệm */
    setVisible(visible) {
        this.el.classList.toggle('is-hidden', !visible);
        if (visible) this.start(); else this.stop();
        return this;
    }

    /** Tàu đang lăn bánh hay đứng yên — đổi nhịp khói và độ ngả của cột */
    setRunning(running) {
        if (running === this.isRunning) return this;
        this.isRunning = running;
        this.el.classList.toggle('is-leaning', running);
        return this;
    }

    _schedule() {
        const o = this.options;
        const base = this.isRunning ? o.holdRunning : o.hold;
        this.timer = setTimeout(() => {
            this._next();
            this._schedule();
        }, base * (0.9 + Math.random() * 0.2));   // rung nhẹ cho nhịp khỏi máy móc
    }

    /**
     * Sang dáng kế tiếp theo kiểu con thoi 1-2-3-2-1-2-3… thay vì nhảy lung tung.
     * Chạy tới rồi lui nên nhịp khói đều, không giật cục.
     */
    _next() {
        const n = this.frames.length;
        if (n < 2) return;

        let index = this.frame + this.step;
        if (index >= n || index < 0) {
            this.step = -this.step;
            index = this.frame + this.step;
        }

        this.frames[this.frame].classList.remove('is-current');
        this.frames[index].classList.add('is-current');
        this.frame = index;
    }
};

/**
 * Toạ độ suy ra từ ảnh gốc, đừng sửa lẻ một số:
 *  - miệng ống khói trong locomotive.webp: x = 1205/1536, y = 138/1024
 *  - gốc cột khói trong ảnh khói:         x = 505/1024,  y = 1305/1536
 */
App.Smoke.GEOMETRY = {
    chimney: { x: 78.45, y: 13.48 },   // % trong khung .train
    root:    { x: 49.30, y: 85.00 }    // % — mốc chung mọi dáng khói được kéo về
};

/**
 * Gốc thật của từng ảnh khói, đo bằng điểm thấp nhất còn rõ nét.
 * Tra theo TÊN FILE chứ không theo thứ tự mảng, để đổi hay bớt ảnh
 * trong config cũng không làm cột khói lệch khỏi ống khói.
 */
App.Smoke.ROOTS = {
    '1.webp': { x: 0.4980, y: 0.8542 },
    '2.webp': { x: 0.4946, y: 0.8835 },
    '3.webp': { x: 0.4902, y: 0.8457 },
    '4.webp': { x: 0.4873, y: 0.8652 },
    '5.webp': { x: 0.4902, y: 0.8132 },
    '6.webp': { x: 0.4941, y: 0.8522 },
    '7.webp': { x: 0.5010, y: 0.8333 }
};
