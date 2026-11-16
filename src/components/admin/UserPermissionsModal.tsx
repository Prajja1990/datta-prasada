import React, { useState } from 'react';
import { UserProfile, PermissionKey } from '../../types';
import { SYSTEM_PERMISSIONS, PermissionDefinition } from '../../services/auth';
import { 
  ShieldCheck, 
  X, 
  Check, 
  Minus, 
  Search, 
  Crown, 
  ChefHat, 
  Store, 
  UserCheck, 
  User as UserIcon,
  AlertCircle,
  Key,
  Info
} from 'lucide-react';

interface UserPermissionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile | null;
}

export const UserPermissionsModal: React.FC<UserPermissionsModalProps> = ({
  isOpen,
  onClose,
  user,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeDomainFilter, setActiveDomainFilter] = useState<string>('ALL');

  if (!isOpen || !user) return null;

  const userRole = user.roles[0];
  const userPermsSet = new Set<string>(user.permissions);

  // Domains
  const domains = Array.from(new Set(SYSTEM_PERMISSIONS.map(p => p.domain)));

  // Filter permissions
  const filteredPerms = SYSTEM_PERMISSIONS.filter(p => {
    const matchesDomain = activeDomainFilter === 'ALL' || p.domain === activeDomainFilter;
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q || (
      p.name.toLowerCase().includes(q) ||
      p.key.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      p.domain.toLowerCase().includes(q)
    );
    return matchesDomain && matchesSearch;
  });

  // Group by domain
  const groupedPerms: Record<string, PermissionDefinition[]> = {};
  filteredPerms.forEach(p => {
    if (!groupedPerms[p.domain]) groupedPerms[p.domain] = [];
    groupedPerms[p.domain].push(p);
  });

  const isCounterStaff = userRole === 'STAFF';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full p-6 sm:p-8 space-y-5 border border-gold-300 my-8 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-100 pb-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gold-100 text-gold-800 flex items-center justify-center shrink-0 border border-gold-300">
              <ShieldCheck className="w-6 h-6 text-gold-700" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1 text-[10px] font-bold text-temple-800 bg-cream-100 px-2 py-0.5 rounded-full mb-0.5">
                <span>RBAC Privilege Audit</span>
              </div>
              <h2 className="font-serif font-black text-2xl text-stone-900 leading-tight">
                System Permissions: {user.fullName}
              </h2>
              <p className="text-xs text-stone-500">
                {user.email} • Role: <strong className="text-temple-800">{userRole.replace('_', ' ')}</strong> ({user.permissions.length} of {SYSTEM_PERMISSIONS.length} capabilities granted)
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Counter staff policy banner */}
        {isCounterStaff && (
          <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs flex items-center gap-2.5 shrink-0">
            <Info className="w-4 h-4 text-blue-600 shrink-0" />
            <div>
              <strong>Counter Staff Operational Rule:</strong> Overview analytics (<code className="font-mono text-[11px] bg-blue-100 px-1 py-0.5 rounded">dashboard.view</code>) is intentionally restricted. Counter staff are exclusively authorized to manage live orders (<code className="font-mono text-[11px] bg-blue-100 px-1 py-0.5 rounded">orders.view_all</code>), advance order tickets, print receipts, and accept payments.
            </div>
          </div>
        )}

        {/* Search and Domain Filters */}
        <div className="space-y-2.5 shrink-0">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-stone-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search permissions by key (e.g. orders, dashboard, menu) or description..."
              className="w-full pl-9 pr-4 py-2 rounded-xl text-xs bg-stone-50 border border-stone-200 focus:outline-none focus:ring-2 focus:ring-gold-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-2 text-stone-400 hover:text-stone-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            <button
              onClick={() => setActiveDomainFilter('ALL')}
              className={`px-3 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition ${
                activeDomainFilter === 'ALL'
                  ? 'bg-temple-700 text-white'
                  : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
              }`}
            >
              All Domains ({SYSTEM_PERMISSIONS.length})
            </button>
            {domains.map(d => (
              <button
                key={d}
                onClick={() => setActiveDomainFilter(d)}
                className={`px-3 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition ${
                  activeDomainFilter === d
                    ? 'bg-temple-700 text-white'
                    : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        {/* Permissions list grouped by domain (scrollable) */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {Object.keys(groupedPerms).length === 0 ? (
            <div className="p-8 text-center text-stone-400 text-xs">
              No system permissions match your search query.
            </div>
          ) : (
            Object.entries(groupedPerms).map(([domain, perms]) => {
              const domainGrantedCount = perms.filter(p => userPermsSet.has(p.key)).length;

              return (
                <div key={domain} className="border border-stone-200 rounded-2xl overflow-hidden bg-white shadow-xs">
                  <div className="bg-stone-50 px-4 py-2.5 border-b border-stone-200 flex items-center justify-between">
                    <span className="font-bold text-xs text-stone-900 uppercase tracking-wide">
                      {domain}
                    </span>
                    <span className="text-[11px] font-mono font-bold text-stone-500">
                      {domainGrantedCount} of {perms.length} granted
                    </span>
                  </div>

                  <div className="divide-y divide-stone-100">
                    {perms.map((p) => {
                      const isGranted = userPermsSet.has(p.key);

                      return (
                        <div
                          key={p.key}
                          className={`p-3.5 flex items-start gap-3 transition ${
                            isGranted ? 'bg-cream-50/30' : 'bg-stone-50/30 opacity-60'
                          }`}
                        >
                          <div
                            className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                              isGranted
                                ? 'bg-green-100 text-green-700 font-bold'
                                : 'bg-stone-200 text-stone-400'
                            }`}
                          >
                            {isGranted ? <Check className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center justify-between gap-1">
                              <span className="font-bold text-xs text-stone-900">{p.name}</span>
                              <span className="font-mono text-[10px] text-stone-500 bg-stone-100 px-2 py-0.5 rounded border border-stone-200">
                                {p.key}
                              </span>
                            </div>
                            <p className="text-[11px] text-stone-600 mt-0.5 leading-relaxed">
                              {p.description}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-stone-100 flex items-center justify-between shrink-0 text-xs text-stone-500">
          <div>
            Active Status: <span className="font-bold text-green-700">{user.isActive ? 'Active User' : 'Deactivated'}</span>
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-temple-700 hover:bg-temple-800 text-white font-bold text-xs transition"
          >
            Close Viewer
          </button>
        </div>
      </div>
    </div>
  );
};
