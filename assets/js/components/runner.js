/**
 * Runner — cho tàu tự chạy dọc cảnh rồi tự dừng ở trạm kế tiếp.
 *
 * Không dịch chuyển đầu tàu (đầu tàu đứng yên giữa khung hình), mà cuộn cảnh
 * phía sau — đúng cách tàu vẫn "chạy" từ đầu dự án tới giờ.
 *
 * Tàu vào ga có phanh: càng gần trạm thì tốc độ tối đa cho phép càng nhỏ
 * (v = căn bậc hai của 2·brake·quãng còn lại), nên tàu trôi êm vào ga
 * chứ không đứng khựng.
 */
window.App = window.App || {};

App.Runner = class Runner {
    /**
     * @param {Object} options
     * @param {number} [options.speed]  tốc độ tối đa, px mỗi giây
     * @param {number} [options.accel]  gia tốc lúc rời ga, px/giây²
     * @param {number} [options.brake]  giảm tốc lúc vào ga, px/giây²
     * @param {number} [options.crawl]  sàn tốc độ đoạn cuối, px/giây
     * @param {number} [options.gap]    px hở giữa mũi tàu và mép nhà ga
     * @param {number} [options.margin] px hở giữa nhà ga và mép phải màn hình
     * @param {Function} [options.nose] trả về hoành độ mũi đầu tàu trên màn hình
     * @param {Function} [options.onDepart]
     * @param {Function} [options.onArrive] nhận prop của trạm vừa tới
     * @param {Function} [options.onFinish] hết cảnh, không còn trạm nào
     */
    constructor(options) {
        this.options = Object.assign({
            speed: 320,
            accel: 260,
            brake: 200,
            crawl: 26,        // px/giây — sàn tốc độ đoạn cuối, để tàu vào hẳn ga
            gap: 10,          // px hở giữa mũi tàu và mép nhà ga
            margin: 24        // px hở giữa nhà ga và mép phải màn hình
        }, options);

        this.stage = null;
        this.state = 'idle';      // idle | running | arrived | finished
        this.velocity = 0;
        this.target = 0;
        // Giữ vị trí ở dạng số thực: scrollLeft bị làm tròn, những bước
        // dịch nhỏ hơn 1px lúc phanh sẽ mất sạch nếu cộng thẳng vào nó.
        this.pos = 0;
        this.arrivedAt = null;
        this._frame = null;
        this._last = 0;
    }

    attach(stage) {
        this.stage = stage;
        // Người dùng tự vuốt thì nhường quyền điều khiển lại cho họ
        ['pointerdown', 'wheel'].forEach((type) => {
            stage.el.addEventListener(type, () => {
                if (this.state === 'running') this.halt();
            }, { passive: true });
        });
        return this;
    }

    /**
     * Vị trí cuộn ứng với từng trạm, đã sắp từ gần tới xa.
     *
     * Tàu chạy tới SÁT nhà ga rồi mới dừng: mũi đầu tàu cách mép trái ga
     * đúng `gap` px. Cuộn càng nhiều thì ga càng dịch sang trái, nên:
     *   - byNose: cuộn tối đa cho phép, quá mức này là tàu lấn vào ga
     *   - byView: cuộn tối thiểu, dưới mức này ga còn tràn ra ngoài mép phải
     * Lấy giá trị LỚN HƠN để tàu tiến sát ga nhất có thể; màn hình hẹp quá
     * không chứa nổi cả hai thì byView thắng, ưu tiên nhìn thấy trọn nhà ga.
     */
    stops() {
        if (!this.stage) return [];

        const o = this.options;
        const view = this.stage.el.clientWidth;
        const max = this.stage.maxScroll;
        const nose = o.nose ? o.nose() : view * 0.5;

        return this.stage.props
            .filter(({ spec }) => spec.stop)
            .map(({ spec, el }) => {
                const width = el.offsetWidth;
                const centerX = parseFloat(el.style.left || 0);
                // Ảnh nhà ga có viền trong suốt hai bên, phải trừ ra
                const content = spec.content || { left: 0, right: 1 };
                const left = centerX - width / 2 + content.left * width;
                const right = centerX - width / 2 + content.right * width;

                const byNose = left - nose - o.gap;
                const byView = right - (view - o.margin);

                return {
                    spec: spec,
                    scroll: Math.max(0, Math.min(max, Math.max(byNose, byView)))
                };
            })
            .sort((a, b) => a.scroll - b.scroll);
    }

    /** Trạm gần nhất còn ở phía trước */
    nextStop() {
        const here = this.stage.scrollLeft + 8;
        return this.stops().find((stop) => stop.scroll > here) || null;
    }

    /** Rời ga, chạy tới trạm kế — hết trạm thì chạy tới cuối cảnh */
    depart() {
        if (!this.stage || this.state === 'running') return this;

        const next = this.nextStop();
        const max = this.stage.maxScroll;

        this.arrivedAt = null;
        this.pending = next;
        this.target = next ? next.scroll : max;

        if (this.target <= this.stage.scrollLeft + 1) {
            this._finish();
            return this;
        }

        this.state = 'running';
        this.velocity = 0;
        this.pos = this.stage.scrollLeft;
        this._last = 0;
        if (this.options.onDepart) this.options.onDepart();
        this._frame = requestAnimationFrame((t) => this._tick(t));
        return this;
    }

    /** Dừng ngay tại chỗ (người dùng tự vuốt hoặc rời trang) */
    halt() {
        cancelAnimationFrame(this._frame);
        this._frame = null;
        this.velocity = 0;
        if (this.state === 'running') this.state = 'idle';
        return this;
    }

    _tick(now) {
        if (this.state !== 'running') return;

        const dt = this._last ? Math.min(0.05, (now - this._last) / 1000) : 0;
        this._last = now;

        const o = this.options;

        // Người dùng vừa can thiệp thì bám theo vị trí thật
        if (Math.abs(this.pos - this.stage.scrollLeft) > 4) {
            this.pos = this.stage.scrollLeft;
        }

        const remain = this.target - this.pos;
        if (remain <= 0.5) {
            this.pos = this.target;
            this.stage.el.scrollLeft = this.target;
            this._arrive();
            return;
        }

        // Tốc độ tối đa cho phép ở quãng còn lại, để phanh vừa đúng lúc tới nơi.
        // Có sàn tối thiểu, không thì đoạn cuối tốc độ về 0 và tàu treo mãi.
        const brakeCap = Math.sqrt(2 * o.brake * remain);
        const cap = Math.max(o.crawl, Math.min(o.speed, brakeCap));
        this.velocity = Math.min(cap, this.velocity + o.accel * dt);

        this.pos = Math.min(this.target, this.pos + this.velocity * dt);
        this.stage.el.scrollLeft = this.pos;
        this._frame = requestAnimationFrame((t) => this._tick(t));
    }

    _arrive() {
        this.velocity = 0;
        this._frame = null;

        if (this.pending) {
            this.state = 'arrived';
            this.arrivedAt = this.pending;
            if (this.options.onArrive) this.options.onArrive(this.pending);
        } else {
            this._finish();
        }
    }

    _finish() {
        this.state = 'finished';
        this.velocity = 0;
        this._frame = null;
        if (this.options.onFinish) this.options.onFinish();
    }
};
