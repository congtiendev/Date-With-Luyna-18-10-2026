/**
 * Ngày mẫu để kiểm tra đường ống dữ liệu — thay toàn bộ nội dung
 * bên dưới bằng kỉ niệm thật, hoặc xoá thư mục này và bỏ tên nó
 * khỏi mảng `days` trong assets/js/config.js.
 */
App.Days.register({
    "date": "2026-10-18",

    "title": "Trạm đầu tiên",
    "subtitle": "Ngày mẫu — thay bằng kỉ niệm thật",

    "summary": "Trạm này chỉ để kiểm tra cấu trúc dữ liệu đã chạy thông.",

    "story": [
        "Chép thư mục assets/days/_TEMPLATE/ để tạo một ngày mới.",
        "Ảnh bỏ vào photos/ rồi khai báo trong mảng photos bên dưới."
    ],

    "scene": "journey",
    "position": 1,

    "station": {
        "image": "photos/station.webp",
        "height": "min(48vh, 55vw)",
        "baseline": 0.7764,
        "content": { "left": 0.0716, "right": 0.9290 },
        "sign": { "x": 0.4883, "y": 0.4214, "width": 0.1432, "height": 0.0459 },
        "spans": [
            { "scene": "journey", "at": { "seam": 0 } }
        ]
    },

    // Lịch hẹn hiện trên lá thư khi tàu dừng ở trạm này.
    // style: "greet" (dòng chào, chữ to hơn) | "date" (nơi, ngày viết, góc phải trên) |
    //        "sign" (chữ kí, thụt vào) | bỏ trống
    "letter": [
        { "text": "Hà Nội, ngày 15 tháng 10 năm 2026", "style": "date" },
        { "text": "Gửi Luyna thân iu,", "style": "greet" },
        { "text": "17h00 : Anh đón em" },
        { "text": "18h00 : Ăn tối tại La Libra Steak - Lạc Long Quân" },
        { "text": "20h00 : Skyon9 Rooftop Bar - Từ Hoa" },
        { "text": "22h30 : Đưa em về nhà" },
        { "text": "Kí tên: Kong Tien", "style": "sign" }
    ],

    "photos": [],

    "tags": []
});
