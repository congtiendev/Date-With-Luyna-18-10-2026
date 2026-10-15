/**
 * Progress — vạch vàng mảnh trên đỉnh màn hình,
 * cho biết đã đi được bao nhiêu phần của cảnh hiện tại.
 */
window.App = window.App || {};

App.Progress = class Progress {
    constructor() {
        this.el = document.createElement('div');
        this.el.className = 'progress';
        this.el.innerHTML = '<i class="progress__bar"></i>';
        this.bar = this.el.querySelector('.progress__bar');
    }

    mount(root) {
        root.appendChild(this.el);
        return this;
    }

    show() {
        this.el.classList.add('is-visible');
        return this;
    }

    hide() {
        this.el.classList.remove('is-visible');
        return this;
    }

    /** @param {number} ratio 0 -> 1 */
    set(ratio) {
        this.bar.style.width = (Math.min(1, Math.max(0, ratio)) * 100).toFixed(2) + '%';
        return this;
    }
};
