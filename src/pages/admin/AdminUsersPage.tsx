import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { store } from '../../services/store';
import { DEMO_USERS, ROLE_PERMISSIONS_MAP } from '../../services/auth';
import { UserProfile, UserRoleType } from '../../types';
import { 
  Users, 
  ShieldCheck, 
  Key, 
  UserPlus, 
  Check, 
  X, 
  AlertTriangle,
  Crown
} from 'lucide-react';

export const AdminUsersPage: React.FC = () => {
  const { user: currentUser, hasRole } = useAuth();
  const [usersList, setUsersList] = useState<UserProfile[]>(() => Object.values(DEMO_USERS));
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [selectedRole, setSelectedRole] = useState<UserRoleType>('STAFF');

  const isSuperAdmin = hasRole('SUPER_ADMIN');

  const handleToggleActive = (targetUser: UserProfile) => {
    if (!isSuperAdmin) {
      alert('Only Super Admin can activate or deactivate staff accounts.');
      return;
    }
    const updated = usersList.map(u => 
      u.id === targetUser.id ? { ...u, isActive: !u.isActive } : u
    );
    setUsersList(updated);
    store.addAuditLog({
      actorName: currentUser?.fullName || 'Super Admin',
      actorRole: currentUser?.roles[0],
      action: targetUser.isActive ? 'USER_DEACTIVATED' : 'USER_ACTIVATED',
      entityType: 'USER',
      entityId: targetUser.id,
      oldValues: { isActive: targetUser.isActive },
      newValues: { isActive: !targetUser.isActive },
    });
  };

  const handleUpdateRole = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    if (!isSuperAdmin) {
      alert('Only Super Admin can change staff role assignments.');
      return;
    }

    const oldRole = editingUser.roles[0];
    const newPerms = ROLE_PERMISSIONS_MAP[selectedRole];

    const updated = usersList.map(u => 
      u.id === editingUser.id ? { ...u, roles: [selectedRole], permissions: newPerms } : u
    );
    setUsersList(updated);

    store.addAuditLog({
      actorName: currentUser?.fullName || 'Super Admin',
      actorRole: currentUser?.roles[0],
      action: 'ROLE_REASSIGNED',
      entityType: 'USER',
      entityId: editingUser.id,
      oldValues: { role: oldRole },
      newValues: { role: selectedRole },
    });

    setEditingUser(null);
  };

  return (
    <div className="p-6 sm:p-8 space-y-6 max-w-7xl mx-auto pb-28">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-bold mb-1">
            <Crown className="w-3.5 h-3.5 text-amber-700" />
            <span>Super Admin RBAC Authority</span>
          </div>
          <h1 className="font-serif font-black text-3xl text-stone-900">
            Staff & Role Administration
          </h1>
          <p className="text-stone-500 text-xs sm:text-sm mt-0.5">
            Manage personnel credentials, account activations, and enterprise authorization roles
          </p>
        </div>
      </div>

      {!isSuperAdmin && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
          <span>
            You are logged in as Restaurant Admin. Only the Super Admin (Platform Owner) can assign privileged roles or deactivate accounts.
          </span>
        </div>
      )}

      {/* Staff Accounts Table */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
        <table className="w-full text-left text-xs text-stone-600">
          <thead className="bg-stone-50 border-b border-stone-200 text-stone-800 font-bold uppercase tracking-wider text-[11px]">
            <tr>
              <th className="p-4">Staff Member</th>
              <th className="p-4">Contact / Email</th>
              <th className="p-4">Assigned Role</th>
              <th className="p-4">Permissions Count</th>
              <th className="p-4">Account Status</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {usersList.map((usr) => (
              <tr key={usr.id} className="hover:bg-cream-50/50 transition">
                <td className="p-4">
                  <div className="font-bold text-stone-900 text-sm">{usr.fullName}</div>
                  <div className="font-mono text-[10px] text-stone-400">ID: {usr.id}</div>
                </td>
                <td className="p-4">
                  <div className="font-medium text-stone-700">{usr.email}</div>
                  <div className="text-stone-400 font-mono text-[11px]">{usr.mobile}</div>
                </td>
                <td className="p-4">
                  <span className="inline-block px-2.5 py-1 rounded-md text-[10px] font-black uppercase bg-stone-100 text-stone-800 border border-stone-200">
                    {usr.roles[0].replace('_', ' ')}
                  </span>
                </td>
                <td className="p-4 font-mono font-bold text-stone-700">
                  {usr.permissions.length} keys
                </td>
                <td className="p-4">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      usr.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {usr.isActive ? 'Active' : 'Deactivated'}
                  </span>
                </td>
                <td className="p-4 text-right space-x-2">
                  <button
                    onClick={() => {
                      setEditingUser(usr);
                      setSelectedRole(usr.roles[0]);
                    }}
                    disabled={!isSuperAdmin}
                    className="px-3 py-1 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs disabled:opacity-40"
                  >
                    Change Role
                  </button>

                  <button
                    onClick={() => handleToggleActive(usr)}
                    disabled={!isSuperAdmin}
                    className={`px-3 py-1 rounded-lg text-xs font-bold disabled:opacity-40 ${
                      usr.isActive
                        ? 'bg-red-50 text-red-700 hover:bg-red-100'
                        : 'bg-green-50 text-green-700 hover:bg-green-100'
                    }`}
                  >
                    {usr.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Role Assignment Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 space-y-5 border border-gold-300">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h2 className="font-serif font-bold text-xl text-stone-900">
                Reassign Role: {editingUser.fullName}
              </h2>
              <button onClick={() => setEditingUser(null)} className="text-stone-400 hover:text-stone-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateRole} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase mb-2">
                  Select Authorization Role
                </label>
                <div className="space-y-2">
                  {(['SUPER_ADMIN', 'ADMIN', 'STAFF', 'KITCHEN_STAFF', 'CUSTOMER'] as UserRoleType[]).map((r) => (
                    <label
                      key={r}
                      className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer text-xs transition ${
                        selectedRole === r ? 'border-temple-700 bg-cream-50 font-bold' : 'border-stone-200 hover:bg-stone-50'
                      }`}
                    >
                      <span>{r.replace('_', ' ')}</span>
                      <input
                        type="radio"
                        name="userRole"
                        checked={selectedRole === r}
                        onChange={() => setSelectedRole(r)}
                        className="text-temple-700"
                      />
                    </label>
                  ))}
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 text-stone-600 hover:text-stone-800 font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-temple-700 hover:bg-temple-800 text-white font-bold text-xs shadow-sm transition"
                >
                  Confirm & Commit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
