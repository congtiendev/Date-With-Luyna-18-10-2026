# Timeline — KongTien X Luyna

Trang kỉ niệm tĩnh, mở thẳng `index.html` bằng trình duyệt là chạy (không cần build,
không cần server — script để ở dạng classic nên `file://` vẫn nạp được).

## Cấu trúc

```
index.html                      vỏ trang, chỉ chứa <div id="app"> và các thẻ script
sw.js                           service worker — cache ảnh/mã cho lần mở sau
assets/
├── css/
│   ├── main.css                điểm gom, @import các phần bên dưới
│   ├── base.css                biến màu, font, reset
│   └── components/
│       ├── stage.css           màn cảnh cuộn ngang
│       ├── progress.css        vạch tiến độ trên đỉnh
│       ├── guide.css           dải hướng dẫn vuốt
│       ├── modal.css           popup khung tranh + vị trí nút trên tấm biển vàng
│       ├── rotate.css          nút xoay ngang + hướng dẫn xoay (chỉ máy cảm ứng cầm dọc)
│       ├── rsvp.css            popup xác nhận
│       ├── letter.css          lá thư lịch hẹn + chỗ chữ trên tờ giấy
│       ├── train.css           đầu tàu + bánh xe đặt trên đường ray
│       ├── smoke.css           cột khói trên ống khói
│       ├── control.css         nút khởi hành / chạy tiếp
│       └── veil.css            lớp sáng phủ lúc chuyển cảnh
├── js/
│   ├── config.js               lời thoại, đường dẫn ảnh, mốc thời gian, danh sách ngày
│   ├── data/
│   │   └── days.js             nạp các thư mục ngày, chuẩn hoá đường dẫn ảnh
│   ├── components/
│   │   ├── stage.js            Stage — kéo thả, lăn chuột, vuốt cảm ứng
│   │   ├── progress.js         Progress — set(0..1)
│   │   ├── guide.js            Guide — show / hide / flash / nhắc khi đứng yên
│   │   ├── modal.js            Modal — dựng popup từ ảnh khung + danh sách nút
│   │   ├── rsvp.js             Rsvp — popup "đi tìm nút" (cuộc săn nút nằm ở letter.js)
│   │   ├── rotate.js           Rotate — nút xoay ngang + hướng dẫn xoay
│   │   ├── device.js           Device — chặn zoom và những chỗ riêng của iOS
│   │   ├── sound.js            Sound — tiếng tàu chạy, lặp và vào/ra êm
│   │   ├── preload.js          Preload — giải mã sẵn ảnh lúc máy rảnh
│   │   ├── letter.js           Letter — thư bay ra khi tàu dừng, bút viết lịch hẹn
│   │   ├── train.js            Train — đổi pha bánh xe theo quãng đường đã vuốt
│   │   ├── smoke.js            Smoke — cột khói, đổi dáng và ngả theo nhịp tàu
│   │   ├── runner.js           Runner — tàu tự chạy, tự phanh vào ga
│   │   ├── control.js          Control — nút khởi hành / chạy tiếp
│   │   └── veil.js             Veil — sweep(onCovered, onCleared)
│   └── app.js                  ghép các component lại thành luồng màn welcome
├── images/
│   ├── scenes/                 ảnh nền cuộn ngang (2172×724)
│   ├── frames/                 ảnh khung popup (1536×1024)
│   ├── locomotive.webp         thân đầu tàu (1536×1024)
│   ├── train-carriage.webp     toa nối phía sau (1536×1024)
│   ├── audio/                  train-sound.mp3 — tiếng tàu chạy (10,5 giây, lặp)
│   ├── letter/                 paper.webp (1024×1536), paper-shadow.webp (bóng đổ), pen.webp (đã nướng bóng)
│   ├── train-wheels/           5 khung bánh xe (1536×1024)
│   └── smoke/                  3 dáng cột khói (768×1152): 3, 4, 6
└── days/                       mỗi trạm dừng là một ngày, một thư mục
    ├── _TEMPLATE/              mẫu để chép ra khi thêm ngày mới
    │   ├── day.js
    │   └── photos/
    └── 2026-08-04-ngay-dau-tien/
        ├── day.js
        └── photos/
tools/
└── optimize-images.py          nén ảnh PNG/JPG sang .webp cho nhẹ
```

## Luồng hiện tại

1. Mở trang → vào thẳng cảnh, hiện ngay hướng dẫn vuốt sang phải;
   vạch tiến độ chạy theo lượng đã vuốt.
2. Vuốt tới cuối ảnh nền → popup **hỏi lên tàu** (khung 2 nút).
   - **Chưa vội** → đóng popup, lùi lại một đoạn để vuốt tiếp; tới cuối lần nữa sẽ hỏi lại.
   - **Sẵn sàng** → lớp sáng phủ lên rồi mở ra cảnh `De-sterrennacht-1.webp`,
     đồng thời phát sự kiện `journey:start` trên `document`.

