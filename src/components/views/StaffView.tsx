import React from 'react';
import { 
  Users, 
  PlusCircle, 
  Edit2, 
  Trash2,
  User as UserIcon
} from 'lucide-react';
import { motion } from 'motion/react';
import { User, UserRole } from '../../types';
import { firebaseService } from '../../services/firebaseService';
import { ConfirmModal } from '../ConfirmModal';

interface StaffViewProps {
  users: User[];
  view: string;
  setView: (view: any) => void;
  editingUser: User | null;
  setEditingUser: (user: User | null) => void;
  userForm: Partial<User>;
  setUserForm: (form: Partial<User>) => void;
  handleUserSubmit: (e: React.FormEvent) => void;
  handleUserDelete: (id: string) => void;
  loading: boolean;
}

export const StaffView: React.FC<StaffViewProps> = ({
  users,
  view,
  setView,
  editingUser,
  setEditingUser,
  userForm,
  setUserForm,
  handleUserSubmit,
  handleUserDelete,
  loading
}) => {
  const [deletingUser, setDeletingUser] = React.useState<User | null>(null);
  const [roleFilter, setRoleFilter] = React.useState<'all' | UserRole>('all');

  const filteredUsers = (roleFilter === 'all' 
    ? users 
    : users.filter(u => u.role === roleFilter)).filter(u => u.status !== 'inactive');

  if (view === 'staff_form') {
    return (
      <motion.div 
        key="staff_form"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="max-w-2xl mx-auto"
      >
        <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
          <div className="bg-indigo-600 p-8 text-white">
            <h2 className="text-2xl font-bold">{editingUser ? 'Chỉnh Sửa Nhân Viên' : 'Thêm Nhân Viên Mới'}</h2>
            <p className="text-indigo-100 mt-1">Thông tin cá nhân và quyền hạn truy cập</p>
          </div>
          <form onSubmit={handleUserSubmit} className="p-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Tên đăng nhập</label>
                <input 
                  type="text" 
                  required
                  value={userForm.username}
                  onChange={e => setUserForm({ ...userForm, username: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500" 
                  placeholder="username" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Mật khẩu</label>
                <input 
                  type="text" 
                  required
                  value={userForm.password}
                  onChange={e => setUserForm({ ...userForm, password: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500" 
                  placeholder="password" 
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Họ và Tên</label>
              <input 
                type="text" 
                required
                value={userForm.full_name}
                onChange={e => setUserForm({ ...userForm, full_name: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500" 
                placeholder="Nguyễn Văn A" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Số tài khoản ngân hàng</label>
              <input 
                type="text" 
                value={userForm.bank_account}
                onChange={e => setUserForm({ ...userForm, bank_account: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500" 
                placeholder="0123456789" 
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Vai trò</label>
                <select 
                  value={userForm.role}
                  onChange={e => setUserForm({ ...userForm, role: e.target.value as UserRole })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="reader">Reader</option>
                  <option value="sale">Sale</option>
                  <option value="manager">Manager</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Hoa hồng (%)</label>
                <input 
                  type="number" 
                  required
                  value={userForm.commission_percent}
                  onChange={e => setUserForm({ ...userForm, commission_percent: Number(e.target.value) })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500" 
                  placeholder="0" 
                />
              </div>
            </div>

            <div className="flex space-x-4">
              <button 
                type="button"
                onClick={() => {
                  setEditingUser(null);
                  setView('staff');
                }}
                className="flex-1 bg-slate-100 text-slate-600 font-bold py-4 rounded-2xl hover:bg-slate-200 transition-all"
              >
                Hủy
              </button>
              <button 
                type="submit"
                disabled={loading}
                className="flex-1 bg-indigo-600 text-white font-bold py-4 rounded-2xl shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all disabled:opacity-50"
              >
                {loading ? 'Đang xử lý...' : (editingUser ? 'Cập Nhật' : 'Thêm Nhân Viên')}
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      key="staff"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-slate-900">Quản Lý Nhân Viên</h2>
        <div className="flex items-center gap-3">
          <div className="flex bg-white border border-slate-200 p-1 rounded-xl shadow-sm">
            {(['all', 'reader', 'sale', 'manager'] as const).map(role => (
              <button
                key={role}
                onClick={() => setRoleFilter(role)}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${roleFilter === role ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                {role === 'all' ? 'Tất cả' : role.charAt(0).toUpperCase() + role.slice(1)}
              </button>
            ))}
          </div>
          <button 
            onClick={() => {
              setEditingUser(null);
              setView('staff_form');
            }}
            className="bg-indigo-600 text-white px-4 py-2 rounded-xl flex items-center space-x-2 hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-100"
          >
            <PlusCircle size={20} />
            <span className="hidden sm:inline">Thêm Nhân Viên</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredUsers.map(u => (
          <div key={u.id} className="bg-white p-6 rounded-2xl border border-slate-100 card-shadow group hover:border-indigo-200 transition-all">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center text-slate-600 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors overflow-hidden">
                {u.avatar_url ? (
                  <img src={u.avatar_url} alt={u.full_name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <UserIcon size={24} />
                )}
              </div>
              <div className="flex space-x-1">
                <button 
                  onClick={() => {
                    setEditingUser(u);
                    setView('staff_form');
                  }}
                  className="p-2 text-slate-400 hover:text-indigo-600 transition-colors"
                >
                  <Edit2 size={18} />
                </button>
                <button 
                  onClick={() => setDeletingUser(u)}
                  className="p-2 text-slate-400 hover:text-red-600 transition-colors"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
            <h3 className="font-bold text-slate-900 text-lg">{u.full_name}</h3>
            <p className="text-slate-500 text-sm mb-4">@{u.username} • {u.role}</p>
            <div className="flex items-center justify-between pt-4 border-t border-slate-50">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Hoa hồng</span>
              <span className="bg-emerald-50 text-emerald-600 px-3 py-1 rounded-lg text-sm font-bold">{u.commission_percent}%</span>
            </div>
          </div>
        ))}
      </div>
      <ConfirmModal 
        isOpen={!!deletingUser}
        onClose={() => setDeletingUser(null)}
        onConfirm={() => deletingUser && handleUserDelete(deletingUser.id)}
        title="Xác nhận xóa nhân viên"
        message={`Bạn có chắc chắn muốn xóa nhân viên "${deletingUser?.full_name}"?`}
      />
    </motion.div>
  );
};
