/**
 * Control — nút điều khiển chuyến tàu ở đáy màn hình.
 * Đổi chữ theo trạng thái: chưa chạy → "Khởi hành", đang dừng ở trạm →
 * "Chạy tiếp", hết hành trình → báo đã tới cuối.
 */
window.App = window.App || {};

App.Control = class Control {
    /**
     * @param {Object} options
     * @param {Object} options.labels  { depart, resume, running, finished }
     * @param {Function} options.onClick
     */
    constructor(options) {
        this.labels = options.labels || {};
        this.state = 'idle';

        this.el = document.createElement('button');
        this.el.type = 'button';
        this.el.className = 'control';
        this.el.innerHTML = '<span class="control__icon">&#9654;</span>'
                          + '<span class="control__text"></span>';
        this.textEl = this.el.querySelector('.control__text');

        this.el.addEventListener('click', () => {
            if (this.state === 'running' || this.state === 'finished') return;
            if (options.onClick) options.onClick(this.state);
        });

        this.setState('idle');
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

    /** @param {'idle'|'running'|'arrived'|'finished'} state */
    setState(state) {
        this.state = state;
        this.el.classList.toggle('is-busy', state === 'running');
        this.el.classList.toggle('is-done', state === 'finished');
        this.el.disabled = (state === 'running' || state === 'finished');

        const label = {
            idle: this.labels.depart,
            running: this.labels.running,
            arrived: this.labels.resume,
            finished: this.labels.finished
        }[state];

        this.textEl.textContent = label || '';
        return this;
    }
};
