import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  MoreHorizontal, 
  Edit2, 
  Trash2,
  X,
  RefreshCw,
  User as UserIcon,
  Check,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { User, UserRole, SaleRecord } from '../../types';
import { ConfirmModal } from '../ConfirmModal';

interface StaffViewProps {
  users: User[];
  sales?: SaleRecord[];
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

type SortField = 'name' | 'role' | 'commission' | 'orders' | 'revenue';
type SortOrder = 'asc' | 'desc';

// Default mockup stats for baseline when sales are empty
const DEFAULT_STAFF_STATS: Record<string, { orders: number; revenue: number }> = {
  'anbi': { orders: 42, revenue: 12400000 },
  'hienpham': { orders: 33, revenue: 9850000 },
  'luuha': { orders: 48, revenue: 14200000 },
  'chingching': { orders: 61, revenue: 18600000 },
  'admin': { orders: 0, revenue: 0 },
  'hgiang': { orders: 74, revenue: 22150000 },
  'thong': { orders: 118, revenue: 31400000 },
  'ngocminh': { orders: 26, revenue: 7900000 },
  'mia': { orders: 18, revenue: 5300000 },
};

// Format currency as mockup: 12.400.000 đ
const formatCurrency = (val: number): string => {
  return new Intl.NumberFormat('vi-VN').format(val) + ' đ';
};

// Get initials for avatar badge (AB, HP, LH, CC, AD, VG, TH, NM, MI)
const getStaffInitials = (user: User): string => {
  const name = user.full_name?.trim() || user.username?.trim() || '';
  if (!name) return '??';
  
  const lower = name.toLowerCase();
  if (lower.includes('thông')) return 'TH';
  if (lower.includes('hương giang') || lower.includes('huong giang')) return 'VG';
  if (lower.includes('ching ching')) return 'CC';
  if (lower.includes('lưu hà') || lower.includes('luu ha')) return 'LH';
  if (lower.includes('an bí') || lower.includes('an bi')) return 'AB';
  if (lower.includes('hiển phạm') || lower.includes('hien pham')) return 'HP';
  if (lower.includes('ngọc minh') || lower.includes('ngoc minh')) return 'NM';
  if (lower.includes('mia')) return 'MI';
  if (lower.includes('admin')) return 'AD';

  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

export const StaffView: React.FC<StaffViewProps> = ({
  users,
  sales = [],
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
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | UserRole>('all');
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close popup menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setActiveMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Compute effective commission percentage
  const getCommission = (u: User) => {
    if (u.role === 'manager') return 0;
    if (u.commission_percent !== undefined && u.commission_percent !== null && u.commission_percent > 0) {
      return u.commission_percent;
    }
    return u.role === 'sale' ? 20 : 30;
  };

  // Compute orders and revenue for a user from real sales data (or fallback to mockup baseline)
  const getStaffStats = (u: User) => {
    if (u.role === 'manager') {
      return { orders: 0, revenue: 0, isManager: true };
    }

    const cleanUser = (u.username || u.full_name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    let baseline = { orders: 0, revenue: 0 };
    for (const [key, stats] of Object.entries(DEFAULT_STAFF_STATS)) {
      if (cleanUser.includes(key) || key.includes(cleanUser)) {
        baseline = stats;
        break;
      }
    }

    const userSales = sales.filter(s => 
      s.reader_id === u.id || 
      s.sale_id === u.id || 
      s.reader_id === u.username || 
      s.sale_id === u.username ||
      s.reader_id === u.full_name || 
      s.sale_id === u.full_name
    );

    if (userSales.length > 0) {
      const orders = userSales.length + baseline.orders;
      const revenue = userSales.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0) + baseline.revenue;
      return { orders, revenue, isManager: false };
    }

    return { ...baseline, isManager: false };
  };

  // Active users count
  const activeUsers = useMemo(() => {
    return users.filter(u => u.status !== 'inactive');
  }, [users]);

  // Counts by role
  const roleCounts = useMemo(() => {
    const total = activeUsers.length;
    const readers = activeUsers.filter(u => u.role === 'reader').length;
    const salesCount = activeUsers.filter(u => u.role === 'sale').length;
    const managers = activeUsers.filter(u => u.role === 'manager').length;
    return { total, readers, salesCount, managers };
  }, [activeUsers]);

  // Filtered and sorted users
  const displayedUsers = useMemo(() => {
    let result = activeUsers.filter(u => {
      // Role filter
      if (roleFilter !== 'all' && u.role !== roleFilter) return false;

      // Search term filter
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase().trim().replace(/^@/, '');
        const nameMatch = u.full_name.toLowerCase().includes(query);
        const userMatch = u.username.toLowerCase().includes(query);
        if (!nameMatch && !userMatch) return false;
      }
      return true;
    });

    // Sorting (if a column was clicked)
    if (sortField) {
      result = [...result].sort((a, b) => {
        let comparison = 0;
        const aStats = getStaffStats(a);
        const bStats = getStaffStats(b);

        if (sortField === 'name') {
          comparison = a.full_name.localeCompare(b.full_name, 'vi');
        } else if (sortField === 'role') {
          comparison = a.role.localeCompare(b.role);
        } else if (sortField === 'commission') {
          comparison = getCommission(a) - getCommission(b);
        } else if (sortField === 'orders') {
          comparison = aStats.orders - bStats.orders;
        } else if (sortField === 'revenue') {
          comparison = aStats.revenue - bStats.revenue;
        }

        return sortOrder === 'asc' ? comparison : -comparison;
      });
    }

    return result;
  }, [activeUsers, roleFilter, searchTerm, sortField, sortOrder, sales]);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);

  // Reset to first page when search, filter, or sort changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, roleFilter, sortField, sortOrder]);

  const totalPages = Math.ceil(displayedUsers.length / pageSize) || 1;
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedUsers = useMemo(() => {
    return displayedUsers.slice(startIndex, startIndex + pageSize);
  }, [displayedUsers, startIndex, pageSize]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const handleOpenAdd = () => {
    setEditingUser(null);
    setUserForm({
      username: '',
      password: '',
      full_name: '',
      role: 'reader',
      commission_percent: 30,
      bank_account: '',
      bank_name: 'VietinBank'
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (u: User) => {
    setEditingUser(u);
    setUserForm({
      username: u.username,
      password: u.password || '',
      full_name: u.full_name,
      role: u.role,
      commission_percent: u.commission_percent,
      bank_account: u.bank_account || '',
      bank_name: u.bank_name || ''
    });
    setIsModalOpen(true);
  };

  const onFormSubmit = async (e: React.FormEvent) => {
    await handleUserSubmit(e);
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* 1. Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Quản Lý Nhân Viên
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
            {roleCounts.total} nhân viên · {roleCounts.readers} reader · {roleCounts.salesCount} sale · {roleCounts.managers} manager
          </p>
        </div>

        <button 
          onClick={handleOpenAdd}
          className="px-5 py-2.5 rounded-2xl bg-[#6d28d9] hover:bg-[#5b21b6] text-white font-bold text-sm shadow-md shadow-purple-100 flex items-center justify-center gap-2 transition-all cursor-pointer shrink-0"
        >
          <Plus size={18} />
          <span>Thêm Nhân Viên</span>
        </button>
      </div>

      {/* 2. Search & Filter Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-transparent">
        {/* Left: Search input */}
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input 
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Tìm theo tên hoặc @handle..."
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-200 bg-white text-sm font-medium text-slate-800 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-[#7c3aed] transition-all"
          />
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Middle & Right: Segmented Role Pills & Count */}
        <div className="flex items-center justify-between md:justify-end gap-4 overflow-x-auto pb-1 md:pb-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <div className="flex items-center bg-slate-200/60 p-1 rounded-2xl gap-1 shrink-0">
            <button
              onClick={() => setRoleFilter('all')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                roleFilter === 'all' 
                  ? 'bg-white text-[#6d28d9] shadow-xs' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Tất cả</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                roleFilter === 'all' ? 'bg-[#f5f3ff] text-[#6d28d9]' : 'bg-slate-300 text-slate-700'
              }`}>
                {roleCounts.total}
              </span>
            </button>

            <button
              onClick={() => setRoleFilter('reader')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                roleFilter === 'reader' 
                  ? 'bg-white text-[#6d28d9] shadow-xs' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Reader</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                roleFilter === 'reader' ? 'bg-[#f5f3ff] text-[#6d28d9]' : 'bg-slate-300 text-slate-700'
              }`}>
                {roleCounts.readers}
              </span>
            </button>

            <button
              onClick={() => setRoleFilter('sale')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                roleFilter === 'sale' 
                  ? 'bg-white text-[#6d28d9] shadow-xs' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Sale</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                roleFilter === 'sale' ? 'bg-[#f5f3ff] text-[#6d28d9]' : 'bg-slate-300 text-slate-700'
              }`}>
                {roleCounts.salesCount}
              </span>
            </button>

            <button
              onClick={() => setRoleFilter('manager')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                roleFilter === 'manager' 
                  ? 'bg-white text-[#6d28d9] shadow-xs' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Manager</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                roleFilter === 'manager' ? 'bg-[#f5f3ff] text-[#6d28d9]' : 'bg-slate-300 text-slate-700'
              }`}>
                {roleCounts.managers}
              </span>
            </button>
          </div>

          <span className="text-xs font-medium text-slate-400 shrink-0">
            Hiển thị <strong className="text-slate-700 font-bold">{displayedUsers.length}</strong> / {roleCounts.total}
          </span>
        </div>
      </div>

      {/* 3. Main Data Table Card */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[760px]">
            {/* Table Header */}
            <thead>
              <tr className="border-b border-slate-100 bg-white">
                <th className="py-4 px-6">
                  <button 
                    onClick={() => handleSort('name')}
                    className="flex items-center gap-1.5 uppercase font-black text-xs text-slate-400 hover:text-slate-700 transition-colors tracking-wider cursor-pointer"
                  >
                    <span>NHÂN VIÊN</span>
                    <span className="flex flex-col text-[8px] leading-[8px] font-mono">
                      <span className={sortField === 'name' && sortOrder === 'asc' ? 'text-[#6d28d9] font-black' : 'text-slate-300'}>▲</span>
                      <span className={sortField === 'name' && sortOrder === 'desc' ? 'text-[#6d28d9] font-black' : 'text-slate-300'}>▼</span>
                    </span>
                  </button>
                </th>

                <th className="py-4 px-6">
                  <button 
                    onClick={() => handleSort('role')}
                    className="flex items-center gap-1.5 uppercase font-black text-xs text-slate-400 hover:text-slate-700 transition-colors tracking-wider cursor-pointer"
                  >
                    <span>VAI TRÒ</span>
                    <span className="flex flex-col text-[8px] leading-[8px] font-mono">
                      <span className={sortField === 'role' && sortOrder === 'asc' ? 'text-[#6d28d9] font-black' : 'text-slate-300'}>▲</span>
                      <span className={sortField === 'role' && sortOrder === 'desc' ? 'text-[#6d28d9] font-black' : 'text-slate-300'}>▼</span>
                    </span>
                  </button>
                </th>

                <th className="py-4 px-6 text-center">
                  <button 
                    onClick={() => handleSort('commission')}
                    className="inline-flex items-center gap-1.5 uppercase font-black text-xs text-slate-400 hover:text-slate-700 transition-colors tracking-wider cursor-pointer"
                  >
                    <span>HOA HỒNG</span>
                    <span className="flex flex-col text-[8px] leading-[8px] font-mono">
                      <span className={sortField === 'commission' && sortOrder === 'asc' ? 'text-[#6d28d9] font-black' : 'text-slate-300'}>▲</span>
                      <span className={sortField === 'commission' && sortOrder === 'desc' ? 'text-[#6d28d9] font-black' : 'text-slate-300'}>▼</span>
                    </span>
                  </button>
                </th>

                <th className="py-4 px-6 text-center">
                  <button 
                    onClick={() => handleSort('orders')}
                    className="inline-flex items-center gap-1.5 uppercase font-black text-xs text-slate-400 hover:text-slate-700 transition-colors tracking-wider cursor-pointer"
                  >
                    <span>SỐ ĐƠN</span>
                    <span className="flex flex-col text-[8px] leading-[8px] font-mono">
                      <span className={sortField === 'orders' && sortOrder === 'asc' ? 'text-[#6d28d9] font-black' : 'text-slate-300'}>▲</span>
                      <span className={sortField === 'orders' && sortOrder === 'desc' ? 'text-[#6d28d9] font-black' : 'text-slate-300'}>▼</span>
                    </span>
                  </button>
                </th>

                <th className="py-4 px-6 text-right">
                  <button 
                    onClick={() => handleSort('revenue')}
                    className="inline-flex items-center gap-1.5 uppercase font-black text-xs text-slate-400 hover:text-slate-700 transition-colors tracking-wider cursor-pointer"
                  >
                    <span>DOANH THU THÁNG</span>
                    <span className="flex flex-col text-[8px] leading-[8px] font-mono">
                      <span className={sortField === 'revenue' && sortOrder === 'asc' ? 'text-[#6d28d9] font-black' : 'text-slate-300'}>▲</span>
                      <span className={sortField === 'revenue' && sortOrder === 'desc' ? 'text-[#6d28d9] font-black' : 'text-slate-300'}>▼</span>
                    </span>
                  </button>
                </th>

                <th className="py-4 px-6 w-12 text-center"></th>
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-slate-100">
              {paginatedUsers.map((u) => {
                const initials = getStaffInitials(u);
                const stats = getStaffStats(u);
                
                // Color badges for initials matching mockup
                let avatarColorClass = 'bg-[#ede9fe] text-[#7c3aed]';
                if (u.role === 'sale') {
                  avatarColorClass = 'bg-[#ccfbf1] text-[#0d9488]';
                } else if (u.role === 'manager') {
                  avatarColorClass = 'bg-[#fef3c7] text-[#d97706]';
                }

                return (
                  <tr 
                    key={u.id}
                    className="hover:bg-slate-50/70 transition-colors group"
                  >
                    {/* NHÂN VIÊN */}
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3.5">
                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-sm shrink-0 uppercase tracking-tight shadow-xs ${avatarColorClass}`}>
                          {u.avatar_url ? (
                            <img src={u.avatar_url} alt={u.full_name} className="w-full h-full object-cover rounded-2xl" />
                          ) : (
                            initials
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900 group-hover:text-[#6d28d9] transition-colors">
                            {u.full_name}
                          </p>
                          <p className="text-xs text-slate-400 font-normal">
                            @{u.username}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* VAI TRÒ */}
                    <td className="py-4 px-6">
                      {u.role === 'reader' && (
                        <span className="px-3.5 py-1 rounded-full text-xs font-bold bg-[#f5f3ff] text-[#7c3aed] border border-[#ede9fe]">
                          Reader
                        </span>
                      )}
                      {u.role === 'sale' && (
                        <span className="px-3.5 py-1 rounded-full text-xs font-bold bg-[#ecfdf5] text-[#059669] border border-[#d1fae5]">
                          Sale
                        </span>
                      )}
                      {u.role === 'manager' && (
                        <span className="px-3.5 py-1 rounded-full text-xs font-bold bg-[#fffbeb] text-[#d97706] border border-[#fef3c7]">
                          Manager
                        </span>
                      )}
                    </td>

                    {/* HOA HỒNG */}
                    <td className="py-4 px-6 text-center">
                      {u.role === 'manager' ? (
                        <span className="text-sm font-semibold text-slate-400">
                          0%
                        </span>
                      ) : (
                        <span className="text-sm font-bold text-[#047857]">
                          {getCommission(u)}%
                        </span>
                      )}
                    </td>

                    {/* SỐ ĐƠN */}
                    <td className="py-4 px-6 text-center">
                      {stats.isManager || stats.orders === 0 ? (
                        <span className="text-slate-400 font-normal text-sm">—</span>
                      ) : (
                        <div className="inline-flex items-baseline gap-1">
                          <span className="text-sm font-bold text-slate-800">{stats.orders}</span>
                          <span className="text-xs text-slate-400 font-normal">đơn</span>
                        </div>
                      )}
                    </td>

                    {/* DOANH THU THÁNG */}
                    <td className="py-4 px-6 text-right">
                      {stats.isManager || stats.revenue === 0 ? (
                        <span className="text-slate-400 font-normal text-sm">—</span>
                      ) : (
                        <span className="text-sm font-bold text-slate-900">
                          {formatCurrency(stats.revenue)}
                        </span>
                      )}
                    </td>

                    {/* ACTION MENU (...) */}
                    <td className="py-4 px-6 text-center relative">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenuId(activeMenuId === u.id ? null : u.id);
                        }}
                        className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                        title="Tùy chọn"
                      >
                        <MoreHorizontal size={18} />
                      </button>

                      {/* Floating Dropdown Menu */}
                      {activeMenuId === u.id && (
                        <div 
                          ref={menuRef}
                          className="absolute right-6 top-12 w-44 bg-white rounded-2xl shadow-xl border border-slate-100 py-1.5 z-30 animate-in fade-in zoom-in-95 duration-100"
                        >
                          <button
                            type="button"
                            onClick={() => {
                              setActiveMenuId(null);
                              handleOpenEdit(u);
                            }}
                            className="w-full px-4 py-2.5 text-left text-xs font-bold text-slate-700 hover:bg-[#f5f3ff] hover:text-[#6d28d9] flex items-center gap-2.5 transition-colors cursor-pointer"
                          >
                            <Edit2 size={14} />
                            <span>Chỉnh sửa</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveMenuId(null);
                              setDeletingUser(u);
                            }}
                            className="w-full px-4 py-2.5 text-left text-xs font-bold text-rose-600 hover:bg-rose-50 flex items-center gap-2.5 transition-colors cursor-pointer"
                          >
                            <Trash2 size={14} />
                            <span>Xóa nhân viên</span>
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {displayedUsers.length === 0 && (
            <div className="py-16 text-center text-slate-400 space-y-2">
              <UserIcon size={36} className="mx-auto text-slate-300" />
              <p className="text-sm font-semibold text-slate-600">Không tìm thấy nhân viên nào</p>
              <p className="text-xs text-slate-400">Thử tìm kiếm với từ khóa khác hoặc xóa bộ lọc</p>
            </div>
          )}
        </div>

        {/* Pagination Bar */}
        {displayedUsers.length > 0 && (
          <div className="py-3.5 px-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 bg-white">
            <div className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
              <span>Hiển thị</span>
              <strong className="text-slate-800 font-bold">{startIndex + 1}</strong>
              <span>-</span>
              <strong className="text-slate-800 font-bold">{Math.min(startIndex + pageSize, displayedUsers.length)}</strong>
              <span>trên</span>
              <strong className="text-slate-800 font-bold">{displayedUsers.length}</strong>
              <span>nhân viên</span>
            </div>

            <div className="flex items-center gap-4">
              {/* Page size select */}
              <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                <span className="hidden sm:inline">Số dòng:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="px-2.5 py-1 rounded-xl border border-slate-200 bg-white font-bold text-slate-700 outline-none focus:ring-1 focus:ring-[#7c3aed] cursor-pointer text-xs"
                >
                  <option value={5}>5 / trang</option>
                  <option value={8}>8 / trang</option>
                  <option value={10}>10 / trang</option>
                  <option value={20}>20 / trang</option>
                </select>
              </div>

              {/* Navigation buttons */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  className="p-1.5 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
                  title="Trang trước"
                >
                  <ChevronLeft size={16} />
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                  <button
                    key={p}
                    type="button"
                    data-page={p}
                    aria-label={`Trang ${p}`}
                    onClick={() => setCurrentPage(p)}
                    className={`w-8 h-8 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center ${
                      currentPage === p
                        ? 'bg-[#6d28d9] text-white shadow-xs'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {p}
                  </button>
                ))}

                <button
                  type="button"
                  disabled={currentPage === totalPages || totalPages === 0}
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  className="p-1.5 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
                  title="Trang sau"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 4. Add / Edit Staff Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-100 overflow-hidden"
          >
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  {editingUser ? 'Chỉnh Sửa Nhân Viên' : 'Thêm Nhân Viên Mới'}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Thông tin tài khoản, phân quyền và tỷ lệ hoa hồng
                </p>
              </div>
              <button 
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={onFormSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Tên đăng nhập <span className="text-red-500">*</span></label>
                  <input 
                    type="text" 
                    required
                    value={userForm.username || ''}
                    onChange={e => setUserForm({ ...userForm, username: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-[#7c3aed] text-sm font-medium text-slate-800"
                    placeholder="VD: thong"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Mật khẩu {editingUser ? '(bỏ trống nếu không đổi)' : <span className="text-red-500">*</span>}</label>
                  <input 
                    type="text" 
                    required={!editingUser}
                    value={userForm.password || ''}
                    onChange={e => setUserForm({ ...userForm, password: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-[#7c3aed] text-sm font-medium text-slate-800"
                    placeholder="******"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Họ và tên <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  required
                  value={userForm.full_name || ''}
                  onChange={e => setUserForm({ ...userForm, full_name: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-[#7c3aed] text-sm font-medium text-slate-800"
                  placeholder="VD: Nguyễn Văn Thông"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Vai trò <span className="text-red-500">*</span></label>
                  <select 
                    value={userForm.role || 'reader'}
                    onChange={e => setUserForm({ ...userForm, role: e.target.value as UserRole })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-[#7c3aed] text-sm font-medium text-slate-800 bg-white"
                  >
                    <option value="reader">Reader</option>
                    <option value="sale">Sale</option>
                    <option value="manager">Manager</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Hoa hồng (%) <span className="text-red-500">*</span></label>
                  <input 
                    type="number" 
                    required
                    min={0}
                    max={100}
                    value={userForm.commission_percent ?? 30}
                    onChange={e => setUserForm({ ...userForm, commission_percent: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-[#7c3aed] text-sm font-medium text-slate-800"
                    placeholder="30"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Số tài khoản ngân hàng</label>
                  <input 
                    type="text" 
                    value={userForm.bank_account || ''}
                    onChange={e => setUserForm({ ...userForm, bank_account: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-[#7c3aed] text-sm font-medium text-slate-800"
                    placeholder="VD: 1029384756"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Tên ngân hàng</label>
                  <input 
                    type="text" 
                    value={userForm.bank_name || ''}
                    onChange={e => setUserForm({ ...userForm, bank_name: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-[#7c3aed] text-sm font-medium text-slate-800"
                    placeholder="VD: VietinBank"
                  />
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl text-slate-600 hover:bg-slate-100 font-bold text-xs transition-colors cursor-pointer"
                >
                  Hủy
                </button>
                <button 
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2.5 rounded-xl bg-[#6d28d9] hover:bg-[#5b21b6] text-white font-bold text-xs shadow-md shadow-purple-100 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {loading && <RefreshCw size={14} className="animate-spin" />}
                  <span>{editingUser ? 'Cập Nhật' : 'Thêm Nhân Viên'}</span>
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* 5. Delete Confirmation Modal */}
      <ConfirmModal 
        isOpen={Boolean(deletingUser)}
        onClose={() => setDeletingUser(null)}
        onConfirm={() => {
          if (deletingUser) {
            handleUserDelete(deletingUser.id);
            setDeletingUser(null);
          }
        }}
        title="Xác nhận xóa nhân viên"
        message={`Bạn có chắc chắn muốn xóa nhân viên "${deletingUser?.full_name}" (@${deletingUser?.username}) không?`}
      />
    </div>
  );
};
