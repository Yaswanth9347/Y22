import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Task, TaskStatus, Sprint, Column } from '../types';
import { handleFirestoreError, OperationType } from '../utils/error';
import { logActivity } from '../utils/activity';
import { TaskCard } from '../components/TaskCard';
import { TaskModal } from '../components/TaskModal';
import { TaskViewModal } from '../components/TaskViewModal';
import { ColumnModal } from '../components/ColumnModal';
import { Plus, CheckCircle2, MoreVertical, Edit2, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';

const DEFAULT_COLUMNS = [
  { id: 'todo', name: 'To Do', order: 0 },
  { id: 'inprogress', name: 'In Progress', order: 1 },
  { id: 'done', name: 'Done', order: 2 },
];

export function Board() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [columns, setColumns] = useState<Column[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isColumnModalOpen, setIsColumnModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [viewingTask, setViewingTask] = useState<Task | null>(null);
  const [editingColumn, setEditingColumn] = useState<Column | null>(null);
  const [defaultStatus, setDefaultStatus] = useState<TaskStatus>('todo');
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);

  useEffect(() => {
    if (!auth.currentUser) return;

    const qTasks = query(
      collection(db, 'tasks'),
      where('userId', '==', auth.currentUser.uid)
    );

    const unsubscribeTasks = onSnapshot(qTasks, (snapshot) => {
      const tasksData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Task[];
      
      tasksData.sort((a, b) => {
        const timeA = a.createdAt?.toMillis?.() || 0;
        const timeB = b.createdAt?.toMillis?.() || 0;
        return timeB - timeA;
      });
      
      setTasks(tasksData);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'tasks');
    });

    const qSprints = query(
      collection(db, 'sprints'),
      where('userId', '==', auth.currentUser.uid),
      where('status', '==', 'active')
    );

    const unsubscribeSprints = onSnapshot(qSprints, (snapshot) => {
      const sprintsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Sprint[];
      setSprints(sprintsData);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'sprints');
    });

    const qColumns = query(
      collection(db, 'columns'),
      where('userId', '==', auth.currentUser.uid)
    );

    const unsubscribeColumns = onSnapshot(qColumns, async (snapshot) => {
      if (snapshot.empty && auth.currentUser) {
        // Initialize default columns
        try {
          for (const col of DEFAULT_COLUMNS) {
            await setDoc(doc(db, 'columns', col.id), {
              name: col.name,
              order: col.order,
              userId: auth.currentUser.uid,
              createdAt: serverTimestamp()
            });
          }
        } catch (error) {
          console.error("Failed to initialize default columns", error);
        }
      } else {
        const columnsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Column[];
        columnsData.sort((a, b) => a.order - b.order);
        setColumns(columnsData);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'columns');
    });

    return () => {
      unsubscribeTasks();
      unsubscribeSprints();
      unsubscribeColumns();
    };
  }, []);

  const activeSprint = sprints[0];
  const activeTasks = tasks.filter(t => t.sprintId === activeSprint?.id);

  const handleSaveTask = async (taskData: Partial<Task>) => {
    if (!auth.currentUser || !activeSprint) return;
    try {
      if (editingTask) {
        await updateDoc(doc(db, 'tasks', editingTask.id), taskData);
        
        // Log activity if status changed
        if (taskData.status && taskData.status !== editingTask.status) {
           const oldCol = columns.find(c => c.id === editingTask.status)?.name || editingTask.status;
           const newCol = columns.find(c => c.id === taskData.status)?.name || taskData.status;
           await logActivity(editingTask.id, auth.currentUser.uid, `Moved from ${oldCol} to ${newCol}`);
        }
        // Log activity if priority changed
        if (taskData.priority && taskData.priority !== editingTask.priority) {
           await logActivity(editingTask.id, auth.currentUser.uid, `Priority changed from ${editingTask.priority} to ${taskData.priority}`);
        }
      } else {
        const docRef = await addDoc(collection(db, 'tasks'), {
          ...taskData,
          sprintId: activeSprint.id,
          userId: auth.currentUser.uid,
          createdAt: serverTimestamp(),
        });
        await logActivity(docRef.id, auth.currentUser.uid, 'Task created');
      }
    } catch (error) {
      handleFirestoreError(error, editingTask ? OperationType.UPDATE : OperationType.CREATE, 'tasks');
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await deleteDoc(doc(db, 'tasks', taskId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `tasks/${taskId}`);
    }
  };

  const handleSaveColumn = async (columnData: Partial<Column>) => {
    if (!auth.currentUser) return;
    try {
      if (editingColumn) {
        await updateDoc(doc(db, 'columns', editingColumn.id), columnData);
      } else {
        await addDoc(collection(db, 'columns'), {
          ...columnData,
          order: columns.length,
          userId: auth.currentUser.uid,
          createdAt: serverTimestamp(),
        });
      }
    } catch (error) {
      handleFirestoreError(error, editingColumn ? OperationType.UPDATE : OperationType.CREATE, 'columns');
    }
  };

  const handleDeleteColumn = async (columnId: string) => {
    if (columns.length <= 1 || !auth.currentUser) return; // Prevent deleting the last column
    try {
      await deleteDoc(doc(db, 'columns', columnId));
      // Move tasks to the first available column
      const remainingColumn = columns.find(c => c.id !== columnId);
      if (remainingColumn) {
        const tasksToMove = tasks.filter(t => t.status === columnId);
        for (const task of tasksToMove) {
          await updateDoc(doc(db, 'tasks', task.id), { status: remainingColumn.id });
          await logActivity(task.id, auth.currentUser.uid, `Moved to ${remainingColumn.name} (Column deleted)`);
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `columns/${columnId}`);
    }
  };

  const openColumnModal = (column?: Column) => {
    setEditingColumn(column || null);
    setIsColumnModalOpen(true);
  };

  const handleCompleteSprint = async () => {
    if (!activeSprint || !auth.currentUser) return;
    try {
      const completedCount = activeTasks.filter(t => t.status === 'done').length;
      const totalCount = activeTasks.length;

      await updateDoc(doc(db, 'sprints', activeSprint.id), {
        status: 'closed',
        totalTasks: totalCount,
        completedTasks: completedCount
      });
      
      const incompleteTasks = activeTasks.filter(t => t.status !== 'done');
      for (const task of incompleteTasks) {
        await updateDoc(doc(db, 'tasks', task.id), {
          sprintId: null,
          status: 'todo'
        });
        await logActivity(task.id, auth.currentUser.uid, `Moved to Backlog (Sprint completed)`);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `sprints/${activeSprint.id}`);
    }
  };

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    setDraggedTaskId(taskId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', taskId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, status: TaskStatus) => {
    e.preventDefault();
    if (!draggedTaskId || !auth.currentUser) return;

    const task = tasks.find(t => t.id === draggedTaskId);
    if (task && task.status !== status) {
      try {
        await updateDoc(doc(db, 'tasks', draggedTaskId), { status });
        const oldCol = columns.find(c => c.id === task.status)?.name || task.status;
        const newCol = columns.find(c => c.id === status)?.name || status;
        await logActivity(draggedTaskId, auth.currentUser.uid, `Moved from ${oldCol} to ${newCol}`);
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `tasks/${draggedTaskId}`);
      }
    }
    setDraggedTaskId(null);
  };

  const openModal = (status: TaskStatus = 'todo', task?: Task) => {
    setDefaultStatus(status);
    setEditingTask(task || null);
    setIsModalOpen(true);
  };

  const openViewModal = (task: Task) => {
    setViewingTask(task);
    setIsViewModalOpen(true);
  };

  if (!activeSprint) {
    return (
      <div className="p-6 max-w-7xl mx-auto h-[calc(100vh-64px)] flex flex-col items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">No Active Sprint</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-6">Start a sprint from the backlog to see your board.</p>
          <Link
            to="/backlog"
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 transition-colors"
          >
            Go to Backlog
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto h-[calc(100vh-64px)] flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{activeSprint.name}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {activeSprint.startDate?.toDate ? new Date(activeSprint.startDate.toDate()).toLocaleDateString() : ''} - {activeSprint.endDate?.toDate ? new Date(activeSprint.endDate.toDate()).toLocaleDateString() : ''}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleCompleteSprint}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            <CheckCircle2 className="w-4 h-4" />
            Complete Sprint
          </button>
          <button
            onClick={() => openModal('todo')}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Task
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-x-auto">
        <div className="flex gap-6 h-full min-w-max pb-4">
          {columns.map((col) => (
            <div
              key={col.id}
              className="w-80 flex flex-col bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 transition-colors"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, col.id)}
            >
              <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-gray-100/50 dark:bg-gray-800 rounded-t-xl group">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-gray-700 dark:text-gray-200">{col.name}</h3>
                  <span className="bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs font-medium px-2 py-1 rounded-full">
                    {activeTasks.filter(t => t.status === col.id).length}
                  </span>
                </div>
                <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => openColumnModal(col)}
                    className="p-1 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  {columns.length > 1 && (
                    <button
                      onClick={() => handleDeleteColumn(col.id)}
                      className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
              
              <div className="flex-1 p-3 overflow-y-auto space-y-3">
                {activeTasks
                  .filter(t => t.status === col.id)
                  .map(task => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onEdit={(t) => openModal(t.status, t)}
                      onDelete={handleDeleteTask}
                      onView={openViewModal}
                      onDragStart={handleDragStart}
                    />
                  ))}
                
                <button
                  onClick={() => openModal(col.id)}
                  className="w-full py-2 flex items-center justify-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg border border-dashed border-gray-300 dark:border-gray-600 hover:border-indigo-300 dark:hover:border-indigo-500 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add Task
                </button>
              </div>
            </div>
          ))}
          
          <div className="w-80 flex-shrink-0">
            <button
              onClick={() => openColumnModal()}
              className="w-full h-12 flex items-center justify-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl border border-dashed border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-500 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Column
            </button>
          </div>
        </div>
      </div>

      <TaskModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveTask}
        initialData={editingTask}
        defaultStatus={defaultStatus}
      />

      <TaskViewModal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        task={viewingTask}
        onEdit={(t) => {
          setIsViewModalOpen(false);
          openModal(t.status, t);
        }}
      />

      <ColumnModal
        isOpen={isColumnModalOpen}
        onClose={() => setIsColumnModalOpen(false)}
        onSave={handleSaveColumn}
        initialData={editingColumn}
      />
    </div>
  );
}
