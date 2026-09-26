import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Search, 
  Calendar, 
  TrendingUp, 
  Download,
  Filter,
  Edit2, 
  Trash2,
  X,
  Plus,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  DollarSign,
  Gift,
  FileSpreadsheet,
  Check
} from 'lucide-react';
import { motion } from 'motion/react';
import * as XLSX from 'xlsx';
import { SaleRecord, User } from '../../types';
import { firebaseService } from '../../services/firebaseService';
import { ConfirmModal } from '../ConfirmModal';

interface SalesHistoryViewProps {
  user: User;
  sales: SaleRecord[];
  users: User[];
  fetchData: () => Promise<void>;
  setEditingSale: (sale: SaleRecord | null) => void;
  setView: (view: any) => void;
}

type DatePreset = 'all' | 'today' | 'yesterday' | 'this_week' | 'this_month' | 'custom';
type SortField = 'date' | 'customer' | 'staff' | 'amount' | 'tip' | 'total';
type SortOrder = 'asc' | 'desc';

// Currency formatting helper
const formatPrice = (val: number): string => {
  return new Intl.NumberFormat('vi-VN').format(val) + ' đ';
};

// Staff initials helper
const getStaffInitials = (name?: string): string => {
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

  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

export const SalesHistoryView: React.FC<SalesHistoryViewProps> = ({
  user,
  sales,
  users,
  fetchData,
  setEditingSale,
  setView
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterReader, setFilterReader] = useState('All');
  const [filterSale, setFilterSale] = useState('All');
  const [datePreset, setDatePreset] = useState<DatePreset>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  
  const [deletingSale, setDeletingSale] = useState<SaleRecord | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
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

  // Map users for fast lookups
  const userMap = useMemo(() => {
    const map = new Map<string, User>();
    users.forEach(u => map.set(u.id, u));
    return map;
  }, [users]);

  const readers = useMemo(() => users.filter(u => u.role === 'reader' && u.status !== 'inactive'), [users]);
  const salesStaff = useMemo(() => users.filter(u => u.role === 'sale' && u.status !== 'inactive'), [users]);

  // Helpers to get staff display names
  const getStaffName = (idOrName?: string) => {
    if (!idOrName) return 'N/A';
    if (userMap.has(idOrName)) return userMap.get(idOrName)!.full_name;
    const match = users.find(u => u.full_name === idOrName || u.username === idOrName);
    return match ? match.full_name : idOrName;
  };

  // Date preset calculations
  const calculatePresetDates = (preset: DatePreset) => {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    
    if (preset === 'today') {
      return { start: todayStr, end: todayStr };
    }
    if (preset === 'yesterday') {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const yStr = yesterday.toISOString().slice(0, 10);
      return { start: yStr, end: yStr };
    }
    if (preset === 'this_week') {
      const day = now.getDay();
      const diffToMonday = now.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(now.setDate(diffToMonday));
      return { start: monday.toISOString().slice(0, 10), end: todayStr };
    }
    if (preset === 'this_month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      return { start: firstDay.toISOString().slice(0, 10), end: todayStr };
    }
    return { start: '', end: '' };
  };

  const handlePresetChange = (preset: DatePreset) => {
    setDatePreset(preset);
    if (preset !== 'custom') {
      const { start, end } = calculatePresetDates(preset);
      setStartDate(start);
      setEndDate(end);
    }
  };

  // Reset pagination on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterReader, filterSale, startDate, endDate, datePreset, sortField, sortOrder]);

  // Filtered sales
  const filteredSales = useMemo(() => {
    return sales.filter(s => {
      // Search filter
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase().trim();
        const customerMatch = (s.customer_name || '').toLowerCase().includes(query);
        const packageMatch = (s.package_name || '').toLowerCase().includes(query);
        const readerMatch = getStaffName(s.reader_id).toLowerCase().includes(query);
        const saleMatch = getStaffName(s.sale_id).toLowerCase().includes(query);
        if (!customerMatch && !packageMatch && !readerMatch && !saleMatch) return false;
      }

      // Reader filter
      if (filterReader !== 'All') {
        const rName = getStaffName(s.reader_id);
        const target = getStaffName(filterReader);
        if (s.reader_id !== filterReader && rName !== target) return false;
      }

      // Sale filter
      if (filterSale !== 'All') {
        const sName = getStaffName(s.sale_id);
        const target = getStaffName(filterSale);
        if (s.sale_id !== filterSale && sName !== target) return false;
      }

      // Date range filter
      if (startDate) {
        const saleDateStr = s.date ? s.date.slice(0, 10) : '';
        if (saleDateStr && saleDateStr < startDate) return false;
      }
      if (endDate) {
        const saleDateStr = s.date ? s.date.slice(0, 10) : '';
        if (saleDateStr && saleDateStr > endDate) return false;
      }

      return true;
    });
  }, [sales, searchTerm, filterReader, filterSale, startDate, endDate, userMap]);

  // Sorted sales
  const sortedSales = useMemo(() => {
    const list = [...filteredSales];
    list.sort((a, b) => {
      let comparison = 0;
      if (sortField === 'date') {
        const timeA = a.created_at ? new Date(a.created_at).getTime() : new Date(a.date).getTime();
        const timeB = b.created_at ? new Date(b.created_at).getTime() : new Date(b.date).getTime();
        comparison = timeA - timeB;
      } else if (sortField === 'customer') {
        comparison = (a.customer_name || '').localeCompare(b.customer_name || '', 'vi');
      } else if (sortField === 'staff') {
        comparison = getStaffName(a.reader_id).localeCompare(getStaffName(b.reader_id), 'vi');
      } else if (sortField === 'amount') {
        comparison = (Number(a.amount) || 0) - (Number(b.amount) || 0);
      } else if (sortField === 'tip') {
        comparison = (Number(a.tip) || 0) - (Number(b.tip) || 0);
      } else if (sortField === 'total') {
        const totalA = (Number(a.amount) || 0) + (Number(a.tip) || 0);
        const totalB = (Number(b.amount) || 0) + (Number(b.tip) || 0);
        comparison = totalA - totalB;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });
    return list;
  }, [filteredSales, sortField, sortOrder, userMap]);

  // Aggregated KPI Stats
  const totalAmount = useMemo(() => {
    return filteredSales.reduce((acc, s) => acc + (Number(s.amount) || 0), 0);
  }, [filteredSales]);

  const totalTip = useMemo(() => {
    return filteredSales.reduce((acc, s) => acc + (Number(s.tip) || 0), 0);
  }, [filteredSales]);

  const grandTotal = totalAmount + totalTip;
  const avgOrderValue = filteredSales.length > 0 ? Math.round(grandTotal / filteredSales.length) : 0;

  const staffCommission = useMemo(() => {
    if (user.role === 'manager') return 0;
    const commissionPercent = user.commission_percent || 0;
    return (totalAmount * commissionPercent) / 100;
  }, [user, totalAmount]);

  const staffTotalIncome = useMemo(() => {
    if (user.role === 'manager') return 0;
    return staffCommission + (user.role === 'reader' ? totalTip : 0);
  }, [user.role, staffCommission, totalTip]);

  // Pagination calculations
  const totalPages = Math.ceil(sortedSales.length / pageSize) || 1;
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedSales = useMemo(() => {
    return sortedSales.slice(startIndex, startIndex + pageSize);
  }, [sortedSales, startIndex, pageSize]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  // Export to Excel
  const handleExportExcel = () => {
    if (sortedSales.length === 0) {
      alert('Không có dữ liệu giao dịch nào để xuất file');
      return;
    }

    const rows: any[] = [
      ['BÁO CÁO LỊCH SỬ GIAO DỊCH TAROT SHOP'],
      [`Ngày xuất: ${new Date().toLocaleDateString('vi-VN')} ${new Date().toLocaleTimeString('vi-VN')}`],
      [`Bộ lọc: ${datePreset !== 'all' ? `Thời gian (${startDate || 'Từ đầu'} đến ${endDate || 'Hiện tại'})` : 'Toàn bộ thời gian'}`],
      [`Tổng số đơn: ${sortedSales.length} đơn | Doanh thu: ${formatPrice(totalAmount)} | Tip: ${formatPrice(totalTip)} | Tổng cộng: ${formatPrice(grandTotal)}`],
      [],
      [
        'STT',
        'Ngày',
        'Giờ',
        'Khách Hàng',
        'Gói Dịch Vụ',
        'Reader',
        'Sale',
        'Số Tiền (VNĐ)',
        'Tiền Tip (VNĐ)',
        'Tổng Cộng (VNĐ)'
      ]
    ];

    sortedSales.forEach((s, idx) => {
      const datePart = s.date ? new Date(s.date).toLocaleDateString('vi-VN') : '';
      const timePart = s.created_at ? new Date(s.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '';
      const amount = Number(s.amount) || 0;
      const tip = Number(s.tip) || 0;
      const total = amount + tip;

      rows.push([
        idx + 1,
        datePart,
        timePart,
        s.customer_name || 'Khách',
        s.package_name || 'Gói Tarot',
        getStaffName(s.reader_id),
        getStaffName(s.sale_id),
        amount,
        tip,
        total
      ]);
    });

    // Summary row
    rows.push([]);
    rows.push([
      'TỔNG CỘNG', '', '', '', '', '', '', totalAmount, totalTip, grandTotal
    ]);

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(rows);

    // Auto column widths
    ws['!cols'] = [
      { wch: 6 },
      { wch: 14 },
      { wch: 10 },
      { wch: 22 },
      { wch: 18 },
      { wch: 20 },
      { wch: 18 },
      { wch: 16 },
      { wch: 14 },
      { wch: 18 }
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Giao_Dich');
    const fileName = `Lich_Su_Giao_Dich_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  // Format order date & time
  const formatDateTime = (s: SaleRecord) => {
    let dateStr = '26/09/2026';
    if (s.date) {
      const d = new Date(s.date);
      dateStr = d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    }
    let timeStr = '10:14';
    if (s.created_at) {
      const d = new Date(s.created_at);
      timeStr = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    }
    return { dateStr, timeStr };
  };

  return (
    <div className="space-y-6">
      {/* 1. Header with Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            {user.role === 'manager' ? 'Lịch Sử Giao Dịch' : 'Lịch Sử Đơn Của Tôi'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
            {user.role === 'manager'
              ? 'Nhật ký toàn bộ đơn hàng và phân chia doanh thu theo ca'
              : 'Nhật ký các đơn hàng bạn đã thực hiện và hoa hồng nhận được'}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button 
            type="button"
            onClick={handleExportExcel}
            className="px-4 py-2.5 rounded-2xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs shadow-xs flex items-center gap-2 transition-all cursor-pointer"
            title="Tải file Excel"
          >
            <Download size={15} className="text-emerald-600" />
            <span>Xuất Excel</span>
          </button>

          {(user.role === 'manager' || user.role === 'sale') && (
            <button 
              type="button"
              onClick={() => setView('entry')}
              className="px-5 py-2.5 rounded-2xl bg-[#6d28d9] hover:bg-[#5b21b6] text-white font-bold text-xs shadow-md shadow-purple-100 flex items-center gap-2 transition-all cursor-pointer shrink-0"
            >
              <Plus size={16} />
              <span>Nhập Đơn Mới</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Top 4 KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        {/* Card 1: Doanh Thu */}
        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">
              {user.role === 'manager' ? 'Tổng Doanh Thu' : 'Doanh Thu Của Bạn'}
            </span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-[#6d28d9] flex items-center justify-center font-bold">
              💰
            </div>
          </div>
          <div className="mt-3">
            <p className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {formatPrice(totalAmount)}
            </p>
            <p className="text-[11px] text-slate-400 font-medium mt-0.5">
              {user.role === 'manager' ? 'Tiền bán các gói Tarot' : 'Doanh số gói bạn phụ trách'}
            </p>
          </div>
        </div>

        {/* Card 2: Tiền Tip */}
        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">
              {user.role === 'reader' ? 'Tiền Tip Của Bạn' : 'Tổng Tiền Tip'}
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-[#059669] flex items-center justify-center font-bold">
              🎁
            </div>
          </div>
          <div className="mt-3">
            <p className="text-xl sm:text-2xl font-black text-[#047857] tracking-tight">
              {formatPrice(totalTip)}
            </p>
            <p className="text-[11px] text-slate-400 font-medium mt-0.5">
              {user.role === 'reader' ? '100% tiền tip thuộc về bạn' : 'Khách tip riêng cho Reader'}
            </p>
          </div>
        </div>

        {/* Card 3: Số Lượng Đơn */}
        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">
              {user.role === 'manager' ? 'Số Giao Dịch' : 'Số Đơn Của Bạn'}
            </span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              📋
            </div>
          </div>
          <div className="mt-3">
            <p className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {filteredSales.length} <span className="text-sm font-bold text-slate-400">đơn</span>
            </p>
            <p className="text-[11px] text-slate-400 font-medium mt-0.5">Đã hoàn thành</p>
          </div>
        </div>

        {/* Card 4: Giá Trị Trung Bình hoặc Hoa Hồng */}
        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">
              {user.role === 'manager' ? 'Trung Bình / Đơn' : 'Hoa Hồng Của Bạn'}
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              {user.role === 'manager' ? '🎯' : '💎'}
            </div>
          </div>
          <div className="mt-3">
            <p className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {user.role === 'manager' ? formatPrice(avgOrderValue) : formatPrice(staffCommission)}
            </p>
            <p className="text-[11px] text-slate-400 font-medium mt-0.5">
              {user.role === 'manager' ? 'Giá trị mỗi lượt coi bài' : `${user.commission_percent || 0}% theo doanh thu gói`}
            </p>
          </div>
        </div>
      </div>

      {/* 3. Search & Filter Bar */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-4 sm:p-5 space-y-3.5">
        {/* Row 1: Search + Reader Select + Sale Select */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input 
              type="text" 
              placeholder="Tìm theo tên khách, gói dịch vụ, Reader, Sale..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-9 py-2.5 rounded-2xl border border-slate-200 bg-slate-50/50 text-sm font-medium text-slate-800 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-[#7c3aed] focus:bg-white transition-all"
            />
            {searchTerm && (
              <button 
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Reader filter (manager only) */}
          {user.role === 'manager' && (
            <div className="w-full lg:w-56 shrink-0">
              <select 
                value={filterReader}
                onChange={(e) => setFilterReader(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 bg-slate-50/50 text-sm font-medium text-slate-800 outline-none focus:ring-2 focus:ring-[#7c3aed] focus:bg-white cursor-pointer"
              >
                <option value="All">Tất cả Reader</option>
                {readers.map(r => (
                  <option key={r.id} value={r.id}>{r.full_name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Sale filter (manager only) */}
          {user.role === 'manager' && (
            <div className="w-full lg:w-56 shrink-0">
              <select 
                value={filterSale}
                onChange={(e) => setFilterSale(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 bg-slate-50/50 text-sm font-medium text-slate-800 outline-none focus:ring-2 focus:ring-[#7c3aed] focus:bg-white cursor-pointer"
              >
                <option value="All">Tất cả Sale</option>
                {salesStaff.map(s => (
                  <option key={s.id} value={s.id}>{s.full_name}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Row 2: Date Presets & Custom Range */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1 border-t border-slate-100">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 [&::-webkit-scrollbar]:hidden">
            {(
              [
                { id: 'all', label: 'Tất cả' },
                { id: 'today', label: 'Hôm nay' },
                { id: 'yesterday', label: 'Hôm qua' },
                { id: 'this_week', label: 'Tuần này' },
                { id: 'this_month', label: 'Tháng này' },
                { id: 'custom', label: 'Tùy chọn' }
              ] as const
            ).map(preset => (
              <button
                key={preset.id}
                type="button"
                onClick={() => handlePresetChange(preset.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  datePreset === preset.id
                    ? 'bg-[#6d28d9] text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Custom Date Pickers (Shown only when 'custom' is active) */}
          {datePreset === 'custom' && (
            <div className="flex items-center gap-2">
              <input 
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="px-2.5 py-1 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-700 outline-none focus:ring-1 focus:ring-[#7c3aed]"
                title="Từ ngày"
              />
              <span className="text-slate-400 text-xs">-</span>
              <input 
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="px-2.5 py-1 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-700 outline-none focus:ring-1 focus:ring-[#7c3aed]"
                title="Đến ngày"
              />
            </div>
          )}

          <div className="text-xs text-slate-400 font-medium sm:text-right shrink-0">
            Hiển thị <strong className="text-slate-800 font-bold">{sortedSales.length}</strong> / {sales.length} đơn
          </div>
        </div>
      </div>

      {/* 4. Main Data Table Card */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            {/* Table Header */}
            <thead>
              <tr className="border-b border-slate-100 bg-white">
                <th className="py-4 px-6">
                  <button 
                    onClick={() => handleSort('date')}
                    className="flex items-center gap-1.5 uppercase font-black text-xs text-slate-400 hover:text-slate-700 transition-colors tracking-wider cursor-pointer"
                  >
                    <span>NGÀY & GIỜ</span>
                    <span className="flex flex-col text-[8px] leading-[8px] font-mono">
                      <span className={sortField === 'date' && sortOrder === 'asc' ? 'text-[#6d28d9] font-black' : 'text-slate-300'}>▲</span>
                      <span className={sortField === 'date' && sortOrder === 'desc' ? 'text-[#6d28d9] font-black' : 'text-slate-300'}>▼</span>
                    </span>
                  </button>
                </th>

                <th className="py-4 px-6">
                  <button 
                    onClick={() => handleSort('customer')}
                    className="flex items-center gap-1.5 uppercase font-black text-xs text-slate-400 hover:text-slate-700 transition-colors tracking-wider cursor-pointer"
                  >
                    <span>KHÁCH HÀNG & GÓI</span>
                    <span className="flex flex-col text-[8px] leading-[8px] font-mono">
                      <span className={sortField === 'customer' && sortOrder === 'asc' ? 'text-[#6d28d9] font-black' : 'text-slate-300'}>▲</span>
                      <span className={sortField === 'customer' && sortOrder === 'desc' ? 'text-[#6d28d9] font-black' : 'text-slate-300'}>▼</span>
                    </span>
                  </button>
                </th>

                <th className="py-4 px-6">
                  <button 
                    onClick={() => handleSort('staff')}
                    className="flex items-center gap-1.5 uppercase font-black text-xs text-slate-400 hover:text-slate-700 transition-colors tracking-wider cursor-pointer"
                  >
                    <span>NHÂN SỰ (READER → SALE)</span>
                    <span className="flex flex-col text-[8px] leading-[8px] font-mono">
                      <span className={sortField === 'staff' && sortOrder === 'asc' ? 'text-[#6d28d9] font-black' : 'text-slate-300'}>▲</span>
                      <span className={sortField === 'staff' && sortOrder === 'desc' ? 'text-[#6d28d9] font-black' : 'text-slate-300'}>▼</span>
                    </span>
                  </button>
                </th>

                <th className="py-4 px-6 text-right">
                  <button 
                    onClick={() => handleSort('amount')}
                    className="inline-flex items-center gap-1.5 uppercase font-black text-xs text-slate-400 hover:text-slate-700 transition-colors tracking-wider cursor-pointer"
                  >
                    <span>SỐ TIỀN</span>
                    <span className="flex flex-col text-[8px] leading-[8px] font-mono">
                      <span className={sortField === 'amount' && sortOrder === 'asc' ? 'text-[#6d28d9] font-black' : 'text-slate-300'}>▲</span>
                      <span className={sortField === 'amount' && sortOrder === 'desc' ? 'text-[#6d28d9] font-black' : 'text-slate-300'}>▼</span>
                    </span>
                  </button>
                </th>

                <th className="py-4 px-6 text-right">
                  <button 
                    onClick={() => handleSort('tip')}
                    className="inline-flex items-center gap-1.5 uppercase font-black text-xs text-slate-400 hover:text-slate-700 transition-colors tracking-wider cursor-pointer"
                  >
                    <span>TIP</span>
                    <span className="flex flex-col text-[8px] leading-[8px] font-mono">
                      <span className={sortField === 'tip' && sortOrder === 'asc' ? 'text-[#6d28d9] font-black' : 'text-slate-300'}>▲</span>
                      <span className={sortField === 'tip' && sortOrder === 'desc' ? 'text-[#6d28d9] font-black' : 'text-slate-300'}>▼</span>
                    </span>
                  </button>
                </th>

                <th className="py-4 px-6 text-right">
                  <button 
                    onClick={() => handleSort('total')}
                    className="inline-flex items-center gap-1.5 uppercase font-black text-xs text-slate-400 hover:text-slate-700 transition-colors tracking-wider cursor-pointer"
                  >
                    <span>TỔNG</span>
                    <span className="flex flex-col text-[8px] leading-[8px] font-mono">
                      <span className={sortField === 'total' && sortOrder === 'asc' ? 'text-[#6d28d9] font-black' : 'text-slate-300'}>▲</span>
                      <span className={sortField === 'total' && sortOrder === 'desc' ? 'text-[#6d28d9] font-black' : 'text-slate-300'}>▼</span>
                    </span>
                  </button>
                </th>

                {user.role === 'manager' && (
                  <th className="py-4 px-6 w-12 text-center"></th>
                )}
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-slate-100">
              {paginatedSales.map((s) => {
                const { dateStr, timeStr } = formatDateTime(s);
                const readerName = getStaffName(s.reader_id);
                const saleName = getStaffName(s.sale_id);
                const amount = Number(s.amount) || 0;
                const tip = Number(s.tip) || 0;
                const total = amount + tip;

                return (
                  <tr 
                    key={s.id}
                    className="hover:bg-slate-50/70 transition-colors group"
                  >
                    {/* NGÀY & GIỜ */}
                    <td className="py-4 px-6">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-slate-900">{dateStr}</span>
                        <span className="text-xs text-slate-400 font-mono mt-0.5">{timeStr}</span>
                      </div>
                    </td>

                    {/* KHÁCH HÀNG & GÓI */}
                    <td className="py-4 px-6">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-slate-900 group-hover:text-[#6d28d9] transition-colors">
                          {s.customer_name || 'Khách'}
                        </span>
                        <span className="text-xs text-slate-500 font-medium mt-0.5">
                          {s.package_name || 'Gói Tarot'}
                        </span>
                      </div>
                    </td>

                    {/* NHÂN SỰ (READER → SALE) */}
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#f5f3ff] text-[#6d28d9] text-xs font-bold border border-[#ede9fe]">
                          <span>{readerName}</span>
                        </span>
                        <span className="text-xs text-slate-400 font-medium">→</span>
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#ecfdf5] text-[#059669] text-xs font-bold border border-[#d1fae5]">
                          <span>{saleName}</span>
                        </span>
                      </div>
                    </td>

                    {/* SỐ TIỀN */}
                    <td className="py-4 px-6 text-right">
                      <span className="text-sm font-bold text-slate-900">
                        {formatPrice(amount)}
                      </span>
                    </td>

                    {/* TIP */}
                    <td className="py-4 px-6 text-right">
                      {tip > 0 ? (
                        <span className="text-xs font-bold text-[#059669] bg-emerald-50 px-2 py-0.5 rounded-lg">
                          + tip {formatPrice(tip)}
                        </span>
                      ) : (
                        <span className="text-slate-300 text-sm font-normal">—</span>
                      )}
                    </td>

                    {/* TỔNG */}
                    <td className="py-4 px-6 text-right">
                      <span className="text-sm font-black text-slate-900">
                        {formatPrice(total)}
                      </span>
                    </td>

                    {/* ACTION MENU (...) - Manager only */}
                    {user.role === 'manager' && (
                      <td className="py-4 px-6 text-center relative">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveMenuId(activeMenuId === s.id ? null : s.id);
                          }}
                          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                          title="Tùy chọn"
                        >
                          <MoreHorizontal size={18} />
                        </button>

                        {/* Floating Dropdown Menu */}
                        {activeMenuId === s.id && (
                          <div 
                            ref={menuRef}
                            className="absolute right-6 top-12 w-44 bg-white rounded-2xl shadow-xl border border-slate-100 py-1.5 z-30 animate-in fade-in zoom-in-95 duration-100"
                          >
                            <button
                              type="button"
                              onClick={() => {
                                setActiveMenuId(null);
                                setEditingSale(s);
                                setView('entry');
                              }}
                              className="w-full px-4 py-2.5 text-left text-xs font-bold text-slate-700 hover:bg-[#f5f3ff] hover:text-[#6d28d9] flex items-center gap-2.5 transition-colors cursor-pointer"
                            >
                              <Edit2 size={14} />
                              <span>Chỉnh sửa đơn</span>
                            </button>
                            
                            <button
                              type="button"
                              onClick={() => {
                                setActiveMenuId(null);
                                setDeletingSale(s);
                              }}
                              className="w-full px-4 py-2.5 text-left text-xs font-bold text-rose-600 hover:bg-rose-50 flex items-center gap-2.5 transition-colors cursor-pointer"
                            >
                              <Trash2 size={14} />
                              <span>Xóa đơn hàng</span>
                            </button>
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>

          {sortedSales.length === 0 && (
            <div className="py-16 text-center text-slate-400 space-y-2">
              <TrendingUp size={36} className="mx-auto text-slate-300" />
              <p className="text-sm font-semibold text-slate-600">Không tìm thấy giao dịch nào</p>
              <p className="text-xs text-slate-400">Thử thay đổi bộ lọc ngày, Reader hoặc từ khóa tìm kiếm</p>
            </div>
          )}
        </div>

        {/* Pagination Bar */}
        {sortedSales.length > 0 && (
          <div className="py-3.5 px-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 bg-white">
            <div className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
              <span>Hiển thị</span>
              <strong className="text-slate-800 font-bold">{startIndex + 1}</strong>
              <span>-</span>
              <strong className="text-slate-800 font-bold">{Math.min(startIndex + pageSize, sortedSales.length)}</strong>
              <span>trên</span>
              <strong className="text-slate-800 font-bold">{sortedSales.length}</strong>
              <span>giao dịch</span>
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
                  <option value={10}>10 / trang</option>
                  <option value={20}>20 / trang</option>
                  <option value={50}>50 / trang</option>
                  <option value={100}>100 / trang</option>
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

      {/* Delete Confirmation Modal */}
      <ConfirmModal 
        isOpen={Boolean(deletingSale)}
        onClose={() => setDeletingSale(null)}
        onConfirm={async () => {
          if (deletingSale) {
            const res = await firebaseService.deleteSaleRecord(deletingSale.id);
            if (res.success) {
              await fetchData();
              setDeletingSale(null);
            } else {
              alert(res.message || 'Xóa thất bại');
            }
          }
        }}
        title="Xác nhận xóa giao dịch"
        message={`Bạn có chắc chắn muốn xóa giao dịch của khách hàng "${deletingSale?.customer_name}" (${formatPrice((Number(deletingSale?.amount) || 0) + (Number(deletingSale?.tip) || 0))}) không?`}
      />
    </div>
  );
};