Điều khiển: kéo chuột, vuốt cảm ứng, lăn chuột, phím `←` `→` `End`,
`Enter` để xác nhận popup, `Esc` để đóng popup hỏi lên tàu.

## Đầu tàu trên đường ray

Đường ray là mép cầu cạn trong tranh, đo bằng vệt sáng mép cầu và chân các cột đèn:
**ảnh 1 ở y = 507 / 724**, **ảnh 2 ở y = 576 / 724** — hai bức không cùng độ cao.
Stage canh lại (xem mục dưới) rồi báo mốc chung qua `stage.rail`; `train.setRail()`
ghi vào biến `--rail` để tàu đứng đúng ray. Ảnh nền luôn co theo chiều cao
(`height: 100dvh`) nên tỉ lệ này không đổi dù cửa sổ rộng hẹp thế nào.

Đầu tàu **đứng yên giữa khung hình**, cảnh chạy phía sau khi vuốt — nên tàu trông như
đang chạy về phía trước. Bánh xe cũng không tự quay: `Train.travel(scrollLeft)` đổi pha
bánh theo quãng đường đã vuốt, ngừng vuốt là bánh đứng lại (`distancePerFrame` trong config).

Hình học ghép ảnh (đừng sửa lẻ một chỗ, các số này liên quan nhau):

| Con số | Ý nghĩa |
|---|---|
| khung `.train` | đúng bằng ảnh thân tàu, 1536 × 1024 đơn vị |
| `64%` | lớp bánh xe thu nhỏ còn 64% — bánh gốc to gần bằng cả thân tàu |
| `top: 40.53%`, `left: 17.98%` | vị trí lớp bánh sau khi thu nhỏ, canh giữa theo chiều ngang |
| `z-index` | bánh xe (2) đè lên thân tàu (1), như đầu máy hơi nước thật |
| `84.22%` | đáy bánh xe trong khung — dùng cho `translateY` để bánh chạm ray |
| gầm tàu | hạ thấp bằng cách kéo lớp bánh lên (giảm `top`); `top` càng nhỏ gầm càng thấp |

Cỡ đầu tàu chỉnh ở `config.train.height` (mặc định `min(36vh, 47vw)`), không cần sửa CSS.

Khung bánh số 5 được vẽ nhỏ hơn bốn khung kia khoảng 3 %, đã bù lại bằng
`transform` riêng trong `train.css` để bánh khỏi giật khi lăn.

### Cột khói

Mỗi ảnh trong `assets/images/smoke/` là **nguyên một cột khói**, gốc nhọn cắm vào
miệng ống khói — không phải từng cụm khói rời. Vì vậy khói ở đây **không bay tách ra**:
cột luôn dính liền ống khói, chỉ đổi dáng và lắc lư.

- Điểm neo `.smoke` đặt đúng miệng ống khói: **x = 1205/1536, y = 138/1024**
  trong khung `.train`.
- **Chỉ giữ 3 dáng: `3.webp`, `4.webp`, `6.webp`** (chọn từ bộ 7 dáng gốc). Chọn bằng
  cách canh gốc mọi ảnh về cùng một điểm rồi so từng cặp — bộ 3-4-6 lệch nhau **9.2**,
  các bộ khác 12–20. Ba dáng gần giống nhau nên đổi qua lại trông như khói cuộn tại chỗ;
  dùng nhiều dáng khác nhau thì cột khói đổi hình thấy rõ, rất xấu.
- Gốc cột mỗi ảnh nằm lệch nhau chút ít (y từ 0.813 đến 0.884), nên `App.Smoke.ROOTS`
  ghi gốc thật của từng ảnh và bù riêng cho từng dáng — không có bảng này thì
  đổi dáng xong cột khói sẽ rời khỏi ống khói. Bảng tra theo **tên file**, nên
  đổi hay bớt ảnh trong config cũng không lệch.
- Đổi dáng bằng cách **nhảy khung dứt khoát**, không mờ chồng — mờ chồng làm hai
  dáng đè nhau thành hình nhoè đôi, rất xấu. Đây là kiểu "boil" của hoạt hình vẽ tay:
  mỗi lúc chỉ thấy đúng một nét vẽ sắc. Khung chạy theo kiểu con thoi
  `1-2-3-2-1-2-3…` nên nhịp đều, kèm rung nhẹ ±10% cho khỏi máy móc.
  Chuyển động mượt đến từ `smoke-sway` uốn quanh gốc cột, không đến từ việc mờ.
- Tàu lăn bánh thì cột đổi dáng nhanh hơn và **ngả về sau** (`.smoke.is-leaning`).

