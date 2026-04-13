import React from 'react';
import { motion } from 'motion/react';
import { Trash2, QrCode, X } from 'lucide-react';
import { User, SaleRecord, SystemSettings } from '../../types';
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
  systemSettings?: SystemSettings;
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
  loading,
  systemSettings
}) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);
  const [showQR, setShowQR] = React.useState(false);
  const [quickInput, setQuickInput] = React.useState('');

  const handleQuickEntry = () => {
    if (!quickInput.trim()) return;

    // Regex to find price like 169k, 169000, 169.000
    const priceRegex = /(\d+(?:\.\d+)?)\s*k/i;
    const priceMatch = quickInput.match(priceRegex);

    if (priceMatch) {
      const amount = parseFloat(priceMatch[1].replace(/\./g, '')) * 1000;
      const customerName = quickInput.substring(0, priceMatch.index).trim();
      const remaining = quickInput.substring(priceMatch.index! + priceMatch[0].length).trim();
      
      // Split remaining by comma or space to get staff names
      const staffParts = remaining.split(/[,\s]+/).filter(Boolean);
      
      let readerId = '';
      let saleId = '';

      // Try to find matching staff
      staffParts.forEach(part => {
        const lowerPart = part.toLowerCase();
        const match = users.find(u => 
          u.full_name.toLowerCase().includes(lowerPart) || 
          u.username.toLowerCase().includes(lowerPart)
        );

        if (match) {
          if (match.role === 'reader' && !readerId) readerId = match.id;
          if (match.role === 'sale' && !saleId) saleId = match.id;
        }
      });

      // Map price to package name
      let packageName = '';
      if (amount === 35000) packageName = '1 câu';
      else if (amount === 80000) packageName = '3 câu';
      else if (amount === 100000) packageName = '5 câu';
      else if (amount === 129000) packageName = '7 câu';
      else if (amount === 169000) packageName = '10 câu';
      else packageName = `${amount / 1000}k`;

      setSaleForm({
        ...saleForm,
        customer_name: customerName,
        amount: amount,
        package_name: packageName,
        reader_id: readerId || saleForm.reader_id,
        sale_id: saleId || saleForm.sale_id
      });

      setQuickInput('');
    } else {
      alert('Không tìm thấy giá tiền (ví dụ: 169k) trong nội dung nhập nhanh.');
    }
  };

  const generateVietQR = () => {
    if (!systemSettings?.bank_account_number) return '';
    
    const bankId = systemSettings.bank_name === 'MBBank' ? 'MB' : '970422'; // Default to MB or generic
    const accountNo = systemSettings.bank_account_number;
    const amount = saleForm.amount || 0;
    const description = `THANH TOAN ${saleForm.customer_name?.toUpperCase() || 'KHACH HANG'}`;
    const accountName = systemSettings.bank_account_name || '';

    return `https://img.vietqr.io/image/${bankId}-${accountNo}-compact2.png?amount=${amount}&addInfo=${encodeURIComponent(description)}&accountName=${encodeURIComponent(accountName)}`;
  };

  console.log("[SaleEntryView] Current users:", users);
  console.log("[SaleEntryView] Current saleForm:", saleForm);

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

        {!editingSale && (
          <div className="p-8 pb-0">
            <div className="bg-indigo-50 p-6 rounded-2xl border border-indigo-100">
              <label className="block text-xs font-bold text-indigo-600 uppercase tracking-widest mb-3">Nhập nhanh (Tên khách - Giá - Reader, Sale)</label>
              <div className="flex gap-3">
                <input 
                  type="text"
                  value={quickInput}
                  onChange={e => setQuickInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleQuickEntry())}
                  placeholder="Ví dụ: Chu Khánh 169k Giang, Thông"
                  className="flex-1 px-4 py-3 rounded-xl border border-indigo-200 outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-sm"
                />
                <button 
                  type="button"
                  onClick={handleQuickEntry}
                  className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-sm"
                >
                  Xử lý
                </button>
              </div>
              <p className="text-[10px] text-indigo-400 mt-2 italic">* Hệ thống sẽ tự động nhận diện tên khách, giá tiền và tìm nhân viên phù hợp.</p>
            </div>
          </div>
        )}

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
            {systemSettings?.bank_account_number && (
              <button 
                type="button"
                onClick={() => setShowQR(true)}
                className="w-full bg-emerald-50 text-emerald-600 font-bold py-4 rounded-2xl hover:bg-emerald-100 transition-all flex items-center justify-center space-x-2"
              >
                <QrCode size={18} />
                <span>Tạo mã QR Thanh Toán</span>
              </button>
            )}
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

      {/* QR Code Modal */}
      {showQR && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden"
          >
            <div className="bg-emerald-600 p-6 text-white flex justify-between items-center">
              <h3 className="text-xl font-bold">Mã QR Thanh Toán</h3>
              <button onClick={() => setShowQR(false)} className="text-white/60 hover:text-white">
                <X size={24} />
              </button>
            </div>
            <div className="p-8 flex flex-col items-center space-y-6">
              <div className="bg-white p-4 rounded-2xl border-2 border-slate-100 shadow-sm">
                <img 
                  src={generateVietQR()} 
                  alt="VietQR" 
                  className="w-full max-w-[240px] h-auto"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="text-center">
                <p className="text-sm text-slate-500">Quét mã để thanh toán nhanh qua</p>
                <p className="text-lg font-bold text-slate-900">{systemSettings?.bank_name || 'Ngân hàng'}</p>
                <p className="text-xs text-slate-400 mt-1">{systemSettings?.bank_account_number}</p>
                <p className="text-xs text-slate-400">{systemSettings?.bank_account_name}</p>
              </div>
              <button 
                onClick={() => setShowQR(false)}
                className="w-full py-3 rounded-xl bg-slate-100 text-slate-600 font-bold hover:bg-slate-200 transition-all"
              >
                Đóng
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
};
