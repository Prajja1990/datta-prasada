import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
  SYSTEM_PERMISSIONS, 
  ROLE_PERMISSIONS_MAP, 
  PermissionDefinition 
} from '../../services/auth';
import { store } from '../../services/store';
import { UserRoleType, PermissionKey } from '../../types';
import { 
  ShieldCheck, 
  Search, 
  Check, 
  Minus, 
  Crown, 
  ChefHat, 
  Store, 
  UserCheck, 
  User as UserIcon,
  Info,
  Layers,
  Table as TableIcon,
  RotateCcw,
  Sparkles,
  AlertTriangle,
  X,
  Sliders,
  Filter
} from 'lucide-react';

const ROLES_LIST: {
  role: UserRoleType;
  title: string;
  badge: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  activeBg: string;
  toggleBg: string;
}[] = [
  {
    role: 'SUPER_ADMIN',
    title: 'Super Admin',
    badge: 'Owner',
    icon: Crown,
    color: 'text-purple-700 bg-purple-100 border-purple-300',
    activeBg: 'bg-purple-50 text-purple-900 border-purple-300 hover:bg-purple-100',
    toggleBg: 'bg-purple-600',
  },
  {
    role: 'ADMIN',
    title: 'Restaurant Admin',
    badge: 'Manager',
    icon: UserCheck,
    color: 'text-amber-800 bg-amber-100 border-amber-300',
    activeBg: 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100',
    toggleBg: 'bg-amber-600',
  },
  {
    role: 'STAFF',
    title: 'Counter Staff',
    badge: 'Cashier / Billing',
    icon: Store,
    color: 'text-blue-800 bg-blue-100 border-blue-300',
    activeBg: 'bg-blue-50 text-blue-900 border-blue-300 hover:bg-blue-100',
    toggleBg: 'bg-blue-600',
  },
  {
    role: 'KITCHEN_STAFF',
    title: 'Kitchen Chef',
    badge: 'KDS Cook',
    icon: ChefHat,
    color: 'text-orange-800 bg-orange-100 border-orange-300',
    activeBg: 'bg-orange-50 text-orange-900 border-orange-300 hover:bg-orange-100',
    toggleBg: 'bg-orange-600',
  },
  {
    role: 'CUSTOMER',
    title: 'Customer',
    badge: 'Guest',
    icon: UserIcon,
    color: 'text-emerald-800 bg-emerald-100 border-emerald-300',
    activeBg: 'bg-emerald-50 text-emerald-900 border-emerald-300 hover:bg-emerald-100',
    toggleBg: 'bg-emerald-600',
  },
];

