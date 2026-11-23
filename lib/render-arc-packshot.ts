import sharp from "sharp";

const canvas = {width: 800, height: 1000};

function removeWhiteBackground(data: Buffer, width: number, height: number) {
  const count = width * height;
  const background = new Uint8Array(count);
  const queue = new Uint32Array(count);
  let end = 0;

  function visit(pixel: number) {
    const i = pixel * 3;
    if (background[pixel] || Math.min(data[i], data[i + 1], data[i + 2]) <= 240) return;
    background[pixel] = 1;
    queue[end++] = pixel;
  }

  for (let x = 0; x < width; x++) {
    visit(x);
    visit(count - width + x);
  }
  for (let y = 1; y < height - 1; y++) {
    visit(y * width);
    visit(y * width + width - 1);
  }
  for (let start = 0; start < end; start++) {
    const pixel = queue[start];
    const x = pixel % width;
    if (x > 0) visit(pixel - 1);
    if (x < width - 1) visit(pixel + 1);
    if (pixel >= width) visit(pixel - width);
    if (pixel < count - width) visit(pixel + width);
  }

  const rgba = Buffer.alloc(count * 4);
  for (let pixel = 0; pixel < count; pixel++) {
    const input = pixel * 3;
    const output = pixel * 4;
    const white = Math.min(data[input], data[input + 1], data[input + 2]);
    const opacity = background[pixel] ? Math.max(0, (254 - white) / 14) : 1;
    if (opacity === 0) continue;
    for (let channel = 0; channel < 3; channel++) {
      // Remove the original white matte from partially transparent edges.
      rgba[output + channel] = Math.max(0, Math.round(255 + (data[input + channel] - 255) / opacity));
    }
    rgba[output + 3] = Math.round(opacity * 255);
  }
  return rgba;
}

export async function renderArcPackshot(input: Uint8Array) {
  const cropped = await sharp(input, {limitInputPixels: 12_000_000})
    .autoOrient().flatten({background: "white"}).toColourspace("srgb")
    .trim({threshold: 14, margin: 6}).raw().toBuffer({resolveWithObject: true});
  const {data, info: {width, height}} = await sharp(cropped.data, {raw: cropped.info})
    .resize(canvas.width / 2, canvas.height / 2, {fit: "inside", withoutEnlargement: true})
    .raw().toBuffer({resolveWithObject: true});
  const garment = removeWhiteBackground(data, width, height);

  return sharp({create: {...canvas, channels: 4, background: "transparent"}})
    .composite([{
      input: garment,
      raw: {width, height, channels: 4},
      left: Math.round((canvas.width - width) / 2),
      top: Math.round((canvas.height - height) / 2),
    }])
    .webp({lossless: true}).toBuffer();
}
