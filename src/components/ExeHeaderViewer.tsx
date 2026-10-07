import React from 'react';
import { MzExeHeader, ConvertedVgaAsset, MzExeConfig } from '../types/genesis';
import { Download, FileCode, Cpu, Layers, HardDrive, CheckCircle2 } from 'lucide-react';

interface ExeHeaderViewerProps {
  header: MzExeHeader | null;
  disassembly: { offset: number; hex: string; asm: string; desc: string }[];
  binary: Uint8Array | null;
  config: MzExeConfig;
  onChangeConfig: (newCfg: Partial<MzExeConfig>) => void;
  gameTitle: string;
}

export const ExeHeaderViewer: React.FC<ExeHeaderViewerProps> = ({
  header,
  disassembly,
  binary,
  config,
  onChangeConfig,
  gameTitle
}) => {
  const downloadExe = () => {
    if (!binary) return;
    const blob = new Blob([binary as unknown as BlobPart], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const safeTitle = (config.gameId || 'ARCADE').replace(/[^a-zA-Z0-9]/g, '').slice(0, 8);
    link.download = `${safeTitle}.EXE`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Top Banner and Download Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-neutral-900 border border-neutral-800 p-3.5 rounded-lg">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-400">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-white text-sm flex items-center gap-2">
              <span>MS-DOS MZ Executable (.EXE) Packager</span>
              <span className="text-[11px] font-normal text-emerald-400 bg-emerald-950/60 border border-emerald-800 px-1.5 py-0.5 rounded">
                Valid 16-Bit Real Mode Binary
              </span>
            </h3>
            <p className="text-xs text-neutral-400">
              Generated MZ format compatible with DOSBox, FreeDOS, MS-DOS 3.30–6.22, and real 286/386/486 hardware.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={downloadExe}
            disabled={!binary}
            className="flex items-center gap-2 px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-neutral-950 font-semibold rounded-md text-xs transition-colors shadow-sm"
          >
            <Download className="w-4 h-4" />
            Download {config.gameId || 'PORT'}.EXE ({binary ? (binary.length / 1024).toFixed(1) : 0} KB)
          </button>
        </div>
      </div>

      {/* Configuration Controls */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-neutral-900/60 border border-neutral-800 p-3 rounded-lg text-xs">
        <div>
          <label className="block text-neutral-400 mb-1">DOS 8.3 Executable Name</label>
          <input
            type="text"
            maxLength={8}
            value={config.gameId}
            onChange={(e) => onChangeConfig({ gameId: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '') })}
            className="w-full bg-neutral-950 border border-neutral-800 rounded px-2.5 py-1.5 text-white font-mono uppercase focus:border-amber-500 outline-none"
            placeholder="PORT"
          />
        </div>

        <div>
          <label className="block text-neutral-400 mb-1">Payload Architecture</label>
          <select
            value={config.mode}
            onChange={(e) => onChangeConfig({ mode: e.target.value as any })}
            className="w-full bg-neutral-950 border border-neutral-800 rounded px-2.5 py-1.5 text-white focus:border-amber-500 outline-none"
          >
            <option value="arcade-splash">VGA Mode 13h Arcade Splash Port</option>
            <option value="sprite-viewer">Interactive Sprite / Palette Cycler</option>
            <option value="raw-vga-driver">Raw VGA Driver &amp; Memory Blitter</option>
          </select>
        </div>

        <div>
          <label className="block text-neutral-400 mb-1">Initial Stack Pointer (SP)</label>
          <select
            value={config.stackSize}
            onChange={(e) => onChangeConfig({ stackSize: Number(e.target.value) })}
            className="w-full bg-neutral-950 border border-neutral-800 rounded px-2.5 py-1.5 text-white font-mono focus:border-amber-500 outline-none"
          >
            <option value={1024}>0400h (1 KB Stack)</option>
            <option value={2048}>0800h (2 KB Stack)</option>
            <option value={4096}>1000h (4 KB Stack)</option>
          </select>
        </div>
      </div>

      {/* MZ Header Structural Breakdown Table */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-lg overflow-hidden">
        <div className="px-3.5 py-2.5 bg-neutral-900/90 border-b border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold text-neutral-200">
            <HardDrive className="w-3.5 h-3.5 text-amber-500" />
            <span>MZ Executable Header (0x00 - 0x3F) Structure</span>
          </div>
          <span className="text-[11px] text-neutral-400 font-mono">
            Header Size: {header?.headerSizeParagraphs || 4} paragraphs ({header ? header.headerSizeParagraphs * 16 : 64} bytes)
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-neutral-950 text-neutral-400 border-b border-neutral-800">
              <tr>
                <th className="py-2 px-3">Offset</th>
                <th className="py-2 px-3">Field Name</th>
                <th className="py-2 px-3">Value (Hex)</th>
                <th className="py-2 px-3">Decimal</th>
                <th className="py-2 px-3">DOS Architecture Purpose</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/60 text-neutral-300">
              <tr className="hover:bg-neutral-800/40">
                <td className="py-1.5 px-3 text-amber-400">0x00</td>
                <td className="py-1.5 px-3 font-semibold text-white">e_magic</td>
                <td className="py-1.5 px-3 text-emerald-400">4D 5A ('MZ')</td>
                <td className="py-1.5 px-3">0x5A4D</td>
                <td className="py-1.5 px-3 text-neutral-400">Mark Zbikowski DOS signature magic number</td>
              </tr>
              <tr className="hover:bg-neutral-800/40">
                <td className="py-1.5 px-3 text-amber-400">0x02</td>
                <td className="py-1.5 px-3 font-semibold text-white">e_cblp</td>
                <td className="py-1.5 px-3 text-emerald-400">
                  0x{header?.bytesInLastPage.toString(16).toUpperCase().padStart(4, '0')}
                </td>
                <td className="py-1.5 px-3">{header?.bytesInLastPage} bytes</td>
                <td className="py-1.5 px-3 text-neutral-400">Bytes on last 512-byte page of the executable</td>
              </tr>
              <tr className="hover:bg-neutral-800/40">
                <td className="py-1.5 px-3 text-amber-400">0x04</td>
                <td className="py-1.5 px-3 font-semibold text-white">e_cp</td>
                <td className="py-1.5 px-3 text-emerald-400">
                  0x{header?.pagesInFile.toString(16).toUpperCase().padStart(4, '0')}
                </td>
                <td className="py-1.5 px-3">{header?.pagesInFile} pages</td>
                <td className="py-1.5 px-3 text-neutral-400">Total 512-byte pages in file (including header)</td>
              </tr>
              <tr className="hover:bg-neutral-800/40">
                <td className="py-1.5 px-3 text-amber-400">0x06</td>
                <td className="py-1.5 px-3 font-semibold text-white">e_crlc</td>
                <td className="py-1.5 px-3 text-emerald-400">
                  0x{header?.relocations.toString(16).toUpperCase().padStart(4, '0')}
                </td>
                <td className="py-1.5 px-3">{header?.relocations}</td>
                <td className="py-1.5 px-3 text-neutral-400">Number of relocation entries required</td>
              </tr>
              <tr className="hover:bg-neutral-800/40">
                <td className="py-1.5 px-3 text-amber-400">0x08</td>
                <td className="py-1.5 px-3 font-semibold text-white">e_cparhdr</td>
                <td className="py-1.5 px-3 text-emerald-400">
                  0x{header?.headerSizeParagraphs.toString(16).toUpperCase().padStart(4, '0')}
                </td>
                <td className="py-1.5 px-3">{header?.headerSizeParagraphs}</td>
                <td className="py-1.5 px-3 text-neutral-400">Size of header in 16-byte paragraphs (offset to code)</td>
              </tr>
              <tr className="hover:bg-neutral-800/40">
                <td className="py-1.5 px-3 text-amber-400">0x0A</td>
                <td className="py-1.5 px-3 font-semibold text-white">e_minalloc</td>
                <td className="py-1.5 px-3 text-emerald-400">
                  0x{header?.minExtraParagraphs.toString(16).toUpperCase().padStart(4, '0')}
                </td>
                <td className="py-1.5 px-3">{header?.minExtraParagraphs}</td>
                <td className="py-1.5 px-3 text-neutral-400">Minimum extra paragraphs allocated beyond program size</td>
              </tr>
              <tr className="hover:bg-neutral-800/40">
                <td className="py-1.5 px-3 text-amber-400">0x0C</td>
                <td className="py-1.5 px-3 font-semibold text-white">e_maxalloc</td>
                <td className="py-1.5 px-3 text-emerald-400">
                  0x{header?.maxExtraParagraphs.toString(16).toUpperCase().padStart(4, '0')}
                </td>
                <td className="py-1.5 px-3">{header?.maxExtraParagraphs}</td>
                <td className="py-1.5 px-3 text-neutral-400">Maximum extra paragraphs requested (0xFFFF = all free RAM)</td>
              </tr>
              <tr className="hover:bg-neutral-800/40">
                <td className="py-1.5 px-3 text-amber-400">0x0E</td>
                <td className="py-1.5 px-3 font-semibold text-white">e_ss / e_sp</td>
                <td className="py-1.5 px-3 text-emerald-400">
                  {header?.initialSS.toString(16).padStart(4, '0')} : {header?.initialSP.toString(16).padStart(4, '0')}
                </td>
                <td className="py-1.5 px-3">SS:SP Stack</td>
                <td className="py-1.5 px-3 text-neutral-400">Initial relative Stack Segment &amp; Stack Pointer</td>
              </tr>
              <tr className="hover:bg-neutral-800/40">
                <td className="py-1.5 px-3 text-amber-400">0x14</td>
                <td className="py-1.5 px-3 font-semibold text-white">e_cs / e_ip</td>
                <td className="py-1.5 px-3 text-emerald-400">
                  {header?.initialCS.toString(16).padStart(4, '0')} : {header?.initialIP.toString(16).padStart(4, '0')}
                </td>
                <td className="py-1.5 px-3">CS:IP Entry</td>
                <td className="py-1.5 px-3 text-neutral-400">Initial relative Code Segment &amp; Instruction Pointer</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Real x86 Machine Code Disassembly */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-lg overflow-hidden">
        <div className="px-3.5 py-2.5 bg-neutral-900/90 border-b border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold text-neutral-200">
            <FileCode className="w-3.5 h-3.5 text-amber-500" />
            <span>16-Bit Real Mode x86 Machine Code Disassembly</span>
          </div>
          <span className="text-[11px] text-neutral-400 font-mono">
            BIOS &amp; I/O Ports: INT 10h, INT 16h, INT 21h, 0x3C8, 0x3C9
          </span>
        </div>

        <div className="max-h-[300px] overflow-y-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-neutral-950 text-neutral-400 border-b border-neutral-800 sticky top-0">
              <tr>
                <th className="py-1.5 px-3 w-16">Offset</th>
                <th className="py-1.5 px-3 w-28">Machine Hex</th>
                <th className="py-1.5 px-3 w-36">Assembly (Intel)</th>
                <th className="py-1.5 px-3">Function</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/50 text-neutral-300">
              {disassembly.map((inst, idx) => (
                <tr key={idx} className="hover:bg-neutral-800/40">
                  <td className="py-1 px-3 text-amber-400">+{inst.offset.toString(16).padStart(2, '0').toUpperCase()}h</td>
                  <td className="py-1 px-3 text-emerald-400 font-bold">{inst.hex}</td>
                  <td className="py-1 px-3 text-white font-semibold">{inst.asm}</td>
                  <td className="py-1 px-3 text-neutral-400">{inst.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Memory Segment Layout Map */}
      <div className="bg-neutral-900 border border-neutral-800 p-4 rounded-lg">
        <div className="flex items-center gap-2 text-xs font-semibold text-neutral-200 mb-3">
          <Layers className="w-4 h-4 text-amber-500" />
          <span>DOS Real-Mode Memory Layout Map for Converted Arcade Port</span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs font-mono">
          <div className="p-2.5 bg-neutral-950 border border-neutral-800 rounded">
            <div className="text-[10px] text-neutral-500">0000h - 00FFh (256B)</div>
            <div className="font-semibold text-amber-400 mt-0.5">DOS PSP</div>
            <div className="text-[11px] text-neutral-400 mt-1">Program Segment Prefix &amp; Command Line</div>
          </div>

          <div className="p-2.5 bg-neutral-950 border border-neutral-800 rounded">
            <div className="text-[10px] text-neutral-500">CS:0000h - CS:005Fh</div>
            <div className="font-semibold text-emerald-400 mt-0.5">x86 Code Stub</div>
            <div className="text-[11px] text-neutral-400 mt-1">INT 10h (13h), DAC Ports, Rep Movsw</div>
          </div>

          <div className="p-2.5 bg-neutral-950 border border-neutral-800 rounded">
            <div className="text-[10px] text-neutral-500">CS:0060h - CS:035Fh</div>
            <div className="font-semibold text-blue-400 mt-0.5">VGA DAC Palette</div>
            <div className="text-[11px] text-neutral-400 mt-1">768 bytes (256x3) Genesis 9-bit RGB</div>
          </div>

          <div className="p-2.5 bg-neutral-950 border border-neutral-800 rounded">
            <div className="text-[10px] text-neutral-500">CS:0360h - CS:FD5Fh</div>
            <div className="font-semibold text-purple-400 mt-0.5">VGA Framebuffer</div>
            <div className="text-[11px] text-neutral-400 mt-1">64,000 bytes 8-bit 320x200 pixel matrix</div>
          </div>

          <div className="p-2.5 bg-neutral-950 border border-amber-900/50 rounded">
            <div className="text-[10px] text-neutral-500">A000:0000h (64KB)</div>
            <div className="font-semibold text-amber-300 mt-0.5">VGA VRAM</div>
            <div className="text-[11px] text-neutral-400 mt-1">Hardware video memory blit target</div>
          </div>
        </div>
      </div>
    </div>
  );
};
