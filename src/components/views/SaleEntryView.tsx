import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Trash2, 
  QrCode, 
  X, 
  PlusCircle, 
  RefreshCw, 
  CheckCircle2, 
  Sparkles, 
  Heart, 
  Zap, 
  ArrowRight 
} from 'lucide-react';
import { User, SaleRecord, SystemSettings } from '../../types';
import { formatVND } from '../DashboardComponents';
import { firebaseService } from '../../services/firebaseService';

import { ConfirmModal } from '../ConfirmModal';

export const TAROT_PACKAGES = [
  { name: '1 câu', amount: 35000, label: '1 Câu', badge: '35k' },
  { name: '3 câu', amount: 80000, label: '3 Câu', badge: '80k' },
  { name: '5 câu', amount: 100000, label: '5 Câu', badge: '100k' },
  { name: '7 câu', amount: 129000, label: '7 Câu', badge: '129k' },
  { name: '10 câu', amount: 169000, label: '10 Câu (Phổ biến)', badge: '169k', popular: true },
  { name: 'Trọn gói 1 Giờ', amount: 300000, label: 'Trọn Gói 1h', badge: '300k' },
  { name: 'Gói Năm', amount: 500000, label: 'Gói Năm', badge: '500k' },
];

export const TIP_PRESETS = [
  { label: '0 ₫', value: 0 },
  { label: '+20.000 ₫', value: 20000 },
  { label: '+50.000 ₫', value: 50000 },
  { label: '+100.000 ₫', value: 100000 },
  { label: '+200.000 ₫', value: 200000 },
];

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

  // Feature 5: Consecutive entries state
  const [saveAndContinueLoading, setSaveAndContinueLoading] = React.useState(false);
  const [consecutiveCount, setConsecutiveCount] = React.useState(0);
  const [successNotification, setSuccessNotification] = React.useState<string | null>(null);
  const customerInputRef = React.useRef<HTMLInputElement>(null);

  const handleSaveAndContinue = async () => {
    if (!saleForm.customer_name?.trim()) {
      alert('Vui lòng nhập tên khách hàng!');
      customerInputRef.current?.focus();
      return;
    }
    if (!saleForm.reader_id) {
      alert('Vui lòng chọn Reader phụ trách!');
      return;
    }
    if (!saleForm.amount || Number(saleForm.amount) <= 0) {
      alert('Vui lòng chọn hoặc nhập số tiền gói xem bài!');
      return;
    }

    try {
      setSaveAndContinueLoading(true);
      const res = await firebaseService.addSaleRecord(saleForm);
      if (res.success) {
        const savedCustomer = saleForm.customer_name;
        const savedAmount = formatVND(Number(saleForm.amount) || 0);
        const nextCount = consecutiveCount + 1;
        setConsecutiveCount(nextCount);

        // Keep reader_id, sale_id, date intact for fast consecutive entry
        setSaleForm({
          ...saleForm,
          customer_name: '',
          package_name: '',
          amount: 0,
          tip: 0
        });

        setSuccessNotification(`Đã lưu thành công đơn #${nextCount} của khách "${savedCustomer}" (${savedAmount})! Mời bạn tiếp tục nhập đơn tiếp theo.`);

        // Background update
        fetchData();

        // Focus back to customer input
        setTimeout(() => {
          customerInputRef.current?.focus();
        }, 150);
      } else {
        alert(res.message || 'Lưu thất bại');
      }
    } catch (err: any) {
      alert('Lỗi khi lưu đơn: ' + (err?.message || String(err)));
    } finally {
      setSaveAndContinueLoading(false);
    }
  };

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
      const matchedPkg = TAROT_PACKAGES.find(p => p.amount === amount);
      let packageName = matchedPkg ? matchedPkg.name : `${amount / 1000}k`;

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
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      className="max-w-5xl mx-auto"
    >
      <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-indigo-700 via-indigo-600 to-purple-700 px-7 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-xl">
              <Sparkles size={18} className="text-amber-300 shrink-0" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold">{editingSale ? 'Chỉnh Sửa Giao Dịch' : 'Nhập Dữ Liệu Khách Hàng'}</h2>
              <p className="text-indigo-200 text-xs mt-0.5">{editingSale ? 'Cập nhật giao dịch đã chọn' : 'Ghi nhận doanh thu & hoa hồng cho nhân sự'}</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {consecutiveCount > 0 && !editingSale && (
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-white/20 text-white flex items-center gap-1.5 shadow-sm">
                <CheckCircle2 size={14} className="text-emerald-300" />
                <span>Đã nhập liên tiếp: {consecutiveCount} đơn</span>
              </span>
            )}
            <button 
              type="button" 
              onClick={() => {
                if (editingSale) setEditingSale(null);
                setView('dashboard');
              }}
              className="text-white/70 hover:text-white p-1.5 rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
              title="Đóng / Quay về Dashboard"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Feature 5: Consecutive entry success alert */}
        <AnimatePresence>
          {successNotification && (
            <motion.div 
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="mx-7 mt-3.5 px-4 py-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm font-semibold flex items-center justify-between shadow-sm"
            >
              <div className="flex items-center gap-2.5">
                <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
                <span>{successNotification}</span>
              </div>
              <button 
                type="button"
                onClick={() => setSuccessNotification(null)}
                className="text-emerald-500 hover:text-emerald-700 p-1 cursor-pointer"
              >
                <X size={15} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Quick Entry Bar */}
        {!editingSale && (
          <div className="px-7 pt-4 pb-0">
            <div className="bg-indigo-50/80 p-2.5 sm:px-4 sm:py-2.5 rounded-2xl border border-indigo-100 flex items-center gap-3">
              <span className="text-xs font-bold text-indigo-700 uppercase tracking-wider shrink-0 flex items-center gap-1.5">
                <Zap size={15} className="text-indigo-600" />
                <span className="hidden sm:inline">Nhập nhanh:</span>
              </span>
              <input 
                type="text"
                value={quickInput}
                onChange={e => setQuickInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleQuickEntry())}
                placeholder="Ví dụ: Chu Khánh 169k Giang, Thông"
                className="flex-1 px-3.5 py-2 rounded-xl border border-indigo-200 outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-sm"
              />
              <button 
                type="button"
                onClick={handleQuickEntry}
                className="px-5 py-2 bg-indigo-600 text-white font-bold rounded-xl text-xs sm:text-sm hover:bg-indigo-700 transition-all shadow-sm cursor-pointer shrink-0"
              >
                Xử lý
              </button>
            </div>
          </div>
        )}

        <form onSubmit={handleSaleSubmit} className="p-7 pt-4 space-y-4">
          {/* Row 1: Reader, Sale, Ngày Coi */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">Reader *</label>
              <select 
                required
                value={saleForm.reader_id}
                onChange={e => setSaleForm({ ...saleForm, reader_id: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-sm"
              >
                <option value="">-- Chọn Reader --</option>
                {users.filter(u => u.role === 'reader' && u.status !== 'inactive').map(u => (
                  <option key={u.id} value={u.id}>{u.full_name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">Sale *</label>
              <select 
                required
                value={saleForm.sale_id}
                onChange={e => setSaleForm({ ...saleForm, sale_id: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-sm"
              >
                <option value="">-- Chọn Sale --</option>
                {users.filter(u => u.role === 'sale' && u.status !== 'inactive').map(u => (
                  <option key={u.id} value={u.id}>{u.full_name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">Ngày Coi *</label>
              <input 
                type="date" 
                required
                value={saleForm.date}
                onChange={e => setSaleForm({ ...saleForm, date: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-sm" 
              />
            </div>
          </div>

          {/* Row 2: Khách Hàng + Gói Coi with Quick Package Chips */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-start">
            <div className="sm:col-span-4">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">Tên Khách Hàng *</label>
              <input 
                ref={customerInputRef}
                type="text" 
                required
                value={saleForm.customer_name || ''}
                onChange={e => setSaleForm({ ...saleForm, customer_name: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-sm" 
                placeholder="Nhập tên khách..." 
              />
            </div>

            <div className="sm:col-span-8">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600">Gói Coi *</label>
                <span className="text-xs text-indigo-600 font-semibold flex items-center gap-1">
                  <Zap size={13} /> 1 click chọn gói & giá:
                </span>
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                <input 
                  type="text" 
                  required
                  value={saleForm.package_name || ''}
                  onChange={e => setSaleForm({ ...saleForm, package_name: e.target.value })}
                  className="w-full sm:w-44 px-3.5 py-2.5 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-sm shrink-0" 
                  placeholder="Tên gói..." 
                />
                {/* Feature 1: Quick Package Chips */}
                <div className="flex flex-wrap gap-1.5 flex-1">
                  {TAROT_PACKAGES.map(pkg => {
                    const isSelected = Number(saleForm.amount) === pkg.amount && 
                      (saleForm.package_name?.toLowerCase().includes(pkg.name.toLowerCase()) || 
                       saleForm.package_name?.toLowerCase() === pkg.label.toLowerCase());
                    return (
                      <button
                        key={pkg.name}
                        type="button"
                        onClick={() => {
                          setSaleForm({
                            ...saleForm,
                            package_name: pkg.name,
                            amount: pkg.amount
                          });
                        }}
                        className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${
                          isSelected 
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-100 scale-105' 
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-700'
                        }`}
                      >
                        <span>{pkg.label}</span>
                        <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-black ${
                          isSelected ? 'bg-white/20 text-white' : 'bg-indigo-100 text-indigo-700'
                        }`}>
                          {pkg.badge}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Row 3: Số Tiền & Tiền Tip with Quick Tip Presets */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-start">
            <div className="sm:col-span-4">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">Số Tiền (VNĐ) *</label>
              <input 
                type="number" 
                required
                value={saleForm.amount || ''}
                onChange={e => setSaleForm({ ...saleForm, amount: Number(e.target.value) })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-sm font-bold text-indigo-700" 
                placeholder="0" 
              />
            </div>

            <div className="sm:col-span-8">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600">Tiền Tip (VNĐ)</label>
                <span className="text-xs text-pink-600 font-semibold flex items-center gap-1">
                  <Heart size={13} className="fill-pink-500 text-pink-500" />
                  Tip khách tặng:
                </span>
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                <input 
                  type="number" 
                  value={saleForm.tip || ''}
                  onChange={e => setSaleForm({ ...saleForm, tip: Number(e.target.value) })}
                  className="w-full sm:w-44 px-3.5 py-2.5 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-sm font-semibold text-pink-700 shrink-0" 
                  placeholder="0" 
                />
                {/* Feature 2: Quick Tip Chips */}
                <div className="flex flex-wrap gap-1.5 flex-1">
                  {TIP_PRESETS.map(preset => {
                    const isSelected = (Number(saleForm.tip) || 0) === preset.value;
                    return (
                      <button
                        key={preset.value}
                        type="button"
                        onClick={() => {
                          setSaleForm({
                            ...saleForm,
                            tip: preset.value
                          });
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-pink-600 text-white border-pink-600 shadow-sm'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-pink-50 hover:border-pink-300 hover:text-pink-700'
                        }`}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Row 4: Action Buttons Footer */}
          <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div>
              {systemSettings?.bank_account_number && (
                <button 
                  type="button"
                  onClick={() => setShowQR(true)}
                  className="px-4 py-2.5 rounded-xl bg-emerald-50 text-emerald-700 font-bold text-xs hover:bg-emerald-100 transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <QrCode size={16} />
                  <span>Mã QR Thanh Toán</span>
                </button>
              )}
            </div>

            {editingSale ? (
              <div className="flex items-center gap-2 ml-auto">
                <button 
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="px-4 py-2.5 rounded-xl bg-red-50 text-red-600 font-bold text-xs hover:bg-red-100 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 size={15} />
                  <span>Xóa</span>
                </button>
                <button 
                  type="button"
                  onClick={() => {
                    setEditingSale(null);
                    setView('dashboard');
                  }}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-600 font-bold text-xs hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  Hủy
                </button>
                <button 
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 shadow-md shadow-indigo-100 transition-all disabled:opacity-50 cursor-pointer flex items-center gap-2"
                >
                  {loading ? <RefreshCw size={15} className="animate-spin" /> : null}
                  <span>Cập Nhật Giao Dịch</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3 ml-auto w-full sm:w-auto justify-end">
                <button 
                  type="button"
                  onClick={() => setView('dashboard')}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-600 font-bold text-xs hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  Hủy
                </button>

                {/* Feature 5: Save & Continue */}
                <button 
                  type="button"
                  disabled={loading || saveAndContinueLoading}
                  onClick={handleSaveAndContinue}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md shadow-emerald-100 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  title="Lưu đơn này và giữ lại Reader/Ngày để tiếp tục nhập đơn tiếp theo"
                >
                  {saveAndContinueLoading ? (
                    <RefreshCw size={16} className="animate-spin" />
                  ) : (
                    <PlusCircle size={16} />
                  )}
                  <span>Lưu & Nhập Tiếp</span>
                </button>

                <button 
                  type="submit"
                  disabled={loading || saveAndContinueLoading}
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md shadow-indigo-100 transition-all disabled:opacity-50 cursor-pointer flex items-center gap-2"
                >
                  {loading ? <RefreshCw size={16} className="animate-spin" /> : null}
                  <span>Lưu & Về Dashboard</span>
                </button>
              </div>
            )}
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
