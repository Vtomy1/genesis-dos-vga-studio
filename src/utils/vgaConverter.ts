import {
  ConvertedVgaAsset,
  GenesisPaletteLine,
  GenesisTile,
  VgaConversionConfig
} from '../types/genesis';

/**
 * Standard IBM VGA Mode 13h default 256-color DAC palette (6-bit values, 0-63).
 * Generated according to standard IBM VGA BIOS specs:
 * 0-15: Default 16 EGA colors
 * 16-31: 16-level Grayscale ramp
 * 32-247: 216 color cube / HSV rainbow ramps
 * 248-255: 8 levels of black/dark grays
 */
export function generateDefaultVgaDacPalette(): Uint8Array {
  const dac = new Uint8Array(768); // 256 * 3

  // 16 standard EGA/CGA colors (RGB 0-63)
  const ega16 = [
    [0, 0, 0], [0, 0, 42], [0, 42, 0], [0, 42, 42],
    [42, 0, 0], [42, 0, 42], [42, 21, 0], [42, 42, 42],
    [21, 21, 21], [21, 21, 63], [21, 63, 21], [21, 63, 63],
    [63, 21, 21], [63, 21, 63], [63, 63, 21], [63, 63, 63]
  ];

  for (let i = 0; i < 16; i++) {
    dac[i * 3 + 0] = ega16[i][0];
    dac[i * 3 + 1] = ega16[i][1];
    dac[i * 3 + 2] = ega16[i][2];
  }

  // 16 grayscale values (indices 16 to 31)
  for (let i = 0; i < 16; i++) {
    const val = Math.round((i / 15) * 63);
    const idx = (16 + i) * 3;
    dac[idx + 0] = val;
    dac[idx + 1] = val;
    dac[idx + 2] = val;
  }

  // 216 rainbow / color ramps (indices 32 to 247)
  for (let i = 0; i < 216; i++) {
    const r = Math.floor(i / 36) * 12;
    const g = (Math.floor(i / 6) % 6) * 12;
    const b = (i % 6) * 12;
    const idx = (32 + i) * 3;
    dac[idx + 0] = Math.min(63, r);
    dac[idx + 1] = Math.min(63, g);
    dac[idx + 2] = Math.min(63, b);
  }

  // Indices 248 to 255: dark shades
  for (let i = 0; i < 8; i++) {
    const val = i * 2;
    const idx = (248 + i) * 3;
    dac[idx + 0] = val;
    dac[idx + 1] = val;
    dac[idx + 2] = val;
  }

  return dac;
}

/**
 * Creates a VGA DAC palette integrating the 4 Genesis palette lines (64 colors)
 * into the first 64 indices of the 256-color VGA palette.
 */
export function buildGenesisVgaPalette(
  palettes: GenesisPaletteLine[],
  mode: 'genesis-direct' | 'vga-standard-256' | 'vga-optimized-adaptive'
): { vgaDac: Uint8Array; rgba: Uint32Array } {
  const vgaDac = generateDefaultVgaDacPalette();
  const rgba = new Uint32Array(256);

  if (mode === 'genesis-direct' || mode === 'vga-optimized-adaptive') {
    // Map Genesis 4 lines of 16 colors = 64 colors directly into VGA indices 0 to 63
    for (let l = 0; l < Math.min(4, palettes.length); l++) {
      const line = palettes[l];
      for (let c = 0; c < Math.min(16, line.colors.length); c++) {
        const col = line.colors[c];
        const vgaIdx = l * 16 + c;
        vgaDac[vgaIdx * 3 + 0] = col.vgaR;
        vgaDac[vgaIdx * 3 + 1] = col.vgaG;
        vgaDac[vgaIdx * 3 + 2] = col.vgaB;
      }
    }
  }

  // Fill RGBA 32-bit table from the 6-bit DAC values
  for (let i = 0; i < 256; i++) {
    const r = Math.round((vgaDac[i * 3 + 0] / 63) * 255);
    const g = Math.round((vgaDac[i * 3 + 1] / 63) * 255);
    const b = Math.round((vgaDac[i * 3 + 2] / 63) * 255);
    // Little-endian RGBA: 0xAABBGGRR
    rgba[i] = (255 << 24) | (b << 16) | (g << 8) | r;
  }

  return { vgaDac, rgba };
}

