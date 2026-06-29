import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '../lib/utils';

interface SortableWidgetProps {
  id: string;
  children: React.ReactNode;
  isEditing: boolean;
  className?: string;
}

export function SortableWidget({ id, children, isEditing, className }: SortableWidgetProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled: !isEditing });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(className, isEditing ? "touch-none" : "")}
      {...(isEditing ? attributes : {})}
      {...(isEditing ? listeners : {})}
    >
      {children}
    </div>
  );
}
