import { create } from 'zustand';
import { LogEntry } from '../types';

interface LogsState {
  logs: LogEntry[];
  setLogs: (logs: LogEntry[]) => void;
  addLog: (log: LogEntry) => void;
  updateLog: (id: string, updatedLog: Partial<LogEntry>) => void;
  removeLog: (id: string) => void;
  clearLogs: () => void;
}

export const useLogsStore = create<LogsState>((set) => ({
  logs: [],
  setLogs: (logs) => set({ logs }),
  addLog: (log) => set((state) => ({ logs: [...state.logs, log] })),
  updateLog: (id, updatedLog) => set((state) => ({
    logs: state.logs.map(log => log.id === id ? { ...log, ...updatedLog } : log)
  })),
  removeLog: (id) => set((state) => ({
    logs: state.logs.filter(log => log.id !== id && (!log.nsId || log.nsId !== id) && (log as any)._id !== id)
  })),
  clearLogs: () => set({ logs: [] })
}));
