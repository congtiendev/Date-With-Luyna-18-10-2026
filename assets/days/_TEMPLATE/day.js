/**
 * MẪU MỘT NGÀY — chép cả thư mục này, đổi tên thành YYYY-MM-DD-ten-ngan,
 * rồi thêm tên thư mục đó vào mảng `days` trong assets/js/config.js.
 *
 * Phần trong ngoặc dưới đây là JSON thuần: chỉ dùng dấu nháy kép,
 * không dấu phẩy thừa ở cuối, không viết hàm hay biến vào đây.
 */
App.Days.register({
    "date": "2026-01-01",

    "title": "Tên của ngày",
    "subtitle": "Nơi chốn, thời điểm — dòng phụ ngắn",

    "summary": "Một câu hiện ngay trên biển trạm khi tàu dừng lại.",

    "story": [
        "Đoạn kể thứ nhất, hiện trong popup khi mở trạm.",
        "Đoạn kể thứ hai. Thêm bớt bao nhiêu đoạn cũng được."
    ],

    "scene": "journey",
    "position": 0.5,

    "station": {
        "image": "photos/station.webp",
        "height": "min(48vh, 55vw)",
        "baseline": 0.7764,
        "content": { "left": 0.0716, "right": 0.9290 },
        "sign": { "x": 0.4883, "y": 0.4214, "width": 0.1432, "height": 0.0459 },
        "spans": [
            { "scene": "journey", "at": 0.5 }
        ]
        // "at" là 0 → 1 dọc theo dải ảnh;
        // dùng { "seam": 0 } để đặt đúng chỗ nối giữa ảnh 1 và ảnh 2
    },

    // Lịch hẹn hiện trên lá thư khi tàu dừng ở trạm này; bỏ trống thì không có thư.
    // style: "greet" (dòng chào, chữ to hơn) | "sign" (chữ kí, thụt vào) | bỏ trống
    "letter": [
        { "text": "Gửi Luyna thân iu,", "style": "greet" },
        { "text": "18h45 : Việc đầu tiên" },
        { "text": "Kí tên: Kong Tien", "style": "sign" }
    ],

    "photos": [
        { "src": "photos/01.webp", "caption": "Chú thích ảnh" }
    ],

    "tags": []
});
