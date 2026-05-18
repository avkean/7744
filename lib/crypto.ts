// lib/crypto.ts

const GRID_SIZE = 88;
const CELL_SIZE = 8;
const TOTAL_CELLS = GRID_SIZE * GRID_SIZE;
const SYMBOL_REPEAT = 3;
const MAX_SYMBOLS = Math.floor(TOTAL_CELLS / SYMBOL_REPEAT);
const MAGIC = [0x37, 0x37, 0x34, 0x34]; // "7744"
const VERSION = 2;
const HEADER_SIZE = MAGIC.length + 1 + 4 + 2 + 4;
const HEADER_SYMBOLS = HEADER_SIZE * 2;
const MAX_MESSAGE_BYTES = Math.floor((MAX_SYMBOLS - HEADER_SYMBOLS) / 2);

type Rgb = readonly [number, number, number];

const encoder = new TextEncoder();
const decoder = new TextDecoder("utf-8", { fatal: true });

function stringToBytes(str: string): Uint8Array {
  return encoder.encode(str);
}

function bytesToString(bytes: Uint8Array): string {
  return decoder.decode(bytes);
}

function hslToRgb(hue: number, saturation: number, lightness: number): Rgb {
  const c = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const h = hue / 60;
  const x = c * (1 - Math.abs((h % 2) - 1));
  const m = lightness - c / 2;

  let r = 0;
  let g = 0;
  let b = 0;

  if (h >= 0 && h < 1) {
    r = c;
    g = x;
  } else if (h < 2) {
    r = x;
    g = c;
  } else if (h < 3) {
    g = c;
    b = x;
  } else if (h < 4) {
    g = x;
    b = c;
  } else if (h < 5) {
    r = x;
    b = c;
  } else {
    r = c;
    b = x;
  }

  return [
    Math.round((r + m) * 255),
    Math.round((g + m) * 255),
    Math.round((b + m) * 255),
  ];
}

const PALETTE: Rgb[] = [
  hslToRgb(186, 0.88, 0.92),
  hslToRgb(189, 0.78, 0.82),
  hslToRgb(192, 0.72, 0.72),
  hslToRgb(195, 0.68, 0.62),
  hslToRgb(174, 0.78, 0.86),
  hslToRgb(178, 0.70, 0.76),
  hslToRgb(182, 0.66, 0.66),
  hslToRgb(170, 0.62, 0.58),
  hslToRgb(204, 0.86, 0.88),
  hslToRgb(207, 0.78, 0.78),
  hslToRgb(211, 0.70, 0.68),
  hslToRgb(215, 0.64, 0.59),
  hslToRgb(224, 0.74, 0.88),
  hslToRgb(229, 0.66, 0.78),
  hslToRgb(234, 0.58, 0.69),
  hslToRgb(239, 0.54, 0.62),
];

function fnv1a32(bytes: ArrayLike<number>, seed = 0x811c9dc5): number {
  let hash = seed >>> 0;

  for (let i = 0; i < bytes.length; i++) {
    hash ^= bytes[i] & 0xff;
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }

  return hash >>> 0;
}

function writeUint32(target: number[], value: number) {
  target.push(
    (value >>> 24) & 0xff,
    (value >>> 16) & 0xff,
    (value >>> 8) & 0xff,
    value & 0xff,
  );
}

function readUint32(bytes: number[], offset: number): number {
  return (
    ((bytes[offset] << 24) >>> 0) |
    (bytes[offset + 1] << 16) |
    (bytes[offset + 2] << 8) |
    bytes[offset + 3]
  ) >>> 0;
}

function createSeed(parts: ArrayLike<number>[]): number {
  let seed = 0x811c9dc5;

  for (const part of parts) {
    seed = fnv1a32(part, seed);
  }

  return seed >>> 0;
}

function createByteStream(seed: number) {
  let state = seed >>> 0;

  return function nextByte() {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) & 0xff;
  };
}

function checksum(keyBytes: Uint8Array, messageBytes: Uint8Array): number {
  return createSeed([new Uint8Array(MAGIC), new Uint8Array([VERSION]), keyBytes, messageBytes]);
}

