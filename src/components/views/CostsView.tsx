import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Plus, Trash2, DollarSign, Calendar, Tag, FileText, Loader2 } from 'lucide-react';
import { OperatingCost, User } from '../../types';
import { firebaseService } from '../../services/firebaseService';
import { ConfirmModal } from '../ConfirmModal';

interface CostsViewProps {
  user: User;
  costs: OperatingCost[];
  fetchData: () => Promise<void>;
  loading: boolean;
}

export const CostsView: React.FC<CostsViewProps> = ({ user, costs, fetchData, loading }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<OperatingCost>>({
    category: 'Quảng cáo',
    amount: 0,
    description: '',
    date: new Date().toISOString().split('T')[0]
  });

  const categories = ['Quảng cáo', 'Mặt bằng', 'Điện nước', 'Lương cứng', 'Khác'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.amount || form.amount <= 0) {
      alert('Vui lòng nhập số tiền hợp lệ');
      return;
    }

    try {
      const res = await firebaseService.addOperatingCost(form);
      if (res.success) {
        setIsAdding(false);
        setForm({
          category: 'Quảng cáo',
          amount: 0,
          description: '',
          date: new Date().toISOString().split('T')[0]
        });
        await fetchData();
      } else {
        alert('Thêm chi phí thất bại');
      }
    } catch (err) {
      console.error(err);
      alert('Lỗi hệ thống');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await firebaseService.deleteOperatingCost(id);
      if (res.success) {
        await fetchData();
        setDeletingId(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  if (user.role !== 'manager') {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-slate-500">
        <Tag size={48} className="mb-4 opacity-20" />
        <p>Bạn không có quyền truy cập mục này.</p>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Chi phí vận hành</h1>
          <p className="text-slate-500">Quản lý các khoản chi phí như Ads, mặt bằng, vận hành...</p>
        </div>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="flex items-center justify-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl transition-colors shadow-sm"
        >
          {isAdding ? <Plus className="rotate-45" /> : <Plus />}
          <span>{isAdding ? 'Hủy bỏ' : 'Thêm chi phí'}</span>
        </button>
      </div>

      {isAdding && (
        <motion.div 
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
        >
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Hạng mục</label>
              <select
                value={form.category}
                onChange={e => setForm({ ...form, category: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              >
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Số tiền (VNĐ)</label>
              <input
                type="number"
                value={form.amount || ''}
                onChange={e => setForm({ ...form, amount: Number(e.target.value) })}
                placeholder="VD: 500000"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Ngày chi</label>
              <input
                type="date"
                value={form.date}
                onChange={e => setForm({ ...form, date: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Ghi chú</label>
              <input
                type="text"
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                placeholder="VD: Chạy Ads Facebook tuần 1"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              />
            </div>
            <div className="md:col-span-2 lg:col-span-4 flex justify-end mt-2">
              <button
                type="submit"
                disabled={loading}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-2 rounded-xl font-semibold transition-all shadow-md disabled:opacity-50 flex items-center space-x-2"
              >
                {loading && <Loader2 className="animate-spin w-4 h-4" />}
                <span>Lưu chi phí</span>
              </button>
            </div>
          </form>
        </motion.div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Ngày</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Hạng mục</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Ghi chú</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Số tiền</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center w-20"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {costs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                    Chưa có dữ liệu chi phí nào.
                  </td>
                </tr>
              ) : (
                costs.map((cost) => (
                  <tr key={cost.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2 text-slate-600">
                        <Calendar size={14} className="text-slate-400" />
                        <span className="text-sm">{cost.date}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        cost.category === 'Quảng cáo' ? 'bg-blue-100 text-blue-800' :
                        cost.category === 'Lương cứng' ? 'bg-purple-100 text-purple-800' :
                        'bg-slate-100 text-slate-800'
                      }`}>
                        {cost.category}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2 text-slate-600">
                        <FileText size={14} className="text-slate-400" />
                        <span className="text-sm truncate max-w-xs">{cost.description || 'N/A'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right font-semibold text-red-600">
                      {formatCurrency(cost.amount)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => setDeletingId(cost.id)}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {costs.length > 0 && (
              <tfoot>
                <tr className="bg-slate-50 border-t border-slate-200">
                  <td colSpan={3} className="px-6 py-4 text-sm font-bold text-slate-900 text-right">Tổng cộng:</td>
                  <td className="px-6 py-4 text-right font-bold text-red-600">
                    {formatCurrency(costs.reduce((sum, c) => sum + (Number(c.amount) || 0), 0))}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
      <ConfirmModal 
        isOpen={!!deletingId}
        onClose={() => setDeletingId(null)}
        onConfirm={() => deletingId && handleDelete(deletingId)}
        title="Xác nhận xóa chi phí"
        message="Bạn có chắc chắn muốn xóa khoản chi phí này? Hành động này không thể hoàn tác."
      />
    </motion.div>
  );
};
