#!/usr/bin/env python3
"""
Nén ảnh cho web: PNG/JPG  ->  WebP.

Ảnh gốc do AI sinh ra nặng 2-4MB mỗi tấm, mở trên điện thoại rất lâu.
WebP giữ nguyên độ trong suốt (alpha) mà nhẹ hơn khoảng 8-10 lần.

Mỗi nhóm ảnh có mức nén và cỡ tối đa riêng, khai trong RULES bên dưới:
cỡ tối đa lấy theo chỗ ảnh thật sự hiện trên màn (xem cột "hiện ở đâu"),
nhân đôi cho màn Retina rồi làm tròn lên — để dư nữa chỉ tốn dung lượng
chứ mắt không thấy đẹp hơn.

Dùng:
    python3 tools/optimize-images.py            # xem trước, không đụng file
    python3 tools/optimize-images.py --write    # tạo file .webp
    python3 tools/optimize-images.py --write --delete-originals

Thêm ảnh cho ngày mới cũng chạy lại lệnh này, ảnh nào đã có .webp mới hơn
thì bỏ qua (trừ khi thêm --force).
"""

import argparse
import os
import sys

try:
    from PIL import Image
except ImportError:
    sys.exit('Thiếu Pillow. Cài bằng: pip3 install --user Pillow')

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SOURCE_EXT = ('.png', '.jpg', '.jpeg')

# (tiền tố đường dẫn, chất lượng, cạnh dài tối đa hoặc None nếu giữ nguyên cỡ)
RULES = [
    # Phông cảnh chạy full màn hình, ảnh gốc đã phải phóng to lên -> giữ nguyên cỡ.
    ('assets/images/scenes/',       80, None),
    # Khung popup rộng tối đa 780px CSS -> 1280px là vừa đủ cho màn Retina.
    ('assets/images/frames/',       82, 1280),
    # Bánh xe chỉ rộng 64% đầu tàu (và 28% trên toa) -> 768px là dư.
    ('assets/images/train-wheels/', 80, 768),
    # Đầu tàu và toa: rộng tối đa ~600px CSS trên desktop, ~830px thiết bị trên điện thoại.
    ('assets/images/locomotive',    80, 1280),
    ('assets/images/train-carriage', 80, 1280),
    # Khói cao tối đa bằng khung tàu -> 864px là dư.
    ('assets/images/smoke/',        78, 864),
    # Nhà ga cao tối đa 48vh.
    ('assets/days/',                82, 1152),
]
DEFAULT_RULE = (82, None)


def rule_for(rel_path):
    for prefix, quality, max_side in RULES:
        if rel_path.startswith(prefix):
            return quality, max_side
    return DEFAULT_RULE


def collect():
    found = []
    for folder, _dirs, files in os.walk(os.path.join(ROOT, 'assets')):
        for name in sorted(files):
            if name.lower().endswith(SOURCE_EXT):
                full = os.path.join(folder, name)
                found.append((full, os.path.relpath(full, ROOT).replace(os.sep, '/')))
    return sorted(found, key=lambda item: item[1])


def convert(src, quality, max_side, write):
    image = Image.open(src)
    size = image.size

    if max_side and max(size) > max_side:
        scale = max_side / max(size)
        size = (round(size[0] * scale), round(size[1] * scale))
        if write:
            image = image.resize(size, Image.LANCZOS)

    dest = os.path.splitext(src)[0] + '.webp'
    if write:
        # alpha_quality=100: viền mềm của khói và đầu tàu không bị rỗ.
        image.save(dest, 'WEBP', quality=quality, alpha_quality=100, method=6)
    return dest, size


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--write', action='store_true', help='thật sự ghi file .webp')
    parser.add_argument('--delete-originals', action='store_true',
                        help='xoá PNG/JPG gốc sau khi đã tạo .webp')
    parser.add_argument('--force', action='store_true',
                        help='nén lại cả ảnh đã có .webp mới hơn')
    args = parser.parse_args()

    files = collect()
    if not files:
        print('Không tìm thấy ảnh PNG/JPG nào trong assets/')
        return

    total_before = total_after = 0
    skipped = 0

    for src, rel in files:
        quality, max_side = rule_for(rel)
        dest = os.path.splitext(src)[0] + '.webp'

        if (not args.force and os.path.exists(dest)
                and os.path.getmtime(dest) >= os.path.getmtime(src)):
            skipped += 1
            continue

        before = os.path.getsize(src)
        dest, size = convert(src, quality, max_side, args.write)
        after = os.path.getsize(dest) if args.write else 0

        total_before += before
        total_after += after

        note = f'{size[0]}x{size[1]}'
        if args.write:
            print(f'{rel:52s} {before/1024/1024:6.2f}MB -> '
                  f'{after/1024:7.1f}KB  q{quality} {note}')
            if args.delete_originals:
                os.remove(src)
        else:
            print(f'{rel:52s} {before/1024/1024:6.2f}MB  sẽ nén q{quality} {note}')

    if skipped:
        print(f'\nBỏ qua {skipped} ảnh đã có .webp mới hơn (thêm --force để nén lại).')

    if args.write:
        print(f'\nTổng: {total_before/1024/1024:.1f}MB -> {total_after/1024/1024:.1f}MB '
              f'(còn {total_after/total_before*100:.1f}%)' if total_before else '\nKhông có gì để nén.')
        if not args.delete_originals:
            print('Ảnh gốc vẫn còn. Xoá bằng --delete-originals khi đã xem lại thấy ổn.')
    else:
        print('\nĐây mới là xem trước. Thêm --write để nén thật.')


if __name__ == '__main__':
    main()
