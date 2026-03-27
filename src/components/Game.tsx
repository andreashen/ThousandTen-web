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
        <div className="flex justify-between items-center bg-gray-800 p-4 rounded-xl shadow-lg">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
              ThousandTen
            </h1>
            <p className="text-gray-400 text-sm">10x10 Block Puzzle</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-4">
              <button 
                onClick={toggleHaptic}
                className="text-gray-400 hover:text-white transition-colors p-2 rounded-full hover:bg-white/10 active:scale-95"
                title={hapticEnabled ? "Disable vibration" : "Enable vibration"}
              >
                {hapticEnabled ? <Vibrate size={24} /> : <VibrateOff size={24} />}
              </button>
              <button 
                onClick={toggleAudio}
                className="text-gray-400 hover:text-white transition-colors p-2 rounded-full hover:bg-white/10 active:scale-95"
                title={audioEnabled ? "Mute sound" : "Enable sound"}
              >
                {audioEnabled ? <Volume2 size={24} /> : <VolumeX size={24} />}
              </button>
              <div className="flex items-center gap-2 text-yellow-400">
                <Trophy size={20} />
                <span className="text-2xl font-bold">{score}</span>
              </div>
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
            <div className="absolute inset-0 bg-gray-900/80 rounded-lg flex flex-col items-center justify-center backdrop-blur-sm animate-in fade-in zoom-in duration-300">
              <h2 className="text-4xl font-bold text-red-500 mb-2">Game Over!</h2>
              <p className="text-xl mb-6">Final Score: <span className="text-yellow-400 font-bold">{score}</span></p>
              <button 
                onClick={initGame}
                className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-full font-bold transition-transform hover:scale-105 active:scale-95"
              >
                <RotateCcw size={20} />
                Play Again
              </button>
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
