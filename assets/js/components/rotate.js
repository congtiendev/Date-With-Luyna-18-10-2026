/**
 * Rotate — nút "Xoay ngang" cho điện thoại cầm dọc.
 *
 * Cảnh hành trình là dải ngang nên xem ngang mới trọn vẹn. Bấm nút:
 *   - Android (có Fullscreen + Screen Orientation API): vào toàn màn hình rồi
 *     KHOÁ HƯỚNG NGANG — máy tự xoay.
 *   - iPhone (Safari không cho khoá hướng, cũng không có toàn màn hình cho
 *     trang web): hiện hướng dẫn tự xoay — cầm ngang, và nếu máy không chịu xoay
 *     thì tắt "Khoá hướng dọc" trong Trung tâm điều khiển.
 * Nút chỉ hiện khi máy cảm ứng đang cầm dọc (rotate.css lo việc ẩn/hiện);
 * hướng dẫn tự đóng ngay khi máy được xoay ngang.
 */
window.App = window.App || {};

App.Rotate = class Rotate {
    /**
     * @param {Object} options
     * @param {string} options.label   chữ trên nút
     * @param {string} options.title   tiêu đề hướng dẫn
     * @param {string} options.body    nội dung hướng dẫn
     * @param {string} options.ios     mẹo riêng cho iPhone
     * @param {string} options.confirm chữ nút đóng hướng dẫn
     */
    constructor(options) {
        this.options = options;

        this.button = document.createElement('button');
        this.button.type = 'button';
        this.button.className = 'rotate-btn';
        this.button.setAttribute('aria-label', options.label);
        this.button.innerHTML =
            '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" ' +
                'stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
                '<rect x="7" y="3" width="10" height="18" rx="2.2"/>' +
                '<path d="M11 18h2"/>' +
                '<path d="M20.5 9.5a9 9 0 0 0-3-4.2"/>' +
                '<path d="M20.8 4.6v3.6h-3.6"/>' +
            '</svg>' +
            '<span class="rotate-btn__text"></span>';
        this.button.querySelector('.rotate-btn__text').textContent = options.label;

        this.hint = document.createElement('div');
        this.hint.className = 'rotate-hint is-hidden';
        this.hint.setAttribute('role', 'dialog');
        this.hint.setAttribute('aria-modal', 'true');
        this.hint.innerHTML =
            '<div class="rotate-hint__phone" aria-hidden="true"></div>' +
            '<h2 class="rotate-hint__title"></h2>' +
            '<p class="rotate-hint__body"></p>' +
            '<p class="rotate-hint__ios"></p>' +
            '<button type="button" class="rotate-hint__ok"></button>';
        this.hint.querySelector('.rotate-hint__title').textContent = options.title;
        this.hint.querySelector('.rotate-hint__body').textContent = options.body;
        this.hint.querySelector('.rotate-hint__ios').textContent = options.ios;
        this.hint.querySelector('.rotate-hint__ok').textContent = options.confirm;

        this.button.addEventListener('click', () => this.rotate());
        this.hint.addEventListener('click', () => this.hideHint());

        // Máy được xoay ngang thì hướng dẫn hết việc
        const landscape = matchMedia('(orientation: landscape)');
        const onChange = (e) => { if (e.matches) this.hideHint(); };
        if (landscape.addEventListener) landscape.addEventListener('change', onChange);
        else if (landscape.addListener) landscape.addListener(onChange);   // Safari < 14
    }

    mount(root) {
        root.appendChild(this.button);
        root.appendChild(this.hint);
        return this;
    }

    /** Thử tự xoay; không được thì hiện hướng dẫn */
    rotate() {
        const el = document.documentElement;
        const o = window.screen && screen.orientation;

        if (el.requestFullscreen && o && o.lock) {
            const enter = document.fullscreenElement ? Promise.resolve() : el.requestFullscreen();
            return enter
                .then(() => o.lock('landscape'))
                .catch(() => this.showHint());
        }
        this.showHint();
        return Promise.resolve();
    }

    showHint() {
        this.hint.classList.remove('is-hidden');
    }

    hideHint() {
        this.hint.classList.add('is-hidden');
    }
};
