import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Task, TaskPriority, TaskStatus, Column } from '../types';
import { X } from 'lucide-react';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (taskData: Partial<Task>) => Promise<void>;
  initialData?: Task | null;
  defaultStatus?: TaskStatus;
}

export function TaskModal({ isOpen, onClose, onSave, initialData, defaultStatus = 'todo' }: TaskModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [status, setStatus] = useState<TaskStatus>(defaultStatus);
  const [columns, setColumns] = useState<Column[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!auth.currentUser) return;
    const qColumns = query(
      collection(db, 'columns'),
      where('userId', '==', auth.currentUser.uid)
    );
    const unsubscribe = onSnapshot(qColumns, (snapshot) => {
      const columnsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Column[];
      columnsData.sort((a, b) => a.order - b.order);
      setColumns(columnsData);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setTitle(initialData.title);
        setDescription(initialData.description || '');
        setPriority(initialData.priority);
        setStatus(initialData.status);
      } else {
        setTitle('');
        setDescription('');
        setPriority('medium');
        setStatus(defaultStatus);
      }
    }
  }, [isOpen, initialData, defaultStatus]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);
    try {
      await onSave({
        title: title.trim(),
        description: description.trim(),
        priority,
        status,
      });
      onClose();
    } catch (error) {
      console.error('Failed to save task', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {initialData ? 'Edit Task' : 'Create Task'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1">
          <div className="space-y-4">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Title *
              </label>
              <input
                id="title"
                type="text"
                required
                maxLength={100}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                placeholder="What needs to be done?"
              />
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Description
              </label>
              <textarea
                id="description"
                rows={3}
                maxLength={1000}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none dark:bg-gray-700 dark:text-white"
                placeholder="Add more details..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="status" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Status
                </label>
                <select
                  id="status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as TaskStatus)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                >
                  {columns.map(col => (
                    <option key={col.id} value={col.id}>{col.name}</option>
                  ))}
                  {columns.length === 0 && (
                    <>
                      <option value="todo">To Do</option>
                      <option value="inprogress">In Progress</option>
                      <option value="done">Done</option>
                    </>
                  )}
                </select>
              </div>

              <div>
                <label htmlFor="priority" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Priority
                </label>
                <select
                  id="priority"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as TaskPriority)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 capitalize dark:bg-gray-700 dark:text-white"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
            </div>
          </div>

          <div className="mt-8 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !title.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Saving...' : 'Save Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
