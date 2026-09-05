"""Derives a white version of the Birdie Open mark for use on the green header.

The source logo is a blue bird on a golf ball with the wordmark underneath.
The header already sets "Birdie Open" in type, so the wordmark is cropped away
and only the mark is kept, turned into a solid white silhouette with the ball's
outline left open so it still reads as a ball.
"""
import struct
import zlib

SOURCE = "public/logo.png"
WHITE_MARK = "public/logo-mark-white.png"
# Everything below this row is the wordmark and the tee stem running into it.
MARK_BOTTOM = 330
# How hard to push mid-tone ink up to solid white. 1.0 keeps the original weight.
INK_GAIN = 1.7


def read_png(path):
    data = open(path, "rb").read()
    pos, idat, width, height = 8, b"", 0, 0
    while pos < len(data):
        length = struct.unpack(">I", data[pos : pos + 4])[0]
        kind = data[pos + 4 : pos + 8]
        chunk = data[pos + 8 : pos + 8 + length]
        if kind == b"IHDR":
            width, height = struct.unpack(">II", chunk[:8])
        elif kind == b"IDAT":
            idat += chunk
        pos += 12 + length

    raw = zlib.decompress(idat)
    stride = width * 4
    out = bytearray(width * height * 4)
    prev = bytearray(stride)
    p = 0
    for y in range(height):
        filt = raw[p]
        p += 1
        line = bytearray(raw[p : p + stride])
        p += stride
        if filt == 1:
            for i in range(4, stride):
                line[i] = (line[i] + line[i - 4]) & 255
        elif filt == 2:
            for i in range(stride):
                line[i] = (line[i] + prev[i]) & 255
        elif filt == 3:
            for i in range(stride):
                a = line[i - 4] if i >= 4 else 0
                line[i] = (line[i] + ((a + prev[i]) >> 1)) & 255
        elif filt == 4:
            for i in range(stride):
                a = line[i - 4] if i >= 4 else 0
                b = prev[i]
                c = prev[i - 4] if i >= 4 else 0
                pp = a + b - c
                pa, pb, pc = abs(pp - a), abs(pp - b), abs(pp - c)
                pr = a if (pa <= pb and pa <= pc) else (b if pb <= pc else c)
                line[i] = (line[i] + pr) & 255
        out[y * stride : (y + 1) * stride] = line
        prev = line
    return width, height, out


def write_png(path, width, height, pixels):
    raw = b"".join(b"\x00" + bytes(pixels[y * width * 4 : (y + 1) * width * 4]) for y in range(height))

    def chunk(kind, payload):
        return (
            struct.pack(">I", len(payload))
            + kind
            + payload
            + struct.pack(">I", zlib.crc32(kind + payload) & 0xFFFFFFFF)
        )

    png = b"\x89PNG\r\n\x1a\n"
    png += chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0))
    png += chunk(b"IDAT", zlib.compress(raw, 9))
    png += chunk(b"IEND", b"")
    open(path, "wb").write(png)


def ink_alpha(r, g, b):
    """How far this pixel is from the white background, as an alpha value."""
    distance = max(abs(r - 255), abs(g - 255), abs(b - 255)) / 255
    return min(255, round(distance * INK_GAIN * 255))


def main():
    width, height, px = read_png(SOURCE)

    # Bounding box of the mark, ignoring the wordmark below it.
    left, right, top, bottom = width, 0, height, 0
    for y in range(min(MARK_BOTTOM, height)):
        for x in range(width):
            i = (y * width + x) * 4
            if ink_alpha(px[i], px[i + 1], px[i + 2]) > 8:
                left = min(left, x)
                right = max(right, x)
                top = min(top, y)
                bottom = max(bottom, y)

    pad = 6
    left, top = max(0, left - pad), max(0, top - pad)
    right, bottom = min(width - 1, right + pad), min(height - 1, bottom + pad)
    cw, ch = right - left + 1, bottom - top + 1

    mark = bytearray(cw * ch * 4)
    for y in range(ch):
        for x in range(cw):
            i = ((y + top) * width + (x + left)) * 4
            a = ink_alpha(px[i], px[i + 1], px[i + 2])
            j = (y * cw + x) * 4
            mark[j] = mark[j + 1] = mark[j + 2] = 255
            mark[j + 3] = a

    write_png(WHITE_MARK, cw, ch, mark)
    print(f"{WHITE_MARK}: {cw}x{ch} (beskåret fra {width}x{height})")


if __name__ == "__main__":
    main()
