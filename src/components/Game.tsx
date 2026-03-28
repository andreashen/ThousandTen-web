import { useState, useEffect, useCallback, useRef } from 'react';
import { Grid } from './Grid';
import { Block } from './Block';
import { BLOCK_SHAPES } from '../game/blocks';
import { 
  createEmptyGrid, 
  generateBlocks, 
  canPlaceBlock, 
  placeBlock, 
  checkGameOver
} from '../game/logic';
import type { GridState, BlockShape } from '../game/types';
import { cn } from '../utils/cn';
import { AudioSystem } from '../game/audio';
import { HapticSystem } from '../game/haptic';
import { Trophy, RotateCcw, Volume2, VolumeX, Vibrate, VibrateOff } from 'lucide-react';

export function Game() {
  const [grid, setGrid] = useState<GridState>(() => createEmptyGrid());
  const [score, setScore] = useState(0);
  const [availableBlocks, setAvailableBlocks] = useState<((BlockShape & { instanceId: string }) | null)[]>(() => generateBlocks(BLOCK_SHAPES));
  const [clearedLines, setClearedLines] = useState<{ rows: number[]; cols: number[]; active: boolean }>({
    rows: [],
    cols: [],
    active: false,
  });

  const [comboMessage, setComboMessage] = useState<{ count: number; active: boolean; id: number }>({ count: 0, active: false, id: 0 });
  const comboCountRef = useRef(0);

  const [draggedBlock, setDraggedBlock] = useState<{
    block: BlockShape & { instanceId: string };
    offsetR: number;
    offsetC: number;
    clientX: number;
    clientY: number;
    pointerOffsetX: number;
    pointerOffsetY: number;
    pointerType: string;
  } | null>(null);

  const [audioEnabled, setAudioEnabled] = useState(() => {
    if (typeof window !== 'undefined') {
      const savedAudio = localStorage.getItem('thousandten_audio');
      if (savedAudio) return JSON.parse(savedAudio).enabled ?? true;
    }
    return true;
  });

  const [hapticEnabled, setHapticEnabled] = useState(() => {
    if (typeof window !== 'undefined') {
      const savedHaptic = localStorage.getItem('thousandten_haptic');
      if (savedHaptic) return JSON.parse(savedHaptic).enabled ?? true;
    }
    return true;
  });

  useEffect(() => {
    HapticSystem.init();
  }, []);

  const toggleAudio = () => {
    AudioSystem.init();
    const nextState = !audioEnabled;
    AudioSystem.setEnabled(nextState);
    setAudioEnabled(nextState);
  };

  const toggleHaptic = () => {
    const nextState = !hapticEnabled;
    HapticSystem.setEnabled(nextState);
    setHapticEnabled(nextState);
    if (nextState) {
      HapticSystem.vibratePlace(); // Feedback on turning it on
    }
  };

  const [hoverPreview, setHoverPreview] = useState<{
    block: BlockShape;
    startRow: number;
    startCol: number;
    isValid: boolean;
  } | null>(null);

  // Initialize game
  const initGame = useCallback(() => {
    setGrid(createEmptyGrid());
    setScore(0);
    setAvailableBlocks(generateBlocks(BLOCK_SHAPES));
    setDraggedBlock(null);
    setHoverPreview(null);
    setClearedLines({ rows: [], cols: [], active: false });
    comboCountRef.current = 0;
    setComboMessage({ count: 0, active: false, id: 0 });
  }, []);

  const isGameOver = availableBlocks.length > 0 && checkGameOver(grid, availableBlocks);

  useEffect(() => {
    if (isGameOver) {
      AudioSystem.playGameOverSound();
      HapticSystem.vibrateGameOver();
    }
  }, [isGameOver]);

  useEffect(() => {
    if (!clearedLines.active) return;
    const timer = window.setTimeout(() => {
      setClearedLines({ rows: [], cols: [], active: false });
    }, 300); // Unified with block appearance animation duration
    return () => window.clearTimeout(timer);
  }, [clearedLines]);

  useEffect(() => {
    if (!comboMessage.active) return;
    const timer = window.setTimeout(() => {
      setComboMessage(prev => ({ ...prev, active: false }));
    }, 1200); // Show combo message for a bit longer
    return () => window.clearTimeout(timer);
  }, [comboMessage]);

  const tryPlaceBlock = useCallback((block: BlockShape & { instanceId: string }, startRow: number, startCol: number) => {
    if (!canPlaceBlock(grid, block, startRow, startCol)) {
      return false;
    }
    const { newGrid, scoreGained, clearedRows, clearedCols } = placeBlock(grid, block, startRow, startCol);
    setGrid(newGrid);
    setScore((prev) => prev + scoreGained);
    
    if (clearedRows.length > 0 || clearedCols.length > 0) {
      setClearedLines({ rows: clearedRows, cols: clearedCols, active: true });
      const nextCombo = comboCountRef.current + 1;
      comboCountRef.current = nextCombo;
      AudioSystem.playClearSound(nextCombo);
      HapticSystem.vibrateClear(nextCombo);
      if (nextCombo >= 2) {
        // Increment id to force re-render/re-animation if multiple combos happen quickly
        setComboMessage(msg => ({ count: nextCombo, active: true, id: msg.id + 1 }));
      }
    } else {
      AudioSystem.playPlaceSound();
      HapticSystem.vibratePlace();
      comboCountRef.current = 0;
    }

    setAvailableBlocks((prev) => {
      const newAvailable = prev.map((candidate) =>
        candidate?.instanceId === block.instanceId ? null : candidate
      );
      if (newAvailable.every((candidate) => candidate === null)) {
        return generateBlocks(BLOCK_SHAPES);
      }
      return newAvailable;
    });
    return true;
  }, [grid]);

  const handlePointerDragStart = (
    block: BlockShape & { instanceId: string },
    offsetRow: number,
    offsetCol: number,
    clientX: number,
    clientY: number,
    pointerOffsetX: number,
    pointerOffsetY: number,
    pointerType: string
  ) => {
    if (isGameOver) return;
    
    // Ensure audio context is initialized on first user interaction
    AudioSystem.init();
    
    // Prevent default touch behaviors like scrolling when dragging starts
    document.body.style.userSelect = 'none';
    document.body.style.touchAction = 'none';

    // 移动端触控上移偏移量（相对单格尺寸，约 2.5 个格子的高度）
    const isTouch = pointerType === 'touch' || pointerType === 'pen';
    const TOUCH_Y_OFFSET = isTouch ? 80 : 0;
    
    setDraggedBlock({ 
      block, 
      offsetR: offsetRow, 
      offsetC: offsetCol, 
      clientX, 
      clientY: clientY - TOUCH_Y_OFFSET, 
      pointerOffsetX, 
      pointerOffsetY,
      pointerType
    });
  };

  useEffect(() => {
    if (!draggedBlock || isGameOver) return;
    
    const handlePointerMove = (event: PointerEvent) => {
      // Prevent default to stop scrolling
      event.preventDefault();
      
      const isTouch = draggedBlock.pointerType === 'touch' || draggedBlock.pointerType === 'pen';
      const TOUCH_Y_OFFSET = isTouch ? 80 : 0;
      
      setDraggedBlock(prev => prev ? { ...prev, clientX: event.clientX, clientY: event.clientY - TOUCH_Y_OFFSET } : null);
      
      const target = document.elementFromPoint(event.clientX, event.clientY - TOUCH_Y_OFFSET) as HTMLElement | null;
      const cell = target?.closest('[data-grid-cell="true"]') as HTMLElement | null;
      if (!cell) {
        setHoverPreview(null);
        return;
      }
      const row = Number(cell.dataset.row);
      const col = Number(cell.dataset.col);
      if (Number.isNaN(row) || Number.isNaN(col)) {
        setHoverPreview(null);
        return;
      }
      const startRow = row - draggedBlock.offsetR;
      const startCol = col - draggedBlock.offsetC;
      setHoverPreview({
        block: draggedBlock.block,
        startRow,
        startCol,
        isValid: canPlaceBlock(grid, draggedBlock.block, startRow, startCol),
      });
    };

    const handlePointerUp = () => {
      // Restore default touch behaviors
      document.body.style.userSelect = '';
      document.body.style.touchAction = '';
      
      if (hoverPreview?.isValid) {
        tryPlaceBlock(draggedBlock.block, hoverPreview.startRow, hoverPreview.startCol);
      }
      setDraggedBlock(null);
      setHoverPreview(null);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp, { once: true });

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [draggedBlock, grid, hoverPreview, isGameOver, tryPlaceBlock]);

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center py-10 font-sans">
      <div className="w-full max-w-lg px-4 flex flex-col gap-8">
        
        {/* Header */}
        <div className="flex justify-between items-center bg-gray-800/80 backdrop-blur-md p-5 rounded-2xl shadow-xl border border-white/5 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 pointer-events-none" />
          <div className="relative">
            <h1 className="text-3xl font-black bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent drop-shadow-sm tracking-tight">
              ThousandTen
            </h1>
            <p className="text-gray-400 text-xs font-medium tracking-wider uppercase mt-1">10x10 Block Puzzle</p>
          </div>
          <div className="flex flex-col items-end gap-3 relative">
            <div className="flex items-center gap-4">
              <button 
                onClick={toggleHaptic}
                className={cn(
                  "transition-all p-2.5 rounded-xl active:scale-95",
                  hapticEnabled ? "text-blue-400 bg-blue-400/10 hover:bg-blue-400/20" : "text-gray-500 bg-gray-700/50 hover:bg-gray-700"
                )}
                title={hapticEnabled ? "Disable vibration" : "Enable vibration"}
              >
                {hapticEnabled ? <Vibrate size={22} /> : <VibrateOff size={22} />}
              </button>
              <button 
                onClick={toggleAudio}
                className={cn(
                  "transition-all p-2.5 rounded-xl active:scale-95",
                  audioEnabled ? "text-purple-400 bg-purple-400/10 hover:bg-purple-400/20" : "text-gray-500 bg-gray-700/50 hover:bg-gray-700"
                )}
                title={audioEnabled ? "Mute sound" : "Enable sound"}
              >
                {audioEnabled ? <Volume2 size={22} /> : <VolumeX size={22} />}
              </button>
            </div>
            <div className="flex items-center gap-3 bg-gray-900/60 px-4 py-2 rounded-xl border border-white/5 shadow-inner">
              <Trophy size={20} className="text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]" />
              <span className="text-3xl font-black text-white tracking-tight tabular-nums">{score}</span>
            </div>
          </div>
        </div>

        {/* Game Area */}
        <div className="flex justify-center relative w-full">
          <Grid
            grid={grid}
            hoverPreview={hoverPreview}
            clearedLines={clearedLines}
          />

          {/* Combo Floating Text */}
          {comboMessage.active && (
            <div 
              key={comboMessage.id}
              className={cn(
                "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-50 animate-in fade-in zoom-in-50 slide-in-from-bottom-8 duration-500",
                comboMessage.count >= 4 && "animate-pulse"
              )}
              style={{ filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.5))' }}
            >
              <div className={cn(
                "font-black italic tracking-wider text-transparent bg-clip-text transform -rotate-6 transition-all",
                comboMessage.count === 2 ? "text-4xl md:text-5xl bg-gradient-to-br from-blue-300 to-green-400" :
                comboMessage.count === 3 ? "text-5xl md:text-6xl bg-gradient-to-br from-yellow-300 to-orange-500 scale-110" :
                "text-6xl md:text-7xl bg-gradient-to-br from-orange-400 via-red-500 to-purple-600 scale-125"
              )}>
                {comboMessage.count >= 4 ? 'SUPER COMBO ' : 'COMBO '}x{comboMessage.count}!
              </div>
            </div>
          )}

          {isGameOver && (
            <div className="absolute inset-0 z-[60] bg-gray-950/80 backdrop-blur-md rounded-2xl flex flex-col items-center justify-center animate-in fade-in zoom-in-95 duration-500 border border-white/10 shadow-2xl">
              <div className="absolute inset-0 bg-gradient-to-t from-red-500/10 to-transparent rounded-2xl pointer-events-none" />
              
              <div className="relative flex flex-col items-center p-8 bg-gray-900/50 rounded-3xl border border-white/5 shadow-2xl backdrop-blur-xl w-4/5 max-w-sm">
                <h2 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-b from-red-400 to-red-600 mb-2 drop-shadow-md">
                  Game Over
                </h2>
                <div className="h-px w-12 bg-white/10 my-4" />
                
                <p className="text-gray-400 font-medium mb-1 uppercase tracking-widest text-sm">Final Score</p>
                <p className="text-5xl md:text-6xl font-black text-white mb-8 drop-shadow-[0_0_15px_rgba(255,255,255,0.2)] tabular-nums">
                  {score}
                </p>
                
                <button 
                  onClick={initGame}
                  className="group relative flex items-center justify-center gap-3 bg-gradient-to-b from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 text-white px-8 py-4 rounded-full font-bold text-lg transition-all duration-300 hover:scale-105 hover:shadow-[0_0_20px_rgba(59,130,246,0.4)] active:scale-95 w-full"
                >
                  <RotateCcw size={22} className="transition-transform duration-500 group-hover:-rotate-180" />
                  <span>Play Again</span>
                  <div className="absolute inset-0 rounded-full border border-white/20 pointer-events-none" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Available Blocks */}
        <div className="bg-gray-800 p-3 sm:p-6 rounded-xl shadow-lg min-h-[160px] grid grid-cols-3 gap-2 sm:gap-4 justify-items-center items-center touch-none">
          {availableBlocks.map((block, i) => (
            <div key={i} className="w-[100px] sm:w-[130px] h-[130px] sm:h-[160px] flex items-center justify-center">
              {block ? (
                <Block
                  block={block}
                  disabled={isGameOver}
                  onPointerDragStart={handlePointerDragStart}
                  isDragging={draggedBlock?.block.instanceId === block.instanceId}
                />
              ) : null}
            </div>
          ))}
        </div>

        {/* Floating Drag Layer */}
        {draggedBlock && (
          <div 
            className="fixed pointer-events-none z-[100] transition-none"
            style={{
              left: draggedBlock.clientX - draggedBlock.pointerOffsetX,
              top: draggedBlock.clientY - draggedBlock.pointerOffsetY,
              transform: `scale(1.05)`,
              transformOrigin: `${draggedBlock.pointerOffsetX}px ${draggedBlock.pointerOffsetY}px`
            }}
          >
            <Block block={draggedBlock.block} />
          </div>
        )}
      </div>
    </div>
  );
}
