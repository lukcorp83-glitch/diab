import { create } from 'zustand';
import { LogEntry } from '../types';

interface LogsState {
  logs: LogEntry[];
  setLogs: (logs: LogEntry[]) => void;
  addLog: (log: LogEntry) => void;
  addLogs: (newLogs: LogEntry[]) => void;
  updateLog: (id: string, updatedLog: Partial<LogEntry>) => void;
  removeLog: (id: string) => void;
  clearLogs: () => void;
}

export const useLogsStore = create<LogsState>((set) => ({
  logs: [],
  setLogs: (logs) => set((state) => {
    if (state.logs === logs) return state;
    if (state.logs.length === logs.length) {
      let identical = true;
      for (let i = 0; i < logs.length; i++) {
        const a = state.logs[i];
        const b = logs[i];
        if (a === b) continue;
        const aId = a.id || a.nsId || (a as any)._id;
        const bId = b.id || b.nsId || (b as any)._id;
        if (aId !== bId || a.timestamp !== b.timestamp || a.value !== b.value) {
          identical = false;
          break;
        }
      }
      if (identical) return state;
    }
    return { logs };
  }),
  addLog: (log) => set((state) => ({ logs: [...state.logs, log] })),
  addLogs: (newLogs) => set((state) => {
    if (!newLogs || newLogs.length === 0) return state;
    const existingIds = new Set(state.logs.map(l => l.id || l.nsId || (l as any)._id).filter(Boolean));
    const filteredNew = newLogs.filter(l => {
      const id = l.id || l.nsId || (l as any)._id;
      return !id || !existingIds.has(id);
    });
    if (filteredNew.length === 0) return state;
    return {
      logs: [...filteredNew, ...state.logs].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
    };
  }),
  updateLog: (id, updatedLog) => set((state) => ({
    logs: state.logs.map(log => log.id === id ? { ...log, ...updatedLog } : log)
  })),
  removeLog: (id) => set((state) => ({
    logs: state.logs.filter(log => log.id !== id && (!log.nsId || log.nsId !== id) && (log as any)._id !== id)
  })),
  clearLogs: () => set({ logs: [] })
}));
