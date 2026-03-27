import type { GridState, BlockShape } from '../game/types';
import { cn } from '../utils/cn';

interface GridProps {
  grid: GridState;
  hoverPreview: {
    block: BlockShape;
    startRow: number;
    startCol: number;
    isValid: boolean;
  } | null;
  clearedLines: {
    rows: number[];
    cols: number[];
    active: boolean;
  };
}

export function Grid({ grid, hoverPreview, clearedLines }: GridProps) {
  // Determine if a cell should show a preview
  const getPreviewState = (r: number, c: number) => {
    if (!hoverPreview) return null;
    const { block, startRow, startCol, isValid } = hoverPreview;
    const shape = block.shape;
    
    const blockR = r - startRow;
    const blockC = c - startCol;

    if (
      blockR >= 0 && blockR < shape.length &&
      blockC >= 0 && blockC < shape[0].length &&
      shape[blockR][blockC] === 1
    ) {
      return isValid ? 'valid' : 'invalid';
    }
    return null;
  };

  return (
    <div 
      className="bg-gray-800 p-2 sm:p-4 rounded-xl shadow-xl touch-none w-full flex justify-center"
    >
      <div className="flex flex-col gap-1">
        {grid.map((row, r) => (
          <div key={r} className="flex gap-1">
            {row.map((cell, c) => {
              const preview = getPreviewState(r, c);
              const isFilled = cell === 1;
              const isCleared = clearedLines.active && (clearedLines.rows.includes(r) || clearedLines.cols.includes(c));

              return (
                <div
                  key={c}
                  data-grid-cell="true"
                  data-row={r}
                  data-col={c}
                  className={cn(
                    "w-7 h-7 sm:w-9 sm:h-9 rounded-sm transition-all duration-150 ease-out",
                    isFilled ? "bg-blue-400 shadow-sm" : "bg-gray-700",
                    preview === 'valid' && "bg-green-400/60 shadow-[inset_0_0_8px_rgba(74,222,128,0.5)] scale-[1.02]",
                    preview === 'invalid' && "bg-red-500/60 shadow-[inset_0_0_8px_rgba(239,68,68,0.5)] scale-[1.02]",
                    isCleared && "animate-pulse bg-white/80 shadow-[0_0_18px_rgba(255,255,255,0.65)] scale-90"
                  )}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
