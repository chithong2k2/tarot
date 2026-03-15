import React from 'react';
import { motion } from 'motion/react';
import { Trash2 } from 'lucide-react';
import { User, SaleRecord } from '../../types';
import { formatVND } from '../DashboardComponents';
import { firebaseService } from '../../services/firebaseService';

import { ConfirmModal } from '../ConfirmModal';

interface SaleEntryViewProps {
  editingSale: SaleRecord | null;
  setEditingSale: (sale: SaleRecord | null) => void;
  saleForm: Partial<SaleRecord>;
  setSaleForm: (form: Partial<SaleRecord>) => void;
  handleSaleSubmit: (e: React.FormEvent) => void;
  users: User[];
  fetchData: () => Promise<void>;
  setView: (view: any) => void;
  loading: boolean;
}

export const SaleEntryView: React.FC<SaleEntryViewProps> = ({
  editingSale,
  setEditingSale,
  saleForm,
  setSaleForm,
  handleSaleSubmit,
  users,
  fetchData,
  setView,
  loading
}) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);

  return (
    <motion.div 
      key="entry"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="max-w-2xl mx-auto"
    >
      <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
        <div className="bg-indigo-600 p-8 text-white">
          <h2 className="text-2xl font-bold">{editingSale ? 'Chỉnh Sửa Giao Dịch' : 'Nhập Dữ Liệu Khách Hàng'}</h2>
          <p className="text-indigo-100 mt-1">{editingSale ? 'Cập nhật thông tin giao dịch đã chọn' : 'Ghi nhận doanh thu mới cho hệ thống'}</p>
        </div>
        <form onSubmit={handleSaleSubmit} className="p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Reader</label>
              <select 
                required
                value={saleForm.reader_id}
                onChange={e => setSaleForm({ ...saleForm, reader_id: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                <option value="">Chọn Reader</option>
                {users.filter(u => u.role === 'reader' && u.status !== 'inactive').map(u => (
                  <option key={u.id} value={u.id}>{u.full_name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Sale</label>
              <select 
                required
                value={saleForm.sale_id}
                onChange={e => setSaleForm({ ...saleForm, sale_id: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                <option value="">Chọn Sale</option>
                {users.filter(u => u.role === 'sale' && u.status !== 'inactive').map(u => (
                  <option key={u.id} value={u.id}>{u.full_name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Khách Hàng</label>
            <input 
              type="text" 
              required
              value={saleForm.customer_name}
              onChange={e => setSaleForm({ ...saleForm, customer_name: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 bg-white" 
              placeholder="Nhập tên khách" 
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Gói Coi</label>
            <input 
              type="text" 
              required
              value={saleForm.package_name}
              onChange={e => {
                setSaleForm({ 
                  ...saleForm, 
                  package_name: e.target.value
                });
              }}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 bg-white" 
              placeholder="Nhập tên gói dịch vụ" 
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Số Tiền (VNĐ)</label>
              <input 
                type="number" 
                required
                value={saleForm.amount}
                onChange={e => setSaleForm({ ...saleForm, amount: Number(e.target.value) })}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 bg-white" 
                placeholder="0" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Tiền Tip (VNĐ)</label>
              <input 
                type="number" 
                value={saleForm.tip}
                onChange={e => setSaleForm({ ...saleForm, tip: Number(e.target.value) })}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 bg-white" 
                placeholder="0" 
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Ngày Coi</label>
            <input 
              type="date" 
              required
              value={saleForm.date}
              onChange={e => setSaleForm({ ...saleForm, date: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 bg-white" 
            />
          </div>

          <div className="flex flex-col gap-4">
            {editingSale && (
              <div className="flex flex-col gap-3">
                <button 
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="w-full bg-red-50 text-red-600 font-bold py-4 rounded-2xl hover:bg-red-100 transition-all flex items-center justify-center space-x-2"
                >
                  <Trash2 size={18} />
                  <span>Xóa Giao Dịch</span>
                </button>
                <button 
                  type="button"
                  onClick={() => {
                    setEditingSale(null);
                    setView('dashboard');
                  }}
                  className="w-full bg-slate-100 text-slate-600 font-bold py-4 rounded-2xl hover:bg-slate-200 transition-all"
                >
                  Hủy Chỉnh Sửa
                </button>
              </div>
            )}
            {!editingSale && (
              <button 
                type="button"
                onClick={() => setView('dashboard')}
                className="w-full bg-slate-100 text-slate-600 font-bold py-4 rounded-2xl hover:bg-slate-200 transition-all"
              >
                Hủy
              </button>
            )}
            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 text-white font-bold py-4 rounded-2xl shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all disabled:opacity-50"
            >
              {loading ? 'Đang xử lý...' : (editingSale ? 'Cập Nhật Giao Dịch' : 'Lưu Dữ Liệu')}
            </button>
          </div>
        </form>
      </div>

      <ConfirmModal 
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={async () => {
          if (editingSale) {
            const res = await firebaseService.deleteSaleRecord(editingSale.id);
            if (res.success) {
              setEditingSale(null);
              setView('dashboard');
              await fetchData();
            } else {
              alert(res.message || 'Xóa thất bại');
            }
          }
        }}
        title="Xác nhận xóa giao dịch"
        message={`Bạn có chắc chắn muốn xóa giao dịch của khách hàng "${editingSale?.customer_name}"?`}
      />
    </motion.div>
  );
};
