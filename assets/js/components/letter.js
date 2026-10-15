/**
 * Letter — lá thư lịch hẹn. Tàu dừng ở trạm thì thư bay ra từ đầu tàu, rồi
 * cây bút viết lần lượt từng dòng.
 *
 * Mỗi dòng là một khối overflow:hidden, JS nới dần bề rộng để chữ "hiện ra"
 * theo nét bút, đồng thời dời cây bút tới đúng chỗ đang viết. Lần đầu mở thư
 * của một ngày thì bút viết; mở lại thì hiện luôn cả thư.
 *
 * Chạm ra ngoài tờ thư: đang viết thì hiện nốt cả thư, viết xong rồi thì đóng —
 * trừ khi thư có lời mời mà người xem chưa trả lời.
 *
 * Lời mời: thư viết xong, đợi `askDelay` ms cho người xem đọc rồi gọi `onRead` để
 * app bật popup (App.Rsvp). Popup có nút "Đồng ý" hiện rõ, và dòng "đi tìm nút từ
 * chối" — bấm dòng đó thì popup đóng và app gọi `startHunt()`: nút "Đồng ý" nằm
 * sẵn dưới tờ thư, còn trên tờ giấy giấu HAI nút bé tí trong hai KHE RÁCH khác nhau
 * ở mép giấy (App.Letter.NOTCHES), tô cùng màu nền tối nên chìm vào khoảng trống.
 * Cặp khe được chọn ngẫu nhiên và nhớ trong localStorage để chơi lại không đổi chỗ.
 * Mọi đường đều dẫn tới ĐỒNG Ý:
 *   - bấm "Đồng ý";
 *   - mò ra một trong hai khe và bấm trúng — camera zoom tới và nút lộ ra là "Đồng
 *     ý"; rồi camera zoom ra, lao sang khe còn lại: ở đó mới là nút "Từ chối" ("nút
 *     từ chối ở đây cơ mà") — nhưng thế nào cũng đã đồng ý rồi;
 *   - nản: sau `giveUpAfter` ms dòng "Không tìm thấy nút từ chối?" mới hiện, bấm
 *     vào là đồng ý, RỒI camera mới zoom tới khe có nút "Từ chối" cho xem.
 * Trả lời xong thì con dấu "Đã đồng ý" đóng lên thư và thư mới đóng được; đóng thư
 * thì app tải lại trang.
 *
 * Trạng thái trả lời chỉ giữ trong phiên đang mở. Chỉ riêng CHỖ GIẤU nút là được
 * lưu vào localStorage.
 */
window.App = window.App || {};

