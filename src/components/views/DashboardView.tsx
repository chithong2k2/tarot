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
  FileDown
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
import { User, SaleRecord, DashboardSummary } from '../../types';
import { firebaseService } from '../../services/firebaseService';
import { StatCard, formatVND } from '../DashboardComponents';
import { exportToExcel } from '../../utils/export';

import { ConfirmModal } from '../ConfirmModal';

interface DashboardViewProps {
  user: User;
  summary: DashboardSummary | null;
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

  const getDayName = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) {
        const parts = String(dateStr).split('-');
        const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
        if (isNaN(d.getTime())) return 'N/A';
        const days = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
        return days[d.getDay()];
      }
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
              title="Chi Phí Vận Hành" 
              value={formatVND(summary?.totalOperatingCosts || 0)} 
              icon={<Receipt size={24} />} 
              color="bg-orange-600"
            />
            <StatCard 
              title="Tổng Hoa Hồng" 
              value={formatVND((summary?.totalReaderCommission || 0) + (summary?.totalSaleCommission || 0))} 
              icon={<Wallet size={24} />} 
              color="bg-purple-600"
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
            <div className="flex items-center gap-4 text-xs font-bold">
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
            </div>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={(summary?.revenueByDay || []).map((item, index) => ({
                name: item.name,
                revenue: item.value,
                secondary: user.role === 'manager' 
                  ? (summary?.profitByDay[index]?.value || 0)
                  : user.role === 'reader'
                    ? (summary?.readerCommissionByDay[index]?.value || 0)
                    : (summary?.saleCommissionByDay[index]?.value || 0)
              }))}>
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
                  tickFormatter={(value) => `${value / 1000000}M`}
                />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  formatter={(value: number, name: string) => [
                    formatVND(value), 
                    name === 'revenue' ? 'Doanh thu' : (user.role === 'manager' ? 'Lợi nhuận' : 'Hoa hồng')
                  ]}
                />
                <Bar dataKey="revenue" radius={[6, 6, 0, 0]}>
                  {(summary?.revenueByDay || []).map((entry, index) => {
                    const days = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
                    const todayName = days[new Date().getDay()];
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
                  dataKey="secondary" 
                  stroke="#10b981" 
                  strokeWidth={3} 
                  dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                />
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
      <div className="bg-white rounded-2xl border border-slate-100 card-shadow overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h3 className="text-lg font-bold text-slate-900 uppercase">Chi tiết doanh thu theo ngày</h3>
          <div className="flex flex-wrap items-center gap-4">
            {user.role === 'manager' && (
              <div className="flex items-center space-x-3">
                <label className="text-sm font-medium text-slate-500">Xem theo:</label>
                <select 
                  value={staffType}
                  onChange={(e) => {
                    setStaffType(e.target.value as 'reader' | 'sale');
                    setSelectedReader('All');
                  }}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="reader">Reader</option>
                  <option value="sale">Sale</option>
                </select>
              </div>
            )}
            {user.role === 'manager' && (
              <div className="flex items-center space-x-3">
                <label className="text-sm font-medium text-slate-500">
                  {staffType === 'reader' ? 'Reader:' : 'Sale:'}
                </label>
                <select 
                  value={selectedReader}
                  onChange={(e) => setSelectedReader(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="All">Tất cả</option>
                  {users.filter(u => u.role === staffType).map(u => (
                    <option key={u.id} value={u.id}>{u.full_name}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="flex items-center space-x-3">
              <label className="text-sm font-medium text-slate-500">Ngày:</label>
              <select 
                value={selectedDay}
                onChange={(e) => setSelectedDay(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật'].map(day => (
                  <option key={day} value={day}>{day}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-8">
          {(() => {
            const groupedSales = sales.reduce((acc: Record<string, SaleRecord[]>, sale) => {
              const effectiveStaffType = user.role === 'manager' ? staffType : user.role;
              const rawId = effectiveStaffType === 'reader' 
                ? (sale.reader_id || (sale as any).reader_name)
                : (sale.sale_id || (sale as any).sale_name);
              
              if (!rawId || rawId === 'none' || rawId === 'N/A') return acc;
              
              // Try to find canonical ID
              const staff = users.find(u => 
                u.id.toLowerCase() === String(rawId).toLowerCase() || 
                u.full_name.toLowerCase() === String(rawId).toLowerCase()
              );
              const sId = staff?.id || rawId;

              if (selectedReader !== 'All' && sId !== selectedReader) return acc;
              if (!acc[sId]) acc[sId] = [];
              acc[sId].push(sale);
              return acc;
            }, {});

            const entries = Object.entries(groupedSales);

            if (entries.length === 0) {
              return (
                <div className="p-12 text-center">
                  <div className="bg-slate-50 rounded-3xl p-8 border-2 border-dashed border-slate-200">
                    <p className="text-slate-500 font-medium">Không tìm thấy dữ liệu giao dịch nào cho bộ lọc hiện tại.</p>
                    <p className="text-slate-400 text-sm mt-1">Vui lòng kiểm tra lại Reader/Sale hoặc Ngày được chọn.</p>
                  </div>
                </div>
              );
            }

            return entries.map(([staffId, staffSales]) => {
              const staff = users.find(u => u.id === staffId || u.full_name === staffId);
              const staffName = staff?.full_name || staffId || 'Không xác định';
              const effectiveStaffType = user.role === 'manager' ? staffType : user.role;
              
              const dailySales = (staffSales as SaleRecord[]).filter(s => getDayName(s.date) === selectedDay);
              const totalRevenueToday = dailySales.reduce((sum, s) => sum + (Number(s.amount) || 0) + (Number(s.tip) || 0), 0);
              const totalRevenueThisWeek = (staffSales as SaleRecord[]).reduce((sum, s) => sum + (Number(s.amount) || 0) + (Number(s.tip) || 0), 0);
              
              const commissionPercent = staff?.commission_percent || 0;
              const commissionAmount = (totalRevenueThisWeek * commissionPercent) / 100;

              if (dailySales.length === 0 && (staffSales as SaleRecord[]).length === 0) return null;

              return (
                <div key={staffId} className="space-y-4">
                  {user.role === 'manager' && (
                    <div className="flex items-center space-x-2 pb-2 border-b border-slate-100">
                      <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600">
                        <UserIcon size={16} />
                      </div>
                      <h4 className="font-bold text-slate-900">
                        {effectiveStaffType === 'reader' ? 'Reader:' : 'Sale:'} {staffName}
                      </h4>
                    </div>
                  )}

                  <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="text-slate-400 uppercase text-[10px] tracking-wider font-bold">
                        <th className="pb-3 pr-4">{effectiveStaffType === 'reader' ? 'Nhân Viên Sale' : 'Reader'}</th>
                        <th className="pb-3 pr-4">Khách Hàng</th>
                        <th className="pb-3 pr-4">Gói Dịch Vụ</th>
                        <th className="pb-3 pr-4 text-right">Số Tiền</th>
                        <th className="pb-3 text-right">Tiền Tip</th>
                        {user.role === 'manager' && <th className="pb-3 text-right">Thao tác</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {dailySales.length > 0 ? (
                        dailySales.map(s => {
                          const otherStaffId = effectiveStaffType === 'reader' 
                            ? (s.sale_id || (s as any).sale_name)
                            : (s.reader_id || (s as any).reader_name);
                          
                          const otherStaff = users.find(u => u.id === otherStaffId || u.full_name === otherStaffId);
                          const otherStaffName = otherStaff?.full_name || otherStaffId || 'Không xác định';
                          
                          return (
                            <tr key={s.id} className="group">
                              <td className="py-3 pr-4 text-slate-600">{otherStaffName}</td>
                              <td className="py-3 pr-4 font-medium text-slate-900">{s.customer_name}</td>
                              <td className="py-3 pr-4 text-slate-500">{s.package_name}</td>
                              <td className="py-3 pr-4 text-right font-medium text-slate-900">{formatVND(s.amount)}</td>
                              <td className="py-3 text-right text-emerald-600 font-medium">{formatVND(s.tip)}</td>
                              {user.role === 'manager' && (
                                <td className="py-3 text-right">
                                  <div className="flex items-center justify-end space-x-1">
                                    <button 
                                      onClick={() => {
                                        setEditingSale(s);
                                        setView('entry');
                                      }}
                                      className="p-1.5 text-slate-400 hover:text-indigo-600 transition-colors"
                                    >
                                      <Edit2 size={14} />
                                    </button>
                                    
                                    <button 
                                      onClick={() => setDeletingSaleId(s)}
                                      className="p-1.5 text-slate-400 hover:text-red-600 transition-colors"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                </td>
                              )}
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={user.role === 'manager' ? 6 : 5} className="py-4 text-center text-slate-400 italic">Không có dữ liệu cho ngày này</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="bg-slate-50 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="flex flex-col">
                    <span className="text-slate-500 text-xs uppercase font-bold tracking-wider">Doanh Thu Hôm Nay</span>
                    <span className="font-bold text-indigo-600 text-lg">{formatVND(totalRevenueToday)}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-slate-500 text-xs uppercase font-bold tracking-wider">Doanh Thu Tuần Này</span>
                    <span className="font-bold text-slate-900 text-lg">{formatVND(totalRevenueThisWeek)}</span>
                  </div>
                  <div className="flex flex-col bg-emerald-50 rounded-lg p-2 border border-emerald-100">
                    <div className="flex items-center justify-between">
                      <span className="text-emerald-700 text-xs uppercase font-bold tracking-wider">Hoa Hồng ({commissionPercent}%)</span>
                      <Wallet size={14} className="text-emerald-500" />
                    </div>
                    <span className="font-bold text-emerald-600 text-lg">{formatVND(commissionAmount)}</span>
                  </div>
                </div>
              </div>
            );
          });
        })()}

          {sales.length === 0 && (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Calendar className="text-slate-300" size={32} />
              </div>
              <p className="text-slate-500">Chưa có dữ liệu doanh thu tuần này</p>
            </div>
          )}
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
