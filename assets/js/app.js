/**
 * Luồng màn welcome:
 *   1. Mở trang  -> vào thẳng cảnh, hiện ngay hướng dẫn vuốt sang phải.
 *   2. Vuốt tới cuối đường -> popup hỏi đã sẵn sàng lên tàu chưa.
 *   3. "Sẵn sàng" -> lớp sáng phủ lên rồi mở ra cảnh hành trình.
 */
(function () {
    const cfg = App.config;
    const t = cfg.timing;
    const root = document.getElementById('app');

    /* ---------- Dựng các thành phần ---------- */
    const stages = {};
    Object.keys(cfg.scenes).forEach((key) => {
        stages[key] = new App.Stage(cfg.scenes[key]).mount(root);
        stages[key].key = key;
    });

    const progress = new App.Progress().mount(root);
    const guide    = new App.Guide().mount(root);
    const veil     = new App.Veil().mount(root);
    const train    = new App.Train(cfg.train).mount(root);

    const control = new App.Control({
        labels: cfg.control,
        onClick: () => leaveStation()
    }).mount(root);

    const runner = new App.Runner(Object.assign({}, cfg.runner, {
        // Mũi đầu tàu nằm ở 1507/1536 bề ngang khung .train
        nose: () => {
            const r = train.el.getBoundingClientRect();
            return r.left + r.width * 0.981;
        },
        onDepart: () => control.setState('running'),
        onArrive: (stop) => arriveStation(stop),
        onFinish: () => {
            control.setState('finished');
            guide.flash(cfg.guide.keepGoing, 3000);
        }
    }));

    const boardModal = new App.Modal({
        frame: cfg.frames.twoButton,
        title: cfg.boardModal.title,
        body: cfg.boardModal.body,
        buttons: [
            { slot: 'left',  label: cfg.boardModal.cancel,  onClick: dismissBoarding },
            { slot: 'right', label: cfg.boardModal.confirm, onClick: startJourney }
        ]
    }).mount(root);

    const letter = new App.Letter(cfg.letter).mount(root);

    let current = stages.welcome;
    let boardAsked = false;

    current.activate();
    beginExploring();

    /** 2026-06-28 -> 28-6-2026, đúng cách người Việt đọc ngày */
    function formatDate(iso) {
        const parts = String(iso || '').split('-');
        if (parts.length !== 3) return iso || '';
        return Number(parts[2]) + '-' + Number(parts[1]) + '-' + parts[0];
    }

    /* ---------- Nạp dữ liệu các trạm dừng ---------- */
    // Mỗi ngày tự khai đường dẫn ảnh nhà ga và chỗ nó đứng trong day.js.
    // `at` là 0 → 1 dọc theo dải, hoặc { seam: k } để đặt đúng chỗ nối hai ảnh.
    document.addEventListener('days:ready', (e) => {
        e.detail.forEach((day) => {
            const station = day.station;
            if (!station) return;

            (station.spans || []).forEach((span) => {
                const stage = stages[span.scene];
                if (!stage) {
                    console.warn('[days] ' + day.id + ': không có cảnh "' + span.scene + '"');
                    return;
                }
                stage.addProp({
                    image: station.image,
                    alt: day.title,
                    label: station.sign && Object.assign({}, station.sign, {
                        text: station.sign.text || formatDate(day.date)
                    }),
                    at: span.at,
                    height: station.height || '48vh',
                    baseline: station.baseline,
                    content: station.content,   // viền trong suốt hai bên ảnh ga
                    stop: true,       // Runner lấy các prop có cờ này làm điểm dừng
                    dayId: day.id
                });
            });
        });
    });
    App.Days.load(cfg.days);

    /* ---------- Theo dõi cuộn của cảnh đang xem ---------- */
    Object.values(stages).forEach((stage) => {
        stage.onScroll = (s) => {
            if (s !== current) return;
            progress.set(s.maxScroll > 0 ? s.ratio : 1);
            if (s.rail) train.travel(s.scrollLeft);
            if (!s.canInteract) return;

            if (s.scrollLeft > 40) guide.hide();
            armIdleHint();

            if (s.options.endPrompt && s.atEnd) {
                askBoarding();
            } else if (boardAsked && s.scrollLeft < s.maxScroll - t.resetGap) {
                boardAsked = false; // lùi lại khá xa -> chạm cuối lần sau sẽ hỏi lại
            }
        };
    });

    function armIdleHint() {
        guide.armIdle(
            () => current.canInteract && !boardAsked && !current.atEnd,
            cfg.guide.keepGoing
        );
    }

    /* ---------- Bước 2: vào thẳng cảnh, không qua popup chào mừng ---------- */
    function beginExploring() {
        current.lock(false).scrollTo(0);

        progress.show();
        guide.show(cfg.guide.start);
        armIdleHint();
    }

    /* ---------- Bước 3: chạm cuối đường ---------- */
    function askBoarding() {
        if (boardAsked) return;
        boardAsked = true;
        guide.clearIdle().hide();
        current.lock(true);
        boardModal.open(t.askDelay);
    }

    function dismissBoarding() {
        boardModal.close();
        current.lock(false);
        // Lùi nhẹ ra khỏi mép để còn chỗ vuốt tiếp
        current.scrollTo(Math.max(0, current.maxScroll - t.resetGap - 40));
        setTimeout(() => guide.flash(cfg.guide.afterCancel), 800);
    }

    /* ---------- Bước 4: lên tàu, chuyển sang cảnh hành trình ---------- */
    function goToStage(next, guideMessage) {
        const previous = current;
        previous.lock(true);
        guide.clearIdle().hide();
        progress.hide();

        veil.sweep(
            () => {
                next.playEntrance().activate();
                previous.deactivate();
                current = next;
                progress.set(0);
                // Đầu tàu chỉ đứng trên cảnh nào có đường ray
                if (next.rail) train.setRail(next.rail).show();
                else train.hide();
            },
            () => {
                current.lock(false);
                progress.show();
                if (guideMessage) guide.show(guideMessage);
                armIdleHint();

                // Cảnh nào có trạm thì mời người xem bấm khởi hành
                if (current.props.some(({ spec }) => spec.stop)) {
                    runner.attach(current);
                    control.setState('idle').show();
                    guide.raise(true);
                }
            }
        );
    }

    /* ---------- Tàu vào ga ---------- */
    function arriveStation(stop) {
        control.setState('arrived');
        guide.clearIdle().hide();

        const day = App.Days.byId[stop.spec.dayId];
        if (train.smoke) train.smoke.setRunning(false);
        if (day && day.letter.length) {
            // Chờ tàu đứng hẳn một nhịp rồi thư mới bay ra
            setTimeout(() => letter.open(day.letter, { key: day.id, from: train.el }), t.letterDelay);
        }
        document.dispatchEvent(new CustomEvent('station:arrive', { detail: day || null }));
    }

    /* ---------- Rời ga ---------- */
    function leaveStation() {
        runner.depart();
    }

    function startJourney() {
        boardModal.close();
        goToStage(stages.journey, cfg.guide.journey);
        document.dispatchEvent(new CustomEvent('journey:start'));
    }

    /* ---------- Phím tắt ---------- */
    window.addEventListener('keydown', (e) => {
        if (boardModal.isOpen) {
            if (e.key === 'Escape') dismissBoarding();
            if (e.key === 'Enter')  startJourney();
            return;
        }
        if (letter.isOpen || !current.canInteract) return;
        if (e.key === 'ArrowLeft')  current.nudge(-t.keyStep);
        if (e.key === 'ArrowRight') current.nudge(t.keyStep);
        if (e.key === 'End')        current.scrollTo(current.maxScroll);
    });

    // Để tiện gỡ lỗi và mở rộng thêm cảnh sau này
    App.flow = {
        stages, train, guide, progress, veil, control, runner, days: App.Days,
        goToStage, startJourney, askBoarding, arriveStation, leaveStation,
        current: () => current
    };
})();
