import React, { useRef } from 'react';
import type { BlockShape } from '../game/types';
import { cn } from '../utils/cn';

interface BlockProps {
  block: BlockShape & { instanceId: string };
  onPointerDragStart?: (block: BlockShape & { instanceId: string }, offsetRow: number, offsetCol: number) => void;
  disabled?: boolean;
}

export function Block({ block, onPointerDragStart, disabled }: BlockProps) {
  const dragOffset = useRef({ r: 0, c: 0 });

  const handlePointerCellDown = (e: React.PointerEvent<HTMLDivElement>, r: number, c: number) => {
    if (disabled) return;
    dragOffset.current = { r, c };
    e.preventDefault();
    onPointerDragStart?.(block, r, c);
  };

  return (
    <div
      className={cn(
        "inline-flex flex-col gap-1 cursor-grab active:cursor-grabbing p-2 rounded-xl transition-all duration-200 select-none touch-none",
        !disabled && "hover:bg-white/5 hover:shadow-[0_0_12px_rgba(255,255,255,0.1)]",
        disabled && "opacity-50 cursor-not-allowed grayscale"
      )}
    >
      {block.shape.map((row, r) => (
        <div key={r} className="flex gap-1">
          {row.map((cell, c) => (
            <div
              key={c}
              onPointerDown={(e) => cell === 1 ? handlePointerCellDown(e, r, c) : undefined}
              className={cn(
                "w-10 h-10 rounded-sm",
                cell === 1 ? cn(block.colorClass, "shadow-[0_2px_4px_rgba(0,0,0,0.2)] border border-white/12") : "bg-transparent"
              )}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
