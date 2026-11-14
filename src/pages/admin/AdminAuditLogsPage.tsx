import React, { useState, useEffect } from 'react';
import { store } from '../../services/store';
import { AuditLog } from '../../types';
import { 
  ShieldAlert, 
  Search, 
  Clock, 
  User, 
  Tag, 
  RefreshCw, 
  ChevronDown, 
  ChevronRight,
  ShieldCheck
} from 'lucide-react';

export const AdminAuditLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEntity, setSelectedEntity] = useState<string>('ALL');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const loadData = () => {
    setLogs(store.getAuditLogs());
  };

  useEffect(() => {
    loadData();
    const unsub = store.subscribe(() => loadData());
    return unsub;
  }, []);

  const filteredLogs = logs.filter(log => {
    const matchesEntity = selectedEntity === 'ALL' || log.entityType === selectedEntity;
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q || (
      log.action.toLowerCase().includes(q) ||
      log.actorName.toLowerCase().includes(q) ||
      log.entityType.toLowerCase().includes(q) ||
      log.entityId.toLowerCase().includes(q)
    );
    return matchesEntity && matchesSearch;
  });

  const toggleExpand = (id: string) => {
    setExpandedLogId(expandedLogId === id ? null : id);
  };

  return (
    <div className="p-6 sm:p-8 space-y-6 max-w-7xl mx-auto pb-28">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-100 text-purple-900 text-xs font-bold mb-1">
            <ShieldCheck className="w-3.5 h-3.5 text-purple-700" />
            <span>Enterprise Security Audit Trail</span>
          </div>
          <h1 className="font-serif font-black text-3xl text-stone-900">
            Immutable Audit Trail
          </h1>
          <p className="text-stone-500 text-xs sm:text-sm mt-0.5">
            Cryptographically recorded operational actions, price alterations, status shifts, and logins
          </p>
        </div>

        <button
          onClick={loadData}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-white border border-stone-200 hover:bg-stone-50 text-stone-700 text-xs font-bold rounded-xl shadow-xs transition"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Audit Stream</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search action, actor, or entity..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-stone-200 bg-white text-stone-900 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500 transition shadow-xs"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 w-full sm:w-auto">
          {['ALL', 'ORDER', 'MENU_ITEM', 'CATEGORY', 'PAYMENT', 'USER', 'SETTING'].map((ent) => (
            <button
              key={ent}
              onClick={() => setSelectedEntity(ent)}
              className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                selectedEntity === ent
                  ? 'bg-temple-700 text-white shadow-xs'
                  : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-50'
              }`}
            >
              {ent}
            </button>
          ))}
        </div>
      </div>

      {/* Audit Log Entries List */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden divide-y divide-stone-100">
        {filteredLogs.length === 0 ? (
          <div className="p-8 text-center text-xs text-stone-500">
            No audit records found matching this criteria.
          </div>
        ) : (
          filteredLogs.map((log) => {
            const isExpanded = expandedLogId === log.id;

            return (
              <div key={log.id} className="p-4 hover:bg-cream-50/40 transition">
                <div
                  onClick={() => toggleExpand(log.id)}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <button className="text-stone-400 hover:text-stone-600">
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </button>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs text-temple-900">
                          {log.action}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-stone-100 text-stone-600">
                          {log.entityType}
                        </span>
                      </div>
                      <div className="text-xs text-stone-500 flex items-center gap-2 mt-0.5">
                        <User className="w-3 h-3 text-stone-400" />
                        <span>Actor: <strong>{log.actorName}</strong> {log.actorRole && `(${log.actorRole})`}</span>
                        <span>•</span>
                        <span>Entity ID: <code className="font-mono text-[10px]">{log.entityId}</code></span>
                      </div>
                    </div>
                  </div>

                  <div className="text-xs text-stone-400 font-mono flex items-center gap-1 sm:text-right">
                    <Clock className="w-3.5 h-3.5" />
                    <span>
                      {new Date(log.createdAt).toLocaleDateString('en-IN')}{' '}
                      {new Date(log.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  </div>
                </div>

                {/* Expanded JSON Diffs */}
                {isExpanded && (
                  <div className="mt-4 pt-3 border-t border-stone-100 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
                    <div className="bg-red-50/70 border border-red-200 rounded-xl p-3">
                      <div className="text-[10px] font-bold text-red-800 uppercase tracking-wider mb-1">
                        Previous State (Old Values)
                      </div>
                      <pre className="text-stone-800 overflow-x-auto text-[11px] whitespace-pre-wrap">
                        {log.oldValues ? JSON.stringify(log.oldValues, null, 2) : 'None (Created / Initial)'}
                      </pre>
                    </div>

                    <div className="bg-green-50/70 border border-green-200 rounded-xl p-3">
                      <div className="text-[10px] font-bold text-green-800 uppercase tracking-wider mb-1">
                        Committed State (New Values)
                      </div>
                      <pre className="text-stone-800 overflow-x-auto text-[11px] whitespace-pre-wrap">
                        {log.newValues ? JSON.stringify(log.newValues, null, 2) : 'None (Deleted)'}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
