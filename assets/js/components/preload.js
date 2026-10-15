/**
 * Preload — giải mã sẵn ảnh trong lúc máy rảnh.
 *
 * Trình duyệt chỉ giải mã ảnh khi nó sắp hiện ra, mà ảnh của cảnh hành trình,
 * đầu tàu, khói, nhà ga… đều đang nằm sau lớp visibility:hidden. Không có bước
 * này thì đúng lúc lớp sáng tan ra, cả chục ảnh lớn cùng bị giải mã trên luồng
 * chính — màn hình khựng lại ngay chỗ đẹp nhất.
 *
 * Giải mã LẦN LƯỢT từng ảnh, mỗi ảnh một lượt rảnh, nên không ảnh nào làm
 * giật cảnh chào đang chạy. Máy bật tiết kiệm dữ liệu thì không giải mã trước.
 */
window.App = window.App || {};

App.Preload = {
    seen: new WeakSet(),
    queue: [],
    running: false,

    /** Xếp hàng mọi <img> trong root chưa được giải mã */
    warm(root) {
        const conn = navigator.connection;
        if (conn && conn.saveData) return this;

        root.querySelectorAll('img').forEach((img) => {
            if (this.seen.has(img)) return;
            this.seen.add(img);
            this.queue.push(img);
        });
        this._run();
        return this;
    },

    _idle(fn) {
        if (window.requestIdleCallback) requestIdleCallback(fn, { timeout: 1500 });
        else setTimeout(fn, 60);
    },

    _run() {
        if (this.running) return;
        this.running = true;

        const next = () => {
            const img = this.queue.shift();
            if (!img) { this.running = false; return; }

            // decode() tự chờ ảnh tải xong; ảnh lỗi thì bỏ qua, đừng kẹt hàng
            const done = img.decode ? img.decode().catch(() => {}) : Promise.resolve();
            done.then(() => this._idle(next));
        };
        this._idle(next);
    }
};
