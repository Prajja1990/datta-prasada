import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
  SYSTEM_PERMISSIONS, 
  ROLE_PERMISSIONS_MAP, 
  PermissionDefinition 
} from '../../services/auth';
import { UserRoleType } from '../../types';
import { 
  ShieldCheck, 
  Search, 
  Filter, 
  Check, 
  Minus, 
  Crown, 
  ChefHat, 
  Store, 
  UserCheck, 
  User as UserIcon,
  Info,
  Key,
  Shield,
  Layers,
  Table as TableIcon
} from 'lucide-react';

const ROLES_LIST: {
  role: UserRoleType;
  title: string;
  badge: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}[] = [
  {
    role: 'SUPER_ADMIN',
    title: 'Super Admin',
    badge: 'Owner',
    icon: Crown,
    color: 'text-purple-700 bg-purple-100 border-purple-300',
  },
  {
    role: 'ADMIN',
    title: 'Restaurant Admin',
    badge: 'Manager',
    icon: UserCheck,
    color: 'text-gold-800 bg-gold-100 border-gold-300',
  },
  {
    role: 'STAFF',
    title: 'Counter Staff',
    badge: 'Cashier / Billing',
    icon: Store,
    color: 'text-blue-800 bg-blue-100 border-blue-300',
  },
  {
    role: 'KITCHEN_STAFF',
    title: 'Kitchen Chef',
    badge: 'KDS Cook',
    icon: ChefHat,
    color: 'text-amber-800 bg-amber-100 border-amber-300',
  },
  {
    role: 'CUSTOMER',
    title: 'Customer',
    badge: 'Guest',
    icon: UserIcon,
    color: 'text-stone-800 bg-stone-100 border-stone-300',
  },
];

