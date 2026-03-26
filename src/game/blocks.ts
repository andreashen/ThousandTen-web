import type { BlockShape } from './types';

// Shapes are max 3x3. We represent them as 2D arrays where 1 is solid, 0 is empty.
export const BLOCK_SHAPES: BlockShape[] = [
  // 1x1
  { id: 'dot-1', shape: [[1]], colorClass: 'bg-blue-500' },
  
  // 1x2 and 2x1
  { id: 'line-h-2', shape: [[1, 1]], colorClass: 'bg-green-500' },
  { id: 'line-v-2', shape: [[1], [1]], colorClass: 'bg-green-500' },

  // 1x3 and 3x1
  { id: 'line-h-3', shape: [[1, 1, 1]], colorClass: 'bg-yellow-500' },
  { id: 'line-v-3', shape: [[1], [1], [1]], colorClass: 'bg-yellow-500' },

  // 2x2 Square
  { id: 'square-2', shape: [[1, 1], [1, 1]], colorClass: 'bg-purple-500' },

  // 3x3 Square
  { id: 'square-3', shape: [[1, 1, 1], [1, 1, 1], [1, 1, 1]], colorClass: 'bg-red-500' },

  // 2x2 L-shapes (4 rotations)
  { id: 'l-small-1', shape: [[1, 0], [1, 1]], colorClass: 'bg-orange-500' },
  { id: 'l-small-2', shape: [[0, 1], [1, 1]], colorClass: 'bg-orange-500' },
  { id: 'l-small-3', shape: [[1, 1], [1, 0]], colorClass: 'bg-orange-500' },
  { id: 'l-small-4', shape: [[1, 1], [0, 1]], colorClass: 'bg-orange-500' },

  // 3x3 L-shapes (4 rotations)
  { id: 'l-large-1', shape: [[1, 0, 0], [1, 0, 0], [1, 1, 1]], colorClass: 'bg-pink-500' },
  { id: 'l-large-2', shape: [[0, 0, 1], [0, 0, 1], [1, 1, 1]], colorClass: 'bg-pink-500' },
  { id: 'l-large-3', shape: [[1, 1, 1], [1, 0, 0], [1, 0, 0]], colorClass: 'bg-pink-500' },
  { id: 'l-large-4', shape: [[1, 1, 1], [0, 0, 1], [0, 0, 1]], colorClass: 'bg-pink-500' },
];