Chỉnh ở `config.train.smoke`: `size` (chiều cao cột), `hold` / `holdRunning` (nhịp đổi
dáng), `opacity`, `lean` (độ ngả). Bỏ cả khối `smoke` đi là tắt khói.

### Toa nối phía sau

Số toa đặt ở `config.train.carriage.count` (đang là 2). Vị trí toa và bánh toa do
`train.js` tính (phụ thuộc số toa), các hằng số nằm ở `App.Train.CARRIAGE` —
suy ra từ toạ độ thật trong `train-carriage.webp`: thân toa x 107..1480, nóc y 238,
mép dưới khung gầm y 582, hai giá chuyển hướng ở x ≈ 394 và 1045.

| Con số | Ý nghĩa |
|---|---|
| `scale: 148` | phóng toa để nóc toa ngang nóc cabin đầu tàu |
| `pitch: 131.1` | mỗi toa lùi thêm bấy nhiêu % — đúng khoảng móc nối |
| `wheelScale: 28.2` | cỡ bánh toa, chọn sao cho **đúng nửa bánh** lộ ra dưới gầm |
| `wheelTop: 64.97` | đáy bánh toa trùng mặt ray, cùng mốc với bánh đầu tàu |
| `bogies` | vị trí hai cụm bánh của toa thứ nhất |

Khác đầu tàu ở hai điểm:

- **Bánh nằm sau thân toa** (`z-index: -1`), chỉ hở nửa dưới — đầu tàu thì ngược lại,
  bánh đè lên thân.
- Ảnh toa có sẵn cụm **bánh đĩa nhỏ** vẽ chìm ở đáy; đã cắt bỏ bằng `mask-image`
  ở mốc 56.4 % chiều cao ảnh, thay bằng bánh nan hoa cùng bộ với đầu tàu.
  Lớp `.train__carriage-lit` là bản sao chỉ lộ dải khung gầm, làm sáng lên
  để gầm toa không chìm vào nền cầu.

Cả đoàn đặt ở `left: 52%` nên toa cuối chạy tràn ra ngoài mép trái, chỉ còn thấy
khoảng **1/3** — để đoàn tàu trông như còn dài tiếp chứ không cụt.
Vế `min()` trong `left` lo cho màn hình hẹp: mũi đầu tàu không bao giờ bị tràn ra ngoài.

Bánh của **mọi cụm** (đầu tàu và từng giá chuyển hướng của từng toa) đổi khung cùng lúc
trong `Train.travel()`, nên cả đoàn lăn đồng bộ.

## Sửa nội dung / thêm cảnh

- Đổi chữ, đổi ảnh, chỉnh thời lượng hiệu ứng: sửa `assets/js/config.js`.
- Thêm cảnh mới: khai báo thêm trong `config.scenes`, tạo `new App.Stage(...)`
  trong `app.js` rồi gọi `goToStage(stageMới, 'lời hướng dẫn')`.

## Ghép nhiều ảnh thành một dải liền

Cảnh hành trình **không phải nhiều cảnh chuyển qua lại**, mà là nhiều ảnh nối liền
thành một dải cuộn duy nhất — tàu lướt qua chỗ nối như chưa hề có vết ghép.
Khai báo ở `config.scenes.journey`:

```js
journey: {
    blend: '170px',                       // bề rộng vùng hoà giữa hai ảnh
    images: [
        { src: '…/De-sterrennacht-1.webp', rail: 0.7003 },
        { src: '…/De-sterrennacht-2.webp', rail: 0.7956 },
        { src: '…/De-sterrennacht-2.webp', rail: 0.7956, flip: true }
    ]
}
```

`flip: true` **lật ngang** ảnh. Dùng khi nối lại chính bức vừa rồi để kéo dài
hành trình: mép trái của bản lật chính là mép phải của bản gốc, nên chỗ nối
khớp từng nét vẽ — nối thẳng bản không lật thì lộ vết cắt vì hai đầu ảnh khác
hẳn nhau. (Ảnh bị lật thì mask hoà mép cũng lật theo, nên `stage.js` đổi chiều
gradient cho ảnh đó, không thì vệt hoà rơi sang mép bên kia.)

Hiện dải dài **7748 px** (3 mảnh), cuộn được **6308 px** — trước khi nối bản lật
là 5222 / 3782.

Mỗi ảnh khai `rail` của **chính nó**. Stage tự lo phần còn lại:

1. Lấy dải cao nhất mà mọi ảnh đều phủ được: `band = 1 − (railMax − railMin)`.
   Với hai ảnh hiện tại: `band = 1 − (0.7956 − 0.7003) = 0.9047`, tức xén mất 9,5 %.
