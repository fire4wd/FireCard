
type LogType = 'info' | 'error' | 'request' | 'response';

interface LogEntry {
  timestamp: string;
  msg: string;
  type: LogType;
  extra?: any;
}

const globalLogs: LogEntry[] = [];

export const getDebugLogs = () => [...globalLogs];

export const clearDebugLogs = () => {
  globalLogs.length = 0;
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('firecard-debug-log-sync'));
  }
};

export const addDebugLog = (msg: string, type: LogType = 'info', extra?: any) => {
  const newLog: LogEntry = { 
    timestamp: new Date().toLocaleTimeString(), 
    msg, 
    type, 
    extra 
  };
  
  globalLogs.push(newLog);
  if (globalLogs.length > 200) globalLogs.shift();
  
  console.log(`[DEBUG] ${type.toUpperCase()}: ${msg}`, extra || '');
  
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('firecard-debug-log-sync', { detail: newLog }));
  }
};