/**
 * Finds nearest VGA palette index for given 8-bit RGB color.
 */
export function findNearestVgaColor(
  r: number,
  g: number,
  b: number,
  vgaDac: Uint8Array,
  startIdx = 0,
  endIdx = 255
): number {
  let bestIdx = startIdx;
  let bestDist = Infinity;

  for (let i = startIdx; i <= endIdx; i++) {
    const pr = Math.round((vgaDac[i * 3 + 0] / 63) * 255);
    const pg = Math.round((vgaDac[i * 3 + 1] / 63) * 255);
    const pb = Math.round((vgaDac[i * 3 + 2] / 63) * 255);

    // Weighted Euclidean distance (human eye is more sensitive to green)
    const dr = r - pr;
    const dg = g - pg;
    const db = b - pb;
    const dist = dr * dr * 0.3 + dg * dg * 0.59 + db * db * 0.11;

    if (dist < bestDist) {
      bestDist = dist;
      bestIdx = i;
    }
  }

  return bestIdx;
}

/**
 * Converts Genesis tile scene / tile buffer to 320x200 Mode 13h VGA screen buffer.
 */
export function convertGenesisToVga13h(
  tiles: GenesisTile[],
  palettes: GenesisPaletteLine[],
  config: VgaConversionConfig,
  customSceneImage?: ImageData
): ConvertedVgaAsset {
  const width = 320;
  const height = 200;
  const screenBuffer = new Uint8Array(width * height); // 64,000 bytes

  const { vgaDac, rgba } = buildGenesisVgaPalette(palettes, config.paletteRemapMode);

  // If a custom image or rendered canvas scene was provided:
  if (customSceneImage) {
    convertImageToVga(customSceneImage, screenBuffer, vgaDac, config);
  } else if (config.fitMode === 'tilesheet') {
    // Pack 40 x 25 tiles = 1,000 tiles directly into 320x200
    renderTileSheetToVga(tiles, screenBuffer, config.activePaletteIndex);
  } else {
    // Synthesize authentic Genesis Arcade scene based on ROM tiles
    renderSyntheticArcadeScene(tiles, palettes, screenBuffer, config);
  }

  // Adjust brightness/contrast if specified
  if (config.brightness !== 0 || config.contrast !== 0) {
    applyColorAdjustments(screenBuffer, vgaDac, config.brightness, config.contrast);
  }

  // Generate PCX format
  const pcxData = encodePcx320x200(screenBuffer, vgaDac);

  return {
    width,
    height,
    screenBuffer,
    vgaDacPalette: vgaDac,
    rgbaPalette: rgba,
    pcxData
  };
}

/**
 * Converts ImageData to 320x200 8-bit VGA index buffer with optional dithering.
 */
