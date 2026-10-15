/**
 * Veil — lớp sáng phủ kín màn hình để chuyển cảnh cho mượt:
 * sáng dần lên, đổi cảnh phía sau, rồi tan dần đi.
 */
window.App = window.App || {};

App.Veil = class Veil {
    constructor() {
        this.el = document.createElement('div');
        this.el.className = 'veil';
    }

    mount(root) {
        root.appendChild(this.el);
        return this;
    }

    /**
     * @param {Function} onCovered chạy khi màn hình đã sáng kín — lúc đổi cảnh
     * @param {Function} onCleared chạy khi lớp sáng đã tan hết
     */
    sweep(onCovered, onCleared) {
        const t = App.config.timing;

        this.el.classList.remove('is-fading');
        this.el.classList.add('is-on');

        setTimeout(() => {
            if (onCovered) onCovered();
            requestAnimationFrame(() => {
                this.el.classList.add('is-fading');
                this.el.classList.remove('is-on');
            });
        }, t.veilCover);

        setTimeout(() => {
            if (onCleared) onCleared();
        }, t.veilClear);

        return this;
    }
};