2. Phóng mỗi ảnh lên `100dvh / band` rồi đẩy lên `--shift = rail − railMin`,
   nên mặt cầu các ảnh trùng khít nhau. Phần thừa bị `.stage__scene`
   (`overflow: hidden`) xén đi — ảnh 1 mất đáy, ảnh 2 mất đỉnh.
3. Mốc ray chung sau khi canh: `stage.rail = railMin / band = 0.7741`.

Ảnh thứ hai trở đi lùi vào `-blend` và đeo `mask-image` gradient, nên hai bức
tan vào nhau thay vì đứt gãy. Thêm ảnh 3 chỉ việc nối thêm một dòng vào `images`.

## Trạm dừng — mỗi trạm một ngày

Mỗi ngày là **một thư mục riêng** trong `assets/days/`, tên đặt theo dạng
`YYYY-MM-DD-ten-ngan`. Tên thư mục chính là `id` của trạm.

```
assets/days/2026-08-04-ngay-dau-tien/
├── day.js        nội dung của ngày
└── photos/       ảnh của riêng ngày đó
```

### Thêm một ngày mới

1. Chép cả thư mục `assets/days/_TEMPLATE/`, đổi tên thành `YYYY-MM-DD-ten-ngan`.
2. Sửa nội dung trong `day.js`, bỏ ảnh vào `photos/`.
3. Chạy `python3 tools/optimize-images.py --write --delete-originals` để nén ảnh
   vừa bỏ vào sang `.webp`, rồi sửa đuôi file trong `day.js` cho khớp.
4. Thêm đúng tên thư mục đó vào mảng `days` trong `assets/js/config.js`.

Thứ tự khai báo trong `config.days` không quan trọng — loader tự sắp theo `date`.

### Cấu trúc dữ liệu một ngày

```json
{
  "date": "2026-08-04",
  "title": "Tên của ngày",
  "subtitle": "Nơi chốn, thời điểm — dòng phụ ngắn",
  "summary": "Một câu hiện trên biển trạm khi tàu dừng lại.",
  "story": ["Đoạn kể thứ nhất.", "Đoạn kể thứ hai."],
  "scene": "journey",
  "position": 0.35,
  "photos": [{ "src": "photos/01.webp", "caption": "Chú thích ảnh" }],
  "tags": []
}
```

| Trường | Bắt buộc | Ý nghĩa |
|---|---|---|
| `date` | có | `YYYY-MM-DD`, dùng để sắp thứ tự các trạm |
| `title` | có | tên trạm |
| `subtitle`, `summary` | không | dòng phụ và câu tóm tắt |
| `story` | không | mảng các đoạn văn; viết một chuỗi cũng được |
| `scene` | không | trạm nằm trên cảnh nào (khoá trong `config.scenes`) |
| `position` | không | 0 → 1, vị trí dọc theo chiều dài cảnh |
| `letter` | không | lịch hẹn viết trên lá thư khi tàu dừng ở trạm: `[{ text, style }]`, `style` là `greet` / `date` / `sign` / bỏ trống |
| `photos` | không | `"photos/01.webp"` hoặc `{ src, caption }` |
| `station` | không | nhà ga của trạm, xem bên dưới |
| `id` | không | mặc định lấy tên thư mục |

### Nhà ga của một trạm

```json
"station": {
  "image": "photos/station.webp",
  "height": "48vh",
  "baseline": 0.7764,
  "spans": [ { "scene": "journey", "at": { "seam": 0 } } ]
}
```

- `baseline` — chỗ chạm đất trong ảnh ga (đáy bệ ga ở y = 795 / 1024 = 0.7764);
  nhờ nó bệ ga hạ đúng mặt ray chứ không lơ lửng.
- `at` — `0 → 1` dọc theo dải, hoặc `{ "seam": 0 }` để đặt **đúng chỗ nối**
  giữa ảnh 1 và ảnh 2. Nhà ga đứng ngay mối nối vừa hợp cảnh vừa che luôn chỗ ghép.
- `sign` — vùng lòng biển hiệu để khắc chữ lên, tính theo tỉ lệ của chính ảnh ga:
  `{ "x": 0.4883, "y": 0.4214, "width": 0.1432, "height": 0.0459 }`.
  Chữ mặc định là **ngày của trạm** đổi sang cách đọc Việt (`2026-10-18` →
  `18-10-2026`); muốn chữ khác thì thêm `"text"` vào trong `sign`.
  Lòng bảng chỉ rộng 14.3 % bề ngang ảnh nên cỡ chữ phải nhỏ
  (`.034 × chiều cao ảnh ga` trong `stage.css`), để to hơn là tràn ra ngoài khung.
