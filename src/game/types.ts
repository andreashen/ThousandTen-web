export type GridState = number[][]; // 10x10, 0 means empty, 1 means filled

export interface BlockShape {
  id: string;
  shape: number[][]; // 2D array representation of the block (e.g., [[1,1], [1,0]])
  colorClass: string; // Tailwind class for color
}

export interface PlacedBlock {
  blockId: string;
  x: number; // grid row
  y: number; // grid col
}
