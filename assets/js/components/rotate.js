/**
 * Rotate — nút "Xoay ngang" cho điện thoại cầm dọc.
 *
 * Bấm là cả giao diện xoay 90° bằng CSS (App.Orient) — KHÔNG phụ thuộc hệ điều hành có
 * cho xoay màn hình hay không: iPhone đang khoá hướng dọc, Android tắt tự xoay… đều
 * xoay được. Bấm lần nữa thì quay về dọc ("Xoay dọc"). Máy xoay ngang thật thì giao
 * diện tự về bình thường và nút tự ẩn (rotate.css lo việc ẩn/hiện).
 */
window.App = window.App || {};

App.Rotate = class Rotate {
    /**
     * @param {Object} options
     * @param {string} options.label      chữ trên nút khi giao diện đang dọc
     * @param {string} options.labelBack  chữ trên nút khi giao diện đang bị xoay ngang
     */
    constructor(options) {
        this.options = options;

        this.button = document.createElement('button');
        this.button.type = 'button';
        this.button.className = 'rotate-btn';
        this.button.innerHTML =
            '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" ' +
                'stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
                '<rect x="7" y="3" width="10" height="18" rx="2.2"/>' +
                '<path d="M11 18h2"/>' +
                '<path d="M20.5 9.5a9 9 0 0 0-3-4.2"/>' +
                '<path d="M20.8 4.6v3.6h-3.6"/>' +
            '</svg>' +
            '<span class="rotate-btn__text"></span>';
        this.textEl = this.button.querySelector('.rotate-btn__text');

        this.button.addEventListener('click', () => App.Orient.toggle());
        document.addEventListener('orient:change', () => this._label());
        this._label();
    }

    _label() {
        const text = App.Orient.forced ? this.options.labelBack : this.options.label;
        this.textEl.textContent = text;
        this.button.setAttribute('aria-label', text);
    }

    mount(root) {
        root.appendChild(this.button);
        return this;
    }
};
