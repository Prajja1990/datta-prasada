import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { store } from '../../services/store';
import { ROLE_PERMISSIONS_MAP } from '../../services/auth';
import { UserAccount, UserProfile, UserRoleType } from '../../types';
import { CreateUserModal } from '../../components/admin/CreateUserModal';
import { ChangePasswordModal } from '../../components/auth/ChangePasswordModal';
import { UserPermissionsModal } from '../../components/admin/UserPermissionsModal';
import { 
  Users, 
  ShieldCheck, 
  Key, 
  UserPlus, 
  Check, 
  X, 
  AlertTriangle,
  Crown,
  Search,
  Filter,
  Lock,
  ChefHat,
  Store,
  UserCheck,
  User as UserIcon,
  Sparkles,
  Eye,
  Shield
} from 'lucide-react';

export const AdminUsersPage: React.FC = () => {
  const { user: currentUser, hasRole } = useAuth();
  const isSuperAdmin = hasRole('SUPER_ADMIN');

  const [usersList, setUsersList] = useState<UserAccount[]>(() => store.getUsers());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('ALL');

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [passwordTargetUser, setPasswordTargetUser] = useState<UserProfile | null>(null);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [selectedUserForPerms, setSelectedUserForPerms] = useState<UserProfile | null>(null);
  const [editingUser, setEditingUser] = useState<UserAccount | null>(null);
  const [selectedRole, setSelectedRole] = useState<UserRoleType>('STAFF');

  const [feedbackMessage, setFeedbackMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const loadUsers = () => {
    setUsersList(store.getUsers());
  };

  useEffect(() => {
    loadUsers();
    const unsub = store.subscribe((eventType) => {
      if (eventType === 'USERS_UPDATED') {
        loadUsers();
      }
    });
    return unsub;
  }, []);

  const showFeedback = (text: string, type: 'success' | 'error' = 'success') => {
    setFeedbackMessage({ text, type });
    setTimeout(() => setFeedbackMessage(null), 3500);
  };

  const handleToggleActive = (targetUser: UserAccount) => {
    if (!isSuperAdmin) {
      alert('Only Super Admin can activate or deactivate staff accounts.');
      return;
    }
    const res = store.toggleUserActive(
      targetUser.id,
      {
        name: currentUser?.fullName || 'Super Admin',
        role: currentUser?.roles[0] || 'SUPER_ADMIN',
      }
    );
    if (res.success) {
      showFeedback(`Account for ${targetUser.fullName} ${targetUser.isActive ? 'deactivated' : 'activated'}.`);
    } else {
      showFeedback(res.error || 'Failed to update account status.', 'error');
    }
  };

  const handleUpdateRole = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    if (!isSuperAdmin) {
      alert('Only Super Admin can change staff role assignments.');
      return;
    }

    const res = store.updateUserRole(
      editingUser.id,
      selectedRole,
      {
        name: currentUser?.fullName || 'Super Admin',
        role: currentUser?.roles[0] || 'SUPER_ADMIN',
      }
    );

    if (res.success) {
      showFeedback(`Role for ${editingUser.fullName} changed to ${selectedRole}.`);
      setEditingUser(null);
    } else {
      alert(res.error || 'Failed to reassign role');
    }
  };

  // Filtered users list
  const filteredUsers = usersList.filter((u) => {
    const matchesRole = selectedRoleFilter === 'ALL' || u.roles.includes(selectedRoleFilter as UserRoleType);
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q || (
      u.fullName.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      (u.mobile && u.mobile.includes(q)) ||
      u.id.toLowerCase().includes(q)
    );
    return matchesRole && matchesSearch;
  });

  // Role counter stats
  const countSuperAdmin = usersList.filter(u => u.roles.includes('SUPER_ADMIN')).length;
  const countAdmin = usersList.filter(u => u.roles.includes('ADMIN')).length;
  const countStaff = usersList.filter(u => u.roles.includes('STAFF')).length;
  const countKitchen = usersList.filter(u => u.roles.includes('KITCHEN_STAFF')).length;
  const countCustomer = usersList.filter(u => u.roles.includes('CUSTOMER')).length;

  return (
    <div className="p-6 sm:p-8 space-y-6 max-w-7xl mx-auto pb-28 animate-fadeIn">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-5">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-bold mb-1.5">
            <Crown className="w-3.5 h-3.5 text-amber-700" />
            <span>Super Admin RBAC Authority</span>
          </div>
          <h1 className="font-serif font-black text-3xl text-stone-900">
            Staff & Role Administration
          </h1>
          <p className="text-stone-500 text-xs sm:text-sm mt-0.5">
            Manage restaurant personnel credentials, create new users, assign roles, and handle password resets for all roles
          </p>
        </div>

        {/* Header Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            to="/admin/permissions"
            className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-white hover:bg-stone-50 border border-stone-200 text-stone-700 font-serif font-bold text-sm shadow-xs transition"
          >
            <ShieldCheck className="w-4 h-4 text-gold-600" />
            <span>System Permissions Matrix</span>
          </Link>

          <button
            onClick={() => {
              if (!isSuperAdmin) {
                alert('Only Super Admin (Platform Owner) can create new accounts.');
                return;
              }
              setIsCreateModalOpen(true);
            }}
            disabled={!isSuperAdmin}
            className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-serif font-bold text-sm shadow-traditional transition active:scale-95 ${
              isSuperAdmin
                ? 'bg-temple-700 hover:bg-temple-800 text-white cursor-pointer'
                : 'bg-stone-200 text-stone-400 cursor-not-allowed opacity-60'
            }`}
          >
            <UserPlus className="w-4 h-4 text-gold-400" />
            <span>Create New User</span>
          </button>
        </div>
      </div>

      {/* Role permission notification for non-super admins */}
      {!isSuperAdmin && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
          <span>
            You are logged in as Restaurant Admin. Only the Super Admin (Platform Owner) has authorization to create new user accounts, reassign roles, or deactivate personnel.
          </span>
        </div>
      )}

      {/* Feedback banner */}
      {feedbackMessage && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center gap-2 transition animate-fadeIn ${
            feedbackMessage.type === 'success'
              ? 'bg-green-50 border-green-200 text-green-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          {feedbackMessage.type === 'success' ? (
            <Check className="w-4 h-4 text-green-600 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
          )}
          <span className="font-semibold">{feedbackMessage.text}</span>
        </div>
      )}

      {/* Stats Counter Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs space-y-1">
          <div className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">Total Users</div>
          <div className="text-2xl font-serif font-black text-stone-900">{usersList.length}</div>
        </div>

        <div className="bg-purple-50/60 p-4 rounded-2xl border border-purple-200 shadow-xs space-y-1">
          <div className="text-[11px] font-bold text-purple-700 uppercase tracking-wider flex items-center gap-1">
            <Crown className="w-3 h-3 text-purple-600" />
            <span>Super Admins</span>
          </div>
          <div className="text-2xl font-serif font-black text-purple-950">{countSuperAdmin}</div>
        </div>

        <div className="bg-gold-50/60 p-4 rounded-2xl border border-gold-200 shadow-xs space-y-1">
          <div className="text-[11px] font-bold text-gold-800 uppercase tracking-wider flex items-center gap-1">
            <UserCheck className="w-3 h-3 text-gold-700" />
            <span>Managers</span>
          </div>
          <div className="text-2xl font-serif font-black text-gold-950">{countAdmin}</div>
        </div>

        <div className="bg-blue-50/60 p-4 rounded-2xl border border-blue-200 shadow-xs space-y-1">
          <div className="text-[11px] font-bold text-blue-700 uppercase tracking-wider flex items-center gap-1">
            <Store className="w-3 h-3 text-blue-600" />
            <span>Counter Staff</span>
          </div>
          <div className="text-2xl font-serif font-black text-blue-950">{countStaff}</div>
        </div>

        <div className="bg-amber-50/60 p-4 rounded-2xl border border-amber-200 shadow-xs space-y-1">
          <div className="text-[11px] font-bold text-amber-700 uppercase tracking-wider flex items-center gap-1">
            <ChefHat className="w-3 h-3 text-amber-600" />
            <span>Kitchen Chefs</span>
          </div>
          <div className="text-2xl font-serif font-black text-amber-950">{countKitchen}</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-stone-200 shadow-xs">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-3 text-stone-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by staff name, email, phone, or ID..."
            className="w-full pl-9 pr-4 py-2 rounded-xl text-xs bg-stone-50 border border-stone-200 focus:outline-none focus:ring-2 focus:ring-gold-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-2.5 text-stone-400 hover:text-stone-600 text-xs"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Role Pills */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
          {(['ALL', 'SUPER_ADMIN', 'ADMIN', 'STAFF', 'KITCHEN_STAFF', 'CUSTOMER'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setSelectedRoleFilter(r)}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-bold whitespace-nowrap transition ${
                selectedRoleFilter === r
                  ? 'bg-temple-700 text-white shadow-xs'
                  : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
              }`}
            >
              {r === 'ALL' ? 'All Roles' : r.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Staff Accounts Table */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-stone-600">
            <thead className="bg-stone-50 border-b border-stone-200 text-stone-800 font-bold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="p-4">Personnel Member</th>
                <th className="p-4">Contact / Credentials</th>
                <th className="p-4">Assigned Role</th>
                <th className="p-4">Permissions</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">RBAC Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-stone-400 text-xs">
                    No users found matching your search and filter criteria.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((usr) => {
                  const roleName = usr.roles[0];
                  let roleBadgeStyle = 'bg-stone-100 text-stone-800 border-stone-200';
                  if (roleName === 'SUPER_ADMIN') roleBadgeStyle = 'bg-purple-100 text-purple-900 border-purple-300';
                  else if (roleName === 'ADMIN') roleBadgeStyle = 'bg-gold-100 text-gold-900 border-gold-300';
                  else if (roleName === 'STAFF') roleBadgeStyle = 'bg-blue-100 text-blue-900 border-blue-300';
                  else if (roleName === 'KITCHEN_STAFF') roleBadgeStyle = 'bg-amber-100 text-amber-900 border-amber-300';

                  return (
                    <tr key={usr.id} className="hover:bg-cream-50/50 transition">
                      {/* Name & ID */}
                      <td className="p-4">
                        <div className="font-bold text-stone-900 text-sm">{usr.fullName}</div>
                        <div className="font-mono text-[10px] text-stone-400">ID: {usr.id}</div>
                      </td>

                      {/* Contact / Email */}
                      <td className="p-4">
                        <div className="font-medium text-stone-700 font-mono">{usr.email}</div>
                        <div className="text-stone-400 font-mono text-[11px]">{usr.mobile || 'No mobile set'}</div>
                      </td>

                      {/* Assigned Role */}
                      <td className="p-4">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-md text-[10px] font-black uppercase border ${roleBadgeStyle}`}
                        >
                          {roleName.replace('_', ' ')}
                        </span>
                      </td>

                      {/* Permissions */}
                      <td className="p-4">
                        <button
                          onClick={() => setSelectedUserForPerms(usr)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-gold-50 hover:text-gold-900 hover:border-gold-300 text-stone-700 font-mono font-bold text-xs transition border border-stone-200 group"
                          title={`Click to inspect all ${usr.permissions.length} capabilities granted to ${usr.fullName}`}
                        >
                          <span>{usr.permissions.length} keys</span>
                          <Eye className="w-3.5 h-3.5 text-stone-400 group-hover:text-gold-700" />
                        </button>
                      </td>

                      {/* Status */}
                      <td className="p-4">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            usr.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {usr.isActive ? 'Active' : 'Deactivated'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="p-4 text-right space-x-2">
                        {/* Change Role Button */}
                        <button
                          onClick={() => {
                            setEditingUser(usr);
                            setSelectedRole(usr.roles[0]);
                          }}
                          disabled={!isSuperAdmin}
                          title="Change user authorization role"
                          className="px-2.5 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs disabled:opacity-40 transition"
                        >
                          Role
                        </button>

                        {/* Password Reset Button for Super Admin */}
                        <button
                          onClick={() => {
                            setPasswordTargetUser(usr);
                            setIsPasswordModalOpen(true);
                          }}
                          disabled={!isSuperAdmin && currentUser?.id !== usr.id}
                          title={
                            isSuperAdmin
                              ? `Reset password for ${usr.fullName}`
                              : 'Only Super Admin can reset staff passwords'
                          }
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-gold-50 hover:bg-gold-100 text-gold-900 border border-gold-300 font-bold text-xs disabled:opacity-40 transition"
                        >
                          <Key className="w-3 h-3 text-gold-700" />
                          <span>Change Password</span>
                        </button>

                        {/* Activate / Deactivate Toggle */}
                        <button
                          onClick={() => handleToggleActive(usr)}
                          disabled={!isSuperAdmin}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-bold disabled:opacity-40 transition ${
                            usr.isActive
                              ? 'bg-red-50 text-red-700 hover:bg-red-100'
                              : 'bg-green-50 text-green-700 hover:bg-green-100'
                          }`}
                        >
                          {usr.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create User Modal */}
      <CreateUserModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={(created) => {
          showFeedback(`New user account "${created.fullName}" successfully registered.`);
          loadUsers();
        }}
      />

      {/* Password Reset Modal */}
      <ChangePasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => {
          setIsPasswordModalOpen(false);
          setPasswordTargetUser(null);
        }}
        targetUser={passwordTargetUser}
        onSuccess={() => {
          showFeedback(`Password updated successfully for ${passwordTargetUser?.fullName}.`);
          loadUsers();
        }}
      />

      {/* User System Permissions Viewer Modal */}
      <UserPermissionsModal
        isOpen={!!selectedUserForPerms}
        onClose={() => setSelectedUserForPerms(null)}
        user={selectedUserForPerms}
      />

      {/* Role Assignment Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
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
