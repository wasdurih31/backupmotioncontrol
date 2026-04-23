import { create } from 'zustand';

export type UserRole = 'user' | 'admin';

export interface User {
  id: string;
  email: string;
  accessCode: string;
  role: UserRole;
  apiKey: string | null;
}

export type TaskStatus = 'queued' | 'processing' | 'success' | 'failed';

export interface Task {
  id: string;
  status: TaskStatus;
  prompt?: string;
  characterOrientation?: 'video' | 'image';
  cfgScale?: number;
  createdAt: Date;
  downloadUrl?: string;
  expiresAt?: Date;
}

interface MockStoreState {
  user: User | null;
  tasks: Task[];
  generateCount: number;
  login: (email: string, accessCode: string) => Promise<boolean>;
  adminLogin: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  setApiKey: (key: string) => void;
  addTask: (task: Omit<Task, 'id' | 'createdAt' | 'status'>) => void;
  updateTaskStatus: (id: string, status: TaskStatus, downloadUrl?: string) => void;
}

// Dummy mock data for initial tasks
const initialTasks: Task[] = [
  {
    id: 'TASK-1001',
    status: 'success',
    prompt: 'Cinematic wide shot of a futuristic city at night, neon lights reflecting on wet streets.',
    characterOrientation: 'video',
    cfgScale: 0.5,
    createdAt: new Date(Date.now() - 1000 * 60 * 5), // 5 mins ago
    downloadUrl: '#',
    expiresAt: new Date(Date.now() + 1000 * 60 * 5), // expires in 5 mins
  },
  {
    id: 'TASK-1002',
    status: 'processing',
    prompt: 'A sleek black sports car driving through a desert highway.',
    characterOrientation: 'image',
    cfgScale: 0.7,
    createdAt: new Date(),
  },
];

export const useMockStore = create<MockStoreState>((set, get) => ({
  user: null, // Start logged out
  tasks: initialTasks,
  generateCount: 42,

  login: async (email, accessCode) => {
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    
    // Mock validation for normal user
    if (accessCode.startsWith('KEY-')) {
      set({
        user: {
          id: `USR-${Math.floor(Math.random() * 10000)}`,
          email,
          accessCode,
          role: 'user',
          apiKey: null,
        },
      });
      return true;
    }
    return false;
  },

  adminLogin: async (username, password) => {
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    
    if (username === 'admin' && password === 'universe2026') {
      set({
        user: {
          id: `ADM-001`,
          email: username, // using username as email field for UI consistency
          accessCode: 'ADMIN-ACCESS',
          role: 'admin',
          apiKey: null,
        },
      });
      return true;
    }
    return false;
  },

  logout: () => {
    set({ user: null });
  },

  setApiKey: (key) => {
    set((state) => ({
      user: state.user ? { ...state.user, apiKey: key } : null,
    }));
  },

  addTask: (taskData) => {
    const newTask: Task = {
      ...taskData,
      id: `TASK-${Math.floor(Math.random() * 10000)}`,
      status: 'queued',
      createdAt: new Date(),
    };
    
    set((state) => ({
      tasks: [newTask, ...state.tasks],
      generateCount: state.generateCount + 1,
    }));

    // Simulate progress
    setTimeout(() => {
      get().updateTaskStatus(newTask.id, 'processing');
    }, 2000);

    setTimeout(() => {
      get().updateTaskStatus(newTask.id, 'success', '#');
    }, 10000); // 10 seconds to complete
  },

  updateTaskStatus: (id, status, downloadUrl) => {
    set((state) => ({
      tasks: state.tasks.map((t) => 
        t.id === id 
          ? { 
              ...t, 
              status, 
              downloadUrl, 
              expiresAt: status === 'success' ? new Date(Date.now() + 1000 * 60 * 10) : t.expiresAt // 10 mins expiry
            } 
          : t
      ),
    }));
  },
}));
