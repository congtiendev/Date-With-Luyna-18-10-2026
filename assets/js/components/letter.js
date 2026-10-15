/**
 * Letter — lá thư lịch hẹn. Tàu dừng ở trạm thì thư bay ra từ đầu tàu, rồi
 * cây bút viết lần lượt từng dòng.
 *
 * Mỗi dòng là một khối overflow:hidden, JS nới dần bề rộng để chữ "hiện ra"
 * theo nét bút, đồng thời dời cây bút tới đúng chỗ đang viết. Lần đầu mở thư
 * của một ngày thì bút viết; mở lại thì hiện luôn cả thư.
 *
 * Chạm ra ngoài tờ thư: đang viết thì hiện nốt cả thư, viết xong rồi thì đóng.
 */
window.App = window.App || {};

App.Letter = class Letter {
    /**
     * @param {Object} options
     * @param {string} options.paper   ảnh tờ giấy (1024 × 1536)
     * @param {string} options.pen     ảnh cây bút
     * @param {string} [options.tip]   dòng nhắc dưới tờ thư
     * @param {Function} [options.onClose]
     */
    constructor(options) {
        this.options = options;

        this.lines = [];
        this.isOpen = false;
        this.written = false;
        this.raf = 0;
        this.cur = 0;           // dòng đang viết
        this.pos = 0;           // px đã viết của dòng đó
        this.phase = 'write';   // write | hop (nhấc bút sang dòng mới)
        this.hopT = 0;
        this.lastT = 0;
        this.seen = {};         // key các thư đã được viết một lần
        this.startTimer = null;

        this.el = document.createElement('div');
        this.el.className = 'letter-scene';
        this.el.setAttribute('role', 'dialog');
        this.el.setAttribute('aria-modal', 'true');
        this.el.setAttribute('aria-label', 'Lịch hẹn');

        this.el.innerHTML =
            '<div class="letter">' +
                '<img class="letter__sheet" alt="Tờ thư">' +
                '<div class="letter__ink"></div>' +
                '<img class="letter__pen" alt="">' +
            '</div>' +
            '<span class="letter__tip"></span>';

        this.letterEl = this.el.querySelector('.letter');
        this.inkEl = this.el.querySelector('.letter__ink');
        this.penEl = this.el.querySelector('.letter__pen');
        this.tipEl = this.el.querySelector('.letter__tip');
        this.letterEl.querySelector('.letter__sheet').src = options.paper;
        this.penEl.src = options.pen;
        this.tipEl.textContent = options.tip || '';

        this.reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

        // Chờ font viết tay, nhưng tối đa 1.2s để mạng chậm cũng không kẹt animation
        this.fontsReady = Promise.race([
            document.fonts ? document.fonts.ready : Promise.resolve(),
            new Promise((resolve) => setTimeout(resolve, 1200))
        ]);

        this.el.addEventListener('click', (e) => {
            if (this.letterEl.contains(e.target)) return;
            this.dismiss();
        });
        window.addEventListener('keydown', (e) => {
            if (this.isOpen && e.key === 'Escape') this.dismiss();
        });
        window.addEventListener('resize', () => this._relayout());

        new Image().src = options.paper;
        new Image().src = options.pen;
    }

    mount(root) {
        root.appendChild(this.el);
        return this;
    }

    /**
     * @param {Object[]} items  [{ text, style: 'greet'|'sign'|undefined }]
     * @param {Object} [opts]
     * @param {string} [opts.key]     định danh để nhớ thư đã viết rồi
     * @param {Element} [opts.from]   phần tử mà thư bay ra từ đó
     */
    open(items, opts) {
        if (this.isOpen || !items || !items.length) return this;
        opts = opts || {};

        const first = !this.seen[opts.key];
        if (opts.key) this.seen[opts.key] = true;

        this._build(items);
        this.isOpen = true;
        this.written = false;
        this.tipEl.classList.remove('is-shown');
        this.el.classList.add('is-open');

        requestAnimationFrame(() => {
            if (first && !this.reduced) {
                this._flyIn(opts.from);
                this.startTimer = setTimeout(() => this.fontsReady.then(() => this._start()), 1350);
            } else {
                this.letterEl.style.transition = 'none';
                this.letterEl.style.opacity = '1';
                this.letterEl.style.transform = 'none';
                this.fontsReady.then(() => this._showAll());
            }
        });
        return this;
    }

    close() {
        if (!this.isOpen) return this;
        clearTimeout(this.startTimer);
        this._skip();
        this.isOpen = false;
        this.el.classList.remove('is-open');
        if (this.options.onClose) this.options.onClose();
        return this;
    }

    /** Đang viết thì hiện luôn cả thư, viết xong rồi thì đóng */
    dismiss() {
        if (!this._skip()) this.close();
    }

    _build(items) {
        this.inkEl.textContent = '';
        this.lines = items.map((item) => {
            const ln = document.createElement('div');
            ln.className = 'letter__line' + (item.style ? ' is-' + item.style : '');
            const sp = document.createElement('span');
            sp.textContent = item.text;
            ln.appendChild(sp);
            this.inkEl.appendChild(ln);
            return { ln, sp, w: 0, x: 0, y: 0 };
        });
    }

    /* Co cỡ chữ cho dòng dài nhất vừa tờ giấy, rồi ghi lại toạ độ từng dòng */
    _measure() {
        const lw = this.letterEl.clientWidth;
        this.penEl.style.width = lw * .42 + 'px';
        this.inkEl.style.fontSize = lw * .066 + 'px';
        this.lines.forEach((o) => { o.ln.style.width = 'auto'; });

        const ir = this.inkEl.getBoundingClientRect();
        let scale = 1;
        this.lines.forEach((o) => {
            const avail = ir.right - o.ln.getBoundingClientRect().left;
            if (o.sp.offsetWidth > avail && avail > 0) {
                scale = Math.min(scale, avail / o.sp.offsetWidth);
            }
        });
        if (scale < 1) this.inkEl.style.fontSize = (lw * .066 * scale) + 'px';

        const br = this.letterEl.getBoundingClientRect();
        this.lines.forEach((o) => {
            o.w = o.sp.offsetWidth;
            const r = o.ln.getBoundingClientRect();
            o.x = r.left - br.left;
            o.y = r.top - br.top + r.height * .74;   // đường kẻ chân chữ
        });
        this._applyProgress();
    }

    _applyProgress() {
        this.lines.forEach((o, i) => {
            o.ln.style.width = (i < this.cur ? o.w : i === this.cur ? this.pos : 0) + 'px';
        });
    }

    _penTo(x, y, lift, tilt) {
        const pw = this.penEl.offsetWidth, ph = this.penEl.offsetHeight;
        const tip = App.Letter.PEN_TIP;
        this.penEl.style.transform =
            'translate(' + (x - tip.x * pw) + 'px,' +
            (y + (lift || 0) - tip.y * ph) + 'px) rotate(' + (tilt || 0) + 'deg)';
    }

    _start() {
        if (!this.isOpen) return;
        this.cur = 0; this.pos = 0; this.phase = 'write'; this.hopT = 0;
        this._measure();
        this._penTo(this.lines[0].x, this.lines[0].y, 0, 0);
        this.penEl.classList.add('is-on');
        this.lastT = performance.now();
        this.raf = requestAnimationFrame((t) => this._step(t));
    }

    _step(now) {
        const dt = Math.min((now - this.lastT) / 1000 || 0, .05);
        this.lastT = now;
        const o = this.lines[this.cur];
        const speed = parseFloat(getComputedStyle(this.inkEl).fontSize) * 9.5;   // px / giây

        if (this.phase === 'write') {
            this.pos = Math.min(this.pos + speed * dt, o.w);
            o.ln.style.width = this.pos + 'px';
            const wobble = Math.sin(this.pos / 7) * 1.2;       // rung nhẹ cho ra nét tay
            this._penTo(o.x + this.pos, o.y + wobble * .3, 0, wobble);
            if (this.pos >= o.w) { this.phase = 'hop'; this.hopT = 0; }
        } else {
            this.hopT += dt;
            const k = Math.min(this.hopT / App.Letter.HOP, 1);
            const e = k * k * (3 - 2 * k);
            const nx = this.lines[this.cur + 1];
            const ex = o.x + o.w;
            const iw = this.inkEl.clientWidth;
            if (nx) {
                this._penTo(ex + (nx.x - ex) * e, o.y + (nx.y - o.y) * e,
                    -Math.sin(k * Math.PI) * iw * .05, 0);
            } else {
                this._penTo(ex + e * iw * .4, o.y + e * iw * .35, 0, e * 14);
            }
            if (k >= 1) {
                if (nx) { this.cur++; this.pos = 0; this.phase = 'write'; }
                else { this._finish(); return; }
            }
        }
        this.raf = requestAnimationFrame((t) => this._step(t));
    }

    _finish() {
        this.raf = 0;
        this.written = true;
        this.penEl.classList.remove('is-on');
        this.tipEl.classList.add('is-shown');
    }

    _showAll() {
        if (!this.isOpen) return;
        this.cur = this.lines.length; this.pos = 0;
        this._measure();
        this._finish();
    }

    /** Đang viết thì dừng và hiện hết; trả về true nếu có việc để dừng */
    _skip() {
        if (!this.raf) return false;
        cancelAnimationFrame(this.raf);
        this.raf = 0;
        this._showAll();
        return true;
    }

    _relayout() {
        if (!this.isOpen || !this.lines.length) return;
        const o = this.lines[this.cur];
        const ratio = o && o.w ? this.pos / o.w : 0;
        this._measure();
        if (o) {
            this.pos = o.w * ratio;
            this._applyProgress();
            if (this.raf) this._penTo(o.x + this.pos, o.y, 0, 0);
        }
    }

    /* Thư bay ra từ đầu tàu: thu nhỏ về chỗ đó rồi phóng to ra giữa màn hình */
    _flyIn(from) {
        const lr = this.letterEl.getBoundingClientRect();
        const sr = from ? from.getBoundingClientRect() : null;
        const fx = sr ? sr.left + sr.width * .75 : innerWidth / 2;
        const fy = sr ? sr.top + sr.height * .35 : innerHeight;
        const dx = fx - (lr.left + lr.width / 2);
        const dy = fy - (lr.top + lr.height / 2);

        const el = this.letterEl;
        el.style.transition = 'none';
        el.style.opacity = '0';
        el.style.transform = 'translate(' + dx + 'px,' + dy + 'px) scale(.05) rotate(-24deg)';
        void el.offsetWidth;
        el.style.transition = 'transform 1.25s cubic-bezier(.2,.85,.25,1), opacity .5s ease';
        el.style.opacity = '1';
        el.style.transform = 'none';
    }
};

/** Vị trí đầu ngòi trong pen.webp, tính theo tỉ lệ 0→1 */
App.Letter.PEN_TIP = { x: .0635, y: .976 };

/** Thời gian nhấc bút sang dòng mới, giây */
App.Letter.HOP = .34;
