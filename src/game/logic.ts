import type { BlockShape, GridState } from './types';

export const GRID_SIZE = 10;

export function createEmptyGrid(): GridState {
  return Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(0));
}

// 检查方块能否放在指定位置 (row, col 是网格坐标，对应方块左上角)
export function canPlaceBlock(grid: GridState, block: BlockShape, startRow: number, startCol: number): boolean {
  const shape = block.shape;
  const rows = shape.length;
  const cols = shape[0].length;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (shape[r][c] === 1) {
        const gridRow = startRow + r;
        const gridCol = startCol + c;

        // 越界检查
        if (gridRow < 0 || gridRow >= GRID_SIZE || gridCol < 0 || gridCol >= GRID_SIZE) {
          return false;
        }

        // 重叠检查
        if (grid[gridRow][gridCol] !== 0) {
          return false;
        }
      }
    }
  }
  return true;
}

// 放置方块，返回新的网格和消除信息
export function placeBlock(grid: GridState, block: BlockShape, startRow: number, startCol: number) {
  // 深拷贝网格
  const newGrid = grid.map(row => [...row]);
  const shape = block.shape;
  
  // 放入方块
  let cellsAdded = 0;
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[0].length; c++) {
      if (shape[r][c] === 1) {
        newGrid[startRow + r][startCol + c] = 1;
        cellsAdded++;
      }
    }
  }

  // 检测满行和满列
  const rowsToClear = new Set<number>();
  const colsToClear = new Set<number>();

  for (let r = 0; r < GRID_SIZE; r++) {
    if (newGrid[r].every(cell => cell !== 0)) {
      rowsToClear.add(r);
    }
  }

  for (let c = 0; c < GRID_SIZE; c++) {
    let isFull = true;
    for (let r = 0; r < GRID_SIZE; r++) {
      if (newGrid[r][c] === 0) {
        isFull = false;
        break;
      }
    }
    if (isFull) colsToClear.add(c);
  }

  // 执行消除
  rowsToClear.forEach(r => {
    for (let c = 0; c < GRID_SIZE; c++) {
      newGrid[r][c] = 0;
    }
  });

  colsToClear.forEach(c => {
    for (let r = 0; r < GRID_SIZE; r++) {
      newGrid[r][c] = 0;
    }
  });

  // 计算分数
  const linesCleared = rowsToClear.size + colsToClear.size;
  const scoreGained = cellsAdded + (linesCleared * 10);

  return {
    newGrid,
    scoreGained,
    linesCleared,
    clearedRows: Array.from(rowsToClear),
    clearedCols: Array.from(colsToClear)
  };
}

// 检查备选区是否还有任意一个方块能放下
export function checkGameOver(grid: GridState, availableBlocks: (BlockShape | null)[]): boolean {
  const remainingBlocks = availableBlocks.filter(b => b !== null) as BlockShape[];
  if (remainingBlocks.length === 0) return false; // 需要刷新，不是游戏结束

  for (const block of remainingBlocks) {
    // 只要有一个能放下，就没有结束
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        if (canPlaceBlock(grid, block, r, c)) {
          return false; 
        }
      }
    }
  }
  return true; // 没有任何一个能放下
}

// 随机生成 3 个方块
export function generateBlocks(allShapes: BlockShape[]): (BlockShape & { instanceId: string })[] {
  // Option: We could implement weighted random selection here if needed later.
  // For now, pure random across the expanded pool (including 1x4 and 1x5) works well.
  return Array.from({ length: 3 }, () => {
    const randomIndex = Math.floor(Math.random() * allShapes.length);
    // return a shallow copy with a unique instance id so React keys work better if there are duplicates
    return { ...allShapes[randomIndex], instanceId: Math.random().toString(36).substring(7) };
  });
}
