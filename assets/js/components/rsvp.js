/**
 * Rsvp — popup xác nhận tham gia buổi hẹn, bật lên sau khi thư được đọc xong.
 *
 * Nút "Đồng ý" hiện rõ ngay trên khung. Dưới khung có dòng nhỏ "Đi tìm nút từ
 * chối" — bấm vào thì popup đóng lại, rồi người xem phải đi săn nút Từ chối đã
 * được ngụy trang trên lá thư (xem Letter.startHunt()).
 *
 *   onAccept()  bấm "Đồng ý"
 *   onSeek()    bấm "Đi tìm nút từ chối"; gọi sau khi popup đã đóng hẳn
 */
window.App = window.App || {};

App.Rsvp = class Rsvp {
    /**
     * @param {Object} options
     * @param {string} options.frame   ảnh khung một nút
     * @param {string} options.title
     * @param {string} options.body    cho phép thẻ inline như <em>
     * @param {string} options.accept  chữ nút Đồng ý (trên tấm biển vàng)
     * @param {string} options.seek    chữ dòng "đi tìm nút từ chối"
     * @param {Function} [options.onAccept]
     * @param {Function} [options.onSeek]
     */
    constructor(options) {
        this.options = options;
        this.isOpen = false;

        this.el = document.createElement('div');
        this.el.className = 'overlay rsvp is-hidden';
        this.el.innerHTML =
            '<div class="rsvp__col">' +
                '<div class="modal" role="dialog" aria-modal="true">' +
                    '<img class="modal__frame" alt="">' +
                    '<div class="modal__text">' +
                        '<h1 class="modal__title"></h1>' +
                        '<div class="modal__divider"></div>' +
                        '<p class="modal__body"></p>' +
                    '</div>' +
                    '<button type="button" class="modal__btn modal__btn--single rsvp__accept"></button>' +
                '</div>' +
                '<button type="button" class="rsvp__seek"></button>' +
            '</div>';

        const q = (sel) => this.el.querySelector(sel);
        q('.modal').setAttribute('aria-labelledby', 'rsvp-title');
        q('.modal__frame').src = options.frame;
        q('.modal__title').id = 'rsvp-title';
        q('.modal__title').textContent = options.title;
        q('.modal__body').innerHTML = options.body;
        q('.rsvp__accept').textContent = options.accept;
        q('.rsvp__seek').textContent = options.seek;

        q('.rsvp__accept').addEventListener('click', () => this._close(options.onAccept));
        q('.rsvp__seek').addEventListener('click', () => this._close(options.onSeek));

        new Image().src = options.frame;
    }

    mount(root) {
        root.appendChild(this.el);
        return this;
    }

    open() {
        if (this.isOpen) return this;
        this.isOpen = true;
        this.el.classList.remove('is-hidden');
        return this;
    }

    /** Đóng popup, chờ nó mờ hẳn rồi mới báo — để việc tiếp theo không bị popup che */
    _close(done) {
        if (!this.isOpen) return;
        this.isOpen = false;
        this.el.classList.add('is-hidden');
        setTimeout(() => { if (done) done(); }, App.Rsvp.FADE_MS);
    }
};

App.Rsvp.FADE_MS = 650;   // phải khớp transition của .overlay
