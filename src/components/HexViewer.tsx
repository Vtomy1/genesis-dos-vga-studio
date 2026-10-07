import React, { useState, useMemo } from 'react';
import { Binary, Search, Bookmark, ChevronLeft, ChevronRight } from 'lucide-react';

interface HexViewerProps {
  romBuffer: Uint8Array | null;
  exeBuffer: Uint8Array | null;
  vgaBuffer: Uint8Array | null;
  palBuffer: Uint8Array | null;
}

export const HexViewer: React.FC<HexViewerProps> = ({
  romBuffer,
  exeBuffer,
  vgaBuffer,
  palBuffer
}) => {
  const [sourceType, setSourceType] = useState<'rom' | 'exe' | 'vga' | 'pal'>('exe');
  const [page, setPage] = useState<number>(0);
  const [jumpAddressInput, setJumpAddressInput] = useState<string>('');

  const activeBuffer = useMemo(() => {
    switch (sourceType) {
      case 'rom': return romBuffer;
      case 'exe': return exeBuffer;
      case 'vga': return vgaBuffer;
      case 'pal': return palBuffer;
    }
  }, [sourceType, romBuffer, exeBuffer, vgaBuffer, palBuffer]);

  const bytesPerPage = 256; // 16 rows of 16 bytes
  const totalPages = activeBuffer ? Math.max(1, Math.ceil(activeBuffer.length / bytesPerPage)) : 1;

  const currentBytes = useMemo(() => {
    if (!activeBuffer) return new Uint8Array(0);
    const start = page * bytesPerPage;
    return activeBuffer.slice(start, start + bytesPerPage);
  }, [activeBuffer, page]);

  const handleJump = (offsetHex: string) => {
    const cleaned = offsetHex.replace(/^0x/i, '').replace(/h$/i, '');
    const num = parseInt(cleaned, 16);
    if (!isNaN(num) && activeBuffer) {
      const targetPage = Math.min(totalPages - 1, Math.max(0, Math.floor(num / bytesPerPage)));
      setPage(targetPage);
    }
  };

  const rows = useMemo(() => {
    const list: { offset: number; hexStr: string[]; asciiStr: string }[] = [];
    const baseOffset = page * bytesPerPage;

    for (let r = 0; r < 16; r++) {
      const rowOffset = baseOffset + r * 16;
      if (activeBuffer && rowOffset >= activeBuffer.length) break;

      const hexStr: string[] = [];
      let asciiStr = '';

      for (let c = 0; c < 16; c++) {
        const byteIndex = r * 16 + c;
        if (byteIndex < currentBytes.length) {
          const val = currentBytes[byteIndex];
          hexStr.push(val.toString(16).padStart(2, '0').toUpperCase());
          // ASCII representation
          if (val >= 32 && val <= 126) {
            asciiStr += String.fromCharCode(val);
          } else {
            asciiStr += '·';
          }
        } else {
          hexStr.push('  ');
          asciiStr += ' ';
        }
      }

      list.push({ offset: rowOffset, hexStr, asciiStr });
    }

    return list;
  }, [currentBytes, page, activeBuffer]);

  return (
    <div className="flex flex-col gap-3">
      {/* Top Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-neutral-900 border border-neutral-800 p-2.5 rounded-lg text-xs">
        <div className="flex items-center gap-2">
          <Binary className="w-4 h-4 text-amber-500" />
          <span className="font-semibold text-white">Hex &amp; Binary Stream Inspector</span>
          <span className="text-neutral-500">·</span>
          {/* Source Selector */}
          <div className="flex bg-neutral-950 border border-neutral-800 rounded p-0.5">
            <button
              onClick={() => { setSourceType('exe'); setPage(0); }}
              className={`px-2 py-0.5 rounded transition-colors ${
                sourceType === 'exe' ? 'bg-amber-600 text-white font-medium' : 'text-neutral-400 hover:text-white'
              }`}
            >
              MZ .EXE Binary
            </button>
            <button
              onClick={() => { setSourceType('rom'); setPage(0); }}
              className={`px-2 py-0.5 rounded transition-colors ${
                sourceType === 'rom' ? 'bg-amber-600 text-white font-medium' : 'text-neutral-400 hover:text-white'
              }`}
            >
              Genesis ROM
            </button>
            <button
              onClick={() => { setSourceType('vga'); setPage(0); }}
              className={`px-2 py-0.5 rounded transition-colors ${
                sourceType === 'vga' ? 'bg-amber-600 text-white font-medium' : 'text-neutral-400 hover:text-white'
              }`}
            >
              320x200 .VGA Screen
            </button>
            <button
              onClick={() => { setSourceType('pal'); setPage(0); }}
              className={`px-2 py-0.5 rounded transition-colors ${
                sourceType === 'pal' ? 'bg-amber-600 text-white font-medium' : 'text-neutral-400 hover:text-white'
              }`}
            >
              768-Byte .PAL DAC
            </button>
          </div>
        </div>

        {/* Bookmarks & Jump */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-neutral-400">
            <Bookmark className="w-3.5 h-3.5" />
            <span className="text-[11px]">Jump:</span>
            {sourceType === 'exe' && (
              <>
                <button
                  onClick={() => handleJump('0000')}
                  className="px-1.5 py-0.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded text-[11px]"
                >
                  Header (0h)
                </button>
                <button
                  onClick={() => handleJump('0040')}
                  className="px-1.5 py-0.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded text-[11px]"
                >
                  Code (40h)
                </button>
                <button
                  onClick={() => handleJump('00A0')}
                  className="px-1.5 py-0.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded text-[11px]"
                >
                  Palette (A0h)
                </button>
                <button
                  onClick={() => handleJump('03A0')}
                  className="px-1.5 py-0.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded text-[11px]"
                >
                  VGA (3A0h)
                </button>
              </>
            )}
            {sourceType === 'rom' && (
              <>
                <button
                  onClick={() => handleJump('0000')}
                  className="px-1.5 py-0.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded text-[11px]"
                >
                  Vectors (0h)
                </button>
                <button
                  onClick={() => handleJump('0100')}
                  className="px-1.5 py-0.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded text-[11px]"
                >
                  Header (100h)
                </button>
                <button
                  onClick={() => handleJump('0200')}
                  className="px-1.5 py-0.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded text-[11px]"
                >
                  CRAM (200h)
                </button>
                <button
                  onClick={() => handleJump('0300')}
                  className="px-1.5 py-0.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded text-[11px]"
                >
                  Tiles (300h)
                </button>
              </>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleJump(jumpAddressInput);
            }}
            className="flex items-center"
          >
            <input
              type="text"
              placeholder="Offset hex..."
              value={jumpAddressInput}
              onChange={(e) => setJumpAddressInput(e.target.value)}
              className="w-24 bg-neutral-950 border border-neutral-800 rounded px-2 py-0.5 text-white font-mono text-[11px] outline-none focus:border-amber-500"
            />
          </form>
        </div>
      </div>

      {/* Hex Dump Table */}
      <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-4 font-mono text-xs overflow-x-auto shadow-inner">
        {/* Hex header */}
        <div className="flex items-center text-neutral-500 border-b border-neutral-800 pb-2 mb-2 select-none">
          <span className="w-24 font-bold">Offset</span>
          <div className="flex-1 grid grid-cols-16 gap-1.5 text-center">
            {['00','01','02','03','04','05','06','07','08','09','0A','0B','0C','0D','0E','0F'].map(h => (
              <span key={h}>{h}</span>
            ))}
          </div>
          <span className="w-36 pl-4 font-bold">Decoded ASCII</span>
        </div>

        {/* Rows */}
        <div className="flex flex-col gap-1 text-neutral-300">
          {rows.map((row) => (
            <div key={row.offset} className="flex items-center hover:bg-neutral-900/60 rounded px-1 py-0.5">
              <span className="w-24 text-amber-500 font-bold select-none">
                0x{row.offset.toString(16).padStart(6, '0').toUpperCase()}
              </span>

              <div className="flex-1 grid grid-cols-16 gap-1.5 text-center">
                {row.hexStr.map((hex, i) => {
                  const isZero = hex === '00';
                  const isMZ = row.offset === 0 && (i === 0 || i === 1);
                  return (
                    <span
                      key={i}
                      className={`${
                        isMZ
                          ? 'text-emerald-400 font-bold'
                          : isZero
                          ? 'text-neutral-600'
                          : 'text-neutral-200 font-medium'
                      }`}
                    >
                      {hex}
                    </span>
                  );
                })}
              </div>

              <span className="w-36 pl-4 text-neutral-400 tracking-wider whitespace-pre border-l border-neutral-800">
                {row.asciiStr}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Pagination Footer */}
      <div className="flex items-center justify-between text-xs text-neutral-400 font-mono px-1">
        <span>
          Page {page + 1} of {totalPages} · Total size: {activeBuffer ? activeBuffer.length.toLocaleString() : 0} bytes
        </span>

        <div className="flex items-center gap-1">
          <button
            disabled={page === 0}
            onClick={() => setPage(p => Math.max(0, p - 1))}
            className="flex items-center gap-1 px-2.5 py-1 bg-neutral-900 border border-neutral-800 disabled:opacity-30 rounded hover:border-neutral-700 text-neutral-200"
          >
            <ChevronLeft className="w-3 h-3" />
            Prev
          </button>
          <button
            disabled={page >= totalPages - 1}
            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            className="flex items-center gap-1 px-2.5 py-1 bg-neutral-900 border border-neutral-800 disabled:opacity-30 rounded hover:border-neutral-700 text-neutral-200"
          >
            Next
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
};
