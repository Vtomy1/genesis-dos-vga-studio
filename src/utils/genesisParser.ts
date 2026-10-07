import {
  GenesisHeader,
  GenesisTile,
  GenesisPaletteLine,
  GenesisPaletteColor
} from '../types/genesis';

/**
 * Checks if a buffer is an SMD (Super Magic Drive) interleaved ROM.
 * SMD files typically have a 512-byte header, and size is divisible by 16384 (+512).
 */
export function isSmdFormat(buffer: Uint8Array): boolean {
  if (buffer.length < 512 + 0x200) return false;
  // SMD header byte 8 is 0xAA, byte 9 is 0xBB
  if (buffer[8] === 0xaa && buffer[9] === 0xbb) return true;
  // Check if un-interleaved has "SEGA" at 0x100
  // In SMD, offset 0x100 is inside the first block; let's check
  return false;
}

/**
 * De-interleaves SMD format to flat Motorola 68000 binary format.
 */
export function deinterleaveSMD(buffer: Uint8Array): Uint8Array {
  // Strip 512-byte header if present
  let data = buffer;
  if (buffer.length >= 512 && buffer[8] === 0xaa && buffer[9] === 0xbb) {
    data = buffer.slice(512);
  }

  const blockSize = 16384;
  const halfBlock = 8192;
  const totalBlocks = Math.floor(data.length / blockSize);
  const output = new Uint8Array(data.length);

  for (let b = 0; b < totalBlocks; b++) {
    const blockStart = b * blockSize;
    for (let i = 0; i < halfBlock; i++) {
      // SMD interleaving: first half is odd bytes, second half is even bytes
      // (or vice-versa depending on dumper, standard SMD: even then odd)
      output[blockStart + i * 2 + 1] = data[blockStart + i];
      output[blockStart + i * 2] = data[blockStart + halfBlock + i];
    }
  }

  // Copy any remaining bytes
  const processed = totalBlocks * blockSize;
  if (processed < data.length) {
    output.set(data.slice(processed), processed);
  }

  return output;
}

/**
 * Normalizes input ROM buffer (auto-detects and deinterleaves SMD if needed).
 */
export function normalizeRomBuffer(raw: Uint8Array): { buffer: Uint8Array; wasSmd: boolean } {
  // Check if standard header exists at 0x0100
  const checkText = (buf: Uint8Array, offset: number, match: string) => {
    if (buf.length < offset + match.length) return false;
    for (let i = 0; i < match.length; i++) {
      if (String.fromCharCode(buf[offset + i]) !== match[i]) return false;
    }
    return true;
  };

  if (checkText(raw, 0x100, 'SEGA')) {
    return { buffer: raw, wasSmd: false };
  }

  // Check SMD after 512-byte header
  if (isSmdFormat(raw)) {
    const deinterleaved = deinterleaveSMD(raw);
    return { buffer: deinterleaved, wasSmd: true };
  }

  // Try de-interleave anyway if not matching
  if (raw.length > 16384) {
    const testDeint = deinterleaveSMD(raw);
    if (checkText(testDeint, 0x100, 'SEGA')) {
      return { buffer: testDeint, wasSmd: true };
    }
  }

  return { buffer: raw, wasSmd: false };
}

/**
 * Decodes ASCII string from ROM slice, trimming whitespace and nulls.
 */
function readAscii(buf: Uint8Array, start: number, length: number): string {
  if (start >= buf.length) return '';
  const end = Math.min(start + length, buf.length);
  let str = '';
  for (let i = start; i < end; i++) {
    const code = buf[i];
    if (code >= 32 && code <= 126) {
      str += String.fromCharCode(code);
    } else if (code === 0) {
      str += ' ';
    } else {
      str += ' ';
    }
  }
  return str.trim();
}

/**
 * Reads 16-bit big endian uint.
 */
function readUint16BE(buf: Uint8Array, offset: number): number {
  if (offset + 1 >= buf.length) return 0;
  return (buf[offset] << 8) | buf[offset + 1];
}

/**
 * Reads 32-bit big endian uint.
 */
