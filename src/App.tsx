import React, { useState, useEffect, useMemo } from 'react';
import {
  GenesisHeader,
  GenesisTile,
  GenesisPaletteLine,
  VgaConversionConfig,
  MzExeConfig,
  MzExeHeader,
  ConvertedVgaAsset
} from './types/genesis';
import {
  createSampleGenesisRom,
  normalizeRomBuffer,
  parseGenesisHeader,
  extractPalettes,
  extractTiles
} from './utils/genesisParser';
import { convertGenesisToVga13h } from './utils/vgaConverter';
import { buildDosMzExecutable } from './utils/mzExeBuilder';
import { GenesisRomHeaderCard } from './components/GenesisRomHeaderCard';
import { VgaPipelineConfigPanel } from './components/VgaPipelineConfigPanel';
import { VgaCanvasPreview } from './components/VgaCanvasPreview';
import { DosEmulatorSandbox } from './components/DosEmulatorSandbox';
import { ExeHeaderViewer } from './components/ExeHeaderViewer';
import { PaletteInspector } from './components/PaletteInspector';
import { TileStudio } from './components/TileStudio';
import { HexViewer } from './components/HexViewer';
import { ArcadePortSourceView } from './components/ArcadePortSourceView';
import {
  Monitor,
  Terminal,
  Cpu,
  Palette,
  Grid,
  Binary,
  Code,
  Download,
  Flame,
  Tv
} from 'lucide-react';