- Toạ độ ngang được `stage.layoutProps()` **đo thật** sau khi ảnh tải xong và mỗi lần
  đổi cỡ cửa sổ, nên không lệch ở bất kỳ màn hình nào.

Đường dẫn ảnh viết **tương đối với thư mục ngày**; loader tự nối tiền tố,
nên chuyển thư mục ngày đi đâu cũng không phải sửa đường dẫn.

### Dùng dữ liệu trong code

```js
App.Days.all              // tất cả ngày, đã sắp theo date tăng dần
App.Days.byId['2026-08-04-ngay-dau-tien']
App.Days.forScene('journey')   // các ngày của một cảnh, sắp theo position

document.addEventListener('days:ready', (e) => {
    // e.detail là mảng ngày — chỗ này sẽ dựng biển trạm lên cảnh
});
```

### Vì sao là `day.js` chứ không phải `day.json`

Trang mở thẳng bằng `file://`, mà ở chế độ đó trình duyệt chặn `fetch()` đọc file
cục bộ (CORS). Nên dữ liệu để trong `day.js`, bọc bởi `App.Days.register({...})` —
**phần bên trong vẫn là JSON thuần**. Khi nào chạy qua web server thật, muốn đổi
sang `.json` + `fetch` thì chỉ việc bóc lớp bọc, không phải viết lại nội dung.

## Chuyến tàu tự chạy

Nút ở đáy màn hình: **Khởi hành** → tàu tự chạy tới trạm kế rồi tự dừng →
**Chạy tiếp** → chạy tiếp tới trạm sau, hết trạm thì chạy tới cuối cảnh.
Người xem tự vuốt lúc nào cũng được: chạm tay vào là tàu nhường quyền điều khiển,
nút quay về *Khởi hành*.

Đầu tàu không dịch chuyển — `Runner` cuộn cảnh phía sau, đúng cách tàu vẫn
"chạy" từ đầu. Vào ga có phanh thật: tốc độ tối đa cho phép ở mỗi thời điểm là
`√(2·brake·quãng còn lại)`, nên tàu trôi êm vào ga chứ không đứng khựng.
Đoạn cuối có sàn tốc độ `crawl`, và vị trí được giữ ở dạng **số thực** —
`scrollLeft` bị làm tròn, những bước dịch nhỏ hơn 1px lúc phanh sẽ mất sạch
nếu cộng thẳng vào nó và tàu sẽ treo cách ga vài px.

### Tàu dừng ở đâu

Cuộn càng nhiều thì nhà ga càng dịch sang trái, nên có hai mốc:

| Mốc | Ý nghĩa |
|---|---|
| `byNose` | cuộn tối đa — quá mức này là mũi tàu lấn vào nhà ga |
| `byView` | cuộn tối thiểu — dưới mức này nhà ga còn tràn ra ngoài mép phải |

Lấy **giá trị lớn hơn** để tàu tiến sát ga nhất có thể (mũi tàu cách mép ga đúng
`gap` px). Màn hình hẹp quá không chứa nổi cả hai thì `byView` thắng — ưu tiên
nhìn thấy trọn nhà ga. Vì vậy đoàn tàu được đặt lệch trái (`left: 30%` trong
`train.css`): đặt giữa thì bên phải không còn chỗ, tàu sẽ che mất ga.

Ảnh nhà ga có viền trong suốt hai bên nên `day.js` phải khai
`"content": { "left": 0.0716, "right": 0.9290 }` — không có số này thì tàu
dừng hụt mất gần 42px.

## Điện thoại: nút xoay ngang và tối ưu cho iOS

**Nút "Xoay ngang"** (`App.Rotate`) hiện ở góc phải trên, chỉ khi máy cảm ứng đang cầm
dọc (`@media (pointer: coarse) and (orientation: portrait)`); xoay ngang là nút tự ẩn.
- **Android:** bấm nút → vào toàn màn hình rồi `screen.orientation.lock('landscape')`,
  máy tự xoay.
- **iPhone:** Safari không cho khoá hướng và không có toàn màn hình cho trang web, nên
  nút hiện hướng dẫn: cầm ngang, và nếu máy không xoay thì tắt "Khoá hướng dọc" trong
  Trung tâm điều khiển. Hướng dẫn tự đóng ngay khi máy xoay ngang.
- Chữ chỉnh ở `config.rotate`.

**Riêng cho iOS Safari:**

