import React, { useRef } from 'react';
import type { BlockShape } from '../game/types';
import { cn } from '../utils/cn';

interface BlockProps {
  block: BlockShape & { instanceId: string };
  onPointerDragStart?: (
    block: BlockShape & { instanceId: string },
    offsetRow: number,
    offsetCol: number,
    clientX: number,
    clientY: number,
    pointerOffsetX: number,
    pointerOffsetY: number
  ) => void;
  disabled?: boolean;
  isDragging?: boolean;
}

export function Block({ block, onPointerDragStart, disabled, isDragging }: BlockProps) {
  const blockRef = useRef<HTMLDivElement>(null);

  const handlePointerCellDown = (e: React.PointerEvent<HTMLDivElement>, r: number, c: number) => {
    if (disabled) return;
    
    // Capture the pointer to ensure we receive move/up events even if pointer leaves the element
    e.currentTarget.setPointerCapture(e.pointerId);
    e.preventDefault();
    
    const rect = blockRef.current?.getBoundingClientRect();
    if (rect) {
      // Calculate pointer offset relative to the block's top-left corner
      // We need to store this offset and use it to calculate the correct left/top 
      // position in the fixed layer, rather than calculating startX/startY here.
      const offsetX = e.clientX - rect.left;
      const offsetY = e.clientY - rect.top;

      onPointerDragStart?.(block, r, c, e.clientX, e.clientY, offsetX, offsetY);
    }
  };

  return (
    <div
      ref={blockRef}
      className={cn(
        "inline-flex flex-col gap-1 cursor-grab active:cursor-grabbing p-2 rounded-xl select-none touch-none",
        !disabled && "hover:bg-white/5 hover:shadow-[0_0_12px_rgba(255,255,255,0.1)]",
        disabled && "opacity-50 cursor-not-allowed grayscale",
        isDragging && "opacity-0"
      )}
      style={{ touchAction: 'none' }}
    >
      {block.shape.map((row, r) => (
        <div key={r} className="flex gap-1">
          {row.map((cell, c) => (
            <div
              key={c}
              onPointerDown={(e) => cell === 1 ? handlePointerCellDown(e, r, c) : undefined}
              className={cn(
                "w-7 h-7 sm:w-8 sm:h-8 rounded-sm",
                cell === 1 ? cn(block.colorClass, "shadow-[0_2px_4px_rgba(0,0,0,0.2)] border border-white/12") : "bg-transparent"
              )}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