function readUint32BE(buf: Uint8Array, offset: number): number {
  if (offset + 3 >= buf.length) return 0;
  return (
    ((buf[offset] << 24) >>> 0) +
    (buf[offset + 1] << 16) +
    (buf[offset + 2] << 8) +
    buf[offset + 3]
  );
}

/**
 * Calculates Genesis 16-bit word additive checksum from 0x0200 to EOF.
 */
export function calculateChecksum(buffer: Uint8Array): number {
  let sum = 0;
  const start = 0x0200;
  for (let i = start; i < buffer.length - 1; i += 2) {
    const word = (buffer[i] << 8) | buffer[i + 1];
    sum = (sum + word) & 0xffff;
  }
  return sum;
}

/**
 * Parses Sega Genesis ROM Header (0x0100 - 0x0200).
 */
export function parseGenesisHeader(buffer: Uint8Array, isSMD = false): GenesisHeader {
  const consoleName = readAscii(buffer, 0x0100, 16) || 'SEGA GENESIS';
  const copyright = readAscii(buffer, 0x0110, 16) || '(C)SEGA 1992';
  const domesticTitle = readAscii(buffer, 0x0120, 48) || 'ARCADE PORT VGA 13H';
  const overseasTitle = readAscii(buffer, 0x0150, 48) || domesticTitle;
  const serialNumber = readAscii(buffer, 0x0180, 14) || 'GM-00000000';
  const checksum = readUint16BE(buffer, 0x018e);
  const romStart = readUint32BE(buffer, 0x01a0);
  const romEnd = readUint32BE(buffer, 0x01a4);
  const ramStart = readUint32BE(buffer, 0x01a8);
  const ramEnd = readUint32BE(buffer, 0x01ac);
  const extraMemory = readAscii(buffer, 0x01b0, 12);
  const sramEnabled = extraMemory.startsWith('RA');
  const modemSupport = readAscii(buffer, 0x01bc, 12);
  const region = readAscii(buffer, 0x01f0, 16) || 'JUE';

  const calculatedChecksum = calculateChecksum(buffer);
  const checksumValid = checksum === calculatedChecksum;

  return {
    consoleName,
    copyright,
    domesticTitle,
    overseasTitle,
    serialNumber,
    checksum,
    calculatedChecksum,
    checksumValid,
    romStart,
    romEnd,
    ramStart,
    ramEnd,
    extraMemory,
    sramEnabled,
    modemSupport,
    region,
    isSMD,
    totalSize: buffer.length
  };
}

/**
 * Converts a 16-bit Genesis CRAM word to RGB and VGA DAC values.
 * Standard Genesis format: 0000 BBB0 GGG0 RRR0 (bits 1-3 for R, 5-7 for G, 9-11 for B)
 */
export function decodeGenesisColor(cramWord: number, index: number): GenesisPaletteColor {
  // Bits:
  // R: (word >> 1) & 0x07 (0-7)
  // G: (word >> 5) & 0x07 (0-7)
  // B: (word >> 9) & 0x07 (0-7)
  const r3 = (cramWord >> 1) & 0x07;
  const g3 = (cramWord >> 5) & 0x07;
  const b3 = (cramWord >> 9) & 0x07;

  // 8-bit mapping (0-255)
  const r8 = Math.round((r3 / 7) * 255);
  const g8 = Math.round((g3 / 7) * 255);
  const b8 = Math.round((b3 / 7) * 255);

  // VGA DAC mapping (0-63)
  const vgaR = Math.round((r3 / 7) * 63);
  const vgaG = Math.round((g3 / 7) * 63);
  const vgaB = Math.round((b3 / 7) * 63);

  const hex = `#${r8.toString(16).padStart(2, '0')}${g8.toString(16).padStart(2, '0')}${b8.toString(16).padStart(2, '0')}`;

  return {
    index,
    raw9bit: cramWord,
    r3bit: r3,
    g3bit: g3,
    b3bit: b3,
    r8,
    g8,
    b8,
    vgaR,
    vgaG,
    vgaB,
    hex
  };
}