| Vấn đề | Cách xử lý |
|---|---|
| Tai thỏ / thanh Home che nút | `viewport-fit=cover` + `env(safe-area-inset-*)` cho dải hướng dẫn, nút Khởi hành, nút xoay, popup, thanh tiến độ |
| Kéo xuống thì trang "đàn hồi" lộ nền, thanh địa chỉ co giãn làm trang nhảy | `body` ghim cứng (`position: fixed; inset: 0`), `overscroll-behavior: none`; chiều cao dùng `dvh` (có dự phòng `vh`) |
| Zoom bằng hai ngón / chạm đúp phá bố cục (iOS bỏ qua `user-scalable=no`) | `App.Device`: chặn `gesturestart`, chạm đúp; `touch-action: manipulation` |
| Nháy xám khi chạm, menu "Lưu ảnh" khi giữ lâu | `-webkit-tap-highlight-color: transparent`, `-webkit-touch-callout: none` |
| Tiếng tàu bị chặn: iOS chỉ cho `play()` trong đúng lần chạm, mà tiếng bật từ chuyển động cuộn | Lần chạm đầu tiên phát thử một nhịp **câm** rồi dừng — từ đó trang phát tiếng lúc nào cũng được |
| iOS bỏ qua việc chỉnh `audio.volume` | Tiếng vào/ra dứt khoát hơn (không fade); bật/tắt vẫn đúng |
| Safari < 16 chưa có đơn vị `cqw` (chữ trong popup mất cỡ) | Mỗi dòng `cqw` có sẵn dòng dự phòng bằng `vw` ngay phía trên |
| Thêm vào Màn hình chính | Có `apple-mobile-web-app-capable` + `black-translucent`: mở như app, không còn thanh địa chỉ |
| Dải hướng dẫn tràn hai mép khi cầm dọc / đè lên đầu tàu khi cầm ngang | Cho xuống dòng, và dời lên đỉnh màn khi cầm ngang (màn thấp) |

Chưa thử trên iPhone thật — chỉ giả lập khung màn hình điện thoại bằng Chrome.

## Tiếng tàu chạy

`App.Sound` phát `assets/audio/train-sound.mp3` **lặp liên tục chừng nào tàu còn
lăn bánh**. Nó bám theo chính chuyển động của tàu (`Train.onMotion`, bật khi bánh
xe bắt đầu quay, tắt khi dừng quá 180 ms) nên cả hai trường hợp đều có tiếng:
tàu tự chạy tới trạm và người xem tự vuốt.

- Vào/ra bằng nhịp tăng/giảm âm lượng (`fadeIn` 350 ms, `fadeOut` 500 ms) để khỏi
  cụt tiếng; dừng thì giữ nguyên chỗ đang phát, lần chạy sau nối tiếp.
- Chuyển tab thì tạm dừng, quay lại mà tàu còn chạy thì phát tiếp.
- Chỉnh âm lượng và nhịp ở `config.sound`.
- Trình duyệt chặn âm thanh tới khi người xem bấm vào trang; luồng này luôn có
  lần bấm **Sẵn sàng** trước khi tàu chạy nên không vướng. iOS bỏ qua việc chỉnh
  âm lượng nên ở đó tiếng vào/ra dứt khoát hơn.
- File mp3 được trình duyệt xin từng khúc (Range), nên `sw.js` cố ý **không** cache
  loại yêu cầu này.

## Lá thư lịch hẹn

Tàu dừng ở trạm nào có khai `letter` trong `day.js` thì sau `timing.letterDelay`
(700 ms) một lá thư **bay ra từ đầu tàu**, bay ra giữa màn hình, rồi cây bút
viết lần lượt từng dòng. Lần đầu của mỗi ngày bút mới viết; mở lại lần sau thì
hiện luôn cả thư. Chạm ra ngoài tờ giấy: đang viết thì hiện nốt, viết xong rồi
thì đóng (hoặc `Esc`). Lúc thư mở, phím mũi tên không điều khiển cảnh phía sau.

Mỗi dòng là một khối `overflow: hidden`, JS nới dần bề rộng để chữ hiện ra theo
nét bút và dời cây bút tới đúng chỗ đang viết. Cỡ chữ tự co sao cho dòng dài
nhất vừa tờ giấy. Tham số bút nằm ở `App.Letter.PEN_TIP` (vị trí đầu ngòi) và
`App.Letter.HOP` (thời gian nhấc bút sang dòng mới).

### Popup xác nhận rồi săn nút Từ chối trên thư

Thư viết xong, **1,5 giây sau** (`config.letter.askDelay`) một popup bật lên (`App.Rsvp`,
`rsvp.js`): hỏi có đồng ý buổi hẹn không, nút **Đồng ý** hiện rõ trên tấm biển vàng, và dòng
**"Đi tìm nút từ chối 🔍"** dưới khung. Khung được phóng rộng tới 118% bề ngang màn (phần vẽ
chỉ chiếm ~79% ảnh) nên trên điện thoại chữ không bị nhỏ. **Mọi đường đều dẫn tới Đồng ý:**

