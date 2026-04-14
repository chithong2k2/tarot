import React from 'react';
import { 
  TrendingUp, 
  DollarSign, 
  Receipt, 
  Wallet, 
  RefreshCcw, 
  Trophy,
  Calendar,
  User as UserIcon,
  Edit2,
  Trash2,
  FileDown,
  ChevronDown,
  Facebook
} from 'lucide-react';
import { motion } from 'motion/react';
import { 
  BarChart, 
  Bar, 
  Line,
  ComposedChart,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';
import { User, SaleRecord, DashboardSummary, AdHistoryRecord } from '../../types';
import { firebaseService } from '../../services/firebaseService';
import { StatCard, formatVND } from '../DashboardComponents';
import { exportToExcel } from '../../utils/export';
import { getVNDayName } from '../../utils/dateUtils';

import { ConfirmModal } from '../ConfirmModal';

interface DashboardViewProps {
  user: User;
  summary: DashboardSummary | null;
  adHistory: AdHistoryRecord[];
  fetchData: () => void;
  sales: SaleRecord[];
  users: User[];
  selectedReader: string;
  setSelectedReader: (reader: string) => void;
  selectedDay: string;
  setSelectedDay: (day: string) => void;
  setEditingSale: (sale: SaleRecord | null) => void;
  setView: (view: any) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  user,
  summary,
  adHistory,
  fetchData,
  sales,
  users,
  selectedReader,
  setSelectedReader,
  selectedDay,
  setSelectedDay,
  setEditingSale,
  setView
}) => {
  const [staffType, setStaffType] = React.useState<'reader' | 'sale'>(user.role === 'sale' ? 'sale' : 'reader');
  const [showConfirmSeed, setShowConfirmSeed] = React.useState(false);
  const [isSeeding, setIsSeeding] = React.useState(false);

  const [showConfirmReset, setShowConfirmReset] = React.useState(false);
  const [isResetting, setIsResetting] = React.useState(false);
  const [deletingSale, setDeletingSaleId] = React.useState<SaleRecord | null>(null);
  const [isReaderDropdownOpen, setIsReaderDropdownOpen] = React.useState(false);

  const dropdownRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsReaderDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getDayName = (dateStr: string) => {
    try {
      // Use Vietnam timezone to ensure the day name is correct regardless of browser location
      const date = new Date(`${dateStr}T00:00:00+07:00`);
      if (isNaN(date.getTime())) return 'N/A';
      const days = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
      return days[date.getDay()];
    } catch (e) {
      return 'N/A';
    }
  };

  return (
    <motion.div 
      key="dashboard"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-8"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Tổng Quan Doanh Thu</h2>
          <p className="text-slate-500">Dữ liệu tính từ Thứ 2 đến Chủ Nhật tuần này</p>
        </div>
        {user.role === 'manager' && (
          <div className="flex items-center gap-3">
            <button 
              onClick={() => summary && exportToExcel(sales, users, summary)}
              className="flex items-center space-x-2 bg-emerald-50 border border-emerald-100 px-4 py-2 rounded-xl text-emerald-700 hover:bg-emerald-100 transition-colors shadow-sm"
            >
              <FileDown size={18} />
              <span>Xuất Excel</span>
            </button>
            {!showConfirmReset ? (
              <button 
                onClick={() => setShowConfirmReset(true)}
                className="flex items-center space-x-2 bg-white border border-slate-200 px-4 py-2 rounded-xl text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
              >
                <RefreshCcw size={18} />
                <span>Reset Tuần Mới</span>
              </button>
            ) : (
              <div className="flex items-center bg-red-50 border border-red-100 rounded-xl p-1 gap-1">
                <span className="text-[10px] font-bold text-red-700 px-2 uppercase">Reset?</span>
                <button 
                  disabled={isResetting}
                  onClick={async () => {
                    try {
                      setIsResetting(true);
                      await firebaseService.resetWeek();
                      window.alert('Đã reset tuần mới thành công! Toàn bộ giao dịch và lịch trực đã được xóa.');
                      fetchData();
                      setShowConfirmReset(false);
                    } catch (err) {
                      window.alert('Lỗi: ' + (err instanceof Error ? err.message : String(err)));
                    } finally {
                      setIsResetting(false);
                    }
                  }}
                  className="bg-red-600 text-white text-xs px-3 py-1.5 rounded-lg hover:bg-red-700 transition-colors"
                >
                  {isResetting ? '...' : 'CÓ'}
                </button>
                <button 
                  disabled={isResetting}
                  onClick={() => setShowConfirmReset(false)}
                  className="bg-slate-200 text-slate-700 text-xs px-3 py-1.5 rounded-lg hover:bg-slate-300 transition-colors"
                >
                  HỦY
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        <StatCard 
          title="Tổng Doanh Thu" 
          value={formatVND(summary?.totalRevenue || 0)} 
          icon={<TrendingUp size={24} />} 
          color="bg-indigo-600"
        />
        {user.role === 'manager' && (
          <>
            <StatCard 
              title="Tổng Hoa Hồng" 
              value={formatVND((summary?.totalReaderCommission || 0) + (summary?.totalSaleCommission || 0))} 
              icon={<Wallet size={24} />} 
              color="bg-purple-600"
            />
            <StatCard 
              title="Chi Phí Ads" 
              value={formatVND(summary?.totalAdSpend || 0)} 
              icon={<Facebook size={24} />} 
              color="bg-blue-600"
            />
            <StatCard 
              title="Lợi Nhuận Ròng" 
              value={formatVND(summary?.netProfit || 0)} 
              icon={<DollarSign size={24} />} 
              color="bg-emerald-600"
            />
          </>
        )}
        {user.role !== 'manager' && (
          <StatCard 
            title="Hoa Hồng Của Bạn" 
            value={formatVND(user.role === 'reader' ? (summary?.totalReaderCommission || 0) : (summary?.totalSaleCommission || 0))} 
            icon={<Wallet size={24} />} 
            color="bg-purple-600"
          />
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-100 card-shadow">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-slate-900">
              {user.role === 'manager' ? 'Biểu Đồ Doanh Thu & Lợi Nhuận' : 'Biểu Đồ Doanh Thu & Hoa Hồng'}
            </h3>
            <div className="flex flex-wrap items-center gap-4 text-xs font-bold">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 bg-indigo-600/60 rounded-sm"></div>
                <span className="text-slate-500">Doanh thu</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
                <span className="text-slate-500">
                  {user.role === 'manager' ? 'Lợi nhuận' : 'Hoa hồng'}
                </span>
              </div>
              {user.role === 'manager' && (
                <>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 bg-rose-500 rounded-full"></div>
                    <span className="text-slate-500">Chi phí Ads</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                    <span className="text-slate-500">Hoa hồng</span>
                  </div>
                </>
              )}
            </div>
          </div>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={summary?.dailyStats || []}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 12 }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 12 }}
                  tickFormatter={(value) => `${value / 1000}k`}
                />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  formatter={(value: number, name: string) => {
                    const labels: Record<string, string> = {
                      revenue: 'Doanh thu',
                      profit: 'Lợi nhuận',
                      adSpend: 'Chi phí Ads',
                      commission: 'Hoa hồng'
                    };
                    return [formatVND(value), labels[name] || name];
                  }}
                />
                <Bar dataKey="revenue" radius={[6, 6, 0, 0]}>
                  {(summary?.dailyStats || []).map((entry, index) => {
                    const todayName = getVNDayName();
                    const isToday = entry.name === todayName;
                    
                    return (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={isToday ? '#4f46e5' : '#818cf8'} 
                        fillOpacity={isToday ? 1 : 0.6}
                      />
                    );
                  })}
                </Bar>
                <Line 
                  type="monotone" 
                  dataKey={user.role === 'manager' ? 'profit' : 'commission'} 
                  stroke="#10b981" 
                  strokeWidth={3} 
                  dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                />
                {user.role === 'manager' && (
                  <>
                    <Line 
                      type="monotone" 
                      dataKey="adSpend" 
                      stroke="#f43f5e" 
                      strokeWidth={2} 
                      strokeDasharray="5 5"
                      dot={{ r: 3, fill: '#f43f5e' }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="commission" 
                      stroke="#8b5cf6" 
                      strokeWidth={2} 
                      dot={{ r: 3, fill: '#8b5cf6' }}
                    />
                  </>
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Performers */}
        {user.role === 'manager' && (
          <div className="space-y-4">
            <div className="bg-white p-6 rounded-2xl border border-slate-100 card-shadow">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-slate-900">Top Reader</h3>
                <Trophy className="text-amber-500" size={24} />
              </div>
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 font-bold text-xl">
                  {summary?.topReader.name.charAt(0)}
                </div>
                <div>
                  <p className="font-bold text-slate-900">{summary?.topReader.name}</p>
                  <p className="text-sm text-slate-500">{formatVND(summary?.topReader.amount || 0)}</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-100 card-shadow">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-slate-900">Top Sale</h3>
                <Trophy className="text-slate-400" size={24} />
              </div>
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 font-bold text-xl">
                  {summary?.topSale.name.charAt(0)}
                </div>
                <div>
                  <p className="font-bold text-slate-900">{summary?.topSale.name}</p>
                  <p className="text-sm text-slate-500">{formatVND(summary?.topSale.amount || 0)}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Detailed Table Section */}
      <div className="space-y-6">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-visible">
          {/* Filters & Day Selector */}
          <div className="p-6 border-b border-slate-100 space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="flex flex-wrap items-center gap-4">
                <h3 className="text-lg font-bold text-slate-900 uppercase mr-2">Chi tiết giao dịch</h3>
                {user.role === 'manager' && (
                  <div className="flex items-center bg-slate-100 p-1 rounded-xl">
                    <button 
                      onClick={() => {
                        setStaffType('reader');
                        setSelectedReader('All');
                      }}
                      className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${staffType === 'reader' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                      Reader
                    </button>
                    <button 
                      onClick={() => {
                        setStaffType('sale');
                        setSelectedReader('All');
                      }}
                      className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${staffType === 'sale' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                      Sale
                    </button>
                  </div>
                )}
                {user.role === 'manager' && (
                  <div className="relative" ref={dropdownRef}>
                    <button 
                      onClick={() => setIsReaderDropdownOpen(!isReaderDropdownOpen)}
                      className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 min-w-[200px] cursor-pointer transition-colors hover:bg-slate-100"
                    >
                      <span className="truncate">
                        {selectedReader === 'All' 
                          ? `Tất cả ${staffType === 'reader' ? 'Reader' : 'Sale'}` 
                          : users.find(u => u.id === selectedReader)?.full_name || selectedReader}
                      </span>
                      <ChevronDown size={16} className={`ml-2 text-slate-400 transition-transform ${isReaderDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>
                    
                    {isReaderDropdownOpen && (
                      <div className="absolute top-full left-0 mt-2 w-full bg-white border border-slate-100 rounded-xl shadow-xl z-[100] max-h-60 overflow-y-auto py-2 animate-in fade-in slide-in-from-top-2 duration-200">
                        <button
                          onClick={() => {
                            setSelectedReader('All');
                            setIsReaderDropdownOpen(false);
                          }}
                          className={`w-full text-left px-4 py-2 text-sm transition-colors hover:bg-slate-50 ${selectedReader === 'All' ? 'text-indigo-600 font-bold bg-indigo-50/50' : 'text-slate-600'}`}
                        >
                          Tất cả {staffType === 'reader' ? 'Reader' : 'Sale'}
                        </button>
                        {users.filter(u => u.role === staffType).map(u => (
                          <button
                            key={u.id}
                            onClick={() => {
                              setSelectedReader(u.id);
                              setIsReaderDropdownOpen(false);
                            }}
                            className={`w-full text-left px-4 py-2 text-sm transition-colors hover:bg-slate-50 ${selectedReader === u.id ? 'text-indigo-600 font-bold bg-indigo-50/50' : 'text-slate-600'}`}
                          >
                            {u.full_name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Day Selector Buttons */}
              <div className="flex flex-wrap gap-1.5">
                {['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật'].map(day => (
                  <button
                    key={day}
                    onClick={() => setSelectedDay(day)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                      selectedDay === day 
                        ? 'bg-indigo-900 border-indigo-900 text-white shadow-sm' 
                        : 'bg-white border-slate-200 text-slate-500 hover:border-indigo-200 hover:bg-indigo-50/30 hover:text-indigo-600'
                    }`}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50/50 text-slate-400 uppercase text-[10px] tracking-wider font-bold border-b border-slate-100">
                  <th className="px-6 py-4">{user.role === 'sale' || (user.role === 'manager' && staffType === 'sale') ? 'Reader' : 'Nhân Viên Sale'}</th>
                  <th className="px-6 py-4">Khách Hàng</th>
                  <th className="px-6 py-4">Gói Dịch Vụ</th>
                  <th className="px-6 py-4 text-right">Số Tiền</th>
                  <th className="px-6 py-4 text-right">Tiền Tip</th>
                  {user.role === 'manager' && <th className="px-6 py-4 text-right">Thao tác</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {(() => {
                  const effectiveStaffType = user.role === 'manager' ? staffType : user.role;
                  const groupedSales = sales.reduce((acc: Record<string, SaleRecord[]>, sale) => {
                    const rawId = effectiveStaffType === 'reader' 
                      ? (sale.reader_id || (sale as any).reader_name)
                      : (sale.sale_id || (sale as any).sale_name);
                    
                    if (!rawId || rawId === 'none' || rawId === 'N/A') return acc;
                    
                    const staff = users.find(u => 
                      u.id.toLowerCase() === String(rawId).toLowerCase() || 
                      u.full_name.toLowerCase() === String(rawId).toLowerCase()
                    );
                    const sId = staff?.id || rawId;

                    if (selectedReader !== 'All' && sId !== selectedReader) return acc;
                    
                    // Only group if there are sales for the selected day
                    if (getDayName(sale.date) === selectedDay) {
                      if (!acc[sId]) acc[sId] = [];
                      acc[sId].push(sale);
                    }
                    return acc;
                  }, {});

                  const entries = Object.entries(groupedSales);

                  if (entries.length === 0) {
                    return (
                      <tr>
                        <td colSpan={user.role === 'manager' ? 6 : 5} className="px-6 py-12 text-center">
                          <div className="flex flex-col items-center justify-center text-slate-400">
                            <Calendar size={48} className="mb-4 opacity-20" />
                            <p className="font-medium">Không có giao dịch nào trong ngày {selectedDay}</p>
                          </div>
                        </td>
                      </tr>
                    );
                  }

                  return entries.map(([staffId, staffSales]) => {
                    const staff = users.find(u => u.id === staffId || u.full_name === staffId);
                    const staffName = staff?.full_name || staffId || 'Không xác định';
                    const commissionPercent = staff?.commission_percent || 0;

                    // Calculate stats for this specific staff
                    const todayAmount = (staffSales as SaleRecord[]).reduce((sum, s) => sum + (Number(s.amount) || 0), 0);
                    const todayTip = (staffSales as SaleRecord[]).reduce((sum, s) => sum + (Number(s.tip) || 0), 0);
                    const todayRevenue = todayAmount + todayTip;
                    
                    // Reader gets % of amount. Sale gets % of amount only.
                    const todayCommission = (todayAmount * commissionPercent / 100);

                    // Weekly stats for this staff
                    const weeklySales = sales.filter(s => {
                      const rawId = effectiveStaffType === 'reader' 
                        ? (s.reader_id || (s as any).reader_name)
                        : (s.sale_id || (s as any).sale_name);
                      const sStaff = users.find(u => 
                        u.id.toLowerCase() === String(rawId).toLowerCase() || 
                        u.full_name.toLowerCase() === String(rawId).toLowerCase()
                      );
                      return (sStaff?.id || rawId) === staffId;
                    });
                    const weeklyAmount = weeklySales.reduce((sum, s) => sum + (Number(s.amount) || 0), 0);
                    const weeklyTip = weeklySales.reduce((sum, s) => sum + (Number(s.tip) || 0), 0);
                    const weeklyRevenue = weeklyAmount + weeklyTip;
                    
                    const weeklyCommission = (weeklyAmount * commissionPercent / 100);

                    return (
                      <React.Fragment key={staffId}>
                        {/* Group Header Row */}
                        <tr className="bg-slate-50 border-y border-slate-100/50">
                          <td colSpan={user.role === 'manager' ? 6 : 5} className="px-6 py-4">
                            <div className="flex items-center space-x-3">
                              <div className="w-1.5 h-6 bg-indigo-600 rounded-full"></div>
                              <div className="flex items-center bg-indigo-50 px-4 py-2 rounded-xl border border-indigo-100 shadow-sm">
                                <span className="font-black text-indigo-900 text-[13px] uppercase tracking-widest">
                                  {effectiveStaffType === 'reader' ? 'Reader' : 'Sale'}: {staffName}
                                </span>
                              </div>
                            </div>
                          </td>
                        </tr>
                        {/* Data Rows */}
                        {(staffSales as SaleRecord[]).map(s => {
                          const otherStaffId = effectiveStaffType === 'reader' 
                            ? (s.sale_id || (s as any).sale_name)
                            : (s.reader_id || (s as any).reader_name);
                          
                          const otherStaff = users.find(u => u.id === otherStaffId || u.full_name === otherStaffId);
                          const otherStaffName = otherStaff?.full_name || otherStaffId || 'Không xác định';
                          
                          return (
                            <tr key={s.id} className="group hover:bg-slate-50/40 transition-colors">
                              <td className="px-6 py-5 text-slate-500">{otherStaffName}</td>
                              <td className="px-6 py-5 font-semibold text-slate-800">{s.customer_name}</td>
                              <td className="px-6 py-5 text-slate-500">{s.package_name}</td>
                              <td className="px-6 py-5 text-right font-bold text-slate-900">{formatVND(s.amount)}</td>
                              <td className="px-6 py-5 text-right text-emerald-600 font-bold">{formatVND(s.tip)}</td>
                              {user.role === 'manager' && (
                                <td className="px-6 py-5 text-right">
                                  <div className="flex items-center justify-end space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button 
                                      onClick={() => {
                                        setEditingSale(s);
                                        setView('entry');
                                      }}
                                      className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                                      title="Sửa"
                                    >
                                      <Edit2 size={16} />
                                    </button>
                                    <button 
                                      onClick={() => setDeletingSaleId(s)}
                                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                      title="Xóa"
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                  </div>
                                </td>
                              )}
                            </tr>
                          );
                        })}

                        {/* Summary Bar for Reader */}
                        <tr className="bg-slate-50/30">
                          <td colSpan={user.role === 'manager' ? 6 : 5} className="px-6 py-6 border-t border-slate-100">
                            <div className="bg-white rounded-xl border border-slate-100 p-4 flex flex-col md:flex-row items-center justify-between gap-6">
                              {/* Left side: Revenue text */}
                              <div className="flex flex-wrap items-center gap-8">
                                <div className="flex flex-col">
                                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Doanh Thu Hôm Nay</span>
                                  <span className="text-xl font-bold text-blue-600">{formatVND(todayRevenue)}</span>
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Doanh Thu Tuần Này</span>
                                  <span className="text-xl font-bold text-slate-900">{formatVND(weeklyRevenue)}</span>
                                </div>
                              </div>

                              {/* Right side: Commission Sub-container */}
                              <div className="flex items-center justify-between gap-6 bg-emerald-50 px-6 py-4 rounded-xl border border-emerald-100/50 w-full md:w-auto min-w-[350px]">
                                <div className="flex flex-col">
                                  <span className="text-[10px] font-bold text-emerald-600/70 uppercase tracking-widest mb-1">Hoa Hồng ({commissionPercent}%)</span>
                                  <span className="text-xl font-bold text-emerald-700">{formatVND(weeklyCommission)}</span>
                                  <span className="text-[9px] text-emerald-600/50 font-medium mt-1 text-nowrap">Hôm nay: {formatVND(todayCommission)}</span>
                                </div>
                                {effectiveStaffType === 'reader' && (
                                  <div className="flex flex-col border-l border-emerald-200/50 pl-6">
                                    <span className="text-[10px] font-bold text-emerald-600/70 uppercase tracking-widest mb-1">Tiền Tip (100%)</span>
                                    <span className="text-xl font-bold text-emerald-700">{formatVND(weeklyTip)}</span>
                                    <span className="text-[9px] text-emerald-600/50 font-medium mt-1 text-nowrap">Hôm nay: {formatVND(todayTip)}</span>
                                  </div>
                                )}
                                <div className="bg-emerald-100 p-3 rounded-full hidden sm:block">
                                  <Wallet className="text-emerald-600" size={24} />
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      </React.Fragment>
                    );
                  });
                })()}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <ConfirmModal 
        isOpen={!!deletingSale}
        onClose={() => setDeletingSaleId(null)}
        onConfirm={async () => {
          if (deletingSale) {
            const res = await firebaseService.deleteSaleRecord(deletingSale.id);
            if (res.success) fetchData();
            else alert(res.message || 'Xóa thất bại');
          }
        }}
        title="Xác nhận xóa giao dịch"
        message={`Bạn có chắc chắn muốn xóa giao dịch của khách hàng "${deletingSale?.customer_name}"? Hành động này không thể hoàn tác.`}
      />
    </motion.div>
  );
};
