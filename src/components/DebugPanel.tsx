import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { clearDebugLogs } from '../lib/logger';

interface DebugPanelProps {
  logs: any[];
  onHide: () => void;
  cardCount: number;
  catCount: number;
}

export default function DebugPanel({ logs, onHide, cardCount, catCount }: DebugPanelProps) {
  const [expandedLog, setExpandedLog] = useState<number | null>(null);
  const [deviceInfo, setDeviceInfo] = useState<any>(null);
  const [filter, setFilter] = useState<string | null>(null);

  const copyLogs = () => {
    const text = logs.map(l => `[${l.timestamp}] ${l.type.toUpperCase()}: ${l.msg} ${l.extra ? JSON.stringify(l.extra) : ''}`).join('\n');
    navigator.clipboard.writeText(text);
    alert('Logs copiati negli appunti');
  };
  
  useEffect(() => {
    setDeviceInfo({ 
      platform: 'web', 
      userAgent: navigator.userAgent,
      screen: `${window.innerWidth}x${window.innerHeight}`,
      timestamp: new Date().toISOString()
    });
  }, []);

  return (
    <motion.div 
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      className="fixed inset-0 z-[200] bg-[#050505] text-white p-6 overflow-y-auto font-mono text-[10px] select-text"
    >
      <div className="flex justify-between items-center mb-10 sticky top-0 bg-[#050505]/90 backdrop-blur-md py-4 z-10 border-b border-white/5">
        <div>
          <h2 className="text-xl font-bold text-orange-500 uppercase tracking-tighter">System Kernel</h2>
          <p className="text-[7px] opacity-40 uppercase tracking-widest">FireCard OS // Debug Shell (OFFLINE)</p>
        </div>
        <button onClick={onHide} className="px-6 py-2 bg-orange-600 text-white rounded-xl font-black text-[10px] uppercase transition-all active:scale-95 shadow-lg shadow-orange-600/20">Exit Console</button>
      </div>

      <div className="mb-12">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-pulse" />
          <h3 className="font-bold text-orange-400 uppercase text-[9px] tracking-[0.2em]">Local Metrics</h3>
        </div>
        
        <div className="space-y-2">
          {[
            { label: 'Storage Mode', value: 'IndexedDB (Local Only)', env: 'IDB' },
            { label: 'OCR Engine', value: 'Tesseract.js (Local)', env: 'WASM' },
            { label: 'Runtime Origin', value: window.location.origin, env: 'WEB' },
            { 
              label: 'Device Context', 
              value: deviceInfo ? `${deviceInfo.platform?.toUpperCase()}` : 'FETCHING...', 
              env: 'BROWSER',
              extra: deviceInfo
            },
            { label: 'Database Stats', value: `Cards: ${cardCount} // Categories: ${catCount}`, env: 'DATABASE' }
          ].map((item: any, i) => (
            <div key={i} className="bg-white/5 p-4 rounded-xl border border-white/5 hover:bg-white/10 transition-colors">
              <div className="flex justify-between items-center mb-2">
                <span className="opacity-30 uppercase text-[7px] font-bold tracking-widest">{item.label}</span>
                <span className="text-[6px] bg-white/10 px-1.5 py-0.5 rounded opacity-40 font-bold">{item.env}</span>
              </div>
              <p className="font-bold break-all select-all text-orange-100/90 text-[11px]">
                {item.value || 'NULL'}
              </p>
              {item.extra && (
                <div className="mt-2 text-[6px] opacity-20 bg-black/20 p-2 rounded max-h-20 overflow-auto">
                   {JSON.stringify(item.extra, null, 1)}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="mb-12">
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
              <h3 className="font-bold text-green-400 uppercase text-[9px] tracking-[0.2em]">System Call Stream</h3>
            </div>
            <div className="flex gap-2">
              <button onClick={copyLogs} className="px-3 py-1 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors uppercase text-[8px] font-bold">Copy</button>
              <button 
                onClick={() => {
                  clearDebugLogs();
                  onHide();
                }} 
                className="px-3 py-1 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg hover:bg-red-500/20 transition-colors uppercase text-[8px] font-bold"
              >
                Clear
              </button>
            </div>
          </div>
          
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
            {['all', 'info', 'request', 'response', 'error', 'local'].map(t => (
              <button 
                key={t}
                onClick={() => setFilter(t === 'all' ? null : t)}
                className={`px-3 py-1 rounded-full text-[7px] font-black uppercase tracking-tighter transition-all ${
                  (filter === t || (t === 'all' && !filter)) 
                    ? 'bg-white text-black' 
                    : 'bg-white/5 text-white/40 border border-white/5'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          {logs.slice().reverse().filter(l => !filter || l.type === filter).map((log, i) => (
            <div 
              key={i} 
              onClick={() => setExpandedLog(expandedLog === i ? null : i)}
              className={`p-4 rounded-xl cursor-pointer transition-all border ${
                log.type === 'error' ? 'bg-red-500/10 border-red-500/20 text-red-300' : 
                log.type === 'request' ? 'bg-blue-500/10 border-blue-500/20 text-blue-300' :
                log.type === 'response' ? 'bg-green-500/10 border-green-500/20 text-green-300' :
                'bg-white/5 border-white/5 text-white/70'
              }`}
            >
              <div className="flex justify-between items-center gap-4">
                <div className="flex items-center gap-3 overflow-hidden">
                  <span className="opacity-30 text-[8px] flex-shrink-0">[{log.timestamp}]</span>
                  <span className="font-bold truncate text-[10px] tracking-tight">{log.msg}</span>
                </div>
                <span className={`text-[7px] px-2 py-0.5 rounded-full uppercase font-black flex-shrink-0 ${
                  log.type === 'error' ? 'bg-red-500 text-white' : 
                  log.type === 'request' ? 'bg-blue-500 text-white' :
                  log.type === 'response' ? 'bg-green-500 text-white' :
                  'bg-white/20 text-white'
                }`}>
                  {log.type}
                </span>
              </div>
              
              {expandedLog === i && log.extra && (
                <div className="mt-4 pt-4 border-t border-white/10">
                  <pre className="text-[8px] opacity-60 leading-relaxed bg-black/40 p-3 rounded-lg overflow-x-auto whitespace-pre-wrap break-all">
                    {JSON.stringify(log.extra, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          ))}
          {logs.length === 0 && (
            <div className="py-20 text-center border-2 border-dashed border-white/5 rounded-3xl">
              <p className="opacity-20 uppercase tracking-[0.3em] font-black text-[8px]">Standby // No active streams</p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