- Bấm **Đồng ý** (trong popup) → con dấu đóng xuống thư.
- Bấm **Đi tìm nút từ chối** → popup đóng lại, cuộc săn nút bắt đầu trên chính lá thư
  (`Letter.startHunt()`). Nút **Đồng ý** hiện rõ dưới thư; trên tờ giấy thì **giấu hai nút bé
  tí** (vẽ cỡ thường rồi thu nhỏ 32 lần, hạt ~3 × 1,3 px) trong **hai khe rách khác nhau ở mép
  giấy** (`App.Letter.NOTCHES`, dò từ kênh alpha của `paper.webp`, chỉ lấy khe đủ rộng để nút
  lọt hẳn vào), tô đúng màu nền tối nên chìm vào khoảng trống.
- Suốt cuộc săn nút có **dòng gợi ý trên đỉnh màn hình** (`config.letter.hunt.hint`): *"Nút từ chối
  được giấu trong lá thư — hãy đi tìm nếu bạn muốn từ chối cuộc hẹn này"*. Dòng này ẩn đi khi camera
  zoom.
- **Cặp khe** được chọn ngẫu nhiên và **lưu `localStorage`** (`kt-luyna:notches`) nên chơi lại
  vẫn đúng hai khe đó. Xoá khoá này để đổi chỗ.
