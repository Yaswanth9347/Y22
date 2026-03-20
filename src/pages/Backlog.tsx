import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Task, Sprint, Column } from '../types';
import { handleFirestoreError, OperationType } from '../utils/error';
import { logActivity } from '../utils/activity';
import { TaskCard } from '../components/TaskCard';
import { TaskModal } from '../components/TaskModal';
import { TaskViewModal } from '../components/TaskViewModal';
import { SprintModal } from '../components/SprintModal';
import { Plus, Play, CheckCircle2, Pencil } from 'lucide-react';

export function Backlog() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [columns, setColumns] = useState<Column[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isSprintModalOpen, setIsSprintModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [viewingTask, setViewingTask] = useState<Task | null>(null);
  const [editingSprint, setEditingSprint] = useState<Sprint | null>(null);
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [targetSprintIdForNewTask, setTargetSprintIdForNewTask] = useState<string | null>(null);

  useEffect(() => {
    if (!auth.currentUser) return;

    // Fetch tasks
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

    // Fetch sprints
    const qSprints = query(
      collection(db, 'sprints'),
      where('userId', '==', auth.currentUser.uid)
    );

    const unsubscribeSprints = onSnapshot(qSprints, (snapshot) => {
      const sprintsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Sprint[];
      
      sprintsData.sort((a, b) => {
        const timeA = a.createdAt?.toMillis?.() || 0;
        const timeB = b.createdAt?.toMillis?.() || 0;
        return timeA - timeB; // Oldest first
      });
      
      setSprints(sprintsData);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'sprints');
    });

    // Fetch columns
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
      unsubscribeTasks();
      unsubscribeSprints();
      unsubscribeColumns();
    };
  }, []);

  const handleSaveTask = async (taskData: Partial<Task>) => {
    if (!auth.currentUser) return;
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
          sprintId: targetSprintIdForNewTask,
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

  const handleCreateSprint = () => {
    setEditingSprint(null);
    setIsSprintModalOpen(true);
  };

  const handleEditSprint = (sprint: Sprint) => {
    setEditingSprint(sprint);
    setIsSprintModalOpen(true);
  };

  const handleSaveSprint = async (sprintData: Partial<Sprint>) => {
    if (!auth.currentUser) return;
    try {
      if (editingSprint) {
        await updateDoc(doc(db, 'sprints', editingSprint.id), sprintData);
      } else {
        await addDoc(collection(db, 'sprints'), {
          ...sprintData,
          status: 'future',
          userId: auth.currentUser.uid,
          createdAt: serverTimestamp(),
        });
      }
    } catch (error) {
      handleFirestoreError(error, editingSprint ? OperationType.UPDATE : OperationType.CREATE, 'sprints');
    }
  };

  const handleStartSprint = async (sprint: Sprint) => {
    try {
      const updates: Partial<Sprint> = { status: 'active' };
      
      if (!sprint.startDate || !sprint.endDate) {
        const startDate = new Date();
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + 6); // 6 days sprint
        updates.startDate = startDate;
        updates.endDate = endDate;
      }
      
      await updateDoc(doc(db, 'sprints', sprint.id), updates);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `sprints/${sprint.id}`);
    }
  };

  const handleCompleteSprint = async (sprintId: string) => {
    try {
      const sprintTasks = tasks.filter(t => t.sprintId === sprintId);
      const completedCount = sprintTasks.filter(t => t.status === 'done').length;
      const totalCount = sprintTasks.length;

      await updateDoc(doc(db, 'sprints', sprintId), {
        status: 'closed',
        totalTasks: totalCount,
        completedTasks: completedCount
      });
      
      const incompleteTasks = sprintTasks.filter(t => t.status !== 'done');
      for (const task of incompleteTasks) {
        await updateDoc(doc(db, 'tasks', task.id), {
          sprintId: null,
          status: 'todo'
        });
        await logActivity(task.id, auth.currentUser.uid, `Moved to Backlog (Sprint completed)`);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `sprints/${sprintId}`);
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

  const handleDrop = async (e: React.DragEvent, targetSprintId: string | null) => {
    e.preventDefault();
    if (!draggedTaskId || !auth.currentUser) return;

    const task = tasks.find(t => t.id === draggedTaskId);
    if (task && task.sprintId !== targetSprintId) {
      try {
        await updateDoc(doc(db, 'tasks', draggedTaskId), { sprintId: targetSprintId });
        
        const oldSprint = sprints.find(s => s.id === task.sprintId)?.name || 'Backlog';
        const newSprint = sprints.find(s => s.id === targetSprintId)?.name || 'Backlog';
        await logActivity(draggedTaskId, auth.currentUser.uid, `Moved from ${oldSprint} to ${newSprint}`);
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `tasks/${draggedTaskId}`);
      }
    }
    setDraggedTaskId(null);
  };

  const openModal = (sprintId: string | null = null, task?: Task) => {
    setTargetSprintIdForNewTask(sprintId);
    setEditingTask(task || null);
    setIsModalOpen(true);
  };

  const openViewModal = (task: Task) => {
    setViewingTask(task);
    setIsViewModalOpen(true);
  };

  const activeSprint = sprints.find(s => s.status === 'active');
  const futureSprints = sprints.filter(s => s.status === 'future');
  const backlogTasks = tasks.filter(t => !t.sprintId && t.status !== 'done');

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Backlog</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Plan your sprints and manage tasks</p>
        </div>
        <button
          onClick={handleCreateSprint}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        >
          Create Sprint
        </button>
      </div>

      {/* Active Sprint */}
      {activeSprint && (
        <div 
          className="bg-indigo-50/50 dark:bg-indigo-900/20 rounded-xl border border-indigo-100 dark:border-indigo-800/50 p-6 transition-colors"
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, activeSprint.id)}
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-indigo-900 dark:text-indigo-100 flex items-center gap-2">
                  {activeSprint.name}
                  <span className="bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 text-xs px-2 py-0.5 rounded-full">Active</span>
                </h2>
                <button
                  onClick={() => handleEditSprint(activeSprint)}
                  className="text-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-300 transition-colors"
                >
                  <Pencil className="w-4 h-4" />
                </button>
              </div>
              <p className="text-sm text-indigo-600/80 dark:text-indigo-300/80 mt-1">
                {activeSprint.startDate?.toDate ? new Date(activeSprint.startDate.toDate()).toLocaleDateString() : ''} - {activeSprint.endDate?.toDate ? new Date(activeSprint.endDate.toDate()).toLocaleDateString() : ''}
              </p>
            </div>
            <button
              onClick={() => handleCompleteSprint(activeSprint.id)}
              className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 text-white text-sm font-medium rounded hover:bg-indigo-700 transition-colors"
            >
              <CheckCircle2 className="w-4 h-4" />
              Complete Sprint
            </button>
          </div>
          
          <div className="space-y-3 min-h-[100px]">
            {tasks.filter(t => t.sprintId === activeSprint.id).map(task => (
              <TaskCard
                key={task.id}
                task={task}
                onEdit={(t) => openModal(activeSprint.id, t)}
                onDelete={handleDeleteTask}
                onView={openViewModal}
                onDragStart={handleDragStart}
              />
            ))}
            {tasks.filter(t => t.sprintId === activeSprint.id).length === 0 && (
              <div className="text-center py-8 text-indigo-400 dark:text-indigo-500 border-2 border-dashed border-indigo-200 dark:border-indigo-800/50 rounded-lg">
                Drag tasks here or create a new one
              </div>
            )}
          </div>
          <button
            onClick={() => openModal(activeSprint.id)}
            className="mt-4 flex items-center gap-2 text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium transition-colors"
          >
            <Plus className="w-4 h-4" /> Create task
          </button>
        </div>
      )}

      {/* Future Sprints */}
      {futureSprints.map(sprint => (
        <div 
          key={sprint.id} 
          className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 transition-colors"
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, sprint.id)}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{sprint.name}</h2>
              <button
                onClick={() => handleEditSprint(sprint)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                <Pencil className="w-4 h-4" />
              </button>
            </div>
            <div className="flex items-center gap-3">
              {(sprint.startDate || sprint.endDate) && (
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {sprint.startDate?.toDate ? new Date(sprint.startDate.toDate()).toLocaleDateString() : ''} - {sprint.endDate?.toDate ? new Date(sprint.endDate.toDate()).toLocaleDateString() : ''}
                </span>
              )}
              <button
                onClick={() => handleStartSprint(sprint)}
                disabled={!!activeSprint}
                className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title={activeSprint ? "Complete the active sprint first" : "Start this sprint"}
              >
                <Play className="w-4 h-4" />
                Start Sprint
              </button>
            </div>
          </div>
          
          <div className="space-y-3 min-h-[100px]">
            {tasks.filter(t => t.sprintId === sprint.id).map(task => (
              <TaskCard
                key={task.id}
                task={task}
                onEdit={(t) => openModal(sprint.id, t)}
                onDelete={handleDeleteTask}
                onView={openViewModal}
                onDragStart={handleDragStart}
              />
            ))}
            {tasks.filter(t => t.sprintId === sprint.id).length === 0 && (
              <div className="text-center py-8 text-gray-400 dark:text-gray-500 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
                Plan your sprint by dragging tasks here
              </div>
            )}
          </div>
          <button
            onClick={() => openModal(sprint.id)}
            className="mt-4 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 font-medium transition-colors"
          >
            <Plus className="w-4 h-4" /> Create task
          </button>
        </div>
      ))}

      {/* Backlog */}
      <div 
        className="bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 p-6 transition-colors"
        onDragOver={handleDragOver}
        onDrop={(e) => handleDrop(e, null)}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Backlog</h2>
        </div>
        
        <div className="space-y-3 min-h-[100px]">
          {backlogTasks.map(task => (
            <TaskCard
              key={task.id}
              task={task}
              onEdit={(t) => openModal(null, t)}
              onDelete={handleDeleteTask}
              onView={openViewModal}
              onDragStart={handleDragStart}
            />
          ))}
          {backlogTasks.length === 0 && (
            <div className="text-center py-8 text-gray-400 dark:text-gray-500 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
              Your backlog is empty
            </div>
          )}
        </div>
        <button
          onClick={() => openModal(null)}
          className="mt-4 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 font-medium transition-colors"
        >
          <Plus className="w-4 h-4" /> Create task
        </button>
      </div>

      <TaskModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveTask}
        initialData={editingTask}
        defaultStatus="todo"
      />

      <TaskViewModal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        task={viewingTask}
        onEdit={(t) => {
          setIsViewModalOpen(false);
          openModal(t.sprintId || null, t);
        }}
      />

      <SprintModal
        isOpen={isSprintModalOpen}
        onClose={() => setIsSprintModalOpen(false)}
        onSave={handleSaveSprint}
        initialData={editingSprint}
      />
    </div>
  );
}
