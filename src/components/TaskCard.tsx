import React from 'react';
import { Task } from '../types';
import { GripVertical, Edit2, Trash2 } from 'lucide-react';
import clsx from 'clsx';

interface TaskCardProps {
  task: Task;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
  onView?: (task: Task) => void;
  onDragStart?: (e: React.DragEvent, taskId: string) => void;
}

export function TaskCard({ task, onEdit, onDelete, onView, onDragStart }: TaskCardProps) {
  const priorityColors = {
    low: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
    high: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  };

  return (
    <div
      draggable={!!onDragStart}
      onDragStart={(e) => onDragStart?.(e, task.id)}
      onClick={() => onView?.(task)}
      className={clsx(
        "bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 group transition-colors",
        onView && "cursor-pointer hover:border-indigo-300 dark:hover:border-indigo-500",
        onDragStart && "active:cursor-grabbing"
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-start gap-2 flex-1">
          {onDragStart && (
            <GripVertical className="w-4 h-4 text-gray-400 dark:text-gray-500 mt-1 flex-shrink-0 cursor-grab opacity-0 group-hover:opacity-100 transition-opacity" />
          )}
          <h4 className="font-medium text-gray-900 dark:text-gray-100 leading-tight break-words">{task.title}</h4>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit(task);
            }}
            className="p-1 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded"
            title="Edit task"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(task.id);
            }}
            className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded"
            title="Delete task"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      {task.description && (
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2 pl-6">
          {task.description}
        </p>
      )}
      
      <div className="flex items-center justify-between mt-4 pl-6">
        <span className={clsx("text-xs font-medium px-2.5 py-0.5 rounded-full capitalize", priorityColors[task.priority])}>
          {task.priority}
        </span>
        <span className="text-xs text-gray-400 dark:text-gray-500">
          {task.createdAt?.toDate ? new Date(task.createdAt.toDate()).toLocaleDateString() : ''}
        </span>
      </div>
    </div>
  );
}