- Mò ra một trong hai khe và bấm trúng → camera **zoom 32 lần** tới, nút lộ ra là **"Đồng ý"**;
  rồi zoom ra, lao sang khe còn lại: ở đó mới là nút **"Từ chối"** ("nút từ chối ở đây cơ
  mà") — nhưng đã đồng ý rồi → đóng dấu.
- Nản: sau **9 giây** (`config.letter.hunt.giveUpAfter`) dòng **"Không tìm thấy nút từ chối? 🔍"**
  mới hiện ra. Bấm vào là đồng ý, RỒI camera mới zoom tới khe có nút "Từ chối" cho xem.
- Trả lời xong, **con dấu tròn "ĐÃ ĐỒNG Ý"** đóng xuống khoảng trống dưới chữ ký (không che
  tên). Chưa trả lời thì thư không đóng được.
- **Đóng thư là tải lại trang** (`App.Letter.CLOSE_RELOAD_MS` chờ thư mờ hẳn rồi `location.reload()`),
  nên mọi thứ quay về ban đầu.
- Trạng thái trả lời chỉ nằm trong bộ nhớ của phiên; **chỉ có chỗ giấu nút Từ chối** được lưu vào
  trình duyệt. Sự kiện `letter:answer` phát trên `document` với `detail.how` là
  `accept` / `giveUp` / `found`.

Chữ của popup chỉnh ở `config.rsvp`, của cuộc săn nút ở `config.letter.hunt`, nhịp zoom ở
`App.Letter.ZOOM_*`. Zoom đúng 32 lần mới trả nút về cỡ thật, nên đổi
`App.Letter.TINY_SCALE` thì phải đổi cả `scale(.03125)` trong `.letter__tiny`. Đổi ảnh giấy
thì phải dò lại `App.Letter.NOTCHES`.

### Chế độ thử: bỏ qua đoạn tàu chạy

Thêm vào địa chỉ trang, khỏi phải vuốt, lên tàu, chờ tàu vào ga:

| Địa chỉ | Làm gì |
|---|---|
| `index.html?test=letter` | thư mở ra, bút viết, rồi popup xác nhận bật lên |
| `index.html?test=rsvp` | thư hiện sẵn đủ chữ, popup xác nhận bật lên gần như tức thì |

Dùng ngày đầu tiên có khai `letter`. Tải lại trang là thử lại từ đầu (vì không lưu gì
vào trình duyệt). Không có tham số này thì trang chạy như bình thường.

## Ảnh: vì sao toàn `.webp`

Ảnh gốc do AI sinh ra là PNG 2–4 MB mỗi tấm, cả bộ **64 MB** — mở bằng 4G trên
điện thoại thì tàu hiện ra trước, khói lết vào sau, có khi không
vào nổi. Toàn bộ đã chuyển sang **WebP: 64 MB → 6,9 MB (còn ~11 %)**, mắt thường
không phân biệt được (đo PSNR sau khi ghép nền: 28–36 dB), độ trong suốt giữ
nguyên không mất một chút nào.

Nén bằng `tools/optimize-images.py`. Mỗi nhóm ảnh một mức riêng, khai trong
`RULES` ngay đầu file — cỡ tối đa lấy theo chỗ ảnh **thật sự hiện trên màn**,
nhân đôi cho màn Retina:

| Nhóm | Cỡ | Chất lượng |
|---|---|---|
| `scenes/` | giữ 2172×724 — chạy full màn hình, ảnh gốc vốn đã phải phóng to | 80 |
| `frames/` | 1536×1024 → **1280×853** — popup rộng tối đa 780 px CSS | 82 |
| đầu tàu, toa | 1536×1024 → **1280×853** | 80 |
| bánh xe | 1536×1024 → **768×512** — chỉ rộng 64% đầu tàu (28% trên toa) | 80 |
| `smoke/` | 768×1152 → **576×864** — cao tối đa bằng khung tàu | 78 |
| nhà ga | 1536×1024 → **1152×768** — cao tối đa `48vh` | 82 |

Thu nhỏ **đều cả hai chiều** nên mọi toạ độ phần trăm trong CSS vẫn đúng. Khói
bị thu nhỏ nhưng không lệch một li: mọi toạ độ trong
`App.Smoke.ROOTS` đều là **tỉ lệ 0→1** chứ không
phải số pixel, nên đổi cỡ ảnh không phải sửa gì. Các con số pixel còn sót trong
chú thích code (`y 282..1126`, `1205/1536`…) là đo trên **khung gốc**, giữ lại
để sau này còn dò lại được.

WebP chạy được trên mọi trình duyệt từ 2020 trở đi (Safari 14 / iOS 14 trở lên),
kể cả khi mở thẳng bằng `file://`.

Chạy lại lệnh này bất cứ lúc nào thêm ảnh mới; ảnh nào đã có `.webp` mới hơn thì
tự bỏ qua:

```bash
python3 tools/optimize-images.py                          # xem trước
python3 tools/optimize-images.py --write                  # nén thật
python3 tools/optimize-images.py --write --delete-originals
```

Ảnh PNG gốc vẫn nằm trong lịch sử git (commit `e9ad01a`), cần thì lấy lại được:
`git checkout e9ad01a -- assets/images/`.

## Chống giật trên điện thoại

Cảnh này chạy tốn nhất ở **bộ nhớ ảnh đã giải mã** và các **hiệu ứng làm mờ**
(`filter`, `backdrop-filter`) chạy lại **mỗi khung hình** trên lớp đang chuyển
động. Đã xử lý:

| Vấn đề | Cách xử lý |
|---|---|
| `drop-shadow` trên đầu tàu và toa — hai lớp này rung liên tục lúc tàu chạy, GPU làm mờ lại mỗi khung | **Nướng bóng đổ vào ảnh** (`locomotive.webp`, `train-carriage.webp`) |
| Toa dùng 2 ảnh chồng nhau + `mask` + `filter: brightness` để cắt bánh vẽ sẵn và làm sáng gầm | Gộp thành **một ảnh** đã nướng sẵn; bớt 2 lớp và 2 bộ lọc |
| Bánh xe 1536×1024 × 5 khung (dùng chung cho đầu tàu và 2 toa) | Thu còn 768×512: bộ nhớ giải mã từ ~31 MB xuống ~8 MB |
| `filter: drop-shadow` trên cả tờ thư — mỗi nét bút viết ra lại làm mờ cả tờ giấy | Bóng đổ tách thành ảnh nhỏ tĩnh `paper-shadow.webp`; bóng cây bút nướng vào `pen.webp` |
| `backdrop-filter: blur` toàn màn hình (popup, thư) và trên dải hướng dẫn / nút | Bỏ; tăng độ đậm nền cho khỏi lộ phía sau |
| Animation vô hạn (khói, dải hướng dẫn) vẫn chạy khi đã ẩn | `animation-play-state: paused` khi chưa hiện |
| Ảnh sau `visibility: hidden` chỉ giải mã khi hiện → khựng đúng lúc chuyển cảnh | `Preload` giải mã sẵn **lần lượt từng ảnh** lúc máy rảnh; thẻ ảnh để `decoding="async"` |

Bóng đổ nướng theo cỡ khung ảnh nên **co giãn theo cỡ tàu** — trên điện thoại bóng
nhỏ lại cùng tàu, trước đây bóng cố định theo pixel nên trông to quá.

### Cache cho lần mở sau

`sw.js` (service worker) giữ ảnh và mã trong cache của trình duyệt: lần mở thứ hai
gần như không tải gì. GitHub Pages không cho tự đặt header cache nên cách duy nhất
là qua service worker.

- Ảnh, font: **cache-first** — có sẵn thì dùng luôn.
- HTML / JS / CSS: **stale-while-revalidate** — hiện bản cache ngay, ngầm tải bản
  mới cho lần sau.
- **Thay ảnh mà giữ nguyên tên file thì phải đổi `VERSION` trong `sw.js`**, không
  thì người đã từng vào vẫn thấy ảnh cũ. Thêm ảnh mới vào `PRECACHE` nếu muốn
  tải sẵn lúc cài.
- Chỉ chạy qua `http(s)`; mở thẳng `file://` thì bỏ qua, trang vẫn chạy bình thường.
