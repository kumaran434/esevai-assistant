
import React, { useEffect, useState } from 'react';
import { db, auth } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot, limit } from 'firebase/firestore';
import { Terminal, AlertCircle, Clock, RefreshCw, Send, Copy, Check } from 'lucide-react';
import { reportAppError } from '../lib/firebase-utils';

export default function AdminLogs() {
  const [logs, setLogs] = useState<any[]>([]);
  const [isTestLoading, setIsTestLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyLog = (log: any) => {
    const mainText = log.message || log.error || 'No message';
    const text = `Context: ${log.context}\nLog: ${mainText}\nStack: ${log.stack || 'N/A'}\nURL: ${log.url}\nTime: ${new Date(log.timestamp).toLocaleString()}`;
    navigator.clipboard.writeText(text);
    setCopiedId(log.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const sendTestLog = async () => {
    setIsTestLoading(true);
    try {
      await reportAppError("Manual Test Log Issued", "User Manual Test", "activity");
      alert("டெஸ்ட் லாக் வெற்றிகரமாக அனுப்பப்பட்டது! பட்டியலில் வருகிறதா என்று பார்க்கவும்.");
    } catch (e) {
      alert("டெஸ்ட் அனுப்புவதில் பிழை.");
    } finally {
      setIsTestLoading(false);
    }
  };

  useEffect(() => {
    // Admin logs are now managed locally for stability
    const getLocalLogs = () => {
      try {
        const data = localStorage.getItem('app_logs');
        return data ? JSON.parse(data) : [];
      } catch (e) {
        return [];
      }
    };

    setLogs(getLocalLogs());
    
    // Polling mock
    const interval = setInterval(() => {
      setLogs(getLocalLogs());
    }, 2000);
    
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-8 bg-slate-50 min-h-screen font-sans">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-slate-900 text-white rounded-2xl">
              <Terminal size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900">AI Diagnostic Logs</h1>
              <p className="text-sm text-slate-500 font-bold uppercase tracking-widest">Real-time system tracking</p>
            </div>
          </div>
          
          <button 
            onClick={sendTestLog}
            disabled={isTestLoading}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-blue-700 transition-all disabled:opacity-50"
          >
            {isTestLoading ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
            Send Test Log
          </button>
        </div>

        <div className="space-y-4">
          {logs.map((log) => (
            <div key={log.id} className={`bg-white border-2 rounded-3xl p-6 shadow-sm transition-all ${log.type === 'activity' ? 'border-blue-100 hover:border-blue-200' : 'border-slate-200 hover:border-red-200'}`}>
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl ${log.type === 'activity' ? 'bg-blue-100 text-blue-600' : 'bg-red-100 text-red-600'}`}>
                    {log.type === 'activity' ? <Clock size={20} /> : <AlertCircle size={20} />}
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900">{log.context}</h3>
                    <p className={`${log.type === 'activity' ? 'text-blue-500' : 'text-red-500'} text-xs font-bold font-mono uppercase tracking-tighter`}>
                      {log.message || log.error}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-slate-400 text-[10px] font-bold">
                  {new Date(log.timestamp).toLocaleString()}
                  <button 
                    onClick={() => copyLog(log)}
                    className="ml-2 p-2 hover:bg-slate-100 rounded-lg transition-all"
                    title="Copy Full log"
                  >
                    {copiedId === log.id ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
                  </button>
                </div>
              </div>
              {log.type === 'error' && (
                <div className="bg-slate-900 rounded-2xl p-4 overflow-x-auto">
                  <code className="text-[10px] text-blue-400 block whitespace-pre">
                    {log.stack || 'No stack available'}
                  </code>
                </div>
              )}
              <div className="mt-4 pt-4 border-t border-slate-100 flex gap-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">
                <span>URL: {log.url}</span>
                <span>User: {log.userId}</span>
              </div>
            </div>
          ))}
          {logs.length === 0 && (
            <div className="text-center py-20 bg-white rounded-[3rem] border-2 border-dashed border-slate-200">
              <p className="text-slate-400 font-bold">No errors logged yet. System is healthy!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