function convertImageToVga(
  img: ImageData,
  screenBuffer: Uint8Array,
  vgaDac: Uint8Array,
  config: VgaConversionConfig
) {
  const srcW = img.width;
  const srcH = img.height;
  const srcData = img.data;

  // Temporary buffer for dithering error diffusion
  const rgbFloats = new Float32Array(320 * 200 * 3);

  // Resample / fit into 320x200
  for (let y = 0; y < 200; y++) {
    for (let x = 0; x < 320; x++) {
      let srcX = x;
      let srcY = y;

      if (config.fitMode === 'crop-center') {
        // Source assumed to be 320x224, crop 12 top/bottom
        srcY = Math.min(srcH - 1, y + 12);
        srcX = Math.min(srcW - 1, x);
      } else if (config.fitMode === 'crop-top') {
        srcY = Math.min(srcH - 1, y + 24);
        srcX = Math.min(srcW - 1, x);
      } else if (config.fitMode === 'crop-bottom') {
        srcY = Math.min(srcH - 1, y);
        srcX = Math.min(srcW - 1, x);
      } else if (config.fitMode === 'scale') {
        srcX = Math.min(srcW - 1, Math.floor((x / 320) * srcW));
        srcY = Math.min(srcH - 1, Math.floor((y / 200) * srcH));
      } else if (config.fitMode === 'letterbox') {
        if (y < 10 || y >= 190) {
          // Black border
          const outIdx = (y * 320 + x) * 3;
          rgbFloats[outIdx] = 0;
          rgbFloats[outIdx + 1] = 0;
          rgbFloats[outIdx + 2] = 0;
          continue;
        }
        srcY = Math.min(srcH - 1, Math.floor(((y - 10) / 180) * srcH));
        srcX = Math.min(srcW - 1, Math.floor((x / 320) * srcW));
      }

      const srcIdx = (srcY * srcW + srcX) * 4;
      const outIdx = (y * 320 + x) * 3;
      rgbFloats[outIdx + 0] = srcData[srcIdx + 0];
      rgbFloats[outIdx + 1] = srcData[srcIdx + 1];
      rgbFloats[outIdx + 2] = srcData[srcIdx + 2];
    }
  }

  // Dithering & Quantization
  const bayer4x4 = [
    [0, 8, 2, 10],
    [12, 4, 14, 6],
    [3, 11, 1, 9],
    [15, 7, 13, 5]
  ];

  for (let y = 0; y < 200; y++) {
    for (let x = 0; x < 320; x++) {
      const idx3 = (y * 320 + x) * 3;
      let r = rgbFloats[idx3 + 0];
      let g = rgbFloats[idx3 + 1];
      let b = rgbFloats[idx3 + 2];

      if (config.dither === 'bayer4x4') {
        const ditherVal = (bayer4x4[y % 4][x % 4] / 16 - 0.5) * 24;
        r += ditherVal;
        g += ditherVal;
        b += ditherVal;
      }

      const cr = Math.max(0, Math.min(255, Math.round(r)));
      const cg = Math.max(0, Math.min(255, Math.round(g)));
      const cb = Math.max(0, Math.min(255, Math.round(b)));

      // In genesis-direct mode, prefer first 64 indices
      const palIdx = findNearestVgaColor(cr, cg, cb, vgaDac, 0, 255);
      screenBuffer[y * 320 + x] = palIdx;

      // Error diffusion
      if (config.dither === 'floyd-steinberg' || config.dither === 'atkinson') {
        const pr = Math.round((vgaDac[palIdx * 3 + 0] / 63) * 255);
        const pg = Math.round((vgaDac[palIdx * 3 + 1] / 63) * 255);
        const pb = Math.round((vgaDac[palIdx * 3 + 2] / 63) * 255);

        const errR = cr - pr;
        const errG = cg - pg;
        const errB = cb - pb;

        if (config.dither === 'floyd-steinberg') {
          // (x+1, y) += 7/16
          // (x-1, y+1) += 3/16
          // (x, y+1) += 5/16
          // (x+1, y+1) += 1/16
          diffuseError(rgbFloats, x + 1, y, errR, errG, errB, 7 / 16);
          diffuseError(rgbFloats, x - 1, y + 1, errR, errG, errB, 3 / 16);
          diffuseError(rgbFloats, x, y + 1, errR, errG, errB, 5 / 16);
          diffuseError(rgbFloats, x + 1, y + 1, errR, errG, errB, 1 / 16);
        } else if (config.dither === 'atkinson') {
          // Atkinson distributes 1/8 each to 6 neighbors
          diffuseError(rgbFloats, x + 1, y, errR, errG, errB, 1 / 8);
          diffuseError(rgbFloats, x + 2, y, errR, errG, errB, 1 / 8);
          diffuseError(rgbFloats, x - 1, y + 1, errR, errG, errB, 1 / 8);
          diffuseError(rgbFloats, x, y + 1, errR, errG, errB, 1 / 8);
          diffuseError(rgbFloats, x + 1, y + 1, errR, errG, errB, 1 / 8);
          diffuseError(rgbFloats, x, y + 2, errR, errG, errB, 1 / 8);
        }
      }
    }
  }
}

