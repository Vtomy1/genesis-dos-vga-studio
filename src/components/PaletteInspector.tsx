import React, { useState } from 'react';
import { GenesisPaletteLine, GenesisPaletteColor } from '../types/genesis';
import { Palette, Copy, Check, Sparkles } from 'lucide-react';

interface PaletteInspectorProps {
  palettes: GenesisPaletteLine[];
  activeLineIndex: number;
  onSelectLine: (index: number) => void;
  vgaDacPalette: Uint8Array;
}

export const PaletteInspector: React.FC<PaletteInspectorProps> = ({
  palettes,
  activeLineIndex,
  onSelectLine,
  vgaDacPalette
}) => {
  const [selectedColor, setSelectedColor] = useState<GenesisPaletteColor | null>(
    palettes[0]?.colors[0] || null
  );
  const [copiedHex, setCopiedHex] = useState<string | null>(null);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHex(text);
    setTimeout(() => setCopiedHex(null), 1500);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Header and summary */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-neutral-900 border border-neutral-800 p-3 rounded-lg text-xs">
        <div className="flex items-center gap-2">
          <Palette className="w-4 h-4 text-amber-500" />
          <span className="font-semibold text-white">Sega Genesis CRAM to VGA DAC Palette Mapper</span>
          <span className="text-neutral-500">·</span>
          <span className="text-neutral-400">9-Bit RGB (512 Master) &rarr; 6-Bit VGA DAC (262,144 Master)</span>
        </div>

        <div className="flex items-center gap-2 text-neutral-400">
          <span>Active Palette Line:</span>
          <div className="flex gap-1">
            {[0, 1, 2, 3].map((idx) => (
              <button
                key={idx}
                onClick={() => onSelectLine(idx)}
                className={`px-2 py-0.5 rounded text-xs font-mono transition-colors ${
                  activeLineIndex === idx
                    ? 'bg-amber-600 text-white font-bold'
                    : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300'
                }`}
              >
                Line {idx}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 4 Genesis Palette Lines Swatches */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {palettes.map((line) => {
          const isSelected = activeLineIndex === line.lineIndex;
          const lineLabels = [
            'Line 0: Primary Sprites / Player Character',
            'Line 1: Background Layer A / Scenery',
            'Line 2: Foreground Layer B / Enemies / Metallic',
            'Line 3: HUD, Arcade Fonts, Special Effects'
          ];

          return (
            <div
              key={line.lineIndex}
              onClick={() => onSelectLine(line.lineIndex)}
              className={`p-3 rounded-lg border cursor-pointer transition-all ${
                isSelected
                  ? 'bg-neutral-900/90 border-amber-500/80 shadow-md ring-1 ring-amber-500/30'
                  : 'bg-neutral-900/40 border-neutral-800 hover:border-neutral-700'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-neutral-200">
                  {lineLabels[line.lineIndex] || `Palette Line ${line.lineIndex}`}
                </span>
                <span className="text-[11px] font-mono text-neutral-500">
                  VGA Indices {line.lineIndex * 16}–{line.lineIndex * 16 + 15}
                </span>
              </div>

              {/* 16 color swatches */}
              <div className="grid grid-cols-8 sm:grid-cols-16 gap-1">
                {line.colors.map((c) => (
                  <button
                    key={c.index}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedColor(c);
                    }}
                    className={`h-7 rounded border transition-transform hover:scale-110 relative ${
                      selectedColor?.index === c.index && selectedColor?.raw9bit === c.raw9bit
                        ? 'border-white scale-110 ring-2 ring-amber-400'
                        : 'border-neutral-800 hover:border-neutral-500'
                    }`}
                    style={{ backgroundColor: c.hex }}
                    title={`Color ${c.index}: ${c.hex} (Genesis 9-bit: 0x${c.raw9bit.toString(16).padStart(4, '0')})`}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Detailed Inspector for Selected Swatch */}
      {selectedColor && (
        <div className="bg-neutral-900 border border-neutral-800 p-4 rounded-lg flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-lg border-2 border-neutral-700 shadow-inner"
              style={{ backgroundColor: selectedColor.hex }}
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-white text-sm">
                  Palette Color #{selectedColor.index}
                </span>
                <span className="font-mono text-xs text-amber-400 bg-amber-950/60 border border-amber-800/80 px-1.5 py-0.5 rounded">
                  {selectedColor.hex.toUpperCase()}
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-0.5">
                Genesis CRAM Word: <strong className="text-white font-mono">0x{selectedColor.raw9bit.toString(16).padStart(4, '0').toUpperCase()}</strong> (0000 BBB0 GGG0 RRR0)
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs font-mono">
            {/* Genesis 3-bit values */}
            <div className="bg-neutral-950 border border-neutral-800 px-3 py-2 rounded">
              <span className="text-[10px] text-neutral-500 block uppercase">Genesis 3-Bit RGB</span>
              <span className="text-neutral-300">
                R: <strong className="text-red-400">{selectedColor.r3bit}</strong> ({(selectedColor.r3bit * 2).toString(16)}){' '}
                G: <strong className="text-green-400">{selectedColor.g3bit}</strong> ({(selectedColor.g3bit * 2).toString(16)}){' '}
                B: <strong className="text-blue-400">{selectedColor.b3bit}</strong> ({(selectedColor.b3bit * 2).toString(16)})
              </span>
            </div>

            {/* VGA 6-bit DAC values */}
            <div className="bg-neutral-950 border border-neutral-800 px-3 py-2 rounded">
              <span className="text-[10px] text-neutral-500 block uppercase">VGA Port 3C9h DAC (0-63)</span>
              <span className="text-neutral-300">
                R: <strong className="text-red-400">{selectedColor.vgaR}</strong>{' '}
                G: <strong className="text-green-400">{selectedColor.vgaG}</strong>{' '}
                B: <strong className="text-blue-400">{selectedColor.vgaB}</strong>
              </span>
            </div>

            <button
              onClick={() => copyToClipboard(selectedColor.hex)}
              className="flex items-center gap-1.5 px-3 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded transition-colors text-xs"
            >
              {copiedHex === selectedColor.hex ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Hex</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* VGA Mode 13h 256-Color Palette Map */}
      <div className="bg-neutral-900 border border-neutral-800 p-3.5 rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-neutral-300">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Full VGA 256-Color DAC Register Map (Indices 00h - FFh)</span>
          </div>
          <span className="text-[11px] text-neutral-500">
            0-63: Converted Genesis CRAM · 64-255: Mode 13h BIOS Ramps
          </span>
        </div>

        {/* 16x16 grid of 256 colors */}
        <div className="grid grid-cols-16 sm:grid-cols-32 gap-0.5 bg-neutral-950 p-2 rounded border border-neutral-800">
          {Array.from({ length: 256 }).map((_, idx) => {
            const r = Math.round((vgaDacPalette[idx * 3 + 0] / 63) * 255);
            const g = Math.round((vgaDacPalette[idx * 3 + 1] / 63) * 255);
            const b = Math.round((vgaDacPalette[idx * 3 + 2] / 63) * 255);
            const isGenesisMapped = idx < 64;

            return (
              <div
                key={idx}
                className={`h-4 rounded-[2px] transition-transform hover:scale-125 cursor-pointer relative ${
                  isGenesisMapped ? 'ring-1 ring-amber-500/30' : ''
                }`}
                style={{ backgroundColor: `rgb(${r}, ${g}, ${b})` }}
                title={`VGA Color #${idx} (0x${idx.toString(16).padStart(2, '0').toUpperCase()}): RGB(${r},${g},${b})${
                  isGenesisMapped ? ' [Genesis Mapped]' : ''
                }`}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
};