/**
 * Searches for or generates standard Genesis palettes from ROM.
 * Genesis has 4 palettes of 16 colors each (64 colors total).
 */
export function extractPalettes(buffer: Uint8Array, customOffset?: number): GenesisPaletteLine[] {
  const lines: GenesisPaletteLine[] = [];

  // Default fallback palette if none found
  const defaultPalettesRaw: number[][] = [
    // Palette 0: Arcade Hero / Fighter / Sonic style
    [
      0x0000, 0x000e, 0x004e, 0x008e, 0x00ee, 0x02ee, 0x04ee, 0x06ee,
      0x00e0, 0x04e0, 0x0ee0, 0x0ece, 0x0e8e, 0x0e4e, 0x0e0e, 0x0eee
    ],
    // Palette 1: Background & Terrain / Scenery
    [
      0x0000, 0x0222, 0x0444, 0x0666, 0x0888, 0x0aaa, 0x0ccc, 0x0eee,
      0x0060, 0x00a0, 0x00e0, 0x02e2, 0x04e4, 0x06e6, 0x08e8, 0x0aea
    ],
    // Palette 2: Enemy & FX / Metallics
    [
      0x0000, 0x0002, 0x0006, 0x000a, 0x000e, 0x024e, 0x048e, 0x06ce,
      0x0200, 0x0600, 0x0a00, 0x0e00, 0x0e40, 0x0e80, 0x0ec0, 0x0ee0
    ],
    // Palette 3: HUD, Fonts, Gold & High Contrast
    [
      0x0000, 0x004c, 0x008e, 0x00ce, 0x00ee, 0x04ee, 0x08ee, 0x0cee,
      0x00e4, 0x00ea, 0x02ee, 0x06ee, 0x0aee, 0x0cee, 0x0eee, 0x0eee
    ]
  ];

  let foundOffset = customOffset;

  // If no custom offset provided, scan ROM for valid 16-color palette blocks (where high nibbles are 0)
  if (foundOffset === undefined) {
    for (let i = 0x0200; i < Math.min(buffer.length - 128, 0x8000); i += 2) {
      let valid = true;
      for (let c = 0; c < 16; c++) {
        const word = readUint16BE(buffer, i + c * 2);
        // High nibble must be 0 in standard Genesis CRAM word (0x0EEE max)
        if ((word & 0xf000) !== 0 || (word & 0x0111) !== 0) {
          valid = false;
          break;
        }
      }
      if (valid && (readUint16BE(buffer, i) === 0x0000)) {
        foundOffset = i;
        break;
      }
    }
  }

  for (let line = 0; line < 4; line++) {
    const colors: GenesisPaletteColor[] = [];
    for (let c = 0; c < 16; c++) {
      let word: number;
      if (foundOffset !== undefined && foundOffset + (line * 32) + (c * 2) + 1 < buffer.length) {
        word = readUint16BE(buffer, foundOffset + (line * 32) + (c * 2));
      } else {
        word = defaultPalettesRaw[line][c];
      }
      colors.push(decodeGenesisColor(word, c));
    }
    lines.push({ lineIndex: line, colors });
  }

  return lines;
}

/**
 * Extracts 8x8 4bpp Genesis tiles from ROM buffer.
 * Genesis tile structure: 32 bytes per tile.
 * 8 scanlines, 4 bytes per scanline. Each byte holds 2 pixels (high nibble, low nibble).
 */
export function extractTiles(
  buffer: Uint8Array,
  startOffset = 0x0200,
  maxTiles = 1000
): GenesisTile[] {
  const tiles: GenesisTile[] = [];
  const bytesPerTile = 32;
  const availableTiles = Math.max(0, Math.floor((buffer.length - startOffset) / bytesPerTile));
  const count = Math.min(maxTiles, availableTiles);

  for (let t = 0; t < count; t++) {
    const offset = startOffset + t * bytesPerTile;
    const pixels = new Uint8Array(64); // 8x8 pixels
    let pIdx = 0;

    for (let y = 0; y < 8; y++) {
      const lineOffset = offset + y * 4;
      for (let xByte = 0; xByte < 4; xByte++) {
        const byte = buffer[lineOffset + xByte];
        const pixel0 = (byte >> 4) & 0x0f;
        const pixel1 = byte & 0x0f;
        pixels[pIdx++] = pixel0;
        pixels[pIdx++] = pixel1;
      }
    }

    tiles.push({
      index: t,
      offset,
      pixels
    });
  }

  return tiles;
}

