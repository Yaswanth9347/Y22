export type TaskStatus = string;
export type TaskPriority = 'low' | 'medium' | 'high';

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  createdAt: any;
  userId: string;
  sprintId?: string | null;
}

export type SprintStatus = 'future' | 'active' | 'closed';

export interface Sprint {
  id: string;
  name: string;
  startDate: any | null;
  endDate: any | null;
  status: SprintStatus;
  userId: string;
  createdAt: any;
  totalTasks?: number;
  completedTasks?: number;
}

export interface Column {
  id: string;
  name: string;
  order: number;
  userId: string;
  createdAt: any;
}

export interface Activity {
  id: string;
  taskId: string;
  userId: string;
  userName?: string;
  type: 'comment' | 'system';
  content: string;
  createdAt: any;
}