export default function App() {
  // Active Navigation Tab
  type TabType = 'preview' | 'emulator' | 'exe-header' | 'palettes' | 'tiles' | 'hex' | 'source';
  const [activeTab, setActiveTab] = useState<TabType>('preview');

  // ROM state
  const [activeSampleType, setActiveSampleType] = useState<'arcade-fighter' | 'cyber-sonic' | 'xenon-shmup' | 'custom'>('arcade-fighter');
  const [rawRomBuffer, setRawRomBuffer] = useState<Uint8Array>(() => createSampleGenesisRom('arcade-fighter'));
  const [romHeader, setRomHeader] = useState<GenesisHeader | null>(null);
  const [palettes, setPalettes] = useState<GenesisPaletteLine[]>([]);
  const [tiles, setTiles] = useState<GenesisTile[]>([]);

  // VGA pipeline config
  const [vgaConfig, setVgaConfig] = useState<VgaConversionConfig>({
    fitMode: 'crop-center',
    dither: 'none',
    activePaletteIndex: 0,
    paletteRemapMode: 'genesis-direct',
    brightness: 0,
    contrast: 0,
    gamma: 1.0,
    addScanlineEffectInExe: false
  });

  // Display toggles
  const [crtEffect, setCrtEffect] = useState<boolean>(true);
  const [aspect43, setAspect43] = useState<boolean>(true);

  // MZ EXE Config
  const [exeConfig, setExeConfig] = useState<MzExeConfig>({
    title: 'ARCADE BRAWLER CHAMPION',
    gameId: 'BRAWLER',
    mode: 'arcade-splash',
    minAlloc: 0x1000,
    maxAlloc: 0xffff,
    stackSize: 2048,
    autoExitSeconds: 0,
    showDosBanner: true,
    enableVgaFadeIn: true,
    enableCrtScanlineEmulation: false
  });

  // Converted VGA asset and MZ executable binary
  const [vgaAsset, setVgaAsset] = useState<ConvertedVgaAsset | null>(null);
  const [exeBinary, setExeBinary] = useState<Uint8Array | null>(null);
  const [exeHeader, setExeHeader] = useState<MzExeHeader | null>(null);
  const [disassembly, setDisassembly] = useState<{ offset: number; hex: string; asm: string; desc: string }[]>([]);

  // Parse ROM whenever rawRomBuffer changes
  useEffect(() => {
    try {
      const { buffer, wasSmd } = normalizeRomBuffer(rawRomBuffer);
      const header = parseGenesisHeader(buffer, wasSmd);
      const extractedPalettes = extractPalettes(buffer);
      const extractedTiles = extractTiles(buffer, 0x0300, 300);

      setRomHeader(header);
      setPalettes(extractedPalettes);
      setTiles(extractedTiles);

      const titleClean = header.domesticTitle.replace(/[^a-zA-Z0-9 ]/g, '').trim() || 'ARCADE PORT';
      const idClean = titleClean.split(' ')[0].slice(0, 8).toUpperCase() || 'PORT';

      setExeConfig(prev => ({
        ...prev,
        title: titleClean,
        gameId: idClean
      }));
    } catch (err) {
      console.error('Failed to parse Genesis ROM:', err);
    }
  }, [rawRomBuffer]);

  // Convert to VGA Mode 13h & Build MZ EXE whenever tiles, palettes, or configs update
  useEffect(() => {
    if (!tiles.length || !palettes.length) return;

    try {
      // 1. Generate 320x200 8-bit VGA Mode 13h asset
      const asset = convertGenesisToVga13h(tiles, palettes, vgaConfig);

      // 2. Build MS-DOS MZ Executable with x86 code and embedded payload
      const { binary, header, disassembly: disasm } = buildDosMzExecutable(asset, exeConfig);
      asset.exeBinary = binary;

      setVgaAsset(asset);
      setExeBinary(binary);
      setExeHeader(header);
      setDisassembly(disasm);
    } catch (err) {
      console.error('Failed to convert to VGA Mode 13h:', err);
    }
  }, [tiles, palettes, vgaConfig, exeConfig]);

  // Handle Preset Selection
  const handleSelectSample = (type: 'arcade-fighter' | 'cyber-sonic' | 'xenon-shmup') => {
    setActiveSampleType(type);
    const sampleRom = createSampleGenesisRom(type);
    setRawRomBuffer(sampleRom);
  };

  // Handle User Uploaded ROM
  const handleUploadRom = async (file: File) => {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);
    setActiveSampleType('custom');
    setRawRomBuffer(buffer);
  };

  const handleUpdateVgaConfig = (newCfg: Partial<VgaConversionConfig>) => {
    setVgaConfig(prev => ({ ...prev, ...newCfg }));
  };

  const handleResetVgaConfig = () => {
    setVgaConfig({
      fitMode: 'crop-center',
      dither: 'none',
      activePaletteIndex: 0,
      paletteRemapMode: 'genesis-direct',
      brightness: 0,
      contrast: 0,
      gamma: 1.0,
      addScanlineEffectInExe: false
    });
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-mono selection:bg-amber-600 selection:text-white">
      {/* Header Bar */}
      <header className="border-b border-neutral-800 bg-neutral-900/90 backdrop-blur sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-amber-600 to-amber-800 rounded-lg shadow-md border border-amber-500/30 flex items-center justify-center">
              <Tv className="w-5 h-5 text-neutral-950 font-bold" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-dos text-xl tracking-wider text-amber-400 font-bold">
                  GENESIS2DOS VGA STUDIO
                </h1>
                <span className="text-[10px] text-emerald-400 font-mono bg-emerald-950/60 border border-emerald-800 px-1.5 py-0.5 rounded">
                  8-Bit 320x200 Mode 13h
                </span>
                <span className="text-[10px] text-amber-400 font-mono bg-amber-950/60 border border-amber-800 px-1.5 py-0.5 rounded hidden sm:inline">
                  MZ .EXE
                </span>
              </div>
              <p className="text-xs text-neutral-400 font-sans hidden sm:block">
                Sega Genesis / Mega Drive to MS-DOS Arcade Port Converter &amp; MZ Executable Builder
              </p>
            </div>
          </div>

          {/* Quick Action Download Button */}
          {exeBinary && (
            <button
              onClick={() => {
                const blob = new Blob([exeBinary as unknown as BlobPart], { type: 'application/octet-stream' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${exeConfig.gameId || 'PORT'}.EXE`;
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-semibold rounded-md text-xs transition-colors shadow-md"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download {exeConfig.gameId || 'PORT'}.EXE</span>
            </button>
          )}
        </div>

        {/* Navigation Tabs (Zero-pill discipline: clean segmented tabs with active state) */}
        <div className="max-w-7xl mx-auto px-4 flex items-center gap-1 border-t border-neutral-800/80 overflow-x-auto py-1 text-xs">
          <button
            onClick={() => setActiveTab('preview')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-colors whitespace-nowrap ${
              activeTab === 'preview'
                ? 'bg-neutral-800 text-amber-400 border border-neutral-700'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
            }`}
          >
            <Monitor className="w-3.5 h-3.5" />
            Mode 13h Display
          </button>

          <button
            onClick={() => setActiveTab('emulator')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-colors whitespace-nowrap ${
              activeTab === 'emulator'
                ? 'bg-neutral-800 text-emerald-400 border border-neutral-700'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            MS-DOS 6.22 Runner
          </button>

          <button
            onClick={() => setActiveTab('exe-header')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-colors whitespace-nowrap ${
              activeTab === 'exe-header'
                ? 'bg-neutral-800 text-amber-400 border border-neutral-700'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            MZ .EXE Header &amp; Disassembly
          </button>

          <button
            onClick={() => setActiveTab('palettes')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-colors whitespace-nowrap ${
              activeTab === 'palettes'
                ? 'bg-neutral-800 text-amber-400 border border-neutral-700'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
            }`}
          >
            <Palette className="w-3.5 h-3.5" />
            CRAM &rarr; VGA DAC
          </button>

          <button
            onClick={() => setActiveTab('tiles')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-colors whitespace-nowrap ${
              activeTab === 'tiles'
                ? 'bg-neutral-800 text-amber-400 border border-neutral-700'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
            }`}
          >
            <Grid className="w-3.5 h-3.5" />
            4bpp Tile Studio
          </button>

          <button
            onClick={() => setActiveTab('hex')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-colors whitespace-nowrap ${
              activeTab === 'hex'
                ? 'bg-neutral-800 text-amber-400 border border-neutral-700'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
            }`}
          >
            <Binary className="w-3.5 h-3.5" />
            Hex Stream Inspector
          </button>

          <button
            onClick={() => setActiveTab('source')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-colors whitespace-nowrap ${
              activeTab === 'source'
                ? 'bg-neutral-800 text-amber-400 border border-neutral-700'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
            }`}
          >
            <Code className="w-3.5 h-3.5" />
            Arcade Port C &amp; ASM
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 py-5 flex-1 flex flex-col gap-5 w-full">
        {/* Top: ROM Metadata Card */}
        <GenesisRomHeaderCard
          header={romHeader}
          onUploadRom={handleUploadRom}
          onSelectSample={handleSelectSample}
          activeSample={activeSampleType}
        />

        {/* Mid: VGA Conversion Pipeline Control (Shown in display/preview/palettes/tiles views) */}
        {(activeTab === 'preview' || activeTab === 'palettes' || activeTab === 'tiles') && (
          <VgaPipelineConfigPanel
            config={vgaConfig}
            onChangeConfig={handleUpdateVgaConfig}
            onReset={handleResetVgaConfig}
          />
        )}

        {/* Content by Active Tab */}
        {activeTab === 'preview' && (
          <VgaCanvasPreview
            asset={vgaAsset}
            crtEffect={crtEffect}
            onToggleCrt={() => setCrtEffect(!crtEffect)}
            aspect43={aspect43}
            onToggleAspect={() => setAspect43(!aspect43)}
          />
        )}

        {activeTab === 'emulator' && (
          <DosEmulatorSandbox
            asset={vgaAsset}
            exeHeader={exeHeader}
            gameTitle={romHeader?.domesticTitle || 'ARCADE PORT'}
            crtEffect={crtEffect}
            aspect43={aspect43}
          />
        )}

        {activeTab === 'exe-header' && (
          <ExeHeaderViewer
            header={exeHeader}
            disassembly={disassembly}
            binary={exeBinary}
            config={exeConfig}
            onChangeConfig={(cfg) => setExeConfig(prev => ({ ...prev, ...cfg }))}
            gameTitle={romHeader?.domesticTitle || 'ARCADE PORT'}
          />
        )}

        {activeTab === 'palettes' && (
          <PaletteInspector
            palettes={palettes}
            activeLineIndex={vgaConfig.activePaletteIndex}
            onSelectLine={(idx) => handleUpdateVgaConfig({ activePaletteIndex: idx })}
            vgaDacPalette={vgaAsset?.vgaDacPalette || new Uint8Array(768)}
          />
        )}

        {activeTab === 'tiles' && (
          <TileStudio
            tiles={tiles}
            palettes={palettes}
            activePaletteIndex={vgaConfig.activePaletteIndex}
            onSelectPalette={(idx) => handleUpdateVgaConfig({ activePaletteIndex: idx })}
          />
        )}

        {activeTab === 'hex' && (
          <HexViewer
            romBuffer={rawRomBuffer}
            exeBuffer={exeBinary}
            vgaBuffer={vgaAsset?.screenBuffer || null}
            palBuffer={vgaAsset?.vgaDacPalette || null}
          />
        )}

        {activeTab === 'source' && (
          <ArcadePortSourceView
            asset={vgaAsset}
            gameTitle={romHeader?.domesticTitle || 'ARCADE PORT'}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-800 bg-neutral-900/40 py-3 text-xs text-neutral-500 font-mono">
        <div className="max-w-7xl mx-auto px-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span>Sega Genesis VDP 4bpp / 9-bit CRAM (512 Master)</span>
            <span aria-hidden="true">&rarr;</span>
            <span className="text-amber-400">IBM VGA Mode 13h 320x200x256 DAC (262K Master)</span>
          </div>

          <div className="flex items-center gap-3 text-neutral-400">
            <span>Segment 0xA000</span>
            <span aria-hidden="true">·</span>
            <span>Port 0x3C8/0x3C9</span>
            <span aria-hidden="true">·</span>
            <span>MS-DOS MZ Binary Header Standard</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
