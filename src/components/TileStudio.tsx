import React, { useState, useMemo } from 'react';
import { GenesisTile, GenesisPaletteLine } from '../types/genesis';
import { Grid, Search, ZoomIn, ZoomOut, Maximize2, LayoutGrid, Package } from 'lucide-react';

interface TileStudioProps {
  tiles: GenesisTile[];
  palettes: GenesisPaletteLine[];
  activePaletteIndex: number;
  onSelectPalette: (idx: number) => void;
}

export const TileStudio: React.FC<TileStudioProps> = ({
  tiles,
  palettes,
  activePaletteIndex,
  onSelectPalette
}) => {
  const [zoom, setZoom] = useState<number>(3); // 2x, 3x, 4x
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(0);
  const [selectedTile, setSelectedTile] = useState<GenesisTile | null>(tiles[0] || null);
  const [viewMode, setViewMode] = useState<'grid' | 'sprite-assembly'>('grid');

  const pageSize = 120;

  const filteredTiles = useMemo(() => {
    if (!searchQuery) return tiles;
    const num = parseInt(searchQuery, 10);
    if (!isNaN(num)) {
      return tiles.filter(t => t.index === num || t.offset.toString(16).includes(searchQuery));
    }
    return tiles;
  }, [tiles, searchQuery]);

  const totalPages = Math.ceil(filteredTiles.length / pageSize);
  const currentTiles = filteredTiles.slice(currentPage * pageSize, (currentPage + 1) * pageSize);

  const activeColors = palettes[activePaletteIndex]?.colors || palettes[0]?.colors || [];

  return (
    <div className="flex flex-col gap-4">
      {/* Control bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-neutral-900 border border-neutral-800 p-3 rounded-lg text-xs">
        <div className="flex items-center gap-2">
          <Grid className="w-4 h-4 text-amber-500" />
          <span className="font-semibold text-white">Genesis 4bpp Planar Tile Studio</span>
          <span className="text-neutral-500">·</span>
          <span className="text-neutral-400">Total Tiles: {tiles.length} (32 Bytes/Tile)</span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Palette Line Selector */}
          <div className="flex items-center gap-1.5 text-neutral-400">
            <span>Render with:</span>
            <div className="flex bg-neutral-950 border border-neutral-800 rounded p-0.5">
              {[0, 1, 2, 3].map((idx) => (
                <button
                  key={idx}
                  onClick={() => onSelectPalette(idx)}
                  className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors ${
                    activePaletteIndex === idx
                      ? 'bg-amber-600 text-white font-bold'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  Pal {idx}
                </button>
              ))}
            </div>
          </div>

          {/* View mode toggle */}
          <div className="flex bg-neutral-950 border border-neutral-800 rounded p-0.5">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-2 py-0.5 rounded text-[11px] transition-colors ${
                viewMode === 'grid' ? 'bg-neutral-800 text-white' : 'text-neutral-400 hover:text-white'
              }`}
            >
              Tile Grid
            </button>
            <button
              onClick={() => setViewMode('sprite-assembly')}
              className={`px-2 py-0.5 rounded text-[11px] transition-colors ${
                viewMode === 'sprite-assembly' ? 'bg-neutral-800 text-white' : 'text-neutral-400 hover:text-white'
              }`}
            >
              Sprite Assembler
            </button>
          </div>

          {/* Zoom */}
          <div className="flex items-center bg-neutral-950 border border-neutral-800 rounded px-1.5 py-0.5">
            <button
              onClick={() => setZoom(Math.max(2, zoom - 1))}
              className="p-1 text-neutral-400 hover:text-white"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="px-1 text-[11px] font-mono text-neutral-300">{zoom}x</span>
            <button
              onClick={() => setZoom(Math.min(5, zoom + 1))}
              className="p-1 text-neutral-400 hover:text-white"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {viewMode === 'grid' ? (
        /* Tile Grid View */
        <div className="flex flex-col gap-3">
          <div className="bg-neutral-950 border border-neutral-800 p-4 rounded-xl min-h-[340px]">
            <div className="grid grid-cols-6 sm:grid-cols-10 md:grid-cols-12 lg:grid-cols-15 gap-2">
              {currentTiles.map((tile) => {
                const isSelected = selectedTile?.index === tile.index;
                return (
                  <div
                    key={tile.index}
                    onClick={() => setSelectedTile(tile)}
                    className={`flex flex-col items-center p-1.5 rounded cursor-pointer transition-all border ${
                      isSelected
                        ? 'border-amber-500 bg-amber-950/40 ring-1 ring-amber-500/50'
                        : 'border-neutral-800/80 hover:border-neutral-600 bg-neutral-900/60'
                    }`}
                  >
                    {/* 8x8 rendered canvas for the tile */}
                    <div
                      className="pixel-art border border-neutral-800 rounded-sm overflow-hidden"
                      style={{
                        width: `${8 * zoom}px`,
                        height: `${8 * zoom}px`,
                        display: 'grid',
                        gridTemplateColumns: 'repeat(8, 1fr)',
                        gridTemplateRows: 'repeat(8, 1fr)'
                      }}
                    >
                      {Array.from({ length: 64 }).map((_, pIdx) => {
                        const colIdx = tile.pixels[pIdx];
                        const hex = activeColors[colIdx]?.hex || '#000000';
                        return (
                          <div
                            key={pIdx}
                            style={{ backgroundColor: hex }}
                            className="w-full h-full"
                          />
                        );
                      })}
                    </div>
                    <span className="text-[10px] font-mono text-neutral-400 mt-1">
                      #{tile.index}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between text-xs text-neutral-400 px-1 font-mono">
              <span>
                Showing page {currentPage + 1} of {totalPages} ({filteredTiles.length} total)
              </span>
              <div className="flex gap-1.5">
                <button
                  disabled={currentPage === 0}
                  onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                  className="px-2.5 py-1 bg-neutral-900 border border-neutral-800 disabled:opacity-40 rounded hover:border-neutral-700 text-neutral-200"
                >
                  Previous
                </button>
                <button
                  disabled={currentPage >= totalPages - 1}
                  onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
                  className="px-2.5 py-1 bg-neutral-900 border border-neutral-800 disabled:opacity-40 rounded hover:border-neutral-700 text-neutral-200"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Sprite Assembler Mode (combining multiple 8x8 tiles into 16x16 / 24x24 / 32x32 arcade characters) */
        <div className="bg-neutral-900 border border-neutral-800 p-4 rounded-xl flex flex-col md:flex-row items-center justify-around gap-6">
          <div className="flex flex-col items-center gap-2">
            <span className="text-xs font-semibold text-neutral-300">16x16 Sprite Tile Matrix (2x2 Tiles)</span>
            <div
              className="border-2 border-neutral-700 rounded p-1 bg-black pixel-art shadow-xl"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(16, 8px)',
                gridTemplateRows: 'repeat(16, 8px)'
              }}
            >
              {Array.from({ length: 256 }).map((_, pIdx) => {
                const subX = Math.floor((pIdx % 16) / 8);
                const subY = Math.floor(Math.floor(pIdx / 16) / 8);
                const tileOffset = subY * 2 + subX;
                const tile = tiles[tileOffset % Math.max(1, tiles.length)];
                const px = (pIdx % 16) % 8;
                const py = Math.floor(pIdx / 16) % 8;
                const colIdx = tile ? tile.pixels[py * 8 + px] : 0;
                return (
                  <div
                    key={pIdx}
                    style={{ backgroundColor: activeColors[colIdx]?.hex || '#000' }}
                    className="w-full h-full"
                  />
                );
              })}
            </div>
          </div>

          <div className="flex flex-col items-center gap-2">
            <span className="text-xs font-semibold text-neutral-300">32x32 Arcade Hero Matrix (4x4 Tiles)</span>
            <div
              className="border-2 border-neutral-700 rounded p-1 bg-black pixel-art shadow-xl"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(32, 5px)',
                gridTemplateRows: 'repeat(32, 5px)'
              }}
            >
              {Array.from({ length: 1024 }).map((_, pIdx) => {
                const subX = Math.floor((pIdx % 32) / 8);
                const subY = Math.floor(Math.floor(pIdx / 32) / 8);
                const tileOffset = subY * 4 + subX;
                const tile = tiles[(tileOffset + 10) % Math.max(1, tiles.length)];
                const px = (pIdx % 32) % 8;
                const py = Math.floor(pIdx / 32) % 8;
                const colIdx = tile ? tile.pixels[py * 8 + px] : 0;
                return (
                  <div
                    key={pIdx}
                    style={{ backgroundColor: activeColors[colIdx]?.hex || '#000' }}
                    className="w-full h-full"
                  />
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Selected Tile Inspector */}
      {selectedTile && (
        <div className="bg-neutral-900 border border-neutral-800 p-3.5 rounded-lg flex flex-wrap items-center justify-between gap-4 text-xs font-mono">
          <div className="flex items-center gap-3">
            <div
              className="pixel-art border border-neutral-700 rounded overflow-hidden"
              style={{
                width: '48px',
                height: '48px',
                display: 'grid',
                gridTemplateColumns: 'repeat(8, 1fr)',
                gridTemplateRows: 'repeat(8, 1fr)'
              }}
            >
              {Array.from({ length: 64 }).map((_, pIdx) => {
                const colIdx = selectedTile.pixels[pIdx];
                return (
                  <div
                    key={pIdx}
                    style={{ backgroundColor: activeColors[colIdx]?.hex || '#000' }}
                    className="w-full h-full"
                  />
                );
              })}
            </div>

            <div>
              <div className="text-white font-semibold">
                Genesis Tile #{selectedTile.index}
              </div>
              <div className="text-neutral-400 text-[11px] mt-0.5">
                ROM File Offset: <strong className="text-amber-400">0x{selectedTile.offset.toString(16).toUpperCase()}</strong>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-neutral-400">Format:</span>
            <span className="text-neutral-200 bg-neutral-950 border border-neutral-800 px-2 py-1 rounded">
              Planar 4bpp · 2 pixels/byte · 32 bytes total
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
