import React, { useEffect, useRef, useState } from 'react';
import { ConvertedVgaAsset } from '../types/genesis';
import { Eye, Monitor, ZoomIn, ZoomOut, Maximize2, Download, Crosshair } from 'lucide-react';

interface VgaCanvasPreviewProps {
  asset: ConvertedVgaAsset | null;
  crtEffect: boolean;
  onToggleCrt: () => void;
  aspect43: boolean;
  onToggleAspect: () => void;
}

export const VgaCanvasPreview: React.FC<VgaCanvasPreviewProps> = ({
  asset,
  crtEffect,
  onToggleCrt,
  aspect43,
  onToggleAspect
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [zoom, setZoom] = useState<number>(2);
  const [phosphorMode, setPhosphorMode] = useState<'color' | 'green' | 'amber'>('color');
  const [hoverPixel, setHoverPixel] = useState<{ x: number; y: number; index: number; r: number; g: number; b: number } | null>(null);

  // Render 320x200 to native Canvas
  useEffect(() => {
    if (!asset || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const imgData = ctx.createImageData(320, 200);
    const data32 = new Uint32Array(imgData.data.buffer);
    const { screenBuffer, vgaDacPalette, rgbaPalette } = asset;

    for (let i = 0; i < 64000; i++) {
      const colIdx = screenBuffer[i];
      if (phosphorMode === 'color') {
        data32[i] = rgbaPalette[colIdx];
      } else {
        // Monochrome phosphor simulation
        const r = (vgaDacPalette[colIdx * 3 + 0] / 63) * 255;
        const g = (vgaDacPalette[colIdx * 3 + 1] / 63) * 255;
        const b = (vgaDacPalette[colIdx * 3 + 2] / 63) * 255;
        const lum = r * 0.299 + g * 0.587 + b * 0.114;

        if (phosphorMode === 'green') {
          // IBM P1 Green phosphor (0, lum, lum * 0.3)
          const pR = Math.round(lum * 0.15);
          const pG = Math.round(lum);
          const pB = Math.round(lum * 0.15);
          data32[i] = (255 << 24) | (pB << 16) | (pG << 8) | pR;
        } else {
          // IBM P3 Amber phosphor (lum, lum * 0.7, 0)
          const pR = Math.round(lum);
          const pG = Math.round(lum * 0.65);
          const pB = Math.round(lum * 0.05);
          data32[i] = (255 << 24) | (pB << 16) | (pG << 8) | pR;
        }
      }
    }

    ctx.putImageData(imgData, 0, 0);
  }, [asset, phosphorMode]);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!asset || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = 320 / rect.width;
    const scaleY = 200 / rect.height;

    const x = Math.max(0, Math.min(319, Math.floor((e.clientX - rect.left) * scaleX)));
    const y = Math.max(0, Math.min(199, Math.floor((e.clientY - rect.top) * scaleY)));

    const idx = y * 320 + x;
    const colIdx = asset.screenBuffer[idx];
    const r = Math.round((asset.vgaDacPalette[colIdx * 3 + 0] / 63) * 255);
    const g = Math.round((asset.vgaDacPalette[colIdx * 3 + 1] / 63) * 255);
    const b = Math.round((asset.vgaDacPalette[colIdx * 3 + 2] / 63) * 255);

    setHoverPixel({ x, y, index: colIdx, r, g, b });
  };

  const handleMouseLeave = () => {
    setHoverPixel(null);
  };

  const downloadPngSnapshot = () => {
    if (!canvasRef.current) return;
    const link = document.createElement('a');
    link.download = 'vga_mode13h_frame.png';
    link.href = canvasRef.current.toDataURL('image/png');
    link.click();
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Control bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-neutral-900 border border-neutral-800 p-2.5 rounded-lg text-xs">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-amber-400 flex items-center gap-1.5 font-dos text-base">
            <Monitor className="w-4 h-4 text-amber-500" />
            VGA MODE 13h (320x200x256)
          </span>
          <span className="text-neutral-500">·</span>
          <span className="text-neutral-400">Memory: 0xA000:0000</span>
          <span className="text-neutral-500">·</span>
          <span className="text-neutral-400">64,000 Bytes</span>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Phosphor Mode Selector */}
          <div className="flex bg-neutral-950 border border-neutral-800 rounded p-0.5 text-[11px]">
            <button
              onClick={() => setPhosphorMode('color')}
              className={`px-2 py-0.5 rounded transition-colors ${
                phosphorMode === 'color' ? 'bg-amber-600 text-white font-medium' : 'text-neutral-400 hover:text-white'
              }`}
            >
              RGB Color
            </button>
            <button
              onClick={() => setPhosphorMode('green')}
              className={`px-2 py-0.5 rounded transition-colors ${
                phosphorMode === 'green' ? 'bg-emerald-600 text-white font-medium' : 'text-neutral-400 hover:text-white'
              }`}
            >
              P1 Green
            </button>
            <button
              onClick={() => setPhosphorMode('amber')}
              className={`px-2 py-0.5 rounded transition-colors ${
                phosphorMode === 'amber' ? 'bg-amber-700 text-white font-medium' : 'text-neutral-400 hover:text-white'
              }`}
            >
              P3 Amber
            </button>
          </div>

          {/* CRT Scanline Toggle */}
          <button
            onClick={onToggleCrt}
            className={`px-2.5 py-1 rounded border text-[11px] transition-colors ${
              crtEffect
                ? 'bg-amber-950/70 border-amber-600 text-amber-300'
                : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-neutral-200'
            }`}
            title="Simulate CRT Scanlines & Phosphor Bloom"
          >
            CRT Scanlines {crtEffect ? 'ON' : 'OFF'}
          </button>

          {/* Aspect Ratio 4:3 Toggle */}
          <button
            onClick={onToggleAspect}
            className={`px-2.5 py-1 rounded border text-[11px] transition-colors ${
              aspect43
                ? 'bg-amber-950/70 border-amber-600 text-amber-300'
                : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-neutral-200'
            }`}
            title="Toggle authentic 4:3 non-square CRT monitor aspect ratio vs 1:1 square"
          >
            {aspect43 ? '4:3 CRT Aspect' : '1:1 Square'}
          </button>

          {/* Zoom controls */}
          <div className="flex items-center bg-neutral-950 border border-neutral-800 rounded px-1">
            <button
              onClick={() => setZoom(Math.max(1, zoom - 0.5))}
              className="p-1 text-neutral-400 hover:text-neutral-200"
              title="Zoom out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="px-1 text-[11px] font-mono text-neutral-300">{zoom}x</span>
            <button
              onClick={() => setZoom(Math.min(3.5, zoom + 0.5))}
              className="p-1 text-neutral-400 hover:text-neutral-200"
              title="Zoom in"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Snapshot button */}
          <button
            onClick={downloadPngSnapshot}
            className="p-1.5 bg-neutral-950 border border-neutral-800 text-neutral-300 hover:text-white rounded hover:border-neutral-700 transition-colors"
            title="Download PNG snapshot"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Monitor Bezel Container */}
      <div className="relative flex justify-center items-center bg-neutral-950 border border-neutral-800 rounded-xl p-6 overflow-hidden shadow-2xl">
        {/* Subtle retro monitor frame lines */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(30,30,40,0.5)_0%,rgba(10,10,12,0.95)_100%)] pointer-events-none" />

        <div
          className="relative transition-all duration-150 border-4 border-neutral-900 rounded-lg overflow-hidden shadow-[0_0_30px_rgba(0,0,0,0.8)]"
          style={{
            width: `${320 * zoom}px`,
            height: aspect43 ? `${320 * zoom * 0.75}px` : `${200 * zoom}px`,
            maxWidth: '100%'
          }}
        >
          <canvas
            ref={canvasRef}
            width={320}
            height={200}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            className={`w-full h-full pixel-art cursor-crosshair ${crtEffect ? 'crt-bloom' : ''}`}
          />

          {/* Scanlines overlay */}
          {crtEffect && <div className="absolute inset-0 crt-overlay" />}

          {/* CRT glass curved reflection vignette */}
          {crtEffect && (
            <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,transparent_60%,rgba(0,0,0,0.4)_100%)]" />
          )}
        </div>
      </div>

      {/* Pixel Inspector HUD */}
      <div className="flex items-center justify-between bg-neutral-900/80 border border-neutral-800 px-3 py-1.5 rounded-lg text-xs font-mono">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-neutral-400">
            <Crosshair className="w-3.5 h-3.5 text-amber-500" />
            {hoverPixel ? (
              <span>
                X: <strong className="text-white">{hoverPixel.x}</strong> Y: <strong className="text-white">{hoverPixel.y}</strong>
              </span>
            ) : (
              <span className="text-neutral-500">Hover canvas to inspect pixels</span>
            )}
          </span>

          {hoverPixel && (
            <>
              <span className="text-neutral-600">|</span>
              <div className="flex items-center gap-2">
                <span
                  className="w-4 h-4 rounded border border-neutral-600 shadow-sm"
                  style={{ backgroundColor: `rgb(${hoverPixel.r}, ${hoverPixel.g}, ${hoverPixel.b})` }}
                />
                <span className="text-neutral-300">
                  VGA Index: <strong className="text-amber-400">#{hoverPixel.index}</strong> (0x{hoverPixel.index.toString(16).padStart(2, '0').toUpperCase()})
                </span>
                <span className="text-neutral-400">
                  RGB({hoverPixel.r}, {hoverPixel.g}, {hoverPixel.b})
                </span>
                <span className="text-neutral-500 text-[11px]">
                  (DAC: {Math.round((hoverPixel.r / 255) * 63)}, {Math.round((hoverPixel.g / 255) * 63)}, {Math.round((hoverPixel.b / 255) * 63)})
                </span>
              </div>
            </>
          )}
        </div>

        <div className="text-[11px] text-neutral-400">
          Genesis 320x224 &rarr; DOS Mode 13h (320x200, 70Hz)
        </div>
      </div>
    </div>
  );
};