function createNonce(): Uint8Array {
  const nonce = new Uint8Array(4);

  if (globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(nonce);
    return nonce;
  }

  let fallback = (Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0;
  for (let i = 0; i < nonce.length; i++) {
    fallback = Math.imul(fallback ^ (fallback >>> 15), 0x85ebca6b) >>> 0;
    nonce[i] = fallback & 0xff;
  }

  return nonce;
}

function bytesToSymbols(bytes: number[]): number[] {
  const symbols: number[] = [];

  for (const byte of bytes) {
    symbols.push((byte >>> 4) & 0x0f, byte & 0x0f);
  }

  return symbols;
}

function symbolsToBytes(symbols: number[]): number[] {
  const bytes: number[] = [];

  for (let i = 0; i < symbols.length; i += 2) {
    bytes.push(((symbols[i] & 0x0f) << 4) | (symbols[i + 1] & 0x0f));
  }

  return bytes;
}

function symbolPosition(symbolIndex: number, copyIndex: number): number {
  return copyIndex * MAX_SYMBOLS + symbolIndex;
}

function encodePayload(messageBytes: Uint8Array, keyBytes: Uint8Array): number[] {
  if (keyBytes.length === 0) {
    throw new Error("Key is required.");
  }

  if (messageBytes.length > MAX_MESSAGE_BYTES) {
    throw new Error(`Message is too long. Maximum ${MAX_MESSAGE_BYTES.toLocaleString()} UTF-8 bytes allowed.`);
  }

  const nonce = createNonce();
  const encrypted = new Uint8Array(messageBytes.length);
  const stream = createByteStream(createSeed([keyBytes, nonce, new Uint8Array(MAGIC)]));

  for (let i = 0; i < messageBytes.length; i++) {
    encrypted[i] = messageBytes[i] ^ stream();
  }

  const payload = [...MAGIC, VERSION, ...Array.from(nonce), (messageBytes.length >>> 8) & 0xff, messageBytes.length & 0xff];
  writeUint32(payload, checksum(keyBytes, messageBytes));
  payload.push(...Array.from(encrypted));

  return bytesToSymbols(payload);
}

function colorDistance(a: Uint8ClampedArray, color: Rgb): number {
  const dr = a[0] - color[0];
  const dg = a[1] - color[1];
  const db = a[2] - color[2];
  return dr * dr + dg * dg + db * db;
}

function nearestPaletteSymbol(pixel: Uint8ClampedArray): { symbol: number; distance: number } {
  let bestIndex = 0;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (let i = 0; i < PALETTE.length; i++) {
    const distance = colorDistance(pixel, PALETTE[i]);
    if (distance < bestDistance) {
      bestIndex = i;
      bestDistance = distance;
    }
  }

  return { symbol: bestIndex, distance: bestDistance };
}

function drawPayload(payloadSymbols: number[], canvas: HTMLCanvasElement) {
  canvas.width = GRID_SIZE * CELL_SIZE;
  canvas.height = GRID_SIZE * CELL_SIZE;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Failed to create canvas context.");
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.imageSmoothingEnabled = false;

  const paddingStream = createByteStream(createSeed([new Uint8Array(payloadSymbols), new Uint8Array([0xa5])]));
  const cellSymbols = Array.from({ length: TOTAL_CELLS }, () => paddingStream() & 0x0f);

  for (let symbolIndex = 0; symbolIndex < payloadSymbols.length; symbolIndex++) {
    for (let copyIndex = 0; copyIndex < SYMBOL_REPEAT; copyIndex++) {
      cellSymbols[symbolPosition(symbolIndex, copyIndex)] = payloadSymbols[symbolIndex];
    }
  }

  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE; col++) {
      const [r, g, b] = PALETTE[cellSymbols[row * GRID_SIZE + col]];
      ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
      ctx.fillRect(col * CELL_SIZE, row * CELL_SIZE, CELL_SIZE, CELL_SIZE);
    }
  }
}

function extractCellsFromCanvas(ctx: CanvasRenderingContext2D, width: number, height: number) {
  const cellWidth = width / GRID_SIZE;
  const cellHeight = height / GRID_SIZE;
  const cells: Array<{ symbol: number; distance: number }> = [];

  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE; col++) {
      const x = Math.min(width - 1, Math.max(0, Math.floor((col + 0.5) * cellWidth)));
      const y = Math.min(height - 1, Math.max(0, Math.floor((row + 0.5) * cellHeight)));
      const pixel = ctx.getImageData(x, y, 1, 1).data;
      cells.push(nearestPaletteSymbol(pixel));
    }
  }

  return cells;
}

function majoritySymbol(reads: Array<{ symbol: number; distance: number }>): number {
  const counts = Array.from({ length: PALETTE.length }, () => 0);

  for (const read of reads) {
    counts[read.symbol] += 1;
  }

  for (let symbol = 0; symbol < counts.length; symbol++) {
    if (counts[symbol] >= 2) {
      return symbol;
    }
  }

  return reads.reduce((best, current) => (current.distance < best.distance ? current : best)).symbol;
}

function extractPayloadSymbols(cells: Array<{ symbol: number; distance: number }>): number[] {
  const symbols: number[] = [];

  for (let symbolIndex = 0; symbolIndex < MAX_SYMBOLS; symbolIndex++) {
    symbols.push(
      majoritySymbol([
        cells[symbolPosition(symbolIndex, 0)],
        cells[symbolPosition(symbolIndex, 1)],
        cells[symbolPosition(symbolIndex, 2)],
      ]),
    );
  }

  return symbols;
}

