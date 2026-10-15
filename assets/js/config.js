/**
 * Toàn bộ nội dung chữ, đường dẫn ảnh và các mốc thời gian nằm ở đây.
 * Muốn đổi lời thoại hay thay ảnh thì chỉ cần sửa file này.
 */
window.App = window.App || {};

App.config = {
    scenes: {
        welcome: {
            id: 'stageWelcome',
            image: 'assets/images/scenes/welcome-bg.webp',
            alt: 'Thành phố đêm đầy sao',
            endPrompt: true   // vuốt tới cuối cảnh này thì hỏi lên tàu
        },
        /**
         * Cảnh hành trình là NHIỀU ẢNH GHÉP LIỀN thành một dải cuộn duy nhất.
         * Mặt cầu mỗi bức nằm một độ cao khác nhau (ảnh 1: y=507, ảnh 2: y=576
         * trên tổng 724) nên mỗi ảnh khai `rail` riêng — Stage tự đẩy ảnh
         * lên xuống cho mặt cầu trùng nhau rồi xén phần thừa.
         * `blend` là bề rộng vùng hoà giữa hai ảnh, để không lộ vết ghép.
         * Thêm ảnh 3 chỉ việc nối thêm một dòng vào mảng images.
         */
        journey: {
            id: 'stageJourney',
            alt: 'Đêm đầy sao',
            blend: '170px',
            images: [
                { src: 'assets/images/scenes/De-sterrennacht-1.webp', rail: 0.7003 },
                { src: 'assets/images/scenes/De-sterrennacht-2.webp', rail: 0.7956 },
                // Nối lại chính bức số 2 nhưng LẬT NGANG cho hành trình dài gấp rưỡi.
                // Mép trái của bản lật là mép phải của bản gốc nên chỗ nối khớp
                // từng nét vẽ — nối thẳng bản không lật thì lộ vết cắt.
                { src: 'assets/images/scenes/De-sterrennacht-2.webp', rail: 0.7956, flip: true }
            ]
        }
    },

    /**
     * Các trạm dừng — mỗi trạm là một ngày, mỗi ngày một thư mục
     * trong assets/days/. Thêm ngày mới: chép assets/days/_TEMPLATE/
     * thành YYYY-MM-DD-ten-ngan rồi thêm đúng tên thư mục đó vào đây.
     * Thứ tự trong mảng không quan trọng, loader tự sắp theo ngày.
     */
    days: [
        '2026-18-10'
    ],

    frames: {
        oneButton: 'assets/images/frames/modal-1-btn.webp',
        twoButton: 'assets/images/frames/modal-2-btn.webp'
    },

    train: {
        body: 'assets/images/locomotive.webp',
        // Toa nối phía sau đầu tàu. Toa cuối cố tình chạy tràn ra ngoài mép trái
        // để đoàn tàu trông như còn dài tiếp, không bị cụt.
        carriage: {
            image: 'assets/images/train-carriage.webp',
            count: 2
        },
        wheels: [
            'assets/images/train-wheels/1.webp',
            'assets/images/train-wheels/2.webp',
            'assets/images/train-wheels/3.webp',
            'assets/images/train-wheels/4.webp',
            'assets/images/train-wheels/5.webp'
        ],
        // Cột khói dựng trên ống khói khi tàu đang chạy.
        // Chỉ dùng 3 dáng GIỐNG NHAU nhất trong 7 dáng có sẵn (canh gốc rồi so
        // từng cặp: 3-4-6 lệch 9.2, các bộ khác 12-20). Dáng càng giống nhau
        // thì nhảy khung càng giống khói cuộn tại chỗ.
        smoke: {
            images: [
                'assets/images/smoke/3.webp',
                'assets/images/smoke/4.webp',
                'assets/images/smoke/6.webp'
            ],
            size: 0.85,       // chiều cao cột khói so với chiều cao khung tàu
            hold: 230,        // ms mỗi khung khói khi tàu đứng
            holdRunning: 140, // ms mỗi khung khói khi tàu đang lăn bánh
            opacity: 0.8,     // độ đậm của cột khói
            lean: 9           // độ ngả về sau khi tàu chạy
        },

        // Cỡ đầu tàu: chiều cao khung ảnh. Số vh càng lớn tàu càng to;
        // vế vw để trên màn hình dọc tàu không chiếm hết bề ngang.
        height: 'min(calc(36 * var(--vh)), calc(47 * var(--vw)))',
        distancePerFrame: 34   // vuốt bao nhiêu px thì bánh xe sang khung kế tiếp
    },

    // Tiếng tàu chạy: lặp liền mạch chừng nào tàu còn lăn bánh (tự chạy hay tự vuốt)
    sound: {
        src: 'assets/audio/train-sound.mp3',
        volume: 0.6,      // 0 → 1
        fadeIn: 350,      // ms nhỏ → to khi tàu rục rịch
        fadeOut: 500      // ms to → nhỏ khi tàu dừng
    },

    // Lá thư lịch hẹn hiện ra khi tàu dừng ở trạm; nội dung khai ở `letter` trong day.js
    letter: {
        paper: 'assets/images/letter/paper.webp',
        shadow: 'assets/images/letter/paper-shadow.webp',
        pen: 'assets/images/letter/pen.webp',
        tip: 'Chạm ra ngoài tờ thư để đóng 💛',
        // Viết xong, đợi chừng này ms cho người xem đọc rồi mới bật popup xác nhận
        askDelay: 1500,
        // Sau khi trả lời: con dấu tròn đóng lên thư, kèm lời nhắn bên dưới
        stamp: 'Đã đồng ý',
        note: 'Đã quá hú hú em iu ơi',

        // Cuộc săn nút Từ chối: nút Đồng ý hiện rõ dưới thư, nút Từ chối thì ngụy trang trên
        // tờ giấy (chỗ giấu ngẫu nhiên, lưu localStorage). Đường nào cũng ra đồng ý.
        // Nản thì sau `giveUpAfter` ms mới có dòng "không tìm thấy nút".
        hunt: {
            accept: 'Đồng ý',
            decline: 'Từ chối',
            giveUp: 'Không tìm thấy nút từ chối? 🔍',
            giveUpAfter: 9000,
            // Dòng gợi ý trên đỉnh màn hình suốt cuộc săn nút
            hint: 'Nút từ chối được giấu trong lá thư — hãy đi tìm nếu bạn muốn từ chối cuộc hẹn này'
        }
    },

    // Popup xác nhận buổi hẹn: nút Đồng ý hiện rõ; muốn từ chối thì bấm "đi tìm nút" —
    // popup đóng lại và người xem phải săn nút Từ chối đã ngụy trang trên lá thư.
    rsvp: {
        title: 'Xác nhận buổi hẹn',
        body: 'Bạn có đồng ý tham gia buổi hẹn <em>ngày 18-10-2026</em> không? '
            + 'Muốn từ chối thì tự đi tìm nút nhé 😌',
        accept: 'Đồng ý',
        seek: 'Đi tìm nút từ chối 🔍'
    },

    // Nút xoay ngang cho điện thoại cầm dọc: bấm là cả giao diện xoay 90° bằng CSS
    rotate: {
        label: 'Xoay ngang',
        labelBack: 'Xoay dọc'
    },

    boardModal: {
        title: 'Chuyến tàu đã đợi sẵn',
        body: 'Bạn đã sẵn sàng lên <em>chuyến tàu</em> khám phá hành trình chưa?',
        cancel: 'Chưa vội',
        confirm: 'Sẵn sàng'
    },

    // Tàu tự chạy và tự dừng ở trạm
    runner: {
        speed: 320,       // px mỗi giây, tốc độ tối đa
        accel: 260,       // px/giây², gia tốc lúc rời ga
        brake: 200,       // px/giây², giảm tốc lúc vào ga
        crawl: 26,        // px/giây, sàn tốc độ đoạn cuối để tàu vào hẳn ga
        gap: 10,          // px hở giữa mũi tàu và mép trái nhà ga
        margin: 24        // px hở giữa nhà ga và mép phải màn hình
    },

    control: {
        depart: 'Khởi hành',
        running: 'Tàu đang chạy…',
        resume: 'Chạy tiếp',
        finished: 'Đã tới cuối hành trình'
    },

    guide: {
        start: 'Vuốt sang phải để đi hết vùng đất kỉ niệm',
        keepGoing: 'Vuốt tiếp sang phải nhé',
        afterCancel: 'Cứ ngắm thêm, vuốt tới cuối khi nào bạn sẵn sàng',
        journey: 'Hành trình bắt đầu — vuốt sang phải'
    },

    timing: {
        endTolerance: 4,      // còn dưới ngần này px thì coi như đã chạm cuối đường
        resetGap: 240,        // lùi lại quá ngần này px thì cho hỏi lên tàu lại
        idleHint: 5000,       // đứng yên bao lâu thì nhắc vuốt tiếp
        askDelay: 350,        // chạm cuối bao lâu thì popup hiện
        letterDelay: 700,     // tàu vào ga bao lâu thì lá thư lịch hẹn bay ra
        veilCover: 1000,      // lớp sáng phủ kín màn hình
        veilClear: 2600,      // lớp sáng tan hết, mở lại tương tác
        keyStep: 90           // mỗi lần bấm phím mũi tên đi bao nhiêu px
    }
};