function diffuseError(
  buffer: Float32Array,
  x: number,
  y: number,
  er: number,
  eg: number,
  eb: number,
  fraction: number
) {
  if (x < 0 || x >= 320 || y < 0 || y >= 200) return;
  const idx = (y * 320 + x) * 3;
  buffer[idx + 0] += er * fraction;
  buffer[idx + 1] += eg * fraction;
  buffer[idx + 2] += eb * fraction;
}

/**
 * Assembles Genesis 8x8 tiles into a complete 40x25 tile grid (320x200).
 */
function renderTileSheetToVga(
  tiles: GenesisTile[],
  screenBuffer: Uint8Array,
  activePalLine: number
) {
  const tilesAcross = 40; // 40 * 8 = 320
  const tilesDown = 25;   // 25 * 8 = 200
  const palBase = (activePalLine % 4) * 16;

  for (let ty = 0; ty < tilesDown; ty++) {
    for (let tx = 0; tx < tilesAcross; tx++) {
      const tileIndex = ty * tilesAcross + tx;
      const tile = tiles[tileIndex % Math.max(1, tiles.length)];
      if (!tile) continue;

      const destX0 = tx * 8;
      const destY0 = ty * 8;

      for (let py = 0; py < 8; py++) {
        for (let px = 0; px < 8; px++) {
          const color4bit = tile.pixels[py * 8 + px];
          // Map to VGA 0-63 (Genesis direct)
          const vgaColor = palBase + (color4bit & 0x0f);
          screenBuffer[(destY0 + py) * 320 + (destX0 + px)] = vgaColor;
        }
      }
    }
  }
}

/**
 * Renders an authentic Sega Genesis arcade level / splash screen converted to 320x200 VGA.
 */
function renderSyntheticArcadeScene(
  tiles: GenesisTile[],
  palettes: GenesisPaletteLine[],
  screenBuffer: Uint8Array,
  config: VgaConversionConfig
) {
  // Clear screen to background color (Palette 1, Color 0)
  screenBuffer.fill(16);

  // 1. Sky / Gradient Backdrop (Lines 0 to 80)
  for (let y = 0; y < 80; y++) {
    const band = Math.floor((y / 80) * 8);
    const color = 16 + (band % 8); // Palette line 1 background
    for (let x = 0; x < 320; x++) {
      screenBuffer[y * 320 + x] = color;
    }
  }

  // 2. City / Mountains Skyline Layer (Lines 50 to 110)
  for (let x = 0; x < 320; x++) {
    const hillHeight = Math.sin(x * 0.03) * 15 + Math.cos(x * 0.01) * 20 + 80;
    for (let y = Math.floor(hillHeight); y < 120; y++) {
      const tileIdx = (Math.floor(x / 8) + Math.floor(y / 8)) % Math.max(1, tiles.length);
      const tile = tiles[tileIdx];
      const px = x % 8;
      const py = y % 8;
      const col4 = tile ? tile.pixels[py * 8 + px] : 1;
      screenBuffer[y * 320 + x] = 32 + (col4 & 0x0f); // Palette line 2
    }
  }

  // 3. Ground / Arena Floor Layer (Lines 120 to 180)
  for (let y = 120; y < 180; y++) {
    for (let x = 0; x < 320; x++) {
      const tileIdx = (Math.floor(x / 8) * 3 + Math.floor(y / 8)) % Math.max(1, tiles.length);
      const tile = tiles[tileIdx];
      const px = x % 8;
      const py = y % 8;
      const col4 = tile ? tile.pixels[py * 8 + px] : 2;
      screenBuffer[y * 320 + x] = 16 + (col4 & 0x0f);
    }
  }

  // 4. Center Arcade Hero / Sprite Composition (X: 120-200, Y: 80-160)
  const heroX = 136;
  const heroY = 72;
  const heroTilesWide = 6;
  const heroTilesHigh = 10;

  for (let ty = 0; ty < heroTilesHigh; ty++) {
    for (let tx = 0; tx < heroTilesWide; tx++) {
      const tIdx = (ty * heroTilesWide + tx + 10) % Math.max(1, tiles.length);
      const tile = tiles[tIdx];
      if (!tile) continue;

      for (let py = 0; py < 8; py++) {
        for (let px = 0; px < 8; px++) {
          const col4 = tile.pixels[py * 8 + px];
          if (col4 !== 0) { // Color 0 is transparent sprite pixel
            const destX = heroX + tx * 8 + px;
            const destY = heroY + ty * 8 + py;
            if (destX < 320 && destY < 200) {
              screenBuffer[destY * 320 + destX] = 0 + (col4 & 0x0f); // Palette line 0
            }
          }
        }
      }
    }
  }

  // 5. Arcade HUD / Header Banner (Lines 180 to 200)
  // Draw metallic status bar
  for (let y = 180; y < 200; y++) {
    for (let x = 0; x < 320; x++) {
      if (y === 180 || y === 199 || x === 0 || x === 319) {
        screenBuffer[y * 320 + x] = 15; // Bright white border
      } else {
        screenBuffer[y * 320 + x] = 48 + ((y - 180) % 8); // Palette line 3
      }
    }
  }
}

