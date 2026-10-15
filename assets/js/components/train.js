/**
 * Train — đầu tàu đứng yên giữa khung hình, cảnh chạy phía sau.
 * Bánh xe không tự quay: pha bánh đổi theo quãng đường người dùng đã vuốt,
 * nên vuốt tới đâu tàu lăn tới đó, ngừng vuốt là bánh đứng lại.
 *
 * Toa và bánh toa được đặt bằng JS vì vị trí phụ thuộc số toa;
 * riêng đầu tàu là cố định nên nằm hẳn trong train.css.
 */
window.App = window.App || {};

/**
 * Hình học của toa, tính bằng % bề ngang / chiều cao khung .train
 * (khung = 1536 × 1024 đơn vị, đúng bằng ảnh thân đầu tàu).
 * Suy ra từ toạ độ thật trong train-carriage.webp: thân toa x 107..1480,
 * nóc y 238, đáy bánh y 624, hai giá chuyển hướng ở x ≈ 394 và 1045.
 */
App.Train = class Train {
    /**
     * @param {Object} options
     * @param {string} options.body            ảnh thân đầu tàu
     * @param {string[]} options.wheels        các khung bánh xe theo thứ tự quay
     * @param {Object} [options.carriage]      { image, count } toa nối phía sau
     * @param {string} [options.height]        cỡ đầu tàu, ví dụ 'min(36vh, 47vw)'
     * @param {Object} [options.smoke]        cấu hình khói, xem App.Smoke
     * @param {number} options.distancePerFrame  vuốt bao nhiêu px thì sang khung kế
     */
    constructor(options) {
        this.options = options;
        this.frame = 0;
        this.stopTimer = null;
        this.wheelGroups = [];   // mỗi nhóm là 5 khung bánh của một cụm

        this.el = document.createElement('div');
        this.el.className = 'train';
        if (options.height) this.el.style.setProperty('--train-height', options.height);

        if (options.carriage) this._buildCarriages(options.carriage);

        // Bánh đầu tàu: vị trí do train.css lo, ở đây chỉ dựng 5 khung
        this.wheelGroups.push(this._buildWheelSet('train__wheel'));

        const body = document.createElement('img');
        body.className = 'train__layer train__body';
        body.src = options.body;
        body.alt = 'Đầu tàu';
        this.el.appendChild(body);
        this.bodyEl = body;

        // Khói bay lên trên thân tàu, neo đúng miệng ống khói
        if (options.smoke && App.Smoke) {
            this.smoke = new App.Smoke(options.smoke).mount(this.el);
        }
    }

    /** Dựng 5 khung bánh chồng lên nhau, chỉ khung hiện hành mới hiện */
    _buildWheelSet(extraClass, style) {
        return this.options.wheels.map((src, i) => {
            const img = document.createElement('img');
            img.className = 'train__layer train__wheel--frame ' + extraClass
                          + ' train__wheel--' + (i + 1);
            img.src = src;
            img.alt = '';
            if (style) Object.assign(img.style, style);
            if (i === 0) img.classList.add('is-current');
            this.el.appendChild(img);
            return img;
        });
    }

    _buildCarriages(cfg) {
        const G = App.Train.CARRIAGE;
        this.carriageEls = [];

        // Dựng từ toa xa nhất trở về, để toa gần đầu tàu nằm đè lên toa phía sau
        for (let i = cfg.count; i >= 1; i--) {
            const shift = -(i - 1) * G.pitch;
            const box = {
                left: (G.left + shift) + '%',
                top: G.top + '%',
                width: G.scale + '%',
                height: G.scale + '%'
            };

            const carriage = document.createElement('img');
            carriage.className = 'train__layer train__carriage';
            carriage.src = cfg.image;
            carriage.alt = '';
            Object.assign(carriage.style, box);
            this.el.appendChild(carriage);

            // Bản sao chỉ lộ phần gầm, làm sáng để gầm toa không chìm vào nền cầu
            const lit = document.createElement('img');
            lit.className = 'train__layer train__carriage train__carriage-lit';
            lit.src = cfg.image;
            lit.alt = '';
            Object.assign(lit.style, box);
            this.el.appendChild(lit);

            // Bánh kiểu đầu tàu cho từng giá chuyển hướng
            G.bogies.forEach((bogie) => {
                this.wheelGroups.push(this._buildWheelSet('train__carriage-wheel', {
                    left: (bogie + shift) + '%',
                    top: G.wheelTop + '%',
                    width: G.wheelScale + '%',
                    height: G.wheelScale + '%'
                }));
            });

            this.carriageEls.unshift(carriage);
        }
    }

    mount(root) {
        root.appendChild(this.el);
        return this;
    }

    /**
     * Hạ/nâng tàu cho khớp đường ray của cảnh đang xem.
     * @param {number} ratio 0 → 1, độ cao mặt ray so với chiều cao ảnh nền
     */
    setRail(ratio) {
        this.el.style.setProperty('--rail', (ratio * 100).toFixed(2));
        return this;
    }

    show() {
        this.el.classList.add('is-visible');
        if (this.smoke) this.smoke.start();
        return this;
    }

    hide() {
        this.el.classList.remove('is-visible');
        if (this.smoke) this.smoke.stop();
        return this;
    }

    /** @param {number} distance quãng đường đã cuộn, tính bằng px */
    travel(distance) {
        const n = this.options.wheels.length;
        const step = this.options.distancePerFrame;
        const index = ((Math.floor(distance / step) % n) + n) % n;

        if (index !== this.frame) {
            this.wheelGroups.forEach((group) => {
                group[this.frame].classList.remove('is-current');
                group[index].classList.add('is-current');
            });
            this.frame = index;
        }

        // Đang vuốt thì thân tàu rung nhẹ và khói phun dày, ngừng một nhịp là thôi
        this.el.classList.add('is-running');
        if (this.smoke) this.smoke.setRunning(true);

        clearTimeout(this.stopTimer);
        this.stopTimer = setTimeout(() => {
            this.el.classList.remove('is-running');
            if (this.smoke) this.smoke.setRunning(false);
        }, 180);
        return this;
    }
};

App.Train.CARRIAGE = {
    scale: 148,       // % — nóc toa ngang nóc cabin đầu tàu
    left: -135.12,    // % — toa thứ nhất, móc sát đuôi đầu tàu
    top: -5.97,       // % — hạ sao cho bánh toa chạm đúng mặt ray
    pitch: 131.1,     // % — mỗi toa lùi thêm bấy nhiêu, đúng khoảng móc nối
    frameBottom: 800.3, // đơn vị khung — mép dưới khung gầm toa, chỗ bánh chui vào
    wheelScale: 28.2,   // % — cỡ bánh sao cho đúng nửa bánh lộ ra dưới gầm
    wheelTop: 64.97,    // % — đáy bánh toa trùng mặt ray
    bogies: [-111.17, -48.44]   // % — hai giá chuyển hướng của toa thứ nhất
};