function decodeV2Payload(payloadSymbols: number[], keyBytes: Uint8Array): string {
  const payload = symbolsToBytes(payloadSymbols);
  const hasMagic = MAGIC.every((byte, index) => payload[index] === byte);

  if (!hasMagic || payload[MAGIC.length] !== VERSION) {
    throw new Error("This image was not created by the current encoder.");
  }

  if (keyBytes.length === 0) {
    throw new Error("Key is required.");
  }

  const nonce = new Uint8Array(payload.slice(5, 9));
  const messageLength = (payload[9] << 8) | payload[10];

  if (messageLength > MAX_MESSAGE_BYTES || HEADER_SIZE + messageLength > payload.length) {
    throw new Error("Invalid message length detected. The image may be corrupted.");
  }

  const expectedChecksum = readUint32(payload, 11);
  const encrypted = payload.slice(HEADER_SIZE, HEADER_SIZE + messageLength);
  const messageBytes = new Uint8Array(messageLength);
  const stream = createByteStream(createSeed([keyBytes, nonce, new Uint8Array(MAGIC)]));

  for (let i = 0; i < encrypted.length; i++) {
    messageBytes[i] = encrypted[i] ^ stream();
  }

  if (checksum(keyBytes, messageBytes) !== expectedChecksum) {
    throw new Error("Wrong key or corrupted image. Decoding failed.");
  }

  return bytesToString(messageBytes);
}

function legacyDecodePayloadFromCanvas(ctx: CanvasRenderingContext2D, width: number, height: number, key: string): string {
  const cellWidth = width / GRID_SIZE;
  const cellHeight = height / GRID_SIZE;
  const bytes: number[] = [];

  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE; col++) {
      const x = Math.min(width - 1, Math.max(0, Math.floor((col + 0.5) * cellWidth)));
      const y = Math.min(height - 1, Math.max(0, Math.floor((row + 0.5) * cellHeight)));
      const pixel = ctx.getImageData(x, y, 1, 1).data;
      bytes.push(Math.min(255, Math.max(200, pixel[2])) - 200);
    }
  }

  const messageLengthHigh = bytes[0] * 16 + bytes[1];
  const messageLengthLow = bytes[2] * 16 + bytes[3];
  const messageLength = messageLengthHigh * 256 + messageLengthLow;

  if (messageLength < 0 || messageLength > 3871 || 4 + messageLength * 2 > bytes.length) {
    throw new Error("Invalid message length detected. Decoding failed.");
  }

  const messageBytes: number[] = [];
  for (let i = 0; i < messageLength; i++) {
    const encodedHigh = bytes[4 + i * 2];
    const encodedLow = bytes[5 + i * 2];

    if (encodedHigh > 15 || encodedLow > 15) {
      throw new Error("Invalid blue shade detected. Decoding failed.");
    }

    const keyHigh = key.charCodeAt((i * 2) % key.length) % 16;
    const keyLow = key.charCodeAt((i * 2 + 1) % key.length) % 16;
    const originalHigh = (encodedHigh - keyHigh + 16) % 16;
    const originalLow = (encodedLow - keyLow + 16) % 16;

    messageBytes.push((originalHigh << 4) | originalLow);
  }

  return bytesToString(new Uint8Array(messageBytes));
}

/**
 * Encodes a message into an 88x88 PNG-safe image.
 */
export function encodeMessage(message: string, key: string, canvas: HTMLCanvasElement) {
  const payload = encodePayload(stringToBytes(message), stringToBytes(key));
  drawPayload(payload, canvas);
}

/**
 * Decodes a message from an uploaded 88x88 grid image.
 */
export async function decodeMessage(file: File, key: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = function(event) {
      const img = new Image();

      img.onload = function() {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");

        if (!ctx) {
          reject(new Error("Failed to create canvas context."));
          return;
        }

        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        try {
          const cells = extractCellsFromCanvas(ctx, canvas.width, canvas.height);
          const payloadSymbols = extractPayloadSymbols(cells);
          resolve(decodeV2Payload(payloadSymbols, stringToBytes(key)));
        } catch (v2Error) {
          try {
            resolve(legacyDecodePayloadFromCanvas(ctx, canvas.width, canvas.height, key));
          } catch {
            reject(v2Error instanceof Error ? v2Error : new Error("Decoding failed."));
          }
        }
      };

      img.onerror = function() {
        reject(new Error("Invalid image file. Please upload a valid grid image."));
      };

      if (event.target?.result) {
        img.src = event.target.result as string;
      } else {
        reject(new Error("Failed to load image."));
      }
    };

    reader.onerror = function() {
      reject(new Error("Failed to read image file."));
    };

    reader.readAsDataURL(file);
  });
}
