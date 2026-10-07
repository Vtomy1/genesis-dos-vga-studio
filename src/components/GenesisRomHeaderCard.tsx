import React, { useRef } from 'react';
import { GenesisHeader } from '../types/genesis';
import { Upload, CheckCircle2, AlertTriangle, FileBox, Gamepad2, Info } from 'lucide-react';

interface GenesisRomHeaderCardProps {
  header: GenesisHeader | null;
  onUploadRom: (file: File) => void;
  onSelectSample: (type: 'arcade-fighter' | 'cyber-sonic' | 'xenon-shmup') => void;
  activeSample: 'arcade-fighter' | 'cyber-sonic' | 'xenon-shmup' | 'custom';
}

export const GenesisRomHeaderCard: React.FC<GenesisRomHeaderCardProps> = ({
  header,
  onUploadRom,
  onSelectSample,
  activeSample
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUploadRom(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      onUploadRom(file);
    }
  };

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 flex flex-col gap-4">
      {/* Sample Presets & Upload Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-800 pb-3">
        <div className="flex items-center gap-2">
          <Gamepad2 className="w-5 h-5 text-amber-500" />
          <div>
            <h2 className="font-semibold text-white text-sm">Sega Genesis / Mega Drive ROM Source</h2>
            <p className="text-xs text-neutral-400">Select an authentic arcade preset or load your own .BIN / .SMD / .GEN file</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Preset Buttons */}
          <div className="flex bg-neutral-950 border border-neutral-800 rounded-lg p-0.5 text-xs">
            <button
              onClick={() => onSelectSample('arcade-fighter')}
              className={`px-2.5 py-1 rounded transition-colors ${
                activeSample === 'arcade-fighter'
                  ? 'bg-amber-600 text-white font-medium'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Street Brawler '92
            </button>
            <button
              onClick={() => onSelectSample('cyber-sonic')}
              className={`px-2.5 py-1 rounded transition-colors ${
                activeSample === 'cyber-sonic'
                  ? 'bg-amber-600 text-white font-medium'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Cyber Sonic 16-Bit
            </button>
            <button
              onClick={() => onSelectSample('xenon-shmup')}
              className={`px-2.5 py-1 rounded transition-colors ${
                activeSample === 'xenon-shmup'
                  ? 'bg-amber-600 text-white font-medium'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Xenon Force Shmup
            </button>
          </div>

          {/* Upload Button */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".bin,.smd,.gen,.md"
            onChange={handleFileChange}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 rounded-lg text-xs transition-colors"
          >
            <Upload className="w-3.5 h-3.5" />
            Upload Genesis ROM
          </button>
        </div>
      </div>

      {/* Header Fields Table */}
      {header && (
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3 text-xs">
          <div className="p-2.5 bg-neutral-950/80 border border-neutral-800/80 rounded-lg">
            <span className="text-[10px] text-neutral-500 uppercase block font-mono">System Console</span>
            <span className="font-semibold text-white truncate block mt-0.5">{header.consoleName}</span>
          </div>

          <div className="p-2.5 bg-neutral-950/80 border border-neutral-800/80 rounded-lg">
            <span className="text-[10px] text-neutral-500 uppercase block font-mono">Domestic Title</span>
            <span className="font-semibold text-amber-400 truncate block mt-0.5" title={header.domesticTitle}>
              {header.domesticTitle}
            </span>
          </div>

          <div className="p-2.5 bg-neutral-950/80 border border-neutral-800/80 rounded-lg">
            <span className="text-[10px] text-neutral-500 uppercase block font-mono">Copyright &amp; Year</span>
            <span className="text-neutral-300 truncate block mt-0.5">{header.copyright}</span>
          </div>

          <div className="p-2.5 bg-neutral-950/80 border border-neutral-800/80 rounded-lg">
            <span className="text-[10px] text-neutral-500 uppercase block font-mono">Serial Number</span>
            <span className="text-neutral-300 font-mono truncate block mt-0.5">{header.serialNumber}</span>
          </div>

          <div className="p-2.5 bg-neutral-950/80 border border-neutral-800/80 rounded-lg">
            <span className="text-[10px] text-neutral-500 uppercase block font-mono">68000 Checksum</span>
            <div className="flex items-center gap-1.5 mt-0.5 font-mono">
              <span className="text-neutral-200">
                0x{header.checksum.toString(16).padStart(4, '0').toUpperCase()}
              </span>
              {header.checksumValid ? (
                <span title="Checksum Matches Calculated Word Sum">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                </span>
              ) : (
                <span title={`Calculated: 0x${header.calculatedChecksum.toString(16).padStart(4, '0')}`}>
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                </span>
              )}
            </div>
          </div>

          <div className="p-2.5 bg-neutral-950/80 border border-neutral-800/80 rounded-lg">
            <span className="text-[10px] text-neutral-500 uppercase block font-mono">ROM Size / Format</span>
            <div className="flex items-center gap-1 mt-0.5 font-mono">
              <span className="text-neutral-200">{(header.totalSize / 1024).toFixed(0)} KB</span>
              {header.isSMD && (
                <span className="text-[10px] text-amber-400 bg-amber-950 px-1 rounded">SMD</span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
