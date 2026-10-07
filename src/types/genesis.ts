export interface GenesisHeader {
  consoleName: string;
  copyright: string;
  domesticTitle: string;
  overseasTitle: string;
  serialNumber: string;
  checksum: number;
  calculatedChecksum: number;
  checksumValid: boolean;
  romStart: number;
  romEnd: number;
  ramStart: number;
  ramEnd: number;
  extraMemory: string;
  sramEnabled: boolean;
  modemSupport: string;
  region: string;
  isSMD: boolean;
  totalSize: number;
}

export interface GenesisTile {
  index: number;
  offset: number;
  // 64 pixels (8x8), values 0-15 representing color indices in the active palette
  pixels: Uint8Array;
}

export interface GenesisPaletteColor {
  index: number;
  // Genesis 9-bit raw color: 0000 BBB0 GGG0 RRR0 (even bytes 0, 2, 4, 6, 8, A, C, E)
  raw9bit: number;
  r3bit: number; // 0-7
  g3bit: number; // 0-7
  b3bit: number; // 0-7
  // Converted 8-bit RGB (0-255)
  r8: number;
  g8: number;
  b8: number;
  // VGA DAC 6-bit values (0-63)
  vgaR: number;
  vgaG: number;
  vgaB: number;
  hex: string;
}

export interface GenesisPaletteLine {
  lineIndex: number; // 0 to 3 (Genesis has 4 palette lines)
  colors: GenesisPaletteColor[];
}

export type VgaDitherMethod = 'none' | 'floyd-steinberg' | 'atkinson' | 'bayer4x4';
export type VgaFitMode = 'crop-center' | 'crop-top' | 'crop-bottom' | 'scale' | 'letterbox' | 'tilesheet';
export type ExePayloadMode = 'arcade-splash' | 'sprite-viewer' | 'raw-vga-driver' | 'cinematic-intro';

export interface VgaConversionConfig {
  fitMode: VgaFitMode;
  dither: VgaDitherMethod;
  activePaletteIndex: number;
  paletteRemapMode: 'genesis-direct' | 'vga-standard-256' | 'vga-optimized-adaptive';
  brightness: number; // -50 to +50
  contrast: number;   // -50 to +50
  gamma: number;      // 0.5 to 2.0
  addScanlineEffectInExe: boolean;
}

export interface MzExeHeader {
  signature: string; // 'MZ' (0x5A4D)
  bytesInLastPage: number; // e_cblp
  pagesInFile: number; // e_cp (512-byte pages)
  relocations: number; // e_crlc
  headerSizeParagraphs: number; // e_cparhdr (16-byte paras)
  minExtraParagraphs: number; // e_minalloc
  maxExtraParagraphs: number; // e_maxalloc
  initialSS: number; // e_ss
  initialSP: number; // e_sp
  checksum: number; // e_csum
  initialIP: number; // e_ip
  initialCS: number; // e_cs
  relocationTableOffset: number; // e_lfarlc
  overlayNumber: number; // e_ovno
}

export interface MzExeConfig {
  title: string;
  gameId: string;
  mode: ExePayloadMode;
  minAlloc: number;
  maxAlloc: number;
  stackSize: number;
  autoExitSeconds: number; // 0 = wait for key
  showDosBanner: boolean;
  enableVgaFadeIn: boolean;
  enableCrtScanlineEmulation: boolean;
}

export interface ConvertedVgaAsset {
  width: number;
  height: number;
  // 64000 bytes (320 * 200) index buffer
  screenBuffer: Uint8Array;
  // 768 bytes (256 * 3) VGA DAC palette (0-63 each)
  vgaDacPalette: Uint8Array;
  // 1024 bytes (256 * 4) RGBA palette for preview rendering
  rgbaPalette: Uint32Array;
  pcxData?: Uint8Array;
  exeBinary?: Uint8Array;
}
