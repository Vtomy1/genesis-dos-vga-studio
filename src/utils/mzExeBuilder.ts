import {
  ConvertedVgaAsset,
  MzExeConfig,
  MzExeHeader
} from '../types/genesis';

/**
 * Builds a valid, bootable MS-DOS MZ Executable (.EXE) binary containing
 * real 16-bit x86 machine code and the converted 320x200 Mode 13h VGA payload.
 */
export function buildDosMzExecutable(
  asset: ConvertedVgaAsset,
  config: MzExeConfig
): { binary: Uint8Array; header: MzExeHeader; disassembly: { offset: number; hex: string; asm: string; desc: string }[] } {
  // 1. Prepare Header Structure (64 bytes = 4 paragraphs)
  const headerParagraphs = 4;
  const headerSize = headerParagraphs * 16; // 64 bytes

  // 2. Assemble 16-bit x86 code
  const codeBytes: number[] = [];
  const disassembly: { offset: number; hex: string; asm: string; desc: string }[] = [];

  const addInstr = (bytes: number[], asm: string, desc: string) => {
    const hex = bytes.map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(' ');
    disassembly.push({
      offset: codeBytes.length,
      hex,
      asm,
      desc
    });
    for (const b of bytes) {
      codeBytes.push(b);
    }
  };

  // Push DS and set DS = CS (Real mode code segment)
  addInstr([0x1E], 'PUSH DS', 'Save DOS caller Data Segment');
  addInstr([0x8C, 0xC8], 'MOV AX, CS', 'Load Code Segment into AX');
  addInstr([0x8E, 0xD8], 'MOV DS, AX', 'Set DS = CS for local data access');

  if (config.showDosBanner) {
    // Write banner string to DOS console via INT 21h, AH=09h before switching video mode
    // We will place string later; for now, placeholder or direct switch
  }

  // Switch to VGA Mode 13h (320x200 256 colors)
  addInstr([0xB8, 0x13, 0x00], 'MOV AX, 0013h', 'AH=0 (Set Video Mode), AL=13h (VGA 320x200x256)');
  addInstr([0xCD, 0x10], 'INT 10h', 'Call Video BIOS: Enter Mode 13h');

  // Offset of palette data relative to CS
  // The code section will be followed by:
  // Palette (768 bytes), then Screen buffer (64,000 bytes)
  // Let's calculate code length placeholder
  const estimatedCodeLen = 96; // Approximate code size
  const palOffset = estimatedCodeLen;
  const palLow = palOffset & 0xff;
  const palHigh = (palOffset >> 8) & 0xff;

  // Set VGA DAC Palette via Port 3C8h and 3C9h
  addInstr([0xBA, 0xC8, 0x03], 'MOV DX, 03C8h', 'DX = VGA DAC Pel Address Write Mode Register');
  addInstr([0x31, 0xC0], 'XOR AL, AL', 'AL = 0 (Start writing from Palette Index 0)');
  addInstr([0xEE], 'OUT DX, AL', 'Write index 0 to port 0x3C8');
  addInstr([0x42], 'INC DX', 'DX = 03C9h (VGA DAC Data Register)');
  addInstr([0xBE, palLow, palHigh], `MOV SI, ${palOffset.toString(16).padStart(4, '0')}h`, 'SI points to converted 768-byte VGA DAC palette');
  addInstr([0xB9, 0x00, 0x03], 'MOV CX, 0300h', 'CX = 768 bytes (256 colors * 3 DAC channels)');

  // Loop to transfer DAC palette
  // LODSB (AC), OUT DX, AL (EE), LOOP (E2 FD)
  addInstr([0xAC], 'LODSB', 'Load byte from [SI] into AL and increment SI');
  addInstr([0xEE], 'OUT DX, AL', 'Send 6-bit DAC RGB value to VGA port 0x3C9');
  addInstr([0xE2, 0xFC], 'LOOP 0011h', 'Loop CX times until all 768 palette bytes sent');

  // Copy 320x200 Framebuffer to VGA Video Memory Segment (0xA000)
  const screenOffset = palOffset + 768;
  const scrLow = screenOffset & 0xff;
  const scrHigh = (screenOffset >> 8) & 0xff;

  addInstr([0xB8, 0x00, 0xA0], 'MOV AX, 0A000h', 'AX = A000h (Standard VGA framebuffer segment)');
  addInstr([0x8E, 0xC0], 'MOV ES, AX', 'ES = A000h (Video RAM)');
  addInstr([0x31, 0xFF], 'XOR DI, DI', 'DI = 0 (Destination offset in A000:0000)');
  addInstr([0xBE, scrLow, scrHigh], `MOV SI, ${screenOffset.toString(16).padStart(4, '0')}h`, 'SI points to converted 64,000-byte screen buffer');
  addInstr([0xB9, 0x00, 0x7D], 'MOV CX, 7D00h', 'CX = 32,000 words (64,000 bytes)');
  addInstr([0xF3, 0xA5], 'REP MOVSW', 'High-speed word block transfer from DS:SI to ES:DI');

  // Wait for keypress or loop
  if (config.mode === 'sprite-viewer') {
    // Interactive cycle loop
    addInstr([0x31, 0xE4], 'XOR AH, AH', 'AH = 00h (Wait for keystroke)');
    addInstr([0xCD, 0x16], 'INT 16h', 'BIOS Keyboard Service');
  } else {
    // Wait for single keypress
    addInstr([0x31, 0xE4], 'XOR AH, AH', 'AH = 00h (Wait for keypress)');
    addInstr([0xCD, 0x16], 'INT 16h', 'Call BIOS Keyboard Service: Halt until key hit');
  }

  // Restore 80x25 16-color text mode (Mode 03h)
  addInstr([0xB8, 0x03, 0x00], 'MOV AX, 0003h', 'AH=0, AL=03h (Standard DOS text mode)');
  addInstr([0xCD, 0x10], 'INT 10h', 'Call Video BIOS: Restore standard text screen');

  // Restore DS
  addInstr([0x1F], 'POP DS', 'Restore original DOS Data Segment');

  // Exit cleanly to MS-DOS (INT 21h, AH=4Ch)
  addInstr([0xB8, 0x00, 0x4C], 'MOV AX, 4C00h', 'AH = 4Ch (DOS Terminate Process), AL = 00h (Return code 0)');
  addInstr([0xCD, 0x21], 'INT 21h', 'Call DOS API: Clean exit to command prompt');

  // Pad code bytes to exactly estimatedCodeLen
  while (codeBytes.length < estimatedCodeLen) {
    codeBytes.push(0x90); // NOP
  }

  // 3. Assemble binary payload
  // Total size: headerSize + codeBytes + 768 (palette) + 64000 (screen)
  const totalBinarySize = headerSize + codeBytes.length + 768 + 64000;
  const binary = new Uint8Array(totalBinarySize);

  // Calculate MZ header fields
  const totalPages = Math.ceil(totalBinarySize / 512);
  const bytesInLastPage = totalBinarySize % 512 === 0 ? 512 : totalBinarySize % 512;

  const header: MzExeHeader = {
    signature: 'MZ',
    bytesInLastPage,
    pagesInFile: totalPages,
    relocations: 0,
    headerSizeParagraphs: headerParagraphs,
    minExtraParagraphs: config.minAlloc || 0x1000,
    maxExtraParagraphs: config.maxAlloc || 0xffff,
    initialSS: 0x1000, // Stack segment above code/data
    initialSP: config.stackSize || 0x0800,
    checksum: 0x0000,
    initialIP: 0x0000,
    initialCS: 0x0000,
    relocationTableOffset: 0x001c,
    overlayNumber: 0x0000
  };

  // Write MZ Header (Little Endian)
  const view = new DataView(binary.buffer);
  binary[0] = 0x4d; // 'M'
  binary[1] = 0x5a; // 'Z'
  view.setUint16(2, header.bytesInLastPage, true);
  view.setUint16(4, header.pagesInFile, true);
  view.setUint16(6, header.relocations, true);
  view.setUint16(8, header.headerSizeParagraphs, true);
  view.setUint16(10, header.minExtraParagraphs, true);
  view.setUint16(12, header.maxExtraParagraphs, true);
  view.setUint16(14, header.initialSS, true);
  view.setUint16(16, header.initialSP, true);
  view.setUint16(18, header.checksum, true);
  view.setUint16(20, header.initialIP, true);
  view.setUint16(22, header.initialCS, true);
  view.setUint16(24, header.relocationTableOffset, true);
  view.setUint16(26, header.overlayNumber, true);

  // Optional: write title string inside reserved header space (offsets 28-63)
  const titleBytes = new TextEncoder().encode(`GENESIS2DOS:${config.title.slice(0, 30)}`);
  for (let i = 0; i < Math.min(32, titleBytes.length); i++) {
    binary[28 + i] = titleBytes[i];
  }

  // 4. Write Code section at headerSize
  binary.set(new Uint8Array(codeBytes), headerSize);

  // 5. Write Palette data (768 bytes)
  const palDest = headerSize + codeBytes.length;
  binary.set(asset.vgaDacPalette, palDest);

  // 6. Write Screen buffer (64,000 bytes)
  const scrDest = palDest + 768;
  binary.set(asset.screenBuffer, scrDest);

  return { binary, header, disassembly };
}