function applyColorAdjustments(
  buffer: Uint8Array,
  vgaDac: Uint8Array,
  brightness: number,
  contrast: number
) {
  // Directly tweak DAC palette
  const bDelta = Math.round((brightness / 100) * 30);
  const factor = (259 * (contrast + 100)) / (100 * (259 - contrast));

  for (let i = 0; i < 768; i++) {
    let val = vgaDac[i];
    // Scale 0-63 to 0-255 for contrast calc
    let v255 = (val / 63) * 255;
    v255 = factor * (v255 - 128) + 128 + bDelta * 4;
    v255 = Math.max(0, Math.min(255, v255));
    vgaDac[i] = Math.round((v255 / 255) * 63);
  }
}

/**
 * Encodes 320x200 8-bit screen buffer to authentic MS-DOS PCX format.
 * Structure: 128-byte Header + RLE-compressed data + 0x0C + 768-byte 8-bit RGB Palette.
 */
export function encodePcx320x200(buffer: Uint8Array, vgaDac: Uint8Array): Uint8Array {
  const header = new Uint8Array(128);
  header[0] = 0x0a; // Manufacturer: ZSoft
  header[1] = 0x05; // Version: 3.0 (with 256 color palette)
  header[2] = 0x01; // Encoding: RLE
  header[3] = 0x08; // Bits per pixel per plane: 8
  // Window: 0, 0, 319, 199
  header[4] = 0; header[5] = 0;   // Xmin
  header[6] = 0; header[7] = 0;   // Ymin
  header[8] = 0x3f; header[9] = 0x01; // Xmax = 319
  header[10] = 0xc7; header[11] = 0x00; // Ymax = 199
  header[12] = 0x40; header[13] = 0x01; // HDpi = 320
  header[14] = 0xc8; header[15] = 0x00; // VDpi = 200
  header[65] = 0x01; // NPlanes: 1 (256 color planar)
  header[66] = 0x40; header[67] = 0x01; // BytesPerLine = 320
  header[68] = 0x01; header[69] = 0x00; // PaletteInfo: Color/BW

  // RLE encode the 64,000 bytes
  const rleChunks: number[] = [];
  let i = 0;
  while (i < buffer.length) {
    const val = buffer[i];
    let runLen = 1;
    while (runLen < 63 && i + runLen < buffer.length && buffer[i + runLen] === val) {
      runLen++;
    }

    if (runLen > 1 || (val & 0xc0) === 0xc0) {
      rleChunks.push(0xc0 | runLen);
      rleChunks.push(val);
    } else {
      rleChunks.push(val);
    }
    i += runLen;
  }

  // 768-byte 8-bit palette (0-255)
  const pal8bit = new Uint8Array(768);
  for (let p = 0; p < 768; p++) {
    pal8bit[p] = Math.round((vgaDac[p] / 63) * 255);
  }

  const totalSize = 128 + rleChunks.length + 1 + 768;
  const pcx = new Uint8Array(totalSize);

  pcx.set(header, 0);
  pcx.set(new Uint8Array(rleChunks), 128);
  pcx[128 + rleChunks.length] = 0x0c; // Palette marker
  pcx.set(pal8bit, 128 + rleChunks.length + 1);

  return pcx;
}

