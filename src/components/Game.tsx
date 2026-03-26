import { useState, useEffect, useCallback } from 'react';
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
import { Trophy, RotateCcw } from 'lucide-react';

export function Game() {
  const [grid, setGrid] = useState<GridState>(() => createEmptyGrid());
  const [score, setScore] = useState(0);
  const [availableBlocks, setAvailableBlocks] = useState<((BlockShape & { instanceId: string }) | null)[]>(() => generateBlocks(BLOCK_SHAPES));
  const [clearedLines, setClearedLines] = useState<{ rows: number[]; cols: number[]; active: boolean }>({
    rows: [],
    cols: [],
    active: false,
  });

  const [draggedBlock, setDraggedBlock] = useState<{
    block: BlockShape & { instanceId: string };
    offsetR: number;
    offsetC: number;
  } | null>(null);

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
  }, []);

  const isGameOver = availableBlocks.length > 0 && checkGameOver(grid, availableBlocks);

  useEffect(() => {
    if (!clearedLines.active) return;
    const timer = window.setTimeout(() => {
      setClearedLines({ rows: [], cols: [], active: false });
    }, 260);
    return () => window.clearTimeout(timer);
  }, [clearedLines]);

  const tryPlaceBlock = useCallback((block: BlockShape & { instanceId: string }, startRow: number, startCol: number) => {
    if (!canPlaceBlock(grid, block, startRow, startCol)) {
      return false;
    }
    const { newGrid, scoreGained, clearedRows, clearedCols } = placeBlock(grid, block, startRow, startCol);
    setGrid(newGrid);
    setScore((prev) => prev + scoreGained);
    if (clearedRows.length > 0 || clearedCols.length > 0) {
      setClearedLines({ rows: clearedRows, cols: clearedCols, active: true });
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

  const handlePointerDragStart = (block: BlockShape & { instanceId: string }, offsetRow: number, offsetCol: number) => {
    if (isGameOver) return;
    setDraggedBlock({ block, offsetR: offsetRow, offsetC: offsetCol });
  };

  useEffect(() => {
    if (!draggedBlock || isGameOver) return;
    const handlePointerMove = (event: PointerEvent) => {
      const target = document.elementFromPoint(event.clientX, event.clientY) as HTMLElement | null;
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
            <p className="text-gray-400 text-sm">9x9 Block Puzzle</p>
          </div>
          <div className="flex flex-col items-end">
            <div className="flex items-center gap-2 text-yellow-400">
              <Trophy size={20} />
              <span className="text-2xl font-bold">{score}</span>
            </div>
          </div>
        </div>

        {/* Game Area */}
        <div className="flex justify-center relative">
          <Grid
            grid={grid}
            hoverPreview={hoverPreview}
            clearedLines={clearedLines}
          />

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
        <div className="bg-gray-800 p-6 rounded-xl shadow-lg min-h-[160px] grid grid-cols-3 gap-4 justify-items-center items-center touch-none">
          {availableBlocks.map((block, i) => (
            <div key={i} className="w-[120px] h-[120px] flex items-center justify-center">
              {block ? (
                <Block
                  block={block}
                  disabled={isGameOver}
                  onPointerDragStart={handlePointerDragStart}
                />
              ) : null}
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
