import React, { useState } from 'react';
import { ConvertedVgaAsset } from '../types/genesis';
import { generateCHeader, generateAsmSource } from '../utils/vgaConverter';
import { Download, Copy, Check, Code, FileText } from 'lucide-react';

interface ArcadePortSourceViewProps {
  asset: ConvertedVgaAsset | null;
  gameTitle: string;
}

export const ArcadePortSourceView: React.FC<ArcadePortSourceViewProps> = ({
  asset,
  gameTitle
}) => {
  const [activeTab, setActiveTab] = useState<'watcom-c' | 'nasm-asm' | 'batch-build'>('watcom-c');
  const [copied, setCopied] = useState<boolean>(false);

  if (!asset) return null;

  const cCode = generateCHeader(asset, gameTitle);
  const asmCode = generateAsmSource(asset, gameTitle);
  const batCode = `@echo off
REM =========================================================================
REM DOS Arcade Port Build Script for Watcom C / TASM / TLINK
REM Converted by Genesis2DOS VGA Studio
REM =========================================================================

echo Building 16-bit DOS Arcade Port: ${gameTitle}...

REM Method 1: Borland Turbo Assembler (TASM)
REM tasm /m2 /zi PORT.ASM
REM tlink /v PORT.OBJ, PORT.EXE

REM Method 2: Open Watcom C
REM wcl -ms -0 -zq -fpi87 MAIN.C

echo Build complete! Type PORT.EXE to launch 320x200 Mode 13h port.
`;

  const getActiveCode = () => {
    switch (activeTab) {
      case 'watcom-c': return cCode;
      case 'nasm-asm': return asmCode;
      case 'batch-build': return batCode;
    }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(getActiveCode());
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const downloadFile = (filename: string, content: string | Uint8Array, mime: string) => {
    const blob = new Blob([content as any], { type: mime });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Top bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-neutral-900 border border-neutral-800 p-3 rounded-lg text-xs">
        <div className="flex items-center gap-2">
          <Code className="w-4 h-4 text-amber-500" />
          <span className="font-semibold text-white">Retro Arcade Port Source Code &amp; Assets</span>
          <span className="text-neutral-500">·</span>
          <span className="text-neutral-400">Watcom C, Turbo C &amp; NASM 16-Bit Real Mode</span>
        </div>

        {/* Tab selection */}
        <div className="flex bg-neutral-950 border border-neutral-800 rounded p-0.5">
          <button
            onClick={() => setActiveTab('watcom-c')}
            className={`px-2.5 py-1 rounded transition-colors ${
              activeTab === 'watcom-c' ? 'bg-amber-600 text-white font-medium' : 'text-neutral-400 hover:text-white'
            }`}
          >
            Watcom C Header (.H)
          </button>
          <button
            onClick={() => setActiveTab('nasm-asm')}
            className={`px-2.5 py-1 rounded transition-colors ${
              activeTab === 'nasm-asm' ? 'bg-amber-600 text-white font-medium' : 'text-neutral-400 hover:text-white'
            }`}
          >
            NASM Assembly (.ASM)
          </button>
          <button
            onClick={() => setActiveTab('batch-build')}
            className={`px-2.5 py-1 rounded transition-colors ${
              activeTab === 'batch-build' ? 'bg-amber-600 text-white font-medium' : 'text-neutral-400 hover:text-white'
            }`}
          >
            DOS Batch Script (.BAT)
          </button>
        </div>
      </div>

      {/* Quick Asset Download Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <button
          onClick={() => downloadFile('PORT.PCX', asset.pcxData || new Uint8Array(0), 'image/x-pcx')}
          className="flex items-center justify-between p-2.5 bg-neutral-900/80 hover:bg-neutral-800 border border-neutral-800 rounded-lg text-xs transition-colors"
        >
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-purple-400" />
            <div className="text-left">
              <div className="text-white font-semibold">PORT.PCX</div>
              <div className="text-[10px] text-neutral-400">DeluxePaint 256 Color</div>
            </div>
          </div>
          <Download className="w-3.5 h-3.5 text-neutral-400" />
        </button>

        <button
          onClick={() => downloadFile('PORT.VGA', asset.screenBuffer, 'application/octet-stream')}
          className="flex items-center justify-between p-2.5 bg-neutral-900/80 hover:bg-neutral-800 border border-neutral-800 rounded-lg text-xs transition-colors"
        >
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-emerald-400" />
            <div className="text-left">
              <div className="text-white font-semibold">PORT.VGA</div>
              <div className="text-[10px] text-neutral-400">Raw 64,000B Buffer</div>
            </div>
          </div>
          <Download className="w-3.5 h-3.5 text-neutral-400" />
        </button>

        <button
          onClick={() => downloadFile('PORT.PAL', asset.vgaDacPalette, 'application/octet-stream')}
          className="flex items-center justify-between p-2.5 bg-neutral-900/80 hover:bg-neutral-800 border border-neutral-800 rounded-lg text-xs transition-colors"
        >
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-amber-400" />
            <div className="text-left">
              <div className="text-white font-semibold">PORT.PAL</div>
              <div className="text-[10px] text-neutral-400">768B VGA DAC Colors</div>
            </div>
          </div>
          <Download className="w-3.5 h-3.5 text-neutral-400" />
        </button>

        <button
          onClick={() => {
            const ext = activeTab === 'watcom-c' ? 'H' : activeTab === 'nasm-asm' ? 'ASM' : 'BAT';
            downloadFile(`PORT.${ext}`, getActiveCode(), 'text/plain');
          }}
          className="flex items-center justify-between p-2.5 bg-neutral-900/80 hover:bg-neutral-800 border border-neutral-800 rounded-lg text-xs transition-colors"
        >
          <div className="flex items-center gap-2">
            <Code className="w-4 h-4 text-blue-400" />
            <div className="text-left">
              <div className="text-white font-semibold">Export Code</div>
              <div className="text-[10px] text-neutral-400">Download active tab</div>
            </div>
          </div>
          <Download className="w-3.5 h-3.5 text-neutral-400" />
        </button>
      </div>

      {/* Code Display Area */}
      <div className="relative bg-neutral-950 border border-neutral-800 rounded-lg overflow-hidden">
        <div className="flex items-center justify-between bg-neutral-900/80 border-b border-neutral-800 px-3 py-1.5 text-xs">
          <span className="font-mono text-neutral-400">
            {activeTab === 'watcom-c' ? 'PORT_VGA.H' : activeTab === 'nasm-asm' ? 'PORT.ASM' : 'BUILD.BAT'}
          </span>

          <button
            onClick={copyCode}
            className="flex items-center gap-1 px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded text-[11px] transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 text-emerald-400" />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                <span>Copy Code</span>
              </>
            )}
          </button>
        </div>

        <pre className="p-4 text-xs font-mono text-neutral-300 max-h-[360px] overflow-y-auto leading-relaxed select-text">
          <code>{getActiveCode()}</code>
        </pre>
      </div>
    </div>
  );
};