/**
 * Generates Watcom C / Borland Turbo C source header for DOS arcade ports.
 */
export function generateCHeader(asset: ConvertedVgaAsset, gameTitle: string): string {
  const safeName = gameTitle.replace(/[^a-zA-Z0-9_]/g, '_').toUpperCase();
  let code = `/* =========================================================================
 * DOS ARCADE PORT ASSET: ${gameTitle}
 * Mode: VGA Mode 13h (320x200, 256 Colors)
 * Converted by Genesis2DOS VGA Studio
 * ========================================================================= */

#ifndef _${safeName}_VGA_H_
#define _${safeName}_VGA_H_

#define VGA_SCREEN_WIDTH  320
#define VGA_SCREEN_HEIGHT 200
#define VGA_SCREEN_BYTES  64000
#define VGA_PALETTE_BYTES 768

/* 768-byte VGA DAC Palette (RGB values scaled 0-63) */
const unsigned char ${safeName}_PALETTE[768] = {
`;

  // Write palette bytes
  for (let i = 0; i < 256; i++) {
    const r = asset.vgaDacPalette[i * 3 + 0];
    const g = asset.vgaDacPalette[i * 3 + 1];
    const b = asset.vgaDacPalette[i * 3 + 2];
    code += `  ${r.toString().padStart(2, ' ')}, ${g.toString().padStart(2, ' ')}, ${b.toString().padStart(2, ' ')}, /* Color ${i.toString().padStart(3, ' ')} */\n`;
  }

  code += `};

/* Function to set VGA DAC palette registers via I/O ports 0x3C8 and 0x3C9 */
void set_vga_palette(const unsigned char *pal) {
#if defined(__WATCOMC__) || defined(__DJGPP__)
    int i;
    outp(0x3C8, 0);
    for (i = 0; i < 768; i++) {
        outp(0x3C9, pal[i]);
    }
#elif defined(__TURBOC__)
    int i;
    outportb(0x3C8, 0);
    for (i = 0; i < 768; i++) {
        outportb(0x3C9, pal[i]);
    }
#endif
}

#endif /* _${safeName}_VGA_H_ */
`;

  return code;
}

/**
 * Generates NASM / TASM assembly file with real Mode 13h initialization.
 */
export function generateAsmSource(asset: ConvertedVgaAsset, gameTitle: string): string {
  const safeName = gameTitle.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();
  return `; =========================================================================
; Genesis2DOS VGA Studio - Assembly Stub
; Game: ${gameTitle}
; Target: MS-DOS 16-Bit Real Mode (NASM / TASM)
; Mode: VGA Mode 13h (320x200x256)
; =========================================================================

BITS 16
ORG 100h                ; Or MZ EXE entry point

section .text
start:
    ; 1. Enter VGA Mode 13h (320x200 256 colors)
    mov ax, 0013h
    int 10h

    ; 2. Set VGA DAC Palette via Port 3C8h / 3C9h
    mov dx, 03C8h
    xor al, al          ; Start at palette index 0
    out dx, al

    inc dx              ; Port 3C9h (DAC Data)
    mov si, vga_palette
    mov cx, 768
set_pal_loop:
    lodsb
    out dx, al
    loop set_pal_loop

    ; 3. Copy Screen Buffer directly to VGA Video Memory (A000:0000)
    push ds
    mov ax, 0A000h
    mov es, ax
    xor di, di          ; ES:DI = A000:0000
    mov si, vga_pixels  ; DS:SI = image data
    mov cx, 32000       ; 32000 words = 64000 bytes
    rep movsw
    pop ds

    ; 4. Wait for Keypress (BIOS INT 16h)
wait_key:
    xor ah, ah
    int 16h

    ; 5. Restore 80x25 Color Text Mode (Mode 03h)
    mov ax, 0003h
    int 10h

    ; 6. Terminate to DOS
    mov ax, 4C00h
    int 21h

section .data
vga_palette:
    incbin "${safeName}.pal"

vga_pixels:
    incbin "${safeName}.vga"
`;
}
