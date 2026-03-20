import React, { useState, useEffect } from 'react';
import { Task, Activity, Column } from '../types';
import { X, Edit2, Calendar, AlertCircle, CheckCircle2, Clock, ListTodo, MessageSquare, Send } from 'lucide-react';
import clsx from 'clsx';
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../firebase';

interface TaskViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null;
  onEdit: (task: Task) => void;
}

export function TaskViewModal({ isOpen, onClose, task, onEdit }: TaskViewModalProps) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [newComment, setNewComment] = useState('');
  const [columns, setColumns] = useState<Column[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen || !task || !auth.currentUser) return;

    const qActivities = query(
      collection(db, 'activities'),
      where('taskId', '==', task.id),
      orderBy('createdAt', 'asc')
    );

    const unsubscribeActivities = onSnapshot(qActivities, (snapshot) => {
      const activitiesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Activity[];
      setActivities(activitiesData);
    });

    const qColumns = query(
      collection(db, 'columns'),
      where('userId', '==', auth.currentUser.uid)
    );

    const unsubscribeColumns = onSnapshot(qColumns, (snapshot) => {
      const columnsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Column[];
      setColumns(columnsData);
    });

    return () => {
      unsubscribeActivities();
      unsubscribeColumns();
    };
  }, [isOpen, task]);

  if (!isOpen || !task) return null;

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !auth.currentUser || !task) return;

    setIsSubmitting(true);
    try {
      const userName = auth.currentUser.displayName || auth.currentUser.email?.split('@')[0] || 'User';
      await addDoc(collection(db, 'activities'), {
        taskId: task.id,
        userId: auth.currentUser.uid,
        userName,
        type: 'comment',
        content: newComment.trim(),
        createdAt: serverTimestamp(),
      });
      setNewComment('');
    } catch (error) {
      console.error('Failed to add comment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusDisplay = (statusId: string) => {
    const column = columns.find(c => c.id === statusId);
    if (column) {
      return { label: column.name, color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200' };
    }
    
    // Fallbacks
    const statusColors: Record<string, string> = {
      todo: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
      inprogress: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      done: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    };
    const statusLabels: Record<string, string> = {
      todo: 'To Do',
      inprogress: 'In Progress',
      done: 'Done',
    };
    
    return {
      label: statusLabels[statusId] || statusId,
      color: statusColors[statusId] || statusColors.todo
    };
  };

  const statusDisplay = getStatusDisplay(task.status);

  const priorityColors: Record<string, string> = {
    low: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
    high: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-start justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700">
          <div className="flex-1 pr-4">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white break-words leading-tight">
              {task.title}
            </h2>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => {
                onClose();
                onEdit(task);
              }}
              className="p-2 text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-md transition-colors"
              title="Edit task"
            >
              <Edit2 className="w-5 h-5" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        <div className="p-6 overflow-y-auto flex-1 bg-gray-50/50 dark:bg-gray-900/50">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2 uppercase tracking-wider">Description</h3>
                {task.description ? (
                  <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                    {task.description}
                  </div>
                ) : (
                  <p className="text-gray-500 dark:text-gray-400 italic bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                    No description provided.
                  </p>
                )}
              </div>

              {/* Activity Log & Comments */}
              <div className="mt-8">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 uppercase tracking-wider flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  Activity & Comments
                </h3>
                
                <div className="space-y-4 mb-4 max-h-64 overflow-y-auto pr-2">
                  {activities.length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400 italic">No activity yet.</p>
                  ) : (
                    activities.map((activity) => (
                      <div key={activity.id} className="flex gap-3">
                        <div className="flex-shrink-0 mt-1">
                          {activity.type === 'system' ? (
                            <div className="w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                              <AlertCircle className="w-3 h-3 text-gray-500 dark:text-gray-400" />
                            </div>
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-700 dark:text-indigo-300 font-medium text-sm uppercase">
                              {(activity.userName || 'U').charAt(0)}
                            </div>
                          )}
                        </div>
                        <div className={clsx(
                          "flex-1 rounded-lg p-3",
                          activity.type === 'system' 
                            ? "bg-gray-50 dark:bg-gray-800/50 text-sm text-gray-600 dark:text-gray-400" 
                            : "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
                        )}>
                          {activity.type === 'comment' && (
                            <div className="flex justify-between items-start mb-1">
                              <span className="font-medium text-sm text-gray-900 dark:text-white">
                                {activity.userName || 'User'}
                              </span>
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                {activity.createdAt?.toDate ? new Date(activity.createdAt.toDate()).toLocaleString() : 'Just now'}
                              </span>
                            </div>
                          )}
                          <p className={clsx(
                            "whitespace-pre-wrap",
                            activity.type === 'comment' ? "text-gray-700 dark:text-gray-300 text-sm" : ""
                          )}>
                            {activity.content}
                          </p>
                          {activity.type === 'system' && (
                            <div className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                              {activity.createdAt?.toDate ? new Date(activity.createdAt.toDate()).toLocaleString() : 'Just now'}
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <form onSubmit={handleAddComment} className="flex gap-2">
                  <input
                    type="text"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Add a comment..."
                    className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                  />
                  <button
                    type="submit"
                    disabled={!newComment.trim() || isSubmitting}
                    className="px-3 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 space-y-4">
                <div>
                  <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Status</h3>
                  <div className={clsx("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-sm font-medium", statusDisplay.color)}>
                    {statusDisplay.label}
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Priority</h3>
                  <div className={clsx("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-sm font-medium capitalize", priorityColors[task.priority])}>
                    <AlertCircle className="w-4 h-4" />
                    {task.priority}
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Created</h3>
                  <div className="flex items-center gap-1.5 text-sm text-gray-700 dark:text-gray-300">
                    <Calendar className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                    {task.createdAt?.toDate ? new Date(task.createdAt.toDate()).toLocaleString() : 'Just now'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
