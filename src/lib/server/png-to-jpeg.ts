import jpeg from "jpeg-js";
import { PNG } from "pngjs";

const BG = { r: 13, g: 13, b: 13 };

export function pngBufferToJpegBuffer(input: ArrayBuffer, quality = 94) {
  const png = PNG.sync.read(Buffer.from(input));
  const data = Buffer.from(png.data);

  for (let i = 0; i < data.length; i += 4) {
    const alpha = data[i + 3] / 255;
    data[i] = Math.round(data[i] * alpha + BG.r * (1 - alpha));
    data[i + 1] = Math.round(data[i + 1] * alpha + BG.g * (1 - alpha));
    data[i + 2] = Math.round(data[i + 2] * alpha + BG.b * (1 - alpha));
    data[i + 3] = 255;
  }

  return jpeg.encode({ data, width: png.width, height: png.height }, quality).data;
}
