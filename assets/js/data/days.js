/**
 * Days — lớp dữ liệu cho các trạm dừng, mỗi trạm là một ngày.
 *
 * Mỗi ngày là một thư mục riêng trong assets/days/, bên trong có:
 *   day.js     nội dung ngày đó (JSON bọc trong App.Days.register)
 *   photos/    ảnh của ngày đó
 *
 * Vì trang mở thẳng bằng file:// nên không dùng fetch() đọc .json được
 * (trình duyệt chặn CORS). Dữ liệu vì vậy để trong day.js — phần bên trong
 * vẫn là JSON thuần, sau này chạy qua server thì đổi sang .json không mất gì.
 *
 * Đường dẫn ảnh trong day.js viết tương đối với thư mục ngày
 * ('photos/01.webp'); loader tự nối tiền tố cho đúng.
 */
window.App = window.App || {};

App.Days = {
    base: 'assets/days/',

    all: [],      // tất cả ngày đã nạp, sắp theo ngày tăng dần
    byId: {},     // tra nhanh theo id (mặc định id = tên thư mục)

    _folder: null,   // thư mục đang nạp, để nối đường dẫn ảnh

    /** Mỗi file day.js gọi đúng một lần hàm này */
    register(day) {
        const folder = this._folder;
        if (!folder) {
            console.warn('[days] register() chỉ được gọi từ day.js trong thư mục ngày');
            return;
        }

        const missing = ['date', 'title'].filter((key) => !day[key]);
        if (missing.length) {
            console.warn('[days] ' + folder + ': thiếu trường ' + missing.join(', '));
        }

        const path = this.base + folder + '/';
        const entry = Object.assign({}, day, {
            id: day.id || folder,
            folder: folder,
            path: path,
            story: [].concat(day.story || []),
            letter: [].concat(day.letter || []),
            station: day.station ? Object.assign({}, day.station, {
                image: path + day.station.image
            }) : null,
            photos: (day.photos || []).map((photo) => {
                const item = (typeof photo === 'string') ? { src: photo } : Object.assign({}, photo);
                item.src = path + item.src;
                return item;
            })
        });

        this.all.push(entry);
        this.byId[entry.id] = entry;
    },

    /**
     * Nạp lần lượt các thư mục ngày khai báo ở config.days.
     * Nạp tuần tự (không song song) để biết chắc day.js nào đang chạy.
     * @param {string[]} folders
     * @param {Function} [done] gọi khi nạp xong, nhận mảng ngày đã sắp xếp
     */
    load(folders, done) {
        const queue = (folders || []).slice();

        const next = () => {
            if (!queue.length) {
                this._folder = null;
                this.all.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
                if (done) done(this.all);
                document.dispatchEvent(new CustomEvent('days:ready', { detail: this.all }));
                return;
            }

            const folder = queue.shift();
            this._folder = folder;

            const script = document.createElement('script');
            script.src = this.base + folder + '/day.js';
            script.onload = next;
            script.onerror = () => {
                console.warn('[days] không đọc được ' + script.src);
                next();
            };
            document.head.appendChild(script);
        };

        next();
    },

    /** Các ngày nằm trên một cảnh, đã sắp theo vị trí dọc cảnh */
    forScene(sceneKey) {
        return this.all
            .filter((day) => day.scene === sceneKey)
            .sort((a, b) => (a.position || 0) - (b.position || 0));
    }
};