export const AdminPermissionsPage: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'MATRIX' | 'DIRECTORY'>('MATRIX');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDomain, setSelectedDomain] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ENABLED_ONLY' | 'RESTRICTED_ONLY'>('ALL');
  
  // Dynamic Role Permissions Matrix loaded from persistent store
  const [matrix, setMatrix] = useState<Record<UserRoleType, PermissionKey[]>>(() => store.getRolePermissionsMap());
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [showResetModal, setShowResetModal] = useState(false);

  // Sync state when store emits update
  useEffect(() => {
    const unsub = store.subscribe((type) => {
      if (type === 'ROLE_PERMISSIONS_UPDATED') {
        setMatrix(store.getRolePermissionsMap());
      }
    });
    return unsub;
  }, []);

  // Auto-dismiss toast
  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => setToastMessage(null), 4500);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  const domains = Array.from(new Set(SYSTEM_PERMISSIONS.map(p => p.domain)));

  // Filtered permissions
  const filteredPermissions = SYSTEM_PERMISSIONS.filter((p) => {
    const matchesDomain = selectedDomain === 'ALL' || p.domain === selectedDomain;
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q || (
      p.name.toLowerCase().includes(q) ||
      p.key.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      p.domain.toLowerCase().includes(q)
    );
    return matchesDomain && matchesSearch;
  });

  const handleToggle = (role: UserRoleType, permissionKey: PermissionKey, nextState: boolean) => {
    const actor = {
      name: user?.fullName || 'Super Admin',
      role: user?.roles[0] || 'SUPER_ADMIN',
    };

    const res = store.toggleRolePermission(role, permissionKey, nextState, actor);
    if (!res.success) {
      setToastMessage({
        type: 'error',
        text: res.error || 'Failed to update privilege.',
      });
      return;
    }

    const roleInfo = ROLES_LIST.find(r => r.role === role);
    const permInfo = SYSTEM_PERMISSIONS.find(p => p.key === permissionKey);
    setToastMessage({
      type: 'success',
      text: `${nextState ? 'Enabled' : 'Disabled'} "${permInfo?.name || permissionKey}" for ${roleInfo?.title || role}.`,
    });
    setMatrix(store.getRolePermissionsMap());
  };

  const handleResetToDefault = () => {
    const actor = {
      name: user?.fullName || 'Super Admin',
      role: user?.roles[0] || 'SUPER_ADMIN',
    };
    const res = store.resetRolePermissionsToDefault(actor);
    if (res.success) {
      setMatrix(store.getRolePermissionsMap());
      setToastMessage({
        type: 'info',
        text: 'System Permissions & Privilege Matrix reset to factory defaults.',
      });
      setShowResetModal(false);
    } else {
      setToastMessage({
        type: 'error',
        text: res.error || 'Failed to reset privileges.',
      });
    }
  };

  return (
    <div className="p-6 sm:p-8 space-y-6 max-w-7xl mx-auto pb-28 animate-fadeIn">
      {/* Toast Notification */}
      {toastMessage && (
        <div className={`p-4 rounded-2xl border shadow-md flex items-center justify-between gap-3 text-xs font-semibold animate-slideDown ${
          toastMessage.type === 'success' 
            ? 'bg-emerald-50 text-emerald-900 border-emerald-300' 
            : toastMessage.type === 'error'
            ? 'bg-red-50 text-red-900 border-red-300'
            : 'bg-blue-50 text-blue-900 border-blue-300'
        }`}>
          <div className="flex items-center gap-2">
            {toastMessage.type === 'success' && <Check className="w-4 h-4 text-emerald-600 shrink-0" />}
            {toastMessage.type === 'error' && <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />}
            {toastMessage.type === 'info' && <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />}
            <span>{toastMessage.text}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="p-1 hover:opacity-75">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-5">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gold-100 text-gold-900 text-xs font-bold mb-1.5 border border-gold-300">
            <ShieldCheck className="w-3.5 h-3.5 text-gold-700" />
            <span>Interactive RBAC Privilege Matrix</span>
          </div>
          <h1 className="font-serif font-black text-3xl text-stone-900">
            System Permissions & Privilege Matrix
          </h1>
          <p className="text-stone-500 text-xs sm:text-sm mt-0.5">
            Enable or disable granular operational privileges for each system role with real-time enforcement
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => setShowResetModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border border-stone-300 bg-white text-stone-700 hover:bg-stone-50 hover:text-stone-900 transition shadow-xs active:scale-95"
            title="Reset role permissions to initial factory defaults"
          >
            <RotateCcw className="w-3.5 h-3.5 text-stone-500" />
            <span>Reset Defaults</span>
          </button>

          {/* View Toggle */}
          <div className="flex items-center p-1 rounded-2xl bg-stone-200 border border-stone-300">
            <button
              onClick={() => setActiveTab('MATRIX')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                activeTab === 'MATRIX'
                  ? 'bg-white text-temple-900 shadow-sm'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5 text-gold-600" />
              <span>RBAC Matrix</span>
            </button>

            <button
              onClick={() => setActiveTab('DIRECTORY')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                activeTab === 'DIRECTORY'
                  ? 'bg-white text-temple-900 shadow-sm'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-gold-600" />
              <span>Catalogue</span>
            </button>
          </div>
        </div>
      </div>

      {/* Interactive Guidance Banner */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-cream-100 via-gold-50 to-cream-100 border border-gold-300/80 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-stone-800">
        <div className="flex items-start sm:items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gold-200 text-gold-900 flex items-center justify-center shrink-0 border border-gold-400">
            <Sliders className="w-5 h-5 text-gold-800" />
          </div>
          <div>
            <div className="font-bold text-sm text-stone-900">
              Interactive Privilege Controls Enabled
            </div>
            <p className="text-stone-600 text-xs mt-0.5">
              Click any switch in the matrix table below to toggle capabilities ON or OFF for that role. Changes sync instantly across all active sessions, POS billing terminals, and Kitchen displays.
            </p>
          </div>
        </div>
      </div>

      {/* Role Counts Summary Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {ROLES_LIST.map((r) => {
          const perms = matrix[r.role] || [];
          const Icon = r.icon;
          const count = perms.length;
          const pct = Math.round((count / SYSTEM_PERMISSIONS.length) * 100);

          return (
            <div key={r.role} className="bg-white p-3.5 rounded-2xl border border-stone-200 shadow-xs space-y-1 hover:border-gold-300 transition">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">{r.badge}</span>
                <Icon className="w-4 h-4 text-stone-400" />
              </div>
              <div className="font-bold text-xs text-stone-800 truncate">{r.title}</div>
              <div className="flex items-baseline justify-between">
                <div className="text-xl font-serif font-black text-stone-900">
                  {count} <span className="text-[11px] font-sans font-normal text-stone-400">/ 27</span>
                </div>
                <span className="text-[11px] font-semibold text-stone-500">{pct}%</span>
              </div>
              {/* Mini progress track */}
              <div className="w-full bg-stone-100 h-1.5 rounded-full overflow-hidden mt-1">
                <div 
                  className={`h-full ${r.toggleBg}`} 
                  style={{ width: `${pct}%` }} 
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Search & Domain Filter Bar */}
      <div className="bg-white p-3.5 rounded-2xl border border-stone-200 shadow-xs space-y-2.5">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-stone-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search permissions by name, key (e.g., dashboard, orders, menu), or domain..."
            className="w-full pl-9 pr-4 py-2 rounded-xl text-xs bg-stone-50 border border-stone-200 focus:outline-none focus:ring-2 focus:ring-gold-500"
          />
        </div>

        {/* Domain Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <button
            onClick={() => setSelectedDomain('ALL')}
            className={`px-3 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition ${
              selectedDomain === 'ALL'
                ? 'bg-temple-700 text-white shadow-xs'
                : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
            }`}
          >
            All Domains ({SYSTEM_PERMISSIONS.length})
          </button>
          {domains.map((d) => (
            <button
              key={d}
              onClick={() => setSelectedDomain(d)}
              className={`px-3 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition ${
                selectedDomain === d
                  ? 'bg-temple-700 text-white shadow-xs'
                  : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
              }`}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      {/* TAB 1: INTERACTIVE ROLE-PERMISSIONS MATRIX TABLE */}
      {activeTab === 'MATRIX' && (
        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-stone-600">
              <thead className="bg-stone-50 border-b border-stone-200 text-stone-800 font-bold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="p-4 min-w-[240px]">Permission Name & Key</th>
                  <th className="p-4">Domain</th>
                  {ROLES_LIST.map((r) => (
                    <th 
                      key={r.role} 
                      className={`p-4 text-center min-w-[130px] ${
                        r.role === 'STAFF' ? 'bg-blue-50/60 text-blue-900 border-x border-blue-100' : ''
                      }`}
                    >
                      <div className="flex items-center justify-center gap-1.5">
                        <span>{r.title}</span>
                      </div>
                      <div className="text-[10px] font-normal normal-case text-stone-400 mt-0.5">
                        {(matrix[r.role] || []).length} active
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredPermissions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-stone-400 text-xs">
                      No system permissions match your search filter.
                    </td>
                  </tr>
                ) : (
                  filteredPermissions.map((p) => {
                    const isOverviewRow = p.key === 'dashboard.view';

                    return (
                      <tr 
                        key={p.key} 
                        className={`transition ${
                          isOverviewRow 
                            ? 'bg-blue-50/20 hover:bg-blue-50/40' 
                            : 'hover:bg-cream-50/50'
                        }`}
                      >
                        {/* Name & Key */}
                        <td className="p-4">
                          <div className="font-bold text-stone-900 text-sm">{p.name}</div>
                          <div className="font-mono text-[11px] text-stone-500 mt-0.5">{p.key}</div>
                          <p className="text-[11px] text-stone-400 mt-1 line-clamp-2 max-w-sm">
                            {p.description}
                          </p>
                        </td>

                        {/* Domain */}
                        <td className="p-4">
                          <span className="inline-block px-2.5 py-1 rounded-md text-[10px] font-bold bg-stone-100 text-stone-700 border border-stone-200">
                            {p.domain}
                          </span>
                        </td>

                        {/* Roles with Interactive Switches */}
                        {ROLES_LIST.map((r) => {
                          const isGranted = (matrix[r.role] || []).includes(p.key);
                          const isStaffColumn = r.role === 'STAFF';

                          return (
                            <td 
                              key={r.role} 
                              className={`p-4 text-center ${
                                isStaffColumn ? 'bg-blue-50/20 border-x border-blue-100' : ''
                              }`}
                            >
                              <button
                                type="button"
                                onClick={() => handleToggle(r.role, p.key, !isGranted)}
                                className={`group relative inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all shadow-xs select-none active:scale-95 cursor-pointer ${
                                  isGranted
                                    ? r.activeBg
                                    : 'bg-stone-50 text-stone-400 border-stone-200 hover:bg-stone-100 hover:text-stone-600'
                                }`}
                                title={`Click to ${isGranted ? 'disable' : 'enable'} "${p.name}" for ${r.title}`}
                              >
                                {/* Animated switch knob */}
                                <span className={`w-7 h-4 rounded-full flex items-center p-0.5 transition-colors ${
                                  isGranted ? r.toggleBg : 'bg-stone-300'
                                }`}>
                                  <span className={`w-3 h-3 rounded-full bg-white shadow-xs transform transition-transform flex items-center justify-center ${
                                    isGranted ? 'translate-x-3' : 'translate-x-0'
                                  }`}>
                                    {isGranted ? (
                                      <Check className="w-2 h-2 text-stone-900" />
                                    ) : (
                                      <Minus className="w-2 h-2 text-stone-400" />
                                    )}
                                  </span>
                                </span>

                                <span className="text-[11px]">
                                  {isGranted ? 'Enabled' : 'Disabled'}
                                </span>
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: DETAILED PERMISSIONS CATALOGUE */}
      {activeTab === 'DIRECTORY' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredPermissions.map((p) => {
            return (
              <div 
                key={p.key} 
                className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs hover:border-gold-300 transition space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                      {p.domain}
                    </span>
                    <h3 className="font-bold text-base text-stone-900 leading-tight">
                      {p.name}
                    </h3>
                  </div>
                  <span className="font-mono text-[10px] font-bold px-2 py-1 bg-stone-100 text-stone-700 rounded-lg border border-stone-200 shrink-0">
                    {p.key}
                  </span>
                </div>

                <p className="text-xs text-stone-600 leading-relaxed">
                  {p.description}
                </p>

                <div className="pt-2 border-t border-stone-100">
                  <div className="text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-2">
                    Role Entitlements (Click chip to toggle privilege):
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {ROLES_LIST.map((r) => {
                      const isGranted = (matrix[r.role] || []).includes(p.key);

                      return (
                        <button
                          key={r.role}
                          type="button"
                          onClick={() => handleToggle(r.role, p.key, !isGranted)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border transition cursor-pointer active:scale-95 ${
                            isGranted
                              ? r.activeBg
                              : 'bg-stone-50 text-stone-400 border-dashed border-stone-300 hover:bg-stone-100 hover:text-stone-700'
                          }`}
                          title={`Click to ${isGranted ? 'disable' : 'enable'} for ${r.title}`}
                        >
                          <span className={`w-2 h-2 rounded-full ${isGranted ? r.toggleBg : 'bg-stone-300'}`} />
                          <span>{r.title}</span>
                          {isGranted ? (
                            <Check className="w-3 h-3 text-current ml-0.5" />
                          ) : (
                            <span className="text-[10px] font-normal text-stone-400 ml-0.5">Off</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Reset Defaults Confirmation Modal */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 space-y-4 border border-stone-200">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center border border-amber-300">
              <RotateCcw className="w-6 h-6 text-amber-700" />
            </div>

            <div>
              <h3 className="font-serif font-black text-xl text-stone-900">
                Reset Privilege Matrix to Factory Defaults?
              </h3>
              <p className="text-xs text-stone-500 mt-1 leading-relaxed">
                This action will revert all 5 roles to their original baseline permissions. Custom privilege toggles will be overwritten, and user sessions will sync automatically.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setShowResetModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-stone-600 hover:bg-stone-100 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleResetToDefault}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-temple-700 hover:bg-temple-800 text-white shadow-xs transition active:scale-95"
              >
                Yes, Reset Defaults
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
