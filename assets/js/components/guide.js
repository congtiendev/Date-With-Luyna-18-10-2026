/**
 * Guide — dải hướng dẫn vuốt ở đáy màn hình,
 * kèm hẹn giờ nhắc lại khi người dùng đứng yên quá lâu.
 */
window.App = window.App || {};

App.Guide = class Guide {
    constructor() {
        this.el = document.createElement('div');
        this.el.className = 'guide';
        this.el.innerHTML =
            '<span class="guide__hand">&#128072;</span>' +
            '<span class="guide__text"></span>' +
            '<span class="guide__arrow">&#10230;</span>';
        this.textEl = this.el.querySelector('.guide__text');
        this.idleTimer = null;
    }

    mount(root) {
        root.appendChild(this.el);
        return this;
    }

    /** Lùi lên trên để không đè lên nút điều khiển */
    raise(raised) {
        this.el.classList.toggle('is-raised', raised);
        return this;
    }

    show(text) {
        if (text) this.textEl.textContent = text;
        this.el.classList.add('is-visible');
        return this;
    }

    hide() {
        this.el.classList.remove('is-visible');
        return this;
    }

    /** Hiện rồi tự ẩn sau một lúc */
    flash(text, duration = 5400) {
        this.show(text);
        setTimeout(() => this.hide(), duration);
        return this;
    }

    /** Đặt lại đồng hồ nhắc vuốt; shouldRemind() quyết định có nhắc hay không */
    armIdle(shouldRemind, text) {
        this.clearIdle();
        this.idleTimer = setTimeout(() => {
            if (shouldRemind()) this.show(text);
        }, App.config.timing.idleHint);
        return this;
    }

    clearIdle() {
        clearTimeout(this.idleTimer);
        return this;
    }
};
