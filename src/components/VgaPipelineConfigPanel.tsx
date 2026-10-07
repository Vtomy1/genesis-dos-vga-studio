import React from 'react';
import { VgaConversionConfig, VgaFitMode, VgaDitherMethod } from '../types/genesis';
import { Sliders, RefreshCw, Palette, Ratio, Sparkles } from 'lucide-react';

interface VgaPipelineConfigPanelProps {
  config: VgaConversionConfig;
  onChangeConfig: (newCfg: Partial<VgaConversionConfig>) => void;
  onReset: () => void;
}

export const VgaPipelineConfigPanel: React.FC<VgaPipelineConfigPanelProps> = ({
  config,
  onChangeConfig,
  onReset
}) => {
  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 flex flex-col gap-4 text-xs">
      <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-amber-500" />
          <span className="font-semibold text-white">8-Bit 320x200 VGA Conversion Pipeline</span>
        </div>

        <button
          onClick={onReset}
          className="flex items-center gap-1 text-[11px] text-neutral-400 hover:text-white transition-colors"
        >
          <RefreshCw className="w-3 h-3" />
          Reset Defaults
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {/* Fit Mode */}
        <div>
          <label className="block text-neutral-400 mb-1.5 flex items-center gap-1 font-medium">
            <Ratio className="w-3.5 h-3.5 text-neutral-500" />
            Aspect &amp; Framing (320x224 &rarr; 320x200)
          </label>
          <select
            value={config.fitMode}
            onChange={(e) => onChangeConfig({ fitMode: e.target.value as VgaFitMode })}
            className="w-full bg-neutral-950 border border-neutral-800 rounded px-2.5 py-1.5 text-white focus:border-amber-500 outline-none"
          >
            <option value="crop-center">Arcade Crop (12px Top / 12px Bottom)</option>
            <option value="crop-top">Crop Top (24px)</option>
            <option value="crop-bottom">Crop Bottom (24px)</option>
            <option value="scale">Linear Resample (224 to 200)</option>
            <option value="letterbox">Letterbox (HUD Status Bars)</option>
            <option value="tilesheet">Tile Sheet Grid (40x25 = 1000 Tiles)</option>
          </select>
        </div>

        {/* Dithering Mode */}
        <div>
          <label className="block text-neutral-400 mb-1.5 flex items-center gap-1 font-medium">
            <Sparkles className="w-3.5 h-3.5 text-neutral-500" />
            Color Dithering Algorithm
          </label>
          <select
            value={config.dither}
            onChange={(e) => onChangeConfig({ dither: e.target.value as VgaDitherMethod })}
            className="w-full bg-neutral-950 border border-neutral-800 rounded px-2.5 py-1.5 text-white focus:border-amber-500 outline-none"
          >
            <option value="none">Nearest Match (Crisp Pixel Art)</option>
            <option value="floyd-steinberg">Floyd-Steinberg Error Diffusion</option>
            <option value="atkinson">Atkinson Dithering (Retro Mac/DOS)</option>
            <option value="bayer4x4">Bayer 4x4 Ordered Matrix</option>
          </select>
        </div>

        {/* Palette Remap */}
        <div>
          <label className="block text-neutral-400 mb-1.5 flex items-center gap-1 font-medium">
            <Palette className="w-3.5 h-3.5 text-neutral-500" />
            VGA DAC Palette Mapping
          </label>
          <select
            value={config.paletteRemapMode}
            onChange={(e) => onChangeConfig({ paletteRemapMode: e.target.value as any })}
            className="w-full bg-neutral-950 border border-neutral-800 rounded px-2.5 py-1.5 text-white focus:border-amber-500 outline-none"
          >
            <option value="genesis-direct">Genesis CRAM Direct (DAC 0-63)</option>
            <option value="vga-standard-256">Standard IBM BIOS Mode 13h</option>
            <option value="vga-optimized-adaptive">Adaptive High-Color Palette</option>
          </select>
        </div>

        {/* Brightness / Contrast */}
        <div>
          <div className="flex justify-between text-neutral-400 mb-1">
            <span>DAC Brightness</span>
            <span className="font-mono text-white">{config.brightness > 0 ? `+${config.brightness}` : config.brightness}%</span>
          </div>
          <input
            type="range"
            min="-50"
            max="50"
            value={config.brightness}
            onChange={(e) => onChangeConfig({ brightness: Number(e.target.value) })}
            className="w-full accent-amber-500 cursor-pointer h-1.5 bg-neutral-950 rounded-lg"
          />

          <div className="flex justify-between text-neutral-400 mt-2 mb-1">
            <span>DAC Contrast</span>
            <span className="font-mono text-white">{config.contrast > 0 ? `+${config.contrast}` : config.contrast}%</span>
          </div>
          <input
            type="range"
            min="-50"
            max="50"
            value={config.contrast}
            onChange={(e) => onChangeConfig({ contrast: Number(e.target.value) })}
            className="w-full accent-amber-500 cursor-pointer h-1.5 bg-neutral-950 rounded-lg"
          />
        </div>
      </div>
    </div>
  );
};
