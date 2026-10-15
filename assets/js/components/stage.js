/**
 * Stage — một màn cảnh cuộn ngang, có thể ghép nhiều ảnh thành một dải liền.
 *
 * Mặt cầu trong các bức tranh không nằm cùng độ cao (ảnh 1: y=507, ảnh 2: y=576
 * trên tổng 724). Stage tự canh: lấy dải cao nhất mà mọi ảnh đều phủ được,
 * đẩy từng ảnh lên/xuống cho mặt cầu trùng nhau, phần thừa bị khung cảnh xén đi.
 * Nhờ vậy tàu chạy suốt hai ảnh mà không phải nhảy độ cao.
 */
window.App = window.App || {};

App.Stage = class Stage {
    constructor(options) {
        this.options = options;
        this.locked = true;
        this.active = false;
        this.ratio = 0;
        this.onScroll = null;
        this.props = [];

        this.el = document.createElement('div');
        this.el.className = 'stage is-locked';
        if (options.id) this.el.id = options.id;

        const scene = document.createElement('div');
        scene.className = 'stage__scene';
        this.scene = scene;

        const list = options.images || [{
            src: options.image,
            alt: options.alt,
            rail: options.rail
        }];

        /* ---------- Canh mặt ray của các ảnh về cùng một độ cao ---------- */
        const rails = list.map((item) => item.rail).filter((r) => typeof r === 'number');
        let band = 1;      // phần chiều cao ảnh gốc còn giữ lại sau khi xén
        let railMin = 0;

        if (rails.length) {
            railMin = Math.min.apply(null, rails);
            band = 1 - (Math.max.apply(null, rails) - railMin);
        }

        // Mặt ray sau khi canh, tính theo chiều cao khung nhìn
        this.rail = rails.length ? railMin / band : null;
        scene.style.setProperty('--band', band.toFixed(5));

        this.slices = list.map((item, i) => {
            const img = document.createElement('img');
            img.className = 'stage__slice' + (list.length === 1 ? ' stage__slice--only' : '');
            img.decoding = 'async';
            img.src = item.src;
            img.alt = item.alt || (i === 0 ? (options.alt || '') : '');

            const shift = (typeof item.rail === 'number') ? item.rail - railMin : 0;
            if (shift) img.style.setProperty('--shift', shift.toFixed(5));

            // Lật ngang: dùng khi nối lại chính bức vừa rồi. Mép trái của bản
            // lật chính là mép phải của bản gốc, nên chỗ nối khớp từng nét vẽ.
            if (item.flip) img.style.transform = 'scaleX(-1)';

            // Hoà mép hai ảnh vào nhau cho khỏi lộ vết ghép.
            // Ảnh bị lật thì mask cũng lật theo, nên phải đổi chiều gradient,
            // không thì vệt hoà rơi sang mép bên kia.
            if (i > 0 && options.blend) {
                const dir = item.flip ? 'to left' : 'to right';
                const fade = 'linear-gradient(' + dir + ', transparent 0, #000 '
                           + options.blend + ')';
                img.style.marginLeft = 'calc(-1 * ' + options.blend + ')';
                img.style.maskImage = fade;
                img.style.webkitMaskImage = fade;
            }

            img.addEventListener('load', () => this.layoutProps());
            scene.appendChild(img);
            return img;
        });

        this.el.appendChild(scene);
        this.image = this.slices[0];

        (options.props || []).forEach((prop) => this.addProp(prop));

        // Chốt lại vị trí vật khi mọi ảnh đã tải xong
        window.addEventListener('load', () => this.layoutProps());

        this._bindDrag();
        this._bindWheel();
        this._bindScroll();
        this._bindResize();
    }

    /**
     * Vật thể đặt lên cảnh (nhà ga, cột mốc…).
     * @param {Object} prop
     * @param {string} prop.image
     * @param {number|Object} prop.at  0 → 1 dọc theo dải, hoặc { seam: 0 } để đặt
     *                                 đúng chỗ nối giữa hai ảnh
     * @param {string} prop.height     chiều cao ảnh, ví dụ '48vh'
     * @param {number} prop.baseline   0 → 1, chỗ chạm đất trong ảnh (mặc định 1)
     * @param {Object} [prop.label]    chữ khắc lên vật: { text, x, y, width, height }
     *                                 toạ độ tính theo tỉ lệ của chính ảnh vật đó
     */
    addProp(prop) {
        const baseline = (prop.baseline === undefined ? 1 : prop.baseline) * 100;

        const holder = document.createElement('div');
        holder.className = 'stage__prop';
        holder.style.height = prop.height;
        holder.style.top = ((this.rail || 1) * 100) + '%';
        holder.style.transform = 'translate(-50%, -' + baseline + '%)';

        const img = document.createElement('img');
        img.decoding = 'async';
        img.src = prop.image;
        img.alt = prop.alt || '';
        img.style.height = prop.height;

        holder.appendChild(img);

        // Chữ khắc lên vật (biển hiệu nhà ga…), cỡ chữ co giãn theo cỡ vật
        if (prop.label && prop.label.text) {
            const L = prop.label;
            holder.style.setProperty('--prop-h', prop.height);

            const label = document.createElement('span');
            label.className = 'stage__prop-label';
            label.textContent = L.text;
            label.style.left = (L.x * 100) + '%';
            label.style.top = (L.y * 100) + '%';
            label.style.width = (L.width * 100) + '%';
            label.style.height = (L.height * 100) + '%';
            holder.appendChild(label);
        }

        this.scene.appendChild(holder);

        this.props.push({ spec: prop, el: holder });
        this.layoutProps();
        return holder;
    }

    /** Đặt lại toạ độ ngang cho các vật — đo thật nên chuẩn ở mọi cỡ màn hình */
    layoutProps() {
        if (!this.props.length) return;
        const total = this.scene.offsetWidth;
        if (!total) return;

        this.props.forEach(({ spec, el }) => {
            let x;
            if (spec.at && typeof spec.at === 'object' && spec.at.seam !== undefined) {
                x = this.seamX(spec.at.seam);
            } else {
                x = (spec.at || 0) * total;
            }
            el.style.left = Math.round(x) + 'px';
        });
    }

    /** Toạ độ ngang của chỗ nối thứ k (0 = giữa ảnh 1 và ảnh 2) */
    seamX(index) {
        const next = this.slices[index + 1];
        if (!next) return this.scene.offsetWidth;
        // Mép trái ảnh kế tiếp đã lùi vào bằng đúng bề rộng vùng hoà,
        // nên tâm vùng hoà là chính giữa chỗ nối.
        const blend = this.slices[index].offsetLeft + this.slices[index].offsetWidth;
        return (blend + next.offsetLeft) / 2;
    }

    get maxScroll() {
        return Math.max(0, this.el.scrollWidth - this.el.clientWidth);
    }

    get scrollLeft() {
        return this.el.scrollLeft;
    }

    get atEnd() {
        const max = this.maxScroll;
        return max > 60 && this.el.scrollLeft >= max - App.config.timing.endTolerance;
    }

    get canInteract() {
        return this.active && !this.locked;
    }

    mount(root) {
        root.appendChild(this.el);
        return this;
    }

    activate() {
        this.active = true;
        this.el.classList.add('is-active');
        return this;
    }

    deactivate() {
        this.active = false;
        this.el.classList.remove('is-active');
        return this;
    }

    lock(locked) {
        this.locked = locked;
        this.el.classList.toggle('is-locked', locked);
        return this;
    }

    scrollTo(left, smooth = true) {
        this.el.scrollTo({ left, behavior: smooth ? 'smooth' : 'auto' });
        return this;
    }

    nudge(delta) {
        this.el.scrollLeft += delta;
        return this;
    }

    /** Hơi phóng to rồi thu về — dùng khi cảnh vừa được mở ra */
    playEntrance() {
        this.el.classList.add('is-entering');
        this.el.scrollLeft = 0;
        requestAnimationFrame(() => this.el.classList.remove('is-entering'));
        return this;
    }

    /* ---------- Kéo ngang bằng chuột / bút ---------- */
    _bindDrag() {
        let dragging = false, startX = 0, startScroll = 0;

        this.el.addEventListener('pointerdown', (e) => {
            // Cảm ứng để trình duyệt tự cuộn cho mượt
            if (!this.canInteract || e.pointerType === 'touch') return;
            dragging = true;
            startX = e.clientX;
            startScroll = this.el.scrollLeft;
            this.el.classList.add('is-dragging');
            this.el.setPointerCapture(e.pointerId);
        });

        this.el.addEventListener('pointermove', (e) => {
            if (!dragging) return;
            this.el.scrollLeft = startScroll - (e.clientX - startX);
        });

        const endDrag = (e) => {
            if (!dragging) return;
            dragging = false;
            this.el.classList.remove('is-dragging');
            if (e.pointerId !== undefined && this.el.hasPointerCapture(e.pointerId)) {
                this.el.releasePointerCapture(e.pointerId);
            }
        };
        this.el.addEventListener('pointerup', endDrag);
        this.el.addEventListener('pointercancel', endDrag);
        this.el.addEventListener('dragstart', (e) => e.preventDefault());
    }

    /* ---------- Lăn chuột dọc -> cuộn ngang ---------- */
    _bindWheel() {
        this.el.addEventListener('wheel', (e) => {
            if (!this.canInteract) return;
            if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
                this.el.scrollLeft += e.deltaY;
                e.preventDefault();
            }
        }, { passive: false });
    }

    _bindScroll() {
        this.el.addEventListener('scroll', () => {
            const max = this.maxScroll;
            if (max > 0) this.ratio = this.el.scrollLeft / max;
            if (this.onScroll) this.onScroll(this);
        }, { passive: true });
    }

    /** Đổi kích thước cửa sổ: giữ nguyên vị trí tương đối đang xem */
    _bindResize() {
        window.addEventListener('resize', () => {
            this.el.scrollLeft = this.ratio * this.maxScroll;
            this.layoutProps();
        });
    }
};