/**
 * Generates an authentic Genesis Homebrew Demo ROM with vector tables,
 * valid header, tile sets, and arcade graphics for instant testing.
 */
export function createSampleGenesisRom(sampleType: 'arcade-fighter' | 'cyber-sonic' | 'xenon-shmup'): Uint8Array {
  // Typical 256KB or 512KB ROM
  const romSize = 256 * 1024;
  const rom = new Uint8Array(romSize);

  // 1. Motorola 68000 Vector Table (0x0000 to 0x0100)
  // Stack pointer initial value: 0x00FF0000 (Top of Genesis RAM)
  rom[0] = 0x00; rom[1] = 0xff; rom[2] = 0x00; rom[3] = 0x00;
  // Program counter start: 0x00000200
  rom[4] = 0x00; rom[5] = 0x00; rom[6] = 0x02; rom[7] = 0x00;

  // 2. Genesis Header (0x0100 to 0x0200)
  const writeAscii = (offset: number, text: string, padLen: number) => {
    for (let i = 0; i < padLen; i++) {
      rom[offset + i] = i < text.length ? text.charCodeAt(i) : 0x20;
    }
  };

  writeAscii(0x0100, 'SEGA MEGA DRIVE ', 16);
  writeAscii(0x0110, '(C)T-12 1993.OCT', 16);

  let domTitle = 'ARCADE BRAWLER CHAMPION DOS-13H';
  let serial = 'GM T-12001-00';
  if (sampleType === 'cyber-sonic') {
    domTitle = 'CYBER SONIC BLAST RUNNER 16-BIT';
    serial = 'GM MK-1249-01';
  } else if (sampleType === 'xenon-shmup') {
    domTitle = 'XENON FORCE: RETRO SHMUP 1989';
    serial = 'GM T-99120-00';
  }

  writeAscii(0x0120, domTitle, 48);
  writeAscii(0x0150, domTitle, 48);
  writeAscii(0x0180, serial, 14);

  // ROM start/end (0x00000000 to romSize - 1)
  const end = romSize - 1;
  rom[0x01a0] = 0; rom[0x01a1] = 0; rom[0x01a2] = 0; rom[0x01a3] = 0;
  rom[0x01a4] = (end >> 24) & 0xff;
  rom[0x01a5] = (end >> 16) & 0xff;
  rom[0x01a6] = (end >> 8) & 0xff;
  rom[0x01a7] = end & 0xff;

  // RAM start/end (0x00FF0000 to 0x00FFFFFF)
  rom[0x01a8] = 0x00; rom[0x01a9] = 0xff; rom[0x01aa] = 0x00; rom[0x01ab] = 0x00;
  rom[0x01ac] = 0x00; rom[0x01ad] = 0xff; rom[0x01ae] = 0xff; rom[0x01af] = 0xff;

  writeAscii(0x01b0, 'RA       ', 12);
  writeAscii(0x01bc, '            ', 12);
  writeAscii(0x01f0, 'JUE             ', 16);

  // 3. Insert Palettes at 0x0200
  // Line 0: Character / Primary
  // Line 1: Background
  // Line 2: Metallic / Enemy
  // Line 3: FX / HUD
  const palettes: number[][] = [];
  if (sampleType === 'arcade-fighter') {
    palettes.push([
      0x0000, 0x002e, 0x004e, 0x008e, 0x00ce, 0x02ee, 0x04ee, 0x0cee,
      0x0e22, 0x0e44, 0x0e88, 0x0ecc, 0x0ece, 0x0eac, 0x0642, 0x0eee
    ]);
    palettes.push([
      0x0000, 0x0222, 0x0444, 0x0666, 0x0888, 0x0aaa, 0x0ccc, 0x0eee,
      0x0040, 0x0080, 0x00c0, 0x02e2, 0x04e4, 0x06e6, 0x08e8, 0x0aea
    ]);
    palettes.push([
      0x0000, 0x0004, 0x0008, 0x000c, 0x024c, 0x046e, 0x088e, 0x0cae,
      0x0400, 0x0800, 0x0c00, 0x0e20, 0x0e60, 0x0ea0, 0x0ee0, 0x0eee
    ]);
    palettes.push([
      0x0000, 0x002c, 0x004e, 0x008e, 0x00ce, 0x02ee, 0x06ee, 0x0aee,
      0x0084, 0x00ca, 0x02ee, 0x06ee, 0x0aee, 0x0cee, 0x0eee, 0x0eee
    ]);
  } else if (sampleType === 'cyber-sonic') {
    palettes.push([
      0x0000, 0x0400, 0x0800, 0x0e00, 0x0e40, 0x0e80, 0x0ec0, 0x0ee0,
      0x0e22, 0x002e, 0x006e, 0x00ae, 0x00ee, 0x04ee, 0x08ee, 0x0eee
    ]);
    palettes.push([
      0x0000, 0x0040, 0x0080, 0x00c0, 0x00e0, 0x04e2, 0x08e4, 0x0ce6,
      0x0842, 0x0a64, 0x0c86, 0x0ea8, 0x0222, 0x0666, 0x0aaa, 0x0eee
    ]);
    palettes.push([
      0x0000, 0x0200, 0x0400, 0x0800, 0x0c00, 0x0e00, 0x0e40, 0x0e80,
      0x0224, 0x0448, 0x066c, 0x088e, 0x0aae, 0x0cce, 0x0eee, 0x0eee
    ]);
    palettes.push([
      0x0000, 0x006e, 0x008e, 0x00ae, 0x00ce, 0x00ee, 0x04ee, 0x08ee,
      0x0e60, 0x0ea0, 0x0ee0, 0x02e2, 0x06e6, 0x0aea, 0x0eee, 0x0eee
    ]);
  } else {
    // Xenon Shmup
    palettes.push([
      0x0000, 0x0024, 0x0048, 0x006c, 0x008e, 0x02ae, 0x04ce, 0x08ee,
      0x0200, 0x0600, 0x0a00, 0x0e00, 0x0e40, 0x0e80, 0x0ec0, 0x0eee
    ]);
    palettes.push([
      0x0000, 0x0002, 0x0006, 0x000a, 0x000e, 0x022e, 0x044e, 0x066e,
      0x0444, 0x0666, 0x0888, 0x0aaa, 0x0ccc, 0x0eee, 0x0cee, 0x0aee
    ]);
    palettes.push([
      0x0000, 0x0204, 0x0408, 0x060c, 0x080e, 0x0a2e, 0x0c4e, 0x0e6e,
      0x0042, 0x0084, 0x00c6, 0x00e8, 0x02ea, 0x04ec, 0x06ee, 0x08ee
    ]);
    palettes.push([
      0x0000, 0x0008, 0x000c, 0x000e, 0x040e, 0x080e, 0x0c0e, 0x0e0e,
      0x0e42, 0x0e84, 0x0ec6, 0x0ee8, 0x02e2, 0x06e6, 0x0aea, 0x0eee
    ]);
  }

  let palOffset = 0x0200;
  for (let l = 0; l < 4; l++) {
    for (let c = 0; c < 16; c++) {
      const val = palettes[l][c];
      rom[palOffset++] = (val >> 8) & 0xff;
      rom[palOffset++] = val & 0xff;
    }
  }

  // 4. Generate 4bpp Genesis Graphic Tiles at 0x0300
  // 32 bytes per tile (8x8 pixels, 4 bytes/line = 2 pixels/byte)
  let tileOffset = 0x0300;
  const numSampleTiles = 300;

  for (let t = 0; t < numSampleTiles; t++) {
    for (let y = 0; y < 8; y++) {
      for (let xPair = 0; xPair < 4; xPair++) {
        let p1 = 0;
        let p2 = 0;

        if (sampleType === 'arcade-fighter') {
          // Generate fighter sprite tiles, bricks, martial arts logo
          const x0 = xPair * 2;
          const x1 = x0 + 1;
          if (t < 20) {
            // Title text & arcade banner
            p1 = (x0 === y || x0 + y === 7 || t % 3 === 0) ? ((t % 7) + 8) : 0;
            p2 = (x1 === y || x1 + y === 7 || (t + 1) % 3 === 0) ? (((t + 1) % 7) + 8) : 0;
          } else if (t < 60) {
            // Brick wall & arena floor
            p1 = (y === 0 || y === 4 || (x0 % 4 === 0 && y < 4) || ((x0 + 2) % 4 === 0 && y >= 4)) ? 1 : 2 + (t % 3);
            p2 = (y === 0 || y === 4 || (x1 % 4 === 0 && y < 4) || ((x1 + 2) % 4 === 0 && y >= 4)) ? 1 : 2 + ((t + 1) % 3);
          } else {
            // Fighter musculature & stance
            const dist = Math.hypot((x0 - 4), (y - 4));
            p1 = dist < 3.5 ? (4 + Math.floor(dist * 2) + (t % 4)) % 15 + 1 : 0;
            const dist2 = Math.hypot((x1 - 4), (y - 4));
            p2 = dist2 < 3.5 ? (4 + Math.floor(dist2 * 2) + ((t + 1) % 4)) % 15 + 1 : 0;
          }
        } else if (sampleType === 'cyber-sonic') {
          // Checkerboard green hill & rings
          const x0 = xPair * 2;
          const x1 = x0 + 1;
          if (t < 30) {
            // Checkerboard terrain
            const cb0 = ((Math.floor(x0 / 4) + Math.floor(y / 4) + t) % 2 === 0);
            const cb1 = ((Math.floor(x1 / 4) + Math.floor(y / 4) + t) % 2 === 0);
            p1 = cb0 ? 9 : 10;
            p2 = cb1 ? 9 : 10;
          } else if (t < 70) {
            // Golden Ring
            const r0 = Math.hypot(x0 - 3.5, y - 3.5);
            const r1 = Math.hypot(x1 - 3.5, y - 3.5);
            p1 = (r0 >= 2.0 && r0 <= 3.8) ? (5 + (t % 3)) : 0;
            p2 = (r1 >= 2.0 && r1 <= 3.8) ? (5 + ((t + 1) % 3)) : 0;
          } else {
            // Blue speed streaks
            p1 = (y % 2 === 0) ? (11 + ((x0 + t) % 4)) : 0;
            p2 = (y % 2 === 0) ? (11 + ((x1 + t) % 4)) : 0;
          }
        } else {
          // Xenon Shmup: Starfields, spaceship hull, laser bolts
          const x0 = xPair * 2;
          const x1 = x0 + 1;
          if (t < 25) {
            // Starfield
            p1 = ((x0 * 13 + y * 17 + t * 31) % 47 === 0) ? 15 : 0;
            p2 = ((x1 * 13 + y * 17 + t * 31) % 47 === 0) ? 15 : 0;
          } else if (t < 65) {
            // Space fighter delta wing
            p1 = (Math.abs(x0 - 4) <= y && y > 1) ? (4 + (y % 6)) : 0;
            p2 = (Math.abs(x1 - 4) <= y && y > 1) ? (4 + (y % 6)) : 0;
          } else {
            // Laser energy blast
            p1 = (x0 === 3 || x0 === 4) ? (10 + (y % 5)) : 0;
            p2 = (x1 === 3 || x1 === 4) ? (10 + (y % 5)) : 0;
          }
        }

        rom[tileOffset++] = ((p1 & 0x0f) << 4) | (p2 & 0x0f);
      }
    }
  }

  // 5. Calculate and write valid Motorola 68000 checksum
  const csum = calculateChecksum(rom);
  rom[0x018e] = (csum >> 8) & 0xff;
  rom[0x018f] = csum & 0xff;

  return rom;
}