App.Letter = class Letter {
    /**
     * @param {Object} options
     * @param {string} options.paper   ảnh tờ giấy (1024 × 1536)
     * @param {string} options.shadow  ảnh bóng đổ của tờ giấy
     * @param {string} options.pen     ảnh cây bút
     * @param {string} [options.tip]   dòng nhắc dưới tờ thư
     * @param {string} [options.stamp] chữ trên con dấu đóng sau khi trả lời
     * @param {string} [options.note]  lời nhắn hiện dưới thư ngay sau khi trả lời
     * @param {number} [options.askDelay] ms từ lúc viết xong tới lúc hỏi xác nhận
     * @param {Function} [options.onRead]  gọi khi tới lúc hỏi, nhận key của thư;
     *                                     không khai thì thư không có lời mời
     * @param {Object} [options.hunt]  { accept, decline, giveUp, giveUpAfter, hint } — nút Đồng ý
     *                                 hiện rõ dưới thư; nút giấu trong khe rách của giấy
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
        this.answers = {};      // key các thư đã được trả lời (chỉ trong phiên này)
        this.startTimer = null;
        this.key = null;
        this.answered = true;   // thư không có lời mời thì coi như đã trả lời
        this.noteTimer = null;
        this.askTimer = null;
        this.hunting = false;
        this.busy = false;
        this.camTimers = [];
        this.huntTimer = null;

        this.el = document.createElement('div');
        this.el.className = 'letter-scene';
        this.el.setAttribute('role', 'dialog');
        this.el.setAttribute('aria-modal', 'true');
        this.el.setAttribute('aria-label', 'Lịch hẹn');

        // .letter__cam là "máy quay": zoom tới nút từ chối bằng cách phóng cả khối này
        this.el.innerHTML =
            '<div class="letter__cam">' +
                '<div class="letter">' +
                    '<img class="letter__shadow" alt="" decoding="async">' +
                    '<img class="letter__sheet" alt="Tờ thư" decoding="async">' +
                    '<div class="letter__ink"></div>' +
                    '<img class="letter__pen" alt="">' +
                    '<div class="letter__stamp"></div>' +
                    '<button type="button" class="letter__tiny letter__tiny--a"></button>' +
                    '<button type="button" class="letter__tiny letter__tiny--b"></button>' +
                '</div>' +
            '</div>' +
            '<div class="letter__actions">' +
                '<button type="button" class="letter__accept"></button>' +
                '<button type="button" class="letter__giveup"></button>' +
            '</div>' +
            '<p class="letter__hint"></p>' +
            '<span class="letter__tip"></span>';

        this.camEl = this.el.querySelector('.letter__cam');
        this.letterEl = this.el.querySelector('.letter');
        this.inkEl = this.el.querySelector('.letter__ink');
        this.penEl = this.el.querySelector('.letter__pen');
        this.tipEl = this.el.querySelector('.letter__tip');
        this.letterEl.querySelector('.letter__sheet').src = options.paper;
        this.letterEl.querySelector('.letter__shadow').src = options.shadow;
        this.penEl.src = options.pen;
        this.tipEl.textContent = options.tip || '';

        this.stampEl = this.el.querySelector('.letter__stamp');
        // "Đã đồng ý" -> "ĐÃ" và "ĐỒNG Ý" xuống hai dòng trong vòng tròn
        const words = (options.stamp || '').split(' ');
        this.stampEl.innerHTML = '<span></span><span></span>';
        this.stampEl.children[0].textContent = words.slice(0, 1).join(' ');
        this.stampEl.children[1].textContent = words.slice(1).join(' ');

        const hunt = options.hunt;
        this.tinyA = this.el.querySelector('.letter__tiny--a');   // hai nút giấu ở hai khe rách
        this.tinyB = this.el.querySelector('.letter__tiny--b');
        this.actionsEl = this.el.querySelector('.letter__actions');
        this.acceptBtn = this.el.querySelector('.letter__accept');
        this.giveUpBtn = this.el.querySelector('.letter__giveup');
        this.hintEl = this.el.querySelector('.letter__hint');
        if (hunt) {
            this.acceptBtn.textContent = hunt.accept;
            this.giveUpBtn.textContent = hunt.giveUp;
            this.hintEl.textContent = hunt.hint || '';

            this.acceptBtn.addEventListener('click', () => this._huntDone('accept'));
            this.tinyA.addEventListener('click', () => this._found(this.tinyA, this.tinyB));
            this.tinyB.addEventListener('click', () => this._found(this.tinyB, this.tinyA));
            this.giveUpBtn.addEventListener('click', () => this._giveUp());
        }

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
        new Image().src = options.shadow;
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
        this.key = opts.key || null;
        this.answered = !this.options.onRead || !!this.answers[this.key];
        this.tipEl.classList.remove('is-shown');
        this.stampEl.classList.remove('is-stamping');
        this.stampEl.classList.toggle('is-set', this.answered && !!this.options.onRead);
        clearTimeout(this.noteTimer);
        clearTimeout(this.askTimer);
        this._endHunt();
        this._resetCam();
        this.tipEl.textContent = this.options.tip || '';
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
        clearTimeout(this.askTimer);
        this._endHunt();
        this._resetCam();
        this._skip();
        this.isOpen = false;
        this.el.classList.remove('is-open');
        if (this.options.onClose) this.options.onClose();
        return this;
    }

    /** Đang viết thì hiện luôn cả thư, viết xong rồi thì đóng */
    dismiss() {
        if (this._skip()) return;
        if (!this.answered) return;   // chưa trả lời thì chưa được đóng
        this.close();
    }

    /** Popup đã đóng: bắt đầu cuộc săn nút Đồng ý / Từ chối trên tờ thư */
    startHunt() {
        if (this.answered || this.hunting || !this.options.hunt) return this;
        this.hunting = true;
        this.busy = false;

        // Nút giấu trong một khe rách ngẫu nhiên, nhớ lại để lần chơi sau vẫn đúng chỗ đó
        const pos = this._notches();
        [[this.tinyA, pos.a], [this.tinyB, pos.b]].forEach(([el, p]) => {
            el.textContent = this.options.hunt.decline;
            el.classList.remove('is-accept', 'is-revealed');
            el.style.left = p.x + '%';
            el.style.top = p.y + '%';
        });
        this.letterEl.classList.add('is-hunting');
        this.actionsEl.classList.add('is-shown');   // nút Đồng ý hiện luôn, dễ thấy
        this.hintEl.classList.add('is-shown');      // gợi ý trên đỉnh: nút từ chối giấu trong thư

        // Nản mới có dòng "không tìm thấy nút" — hiện sớm quá thì chẳng ai chịu tìm
        this.huntTimer = setTimeout(() => this.giveUpBtn.classList.add('is-shown'),
            this.options.hunt.giveUpAfter || 9000);
        return this;
    }

    _endHunt() {
        this.hunting = false;
        clearTimeout(this.huntTimer);
        this.letterEl.classList.remove('is-hunting');
        this.actionsEl.classList.remove('is-shown');
        this.hintEl.classList.remove('is-shown');
        this.giveUpBtn.classList.remove('is-shown');
    }

    /**
     * Hai khe rách giấu nút, % của tờ giấy: chọn ngẫu nhiên (khác nhau) trong
     * App.Letter.NOTCHES rồi lưu, nên chơi lại cũng ở đúng hai khe đó. Giá trị đã lưu không
     * còn khớp khe nào (đổi ảnh giấy…) thì chọn lại; không lưu được thì đổi mỗi phiên.
     */
    _notches() {
        const KEY = 'kt-luyna:notches';
        const list = App.Letter.NOTCHES;
        const has = (p) => p && list.some((n) => n.x === p.x && n.y === p.y);
        try {
            const p = JSON.parse(localStorage.getItem(KEY));
            if (p && has(p.a) && has(p.b) && !(p.a.x === p.b.x && p.a.y === p.b.y)) return p;
        } catch (e) { /* chưa có hoặc hỏng thì chọn lại */ }

        const pool = list.slice();
        const pick = () => pool.splice(Math.floor(Math.random() * pool.length), 1)[0];
        const pos = { a: pick(), b: pick() };
        try { localStorage.setItem(KEY, JSON.stringify(pos)); } catch (e) { /* bỏ qua */ }
        return pos;
    }

    _huntDone(how) {
        if (!this.hunting) return;
        this._endHunt();
        this.answer(how);
    }

    /**
     * Mò ra một khe rách và bấm trúng: nút lộ ra là "Đồng ý", rồi camera sang khe còn
     * lại — ở đó mới là nút "Từ chối".
     */
    _found(clicked, other) {
        this._zoomTour([
            { el: clicked, label: this.options.hunt.accept, accept: true, hold: App.Letter.ZOOM_HOLD },
            { el: other, label: this.options.hunt.decline, accept: false, hold: App.Letter.ZOOM_HOLD + 600 }
        ], 'found');
    }

    /** Nản, bấm "không tìm thấy": zoom tới khe có nút "Từ chối" cho xem */
    _giveUp() {
        this._zoomTour([
            { el: this.tinyB, label: this.options.hunt.decline, accept: false, hold: App.Letter.ZOOM_HOLD }
        ], 'giveUp');
    }

    /**
     * Camera lần lượt lao tới từng nút giấu rồi lộ nó ra, giữa các chặng thì zoom ra hẳn.
     * Nút được vẽ cỡ thường nhưng thu nhỏ 32 lần, nên zoom đúng 32 lần là nó hiện ra
     * cỡ thật. Xong cả chuyến thì báo `how` và đóng dấu.
     * @param {{el: Element, label: string, accept: boolean, hold: number}[]} tour
     * @param {string} how  kết quả báo về: 'found' | 'giveUp'
     */
    _zoomTour(tour, how) {
        if (!this.hunting || this.busy) return;
        this.busy = true;
        this.actionsEl.classList.remove('is-shown');   // cho cảnh zoom được sạch, khỏi vướng nút
        this.hintEl.classList.remove('is-shown');

        if (this.reduced) {            // không có chuyển động thì không zoom, đồng ý luôn
            this.camTimers.push(setTimeout(() => { this.busy = false; this._huntDone(how); }, 600));
            return;
        }

        const Z = App.Letter.TINY_SCALE;
        const IN = App.Letter.ZOOM_IN, OUT = App.Letter.ZOOM_OUT;
        const camR = this.camEl.getBoundingClientRect();
        // Đo vị trí từng nút lúc camera còn đứng yên
        const centers = tour.map((step) => {
            const r = step.el.getBoundingClientRect();
            return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
        });
        const at = (ms, fn) => this.camTimers.push(setTimeout(fn, ms));

        // Bỏ lớp riêng của tờ thư để nó được vẽ lại sắc nét ở cỡ phóng đại
        this.letterEl.style.willChange = 'auto';

        let t = 400;
        tour.forEach((step, i) => {
            const c = centers[i];
            at(t, () => {
                // Camera đang đứng yên nên đổi tâm phóng lúc này không thấy giật
                this.camEl.style.transition = 'none';
                this.camEl.style.transformOrigin = (c.x - camR.left) + 'px ' + (c.y - camR.top) + 'px';
                void this.camEl.offsetWidth;
                step.el.textContent = step.label;
                step.el.classList.toggle('is-accept', step.accept);
                step.el.classList.add('is-revealed');
                this.camEl.style.transition = 'transform ' + IN + 'ms cubic-bezier(.65,0,.25,1)';
                this.camEl.style.transform = 'translate(' + (innerWidth / 2 - c.x) + 'px,'
                    + (innerHeight / 2 - c.y) + 'px) scale(' + (1 / Z) + ')';
            });
            t += IN + step.hold;
            at(t, () => {
                this.camEl.style.transition = 'transform ' + OUT + 'ms cubic-bezier(.45,0,.2,1)';
                this.camEl.style.transform = 'none';
            });
            t += OUT;
            at(t, () => step.el.classList.remove('is-revealed'));
            t += 350;
        });
        at(t, () => { this.busy = false; this._huntDone(how); });
    }

    /** Đưa máy quay về chỗ cũ ngay lập tức (đóng thư giữa chừng, mở lại…) */
    _resetCam() {
        this.camTimers.forEach(clearTimeout);
        this.camTimers = [];
        this.busy = false;
        this.camEl.style.transition = 'none';
        this.camEl.style.transform = 'none';
        this.letterEl.style.willChange = '';
        this.tinyA.classList.remove('is-revealed');
        this.tinyB.classList.remove('is-revealed');
    }

    /**
     * Có người trả lời lời mời — đường nào cũng là đồng ý. Con dấu đóng xuống
     * kèm một cú nảy của tờ thư; từ đây thư mới được phép đóng.
     * @param {'accept'|'giveUp'|'found'} how  người xem đi đường nào tới đây
     */
    answer(how) {
        if (this.answered) return this;
        this.answered = true;
        this.answers[this.key] = true;

        this.stampEl.classList.remove('is-set');
        void this.stampEl.offsetWidth;
        this.stampEl.classList.add('is-stamping');
        this.letterEl.classList.remove('is-thump');
        void this.letterEl.offsetWidth;
        this.letterEl.classList.add('is-thump');

        // Lời nhắn hiện một lúc rồi trả về dòng "chạm ra ngoài để đóng"
        clearTimeout(this.noteTimer);
        this.tipEl.textContent = this.options.note || '';
        this.tipEl.classList.add('is-shown');
        this.noteTimer = setTimeout(() => {
            this.tipEl.classList.remove('is-shown');
            this.noteTimer = setTimeout(() => {
                this.tipEl.textContent = this.options.tip || '';
                this.tipEl.classList.add('is-shown');
            }, 500);
        }, 4200);

        document.dispatchEvent(new CustomEvent('letter:answer', {
            detail: { key: this.key, how: how }
        }));
        return this;
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
        this.penEl.style.width = lw * .42 * App.Letter.PEN_CANVAS + 'px';
        this.stampEl.style.setProperty('--stamp-size', lw * .062 + 'px');
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

        // Viết xong: trả lời rồi thì hiện dòng nhắc đóng thư; chưa thì đợi người xem
        // đọc một lát rồi bật popup xác nhận
        if (this.answered) {
            this.tipEl.classList.add('is-shown');
        } else {
            clearTimeout(this.askTimer);
            this.askTimer = setTimeout(() => {
                if (this.isOpen && !this.answered && this.options.onRead) this.options.onRead(this.key);
            }, this.options.askDelay || 1500);
        }
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

/**
 * pen.webp có nướng sẵn bóng đổ nên canvas rộng hơn cây bút gốc (1264 / 1024
 * lần). Cây bút giữ nguyên cỡ trên màn hình nhờ nhân bề rộng với hệ số này.
 */
App.Letter.PEN_CANVAS = 1264 / 1024;

/** Vị trí đầu ngòi trong pen.webp, tính theo tỉ lệ 0→1 của canvas đã nới */
App.Letter.PEN_TIP = { x: .1622, y: .8904 };

/**
 * Nút từ chối được vẽ cỡ thường rồi thu nhỏ còn 1/24 (xem .letter__tiny trong
 * letter.css). Zoom đúng ngần ấy lần thì nó trở lại cỡ thật.
 */
App.Letter.TINY_SCALE = 1 / 32;
App.Letter.ZOOM_IN = 2000;     // ms máy quay lao tới một nút giấu
App.Letter.ZOOM_HOLD = 1800;   // ms đứng lại cho người xem nhìn thấy nút
App.Letter.ZOOM_OUT = 1000;    // ms zoom ra
App.Letter.CLOSE_RELOAD_MS = 600;   // chờ thư mờ hẳn (transition .6s) rồi app mới tải lại trang

/**
 * Các khe rách ở mép tờ giấy (% của khung paper.webp) — nơi giấu nút. Dò từ kênh alpha
 * của paper.webp: mép giấy bị lõm vào hơn đường mép chung ≥ 14 px (ở khung 1024 × 1536),
 * đủ rộng để nút ~3 px lọt hẳn vào khoảng trống,
 * toạ độ đặt giữa khe, phía ngoài mép, nơi chỉ còn nền tối. Đổi ảnh giấy thì dò lại.
 */
App.Letter.NOTCHES = [
    { x: 3.2,  y: 22.9 },   // mép trái
    { x: 4.3,  y: 50.3 },   // mép trái, khe sâu nhất
    { x: 2.9,  y: 70.4 },   // mép trái, chỗ giấy quăn
    { x: 96.9, y: 49.6 },   // mép phải
    { x: 96.8, y: 73.1 }    // mép phải
];

/** Thời gian nhấc bút sang dòng mới, giây */
App.Letter.HOP = .34;
