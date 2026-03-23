import React, { useState } from 'react';
import { 
  Search, 
  Calendar, 
  TrendingUp, 
  Wallet,
  Filter,
  FileDown,
  Edit2,
  Trash2,
  User as UserIcon
} from 'lucide-react';
import { motion } from 'motion/react';
import { SaleRecord, User } from '../../types';
import { formatVND } from '../DashboardComponents';
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
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [deletingSale, setDeletingSale] = useState<SaleRecord | null>(null);

  const readers = users.filter(u => u.role === 'reader');
  const salesStaff = users.filter(u => u.role === 'sale');

  const filteredSales = sales.filter(s => {
    const matchesSearch = s.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         s.package_name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesReader = filterReader === 'All' || s.reader_id === filterReader || (s as any).reader_name === filterReader;
    const matchesSale = filterSale === 'All' || s.sale_id === filterSale || (s as any).sale_name === filterSale;
    
    const saleDate = new Date(s.date);
    const matchesStart = !startDate || saleDate >= new Date(startDate);
    const matchesEnd = !endDate || saleDate <= new Date(endDate);

    return matchesSearch && matchesReader && matchesSale && matchesStart && matchesEnd;
  }).sort((a, b) => {
    const timeA = a.created_at ? new Date(a.created_at).getTime() : new Date(a.date).getTime();
    const timeB = b.created_at ? new Date(b.created_at).getTime() : new Date(b.date).getTime();
    return timeB - timeA;
  });

  const totalRevenue = filteredSales.reduce((sum, s) => sum + (Number(s.amount) || 0) + (Number(s.tip) || 0), 0);
  const totalCount = filteredSales.length;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Lịch Sử Giao Dịch</h2>
          <p className="text-slate-500">Danh sách toàn bộ giao dịch trong hệ thống</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-white px-4 py-2 rounded-xl border border-slate-100 shadow-sm flex items-center space-x-4">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tổng Giao Dịch</span>
              <span className="text-lg font-bold text-slate-900">{totalCount}</span>
            </div>
            <div className="w-px h-8 bg-slate-100"></div>
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tổng Doanh Thu</span>
              <span className="text-lg font-bold text-indigo-600">{formatVND(totalRevenue)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 card-shadow space-y-4">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Tìm theo tên khách, gói dịch vụ..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-xl bg-slate-50 border border-slate-100 outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
            />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="relative">
              <select 
                value={filterReader}
                onChange={(e) => setFilterReader(e.target.value)}
                className="w-full pl-4 pr-10 py-3 rounded-xl bg-slate-50 border border-slate-100 outline-none focus:ring-2 focus:ring-indigo-500 appearance-none text-sm font-medium"
              >
                <option value="All">Tất cả Reader</option>
                {readers.map(r => <option key={r.id} value={r.id}>{r.full_name}</option>)}
              </select>
              <Filter className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
            </div>
            <div className="relative">
              <select 
                value={filterSale}
                onChange={(e) => setFilterSale(e.target.value)}
                className="w-full pl-4 pr-10 py-3 rounded-xl bg-slate-50 border border-slate-100 outline-none focus:ring-2 focus:ring-indigo-500 appearance-none text-sm font-medium"
              >
                <option value="All">Tất cả Sale</option>
                {salesStaff.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
              </select>
              <Filter className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
            </div>
            <div className="flex items-center space-x-2 bg-slate-50 border border-slate-100 rounded-xl px-3">
              <Calendar size={16} className="text-slate-400" />
              <input 
                type="date" 
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-transparent border-none outline-none text-xs font-medium w-full py-3"
                placeholder="Từ ngày"
              />
            </div>
            <div className="flex items-center space-x-2 bg-slate-50 border border-slate-100 rounded-xl px-3">
              <Calendar size={16} className="text-slate-400" />
              <input 
                type="date" 
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-transparent border-none outline-none text-xs font-medium w-full py-3"
                placeholder="Đến ngày"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-100 card-shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-wider font-bold">
                <th className="px-6 py-4">Ngày</th>
                <th className="px-6 py-4">Reader</th>
                <th className="px-6 py-4">Sale</th>
                <th className="px-6 py-4">Khách Hàng</th>
                <th className="px-6 py-4">Gói Dịch Vụ</th>
                <th className="px-6 py-4 text-right">Số Tiền</th>
                <th className="px-6 py-4 text-right">Tip</th>
                <th className="px-6 py-4 text-right">Tổng</th>
                {user.role === 'manager' && <th className="px-6 py-4 text-right">Thao tác</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredSales.length > 0 ? (
                filteredSales.map((s) => {
                  const reader = users.find(u => u.id === s.reader_id || u.full_name === s.reader_id);
                  const sale = users.find(u => u.id === s.sale_id || u.full_name === s.sale_id);
                  const total = (Number(s.amount) || 0) + (Number(s.tip) || 0);

                  return (
                    <tr key={s.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-6 py-4">
                        <span className="text-slate-600">{new Date(s.date).toLocaleDateString('vi-VN')}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-medium text-slate-900">{reader?.full_name || s.reader_id}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-slate-600">{sale?.full_name || s.sale_id}</span>
                      </td>
                      <td className="px-6 py-4 font-semibold text-slate-800">{s.customer_name}</td>
                      <td className="px-6 py-4 text-slate-500">{s.package_name}</td>
                      <td className="px-6 py-4 text-right font-medium text-slate-900">{formatVND(s.amount)}</td>
                      <td className="px-6 py-4 text-right text-emerald-600 font-medium">{formatVND(s.tip)}</td>
                      <td className="px-6 py-4 text-right font-bold text-indigo-600">{formatVND(total)}</td>
                      {user.role === 'manager' && (
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={() => {
                                setEditingSale(s);
                                setView('entry');
                              }}
                              className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button 
                              onClick={() => setDeletingSale(s)}
                              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={user.role === 'manager' ? 9 : 8} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center space-y-3">
                      <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center text-slate-300">
                        <TrendingUp size={24} />
                      </div>
                      <p className="text-slate-500">Không tìm thấy giao dịch nào.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmModal 
        isOpen={!!deletingSale}
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
        message={`Bạn có chắc chắn muốn xóa giao dịch của khách hàng "${deletingSale?.customer_name}"? Hành động này không thể hoàn tác.`}
      />
    </motion.div>
  );
};
