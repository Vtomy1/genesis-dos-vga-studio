import React, { useState, useEffect, useRef } from 'react';
import { ConvertedVgaAsset, MzExeHeader } from '../types/genesis';
import { Terminal, Play, Square, RotateCcw, Volume2, VolumeX, Keyboard } from 'lucide-react';

interface DosEmulatorSandboxProps {
  asset: ConvertedVgaAsset | null;
  exeHeader: MzExeHeader | null;
  gameTitle: string;
  crtEffect: boolean;
  aspect43: boolean;
}

export const DosEmulatorSandbox: React.FC<DosEmulatorSandboxProps> = ({
  asset,
  exeHeader,
  gameTitle,
  crtEffect,
  aspect43
}) => {
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [history, setHistory] = useState<string[]>([
    'Starting MS-DOS 6.22 (Genesis2DOS Virtual Machine)...',
    'HIMEM.SYS 3.10 : XMS Memory Manager Installed (16MB Extended Memory)',
    'VGA BIOS detected: 256KB Video RAM at A000:0000',
    'Ready. Converted Arcade Port Executable loaded to drive C:\\',
    ''
  ]);
  const [inputCommand, setInputCommand] = useState<string>('PORT.EXE');
  const [audioEnabled, setAudioEnabled] = useState<boolean>(true);
  const terminalBottomRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Play retro PC speaker beep
  const playBeep = (freq = 880, duration = 0.08) => {
    if (!audioEnabled || typeof window === 'undefined') return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square'; // Authentic PC Speaker 8253 timer square wave
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch {
      // Audio not permitted yet
    }
  };

  // Render VGA Mode 13h onto canvas when running
  useEffect(() => {
    if (!isRunning || !asset || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const imgData = ctx.createImageData(320, 200);
    const data32 = new Uint32Array(imgData.data.buffer);
    const { screenBuffer, rgbaPalette } = asset;

    for (let i = 0; i < 64000; i++) {
      data32[i] = rgbaPalette[screenBuffer[i]];
    }

    ctx.putImageData(imgData, 0, 0);
  }, [isRunning, asset]);

  // Scroll terminal
  useEffect(() => {
    if (!isRunning) {
      terminalBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [history, isRunning]);

  const handleExecuteCommand = (cmdToRun?: string) => {
    const rawCmd = (cmdToRun !== undefined ? cmdToRun : inputCommand).trim();
    if (!rawCmd) return;

    const cmd = rawCmd.toUpperCase();
    playBeep(1200, 0.04);

    const newHistory = [...history, `C:\\RETRO> ${rawCmd}`];

    if (cmd === 'PORT.EXE' || cmd === 'RUN' || cmd === 'PORT' || cmd === 'START') {
      newHistory.push(
        `Executing PORT.EXE (MZ binary, ${exeHeader?.pagesInFile || 126} pages)...`,
        'Switching Video Mode: INT 10h AH=00h AL=13h (VGA 320x200 256 colors)...',
        'Reprogramming DAC Registers via ports 03C8h/03C9h...',
        'Blitting DS:SI to ES:DI (A000:0000)...',
        'Running interactive arcade loop. Press ESC or click "Exit to DOS" to quit.'
      );
      setHistory(newHistory);
      setInputCommand('');
      setTimeout(() => {
        playBeep(650, 0.12);
        setIsRunning(true);
      }, 250);
      return;
    }

    if (cmd === 'DIR') {
      const fileSize = (asset?.screenBuffer.length || 64000) + 1024;
      newHistory.push(
        ' Volume in drive C is GENESIS_DOS',
        ' Volume Serial Number is 1993-0A00',
        ' Directory of C:\\RETRO',
        '',
        '.            <DIR>         10-06-93  12:00p',
        '..           <DIR>         10-06-93  12:00p',
        `PORT     EXE    ${fileSize.toString().padStart(6, ' ')} 10-06-93  12:00p`,
        'PORT     VGA     64000 10-06-93  12:00p',
        'PORT     PAL       768 10-06-93  12:00p',
        'README   TXT      1420 10-06-93  12:00p',
        '         4 file(s)      130,188 bytes',
        '         2 dir(s)    15,488,000 bytes free'
      );
    } else if (cmd === 'VER') {
      newHistory.push('MS-DOS Version 6.22 (Genesis2DOS Mode 13h Arcade Runner)');
    } else if (cmd === 'CLS') {
      setHistory(['']);
      setInputCommand('');
      return;
    } else if (cmd === 'MEM') {
      newHistory.push(
        'Memory Type        Total       Used       Free',
        '----------------  ------     ------     ------',
        'Conventional        640K        52K       588K',
        'Upper (A000-FFFF)   384K       128K       256K  [VGA 64K allocated at A000h]',
        'Extended (XMS)    15360K       512K     14848K',
        '----------------  ------     ------     ------',
        'Total memory      16384K       692K     15692K',
        '',
        'Largest executable program size:       588K (602,112 bytes)'
      );
    } else if (cmd === 'TYPE README.TXT' || cmd === 'TYPE README') {
      newHistory.push(
        '=====================================================',
        `GENESIS TO MS-DOS ARCADE PORT: ${gameTitle}`,
        'Video: VGA Mode 13h, 320x200, 256 Colors (70Hz)',
        'Binary Format: MS-DOS 16-bit Real Mode MZ Executable',
        'VGA Palette: 256-color DAC mapped from Sega CRAM 9-bit RGB',
        'Instruction Set: 8086/286/386 compatible x86 real mode',
        'Type PORT.EXE to start the game port!',
        '====================================================='
      );
    } else if (cmd === 'HELP') {
      newHistory.push(
        'Available DOS commands:',
        '  PORT.EXE       - Boot converted Sega Genesis VGA arcade port',
        '  DIR            - List directory files on C:\\RETRO',
        '  TYPE README.TXT- View arcade port release notes',
        '  MEM            - Display MS-DOS conventional and VGA memory map',
        '  VER            - Display MS-DOS version',
        '  CLS            - Clear text screen'
      );
    } else {
      newHistory.push(`Bad command or file name: "${rawCmd}". Type HELP or PORT.EXE`);
    }

    setHistory(newHistory);
    setInputCommand('');
  };

  const handleExitProgram = () => {
    playBeep(440, 0.1);
    setIsRunning(false);
    setHistory(prev => [
      ...prev,
      'INT 10h: Video mode 03h restored (80x25 text mode).',
      'INT 21h AH=4Ch: Program terminated normally. Exit code = 00h (SUCCESS)',
      ''
    ]);
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Top Bar */}
      <div className="flex items-center justify-between bg-neutral-900 border border-neutral-800 p-2.5 rounded-lg text-xs">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-emerald-400" />
          <span className="font-dos text-base text-emerald-400 font-semibold">
            MS-DOS 6.22 VIRTUAL MACHINE & RUNNER
          </span>
          <span className="text-neutral-500">·</span>
          <span className="text-neutral-400">Target: C:\RETRO\PORT.EXE</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setAudioEnabled(!audioEnabled)}
            className={`p-1.5 rounded border transition-colors ${
              audioEnabled ? 'border-neutral-700 text-neutral-300' : 'border-neutral-800 text-neutral-600'
            }`}
            title="Toggle PC Speaker Audio"
          >
            {audioEnabled ? <Volume2 className="w-3.5 h-3.5 text-amber-400" /> : <VolumeX className="w-3.5 h-3.5" />}
          </button>

          {!isRunning ? (
            <button
              onClick={() => handleExecuteCommand('PORT.EXE')}
              className="flex items-center gap-1.5 px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-neutral-950 font-semibold rounded text-xs transition-colors"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              Run PORT.EXE
            </button>
          ) : (
            <button
              onClick={handleExitProgram}
              className="flex items-center gap-1.5 px-3 py-1 bg-red-600 hover:bg-red-500 text-white font-semibold rounded text-xs transition-colors"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              Exit to DOS (ESC)
            </button>
          )}
        </div>
      </div>

      {/* Main Execution View */}
      <div className="relative bg-black border border-neutral-800 rounded-xl overflow-hidden min-h-[380px] shadow-2xl flex flex-col justify-between">
        {!isRunning ? (
          /* DOS Prompt Shell */
          <div
            className="p-5 font-dos text-base text-neutral-300 font-mono tracking-wide leading-relaxed overflow-y-auto max-h-[420px] select-text"
            onClick={() => inputRef.current?.focus()}
          >
            {history.map((line, idx) => (
              <div key={idx} className="whitespace-pre-wrap">
                {line.startsWith('C:\\') ? (
                  <span className="text-white font-bold">{line}</span>
                ) : line.includes('SUCCESS') ? (
                  <span className="text-emerald-400">{line}</span>
                ) : line.includes('PORT.EXE') ? (
                  <span className="text-amber-400">{line}</span>
                ) : (
                  line
                )}
              </div>
            ))}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleExecuteCommand();
              }}
              className="flex items-center gap-1.5 mt-1"
            >
              <span className="text-white font-bold">C:\RETRO&gt;</span>
              <input
                ref={inputRef}
                type="text"
                value={inputCommand}
                onChange={(e) => setInputCommand(e.target.value)}
                className="flex-1 bg-transparent text-amber-400 outline-none font-dos text-base caret-amber-400"
                autoFocus
                spellCheck={false}
              />
            </form>
            <div ref={terminalBottomRef} />
          </div>
        ) : (
          /* VGA Mode 13h Active Screen */
          <div className="relative flex flex-col items-center justify-center p-4 bg-neutral-950 min-h-[380px]">
            <div className="absolute top-3 left-4 flex items-center gap-2 text-xs font-mono text-neutral-400 bg-black/60 px-2 py-1 rounded border border-neutral-800">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>VGA 320x200x256 · SEG A000h</span>
            </div>

            <div className="absolute top-3 right-4 flex items-center gap-2 text-xs font-mono text-neutral-400 bg-black/60 px-2.5 py-1 rounded border border-neutral-800">
              <Keyboard className="w-3.5 h-3.5 text-amber-400" />
              <span>Press <strong className="text-white">ESC</strong> or <strong className="text-white">SPACE</strong> to return</span>
            </div>

            {/* Mode 13h Framebuffer Container */}
            <div
              className="relative border-2 border-neutral-700 rounded overflow-hidden shadow-2xl cursor-pointer"
              style={{
                width: '640px',
                height: aspect43 ? '480px' : '400px',
                maxWidth: '100%'
              }}
              onClick={handleExitProgram}
            >
              <canvas
                ref={canvasRef}
                width={320}
                height={200}
                className={`w-full h-full pixel-art ${crtEffect ? 'crt-bloom' : ''}`}
              />
              {crtEffect && <div className="absolute inset-0 crt-overlay" />}
            </div>

            <div className="mt-3 text-xs text-neutral-500 font-mono">
              Simulating 16-bit real-mode INT 10h (AH=00h, AL=13h) &amp; Port 0x3C8/0x3C9 DAC registers
            </div>
          </div>
        )}

        {/* Quick Commands Footbar */}
        <div className="flex flex-wrap items-center justify-between gap-2 bg-neutral-900 border-t border-neutral-800 px-4 py-2 text-xs font-mono">
          <div className="flex items-center gap-2 text-neutral-400">
            <span>Quick Commands:</span>
            <button
              onClick={() => handleExecuteCommand('PORT.EXE')}
              className="px-2 py-0.5 bg-neutral-800 hover:bg-neutral-700 text-amber-300 rounded transition-colors"
            >
              PORT.EXE
            </button>
            <button
              onClick={() => handleExecuteCommand('DIR')}
              className="px-2 py-0.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded transition-colors"
            >
              DIR
            </button>
            <button
              onClick={() => handleExecuteCommand('MEM')}
              className="px-2 py-0.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded transition-colors"
            >
              MEM
            </button>
            <button
              onClick={() => handleExecuteCommand('TYPE README.TXT')}
              className="px-2 py-0.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded transition-colors"
            >
              TYPE README
            </button>
          </div>

          <div className="text-neutral-500 text-[11px]">
            MS-DOS MZ Binary: CS=0000h, IP=0000h, SS=1000h
          </div>
        </div>
      </div>
    </div>
  );
};
