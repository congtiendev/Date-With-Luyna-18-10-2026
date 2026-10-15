/**
 * Modal — popup lồng trong khung tranh.
 * Nút được đặt đúng vị trí tấm biển vàng có sẵn trên ảnh khung:
 *   single -> khung 1 nút, left / right -> khung 2 nút.
 */
window.App = window.App || {};

App.Modal = class Modal {
    /**
     * @param {Object} options
     * @param {string} options.frame   đường dẫn ảnh khung
     * @param {string} options.title
     * @param {string} options.body    cho phép thẻ inline như <em>
     * @param {Array}  options.buttons [{ label, slot: 'single'|'left'|'right', onClick }]
     */
    constructor(options) {
        const uid = 'modal-' + Math.random().toString(36).slice(2, 8);

        this.el = document.createElement('div');
        this.el.className = 'overlay is-hidden';

        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-modal', 'true');
        modal.setAttribute('aria-labelledby', uid);

        const frame = document.createElement('img');
        frame.className = 'modal__frame';
        frame.src = options.frame;
        frame.alt = '';

        const text = document.createElement('div');
        text.className = 'modal__text';
        text.innerHTML =
            '<h1 class="modal__title" id="' + uid + '"></h1>' +
            '<div class="modal__divider"></div>' +
            '<p class="modal__body"></p>';
        text.querySelector('.modal__title').textContent = options.title;
        text.querySelector('.modal__body').innerHTML = options.body;

        modal.appendChild(frame);
        modal.appendChild(text);

        this.buttons = {};
        (options.buttons || []).forEach((cfg) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'modal__btn modal__btn--' + cfg.slot;
            btn.textContent = cfg.label;
            if (cfg.onClick) btn.addEventListener('click', cfg.onClick);
            this.buttons[cfg.slot] = btn;
            modal.appendChild(btn);
        });

        this.el.appendChild(modal);
    }

    get isOpen() {
        return !this.el.classList.contains('is-hidden');
    }

    mount(root) {
        root.appendChild(this.el);
        return this;
    }

    open(delay = 0) {
        if (delay > 0) {
            setTimeout(() => this.el.classList.remove('is-hidden'), delay);
        } else {
            this.el.classList.remove('is-hidden');
        }
        return this;
    }

    close() {
        this.el.classList.add('is-hidden');
        return this;
    }
};