export const AdminPermissionsPage: React.FC = () => {
  const { hasRole } = useAuth();
  const [activeTab, setActiveTab] = useState<'MATRIX' | 'DIRECTORY'>('MATRIX');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDomain, setSelectedDomain] = useState<string>('ALL');

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

  return (
    <div className="p-6 sm:p-8 space-y-6 max-w-7xl mx-auto pb-28 animate-fadeIn">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-5">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gold-100 text-gold-900 text-xs font-bold mb-1.5 border border-gold-300">
            <ShieldCheck className="w-3.5 h-3.5 text-gold-700" />
            <span>Enterprise RBAC System Directory</span>
          </div>
          <h1 className="font-serif font-black text-3xl text-stone-900">
            System Permissions & Privilege Matrix
          </h1>
          <p className="text-stone-500 text-xs sm:text-sm mt-0.5">
            Complete catalogue of all 27 operational capabilities, capability keys, and role entitlement boundaries
          </p>
        </div>

        {/* View Toggle */}
        <div className="flex items-center p-1 rounded-2xl bg-stone-200 border border-stone-300 self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('MATRIX')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition ${
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
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition ${
              activeTab === 'DIRECTORY'
                ? 'bg-white text-temple-900 shadow-sm'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-gold-600" />
            <span>Permissions Catalogue</span>
          </button>
        </div>
      </div>

      {/* Counter Staff Isolation Notice */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-50 via-cream-50 to-blue-50 border border-blue-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-blue-950">
        <div className="flex items-start sm:items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center shrink-0 border border-blue-300">
            <Store className="w-5 h-5 text-blue-700" />
          </div>
          <div>
            <div className="font-bold text-sm text-blue-900">
              Counter Staff Operational Access Policy
            </div>
            <p className="text-blue-800 text-xs mt-0.5">
              Counter Staff (<code className="font-mono text-[11px] bg-blue-100/80 px-1 py-0.5 rounded">STAFF</code>) are restricted from executive business overview analytics (<code className="font-mono text-[11px] bg-blue-100/80 px-1 py-0.5 rounded">dashboard.view</code>). Only <strong>Live Orders</strong> (<code className="font-mono text-[11px] bg-blue-100/80 px-1 py-0.5 rounded">orders.view_all</code>), thermal billing, and order acceptance are authorized.
            </p>
          </div>
        </div>
      </div>

      {/* Role Counts Summary Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {ROLES_LIST.map((r) => {
          const perms = ROLE_PERMISSIONS_MAP[r.role] || [];
          const Icon = r.icon;
          return (
            <div key={r.role} className="bg-white p-3.5 rounded-2xl border border-stone-200 shadow-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">{r.badge}</span>
                <Icon className="w-4 h-4 text-stone-400" />
              </div>
              <div className="font-bold text-xs text-stone-800 truncate">{r.title}</div>
              <div className="text-xl font-serif font-black text-stone-900">
                {perms.length} <span className="text-[11px] font-sans font-normal text-stone-400">/ 27 keys</span>
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
                ? 'bg-temple-700 text-white'
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
                  ? 'bg-temple-700 text-white'
                  : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
              }`}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      {/* TAB 1: ROLE-PERMISSIONS MATRIX TABLE */}
      {activeTab === 'MATRIX' && (
        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-stone-600">
              <thead className="bg-stone-50 border-b border-stone-200 text-stone-800 font-bold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="p-4 min-w-[240px]">Permission Name & Key</th>
                  <th className="p-4">Domain</th>
                  <th className="p-4 text-center">Super Admin</th>
                  <th className="p-4 text-center">Admin (Manager)</th>
                  <th className="p-4 text-center bg-blue-50/50 text-blue-900 border-x border-blue-100">
                    Counter Staff
                  </th>
                  <th className="p-4 text-center">Kitchen Chef</th>
                  <th className="p-4 text-center">Customer</th>
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
                    const hasSuper = ROLE_PERMISSIONS_MAP.SUPER_ADMIN.includes(p.key);
                    const hasAdmin = ROLE_PERMISSIONS_MAP.ADMIN.includes(p.key);
                    const hasStaff = ROLE_PERMISSIONS_MAP.STAFF.includes(p.key);
                    const hasKitchen = ROLE_PERMISSIONS_MAP.KITCHEN_STAFF.includes(p.key);
                    const hasCustomer = ROLE_PERMISSIONS_MAP.CUSTOMER.includes(p.key);

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

                        {/* Super Admin */}
                        <td className="p-4 text-center">
                          {hasSuper ? (
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-purple-100 text-purple-700">
                              <Check className="w-3.5 h-3.5 font-bold" />
                            </span>
                          ) : (
                            <span className="text-stone-300">—</span>
                          )}
                        </td>

                        {/* Admin */}
                        <td className="p-4 text-center">
                          {hasAdmin ? (
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gold-100 text-gold-800">
                              <Check className="w-3.5 h-3.5 font-bold" />
                            </span>
                          ) : (
                            <span className="text-stone-300">—</span>
                          )}
                        </td>

                        {/* Counter Staff (Highlighted column) */}
                        <td className="p-4 text-center bg-blue-50/30 border-x border-blue-100">
                          {hasStaff ? (
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700">
                              <Check className="w-3.5 h-3.5 font-bold" />
                            </span>
                          ) : (
                            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold text-red-600 bg-red-50 border border-red-200">
                              Restricted
                            </span>
                          )}
                        </td>

                        {/* Kitchen Chef */}
                        <td className="p-4 text-center">
                          {hasKitchen ? (
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-100 text-amber-800">
                              <Check className="w-3.5 h-3.5 font-bold" />
                            </span>
                          ) : (
                            <span className="text-stone-300">—</span>
                          )}
                        </td>

                        {/* Customer */}
                        <td className="p-4 text-center">
                          {hasCustomer ? (
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-100 text-green-800">
                              <Check className="w-3.5 h-3.5 font-bold" />
                            </span>
                          ) : (
                            <span className="text-stone-300">—</span>
                          )}
                        </td>
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
            const rolesHolding = ROLES_LIST.filter(r => ROLE_PERMISSIONS_MAP[r.role].includes(p.key));

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
                  <div className="text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-1.5">
                    Authorized Roles:
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {rolesHolding.map((r) => (
                      <span
                        key={r.role}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${r.color}`}
                      >
                        <span>{r.title}</span>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
